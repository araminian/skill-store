import { readFile, writeFile, mkdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { join, isAbsolute } from 'path';
import type { StackDefinition, RegistrySourceConfig } from '../types.js';
import { getActiveRegistrySources } from '../config.js';
import { BUILTIN_STACKS } from './builtin-stacks.js';

export const COMMUNITY_CACHE_FILE = 'community-stacks.json';
export const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface CachedCommunityCatalog {
  version: number;
  lastSyncedAt: string;
  sources: Array<{ name: string; url: string; count: number }>;
  stacks: StackDefinition[];
}

export function getCommunityCachePath(storeDir: string): string {
  return join(storeDir, COMMUNITY_CACHE_FILE);
}

export async function fetchRegistryContent(urlOrPath: string): Promise<StackDefinition[]> {
  const trimmed = urlOrPath.trim();

  // If local file path
  if (trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('file://') || existsSync(trimmed)) {
    const filePath = trimmed.startsWith('file://') ? trimmed.replace('file://', '') : trimmed;
    const content = await readFile(filePath, 'utf-8');
    const parsed = JSON.parse(content);
    return Array.isArray(parsed.stacks) ? parsed.stacks : [];
  }

  // Remote HTTP(S) URL
  const res = await fetch(trimmed, {
    headers: {
      'User-Agent': 'skill-store-cli',
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }

  const parsed = (await res.json()) as any;
  if (!parsed || !Array.isArray(parsed.stacks)) {
    throw new Error('Invalid registry format: missing "stacks" array');
  }

  return parsed.stacks as StackDefinition[];
}

export async function isCacheFresh(storeDir: string): Promise<boolean> {
  const cachePath = getCommunityCachePath(storeDir);
  if (!existsSync(cachePath)) return false;

  try {
    const stats = await stat(cachePath);
    const age = Date.now() - stats.mtimeMs;
    return age < CACHE_TTL_MS;
  } catch {
    return false;
  }
}

export async function syncRegistries(
  storeDir: string,
  projectDir?: string,
  force = false
): Promise<{ totalStacks: number; syncedSources: number; errors: string[] }> {
  await mkdir(storeDir, { recursive: true });
  const sources = await getActiveRegistrySources(storeDir, projectDir);
  const allFetchedStacks: StackDefinition[] = [];
  const sourceSummaries: Array<{ name: string; url: string; count: number }> = [];
  const errors: string[] = [];

  for (const source of sources) {
    try {
      const stacks = await fetchRegistryContent(source.url);
      for (const stack of stacks) {
        allFetchedStacks.push({
          ...stack,
          origin: 'community',
          sourceRegistry: source.name,
        });
      }
      sourceSummaries.push({
        name: source.name,
        url: source.url,
        count: stacks.length,
      });
    } catch (err: any) {
      errors.push(`Failed to sync from "${source.name}" (${source.url}): ${err?.message || err}`);
    }
  }

  // If sync succeeded for at least one source or fallback, write cache
  if (allFetchedStacks.length > 0) {
    const catalog: CachedCommunityCatalog = {
      version: 1,
      lastSyncedAt: new Date().toISOString(),
      sources: sourceSummaries,
      stacks: allFetchedStacks,
    };
    const cachePath = getCommunityCachePath(storeDir);
    await writeFile(cachePath, JSON.stringify(catalog, null, 2) + '\n', 'utf-8');
  }

  return {
    totalStacks: allFetchedStacks.length,
    syncedSources: sourceSummaries.length,
    errors,
  };
}

export async function getCachedCommunityStacks(
  storeDir: string,
  projectDir?: string
): Promise<Record<string, StackDefinition>> {
  const cachePath = getCommunityCachePath(storeDir);

  // Check if cache needs background / immediate refresh
  if (!existsSync(cachePath)) {
    try {
      await syncRegistries(storeDir, projectDir, false);
    } catch {
      // Fallback to built-ins if offline
    }
  }

  const result: Record<string, StackDefinition> = {};

  // 1. Start with built-ins as base fallback
  for (const [id, stack] of Object.entries(BUILTIN_STACKS)) {
    result[id.toLowerCase()] = stack;
  }

  // 2. Overlay cached community registry if present
  if (existsSync(cachePath)) {
    try {
      const raw = await readFile(cachePath, 'utf-8');
      const catalog = JSON.parse(raw) as CachedCommunityCatalog;
      if (catalog && Array.isArray(catalog.stacks)) {
        for (const stack of catalog.stacks) {
          result[stack.id.toLowerCase()] = {
            ...stack,
            origin: 'community',
          };
        }
      }
    } catch {
      // Fallback to built-ins
    }
  }

  return result;
}
