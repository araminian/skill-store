import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import type { GlobalStacksConfig, StackDefinition } from '../types.js';
import { getCachedCommunityStacks } from './registry-fetcher.js';
import { loadProjectManifest, saveProjectManifest, findProjectRoot } from '../project-manifest.js';
import { resolveStackIdentifier } from './stack-resolver.js';

export const GLOBAL_STACKS_FILE = 'stacks.json';

export function getGlobalStacksPath(storeDir: string): string {
  return join(storeDir, GLOBAL_STACKS_FILE);
}

export async function loadGlobalStacks(storeDir: string): Promise<Record<string, StackDefinition>> {
  const filePath = getGlobalStacksPath(storeDir);
  if (!existsSync(filePath)) {
    return {};
  }

  try {
    const raw = await readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as GlobalStacksConfig;
    if (!parsed.stacks) return {};

    const result: Record<string, StackDefinition> = {};
    for (const [id, def] of Object.entries(parsed.stacks)) {
      const canonicalId = id.includes('/') ? id : `global/${id}`;
      const category = def.category || (id.includes('/') ? id.split('/')[0]! : 'global');
      result[canonicalId.toLowerCase()] = {
        id: canonicalId,
        name: id.includes('/') ? id.split('/').slice(1).join('/') : id,
        category,
        description: def.description || `Custom global stack ${id}`,
        extends: def.extends,
        skills: def.skills || [],
        origin: 'global',
      };
    }
    return result;
  } catch {
    return {};
  }
}

export async function saveGlobalStack(storeDir: string, stack: StackDefinition): Promise<void> {
  await mkdir(storeDir, { recursive: true });
  const filePath = getGlobalStacksPath(storeDir);

  let existing: GlobalStacksConfig = { version: 1, stacks: {} };
  if (existsSync(filePath)) {
    try {
      const raw = await readFile(filePath, 'utf-8');
      existing = JSON.parse(raw) as GlobalStacksConfig;
      if (!existing.stacks) existing.stacks = {};
    } catch {
      existing = { version: 1, stacks: {} };
    }
  }

  existing.stacks[stack.id] = {
    description: stack.description,
    category: stack.category,
    extends: stack.extends,
    skills: stack.skills,
  };

  await writeFile(filePath, JSON.stringify(existing, null, 2) + '\n', 'utf-8');
}

export async function removeGlobalStack(storeDir: string, idOrName: string): Promise<boolean> {
  const filePath = getGlobalStacksPath(storeDir);
  if (!existsSync(filePath)) return false;

  try {
    const raw = await readFile(filePath, 'utf-8');
    const existing = JSON.parse(raw) as GlobalStacksConfig;
    if (!existing.stacks) return false;

    const normalized = idOrName.toLowerCase().trim();
    const key = Object.keys(existing.stacks).find(
      (k) => k.toLowerCase() === normalized || k.split('/').pop()?.toLowerCase() === normalized
    );
    if (!key) return false;

    delete existing.stacks[key];
    await writeFile(filePath, JSON.stringify(existing, null, 2) + '\n', 'utf-8');
    return true;
  } catch {
    return false;
  }
}

export async function loadProjectStacks(projectDir: string): Promise<Record<string, StackDefinition>> {
  const manifest = await loadProjectManifest(projectDir);
  if (!manifest || !manifest.stacks) {
    return {};
  }

  const result: Record<string, StackDefinition> = {};
  for (const [id, def] of Object.entries(manifest.stacks)) {
    const canonicalId = id.includes('/') ? id : `project/${id}`;
    const category = def.category || (id.includes('/') ? id.split('/')[0]! : 'project');
    result[canonicalId.toLowerCase()] = {
      id: canonicalId,
      name: id.includes('/') ? id.split('/').slice(1).join('/') : id,
      category,
      description: def.description || `Project stack ${id}`,
      extends: def.extends,
      skills: def.skills || [],
      origin: 'project',
    };
  }
  return result;
}

export async function saveProjectStack(projectDir: string, stack: StackDefinition): Promise<void> {
  let manifest = await loadProjectManifest(projectDir);
  if (!manifest) {
    manifest = { skills: {}, stacks: {} };
  }
  if (!manifest.stacks) {
    manifest.stacks = {};
  }

  manifest.stacks[stack.id] = {
    description: stack.description,
    category: stack.category,
    extends: stack.extends,
    skills: stack.skills,
  };

  await saveProjectManifest(projectDir, manifest);
}

export async function removeProjectStack(projectDir: string, idOrName: string): Promise<boolean> {
  const manifest = await loadProjectManifest(projectDir);
  if (!manifest || !manifest.stacks) return false;

  const normalized = idOrName.toLowerCase().trim();
  const key = Object.keys(manifest.stacks).find(
    (k) => k.toLowerCase() === normalized || k.split('/').pop()?.toLowerCase() === normalized
  );
  if (!key) return false;

  delete manifest.stacks[key];
  await saveProjectManifest(projectDir, manifest);
  return true;
}

export async function loadAllStacks(
  storeDir: string,
  projectDir?: string
): Promise<Record<string, StackDefinition>> {
  const resolvedProj = projectDir || findProjectRoot();

  // 1. Base / Community cached stacks
  const merged = await getCachedCommunityStacks(storeDir, resolvedProj);

  // 2. Global user stacks (override community)
  const globalStacks = await loadGlobalStacks(storeDir);
  for (const [key, stack] of Object.entries(globalStacks)) {
    merged[key] = stack;
    // Also allow index by short name if unambiguous
    const shortName = stack.id.includes('/') ? stack.id.split('/').pop()! : stack.id;
    if (!merged[shortName.toLowerCase()]) {
      merged[shortName.toLowerCase()] = stack;
    }
  }

  // 3. Project stacks (override global & community)
  const projectStacks = await loadProjectStacks(resolvedProj);
  for (const [key, stack] of Object.entries(projectStacks)) {
    merged[key] = stack;
    const shortName = stack.id.includes('/') ? stack.id.split('/').pop()! : stack.id;
    merged[shortName.toLowerCase()] = stack;
  }

  return merged;
}

export async function getStack(
  nameOrId: string,
  storeDir: string,
  projectDir?: string
): Promise<StackDefinition | undefined> {
  const all = await loadAllStacks(storeDir, projectDir);
  const resolved = await resolveStackIdentifier(nameOrId, all);
  return resolved ?? undefined;
}
