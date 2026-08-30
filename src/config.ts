import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import type { GlobalConfig, RegistrySourceConfig } from './types.js';
import { loadProjectManifest, findProjectRoot } from './project-manifest.js';

export const CONFIG_FILE = 'config.json';
export const DEFAULT_OFFICIAL_REGISTRY_URL =
  'https://raw.githubusercontent.com/araminian/skill-store/main/registry/stacks.json';

export function getDefaultConfig(): GlobalConfig {
  return {
    version: 1,
    defaultRegistry: DEFAULT_OFFICIAL_REGISTRY_URL,
    registries: [
      {
        name: 'official',
        url: DEFAULT_OFFICIAL_REGISTRY_URL,
        enabled: true,
      },
    ],
  };
}

export function getConfigPath(storeDir: string): string {
  return join(storeDir, CONFIG_FILE);
}

export async function loadGlobalConfig(storeDir: string): Promise<GlobalConfig> {
  const configPath = getConfigPath(storeDir);
  if (!existsSync(configPath)) {
    const def = getDefaultConfig();
    await saveGlobalConfig(storeDir, def);
    return def;
  }

  try {
    const raw = await readFile(configPath, 'utf-8');
    const parsed = JSON.parse(raw) as GlobalConfig;
    if (!parsed.registries || !Array.isArray(parsed.registries)) {
      parsed.registries = getDefaultConfig().registries;
    }
    return parsed;
  } catch {
    const def = getDefaultConfig();
    return def;
  }
}

export async function saveGlobalConfig(storeDir: string, config: GlobalConfig): Promise<void> {
  await mkdir(storeDir, { recursive: true });
  const configPath = getConfigPath(storeDir);
  await writeFile(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
}

export async function addRegistrySource(
  storeDir: string,
  name: string,
  url: string
): Promise<void> {
  const config = await loadGlobalConfig(storeDir);
  const normalizedName = name.toLowerCase().trim();

  const existingIdx = config.registries.findIndex((r) => r.name.toLowerCase() === normalizedName);
  if (existingIdx >= 0) {
    config.registries[existingIdx] = {
      name: normalizedName,
      url: url.trim(),
      enabled: true,
    };
  } else {
    config.registries.push({
      name: normalizedName,
      url: url.trim(),
      enabled: true,
    });
  }

  await saveGlobalConfig(storeDir, config);
}

export async function removeRegistrySource(storeDir: string, name: string): Promise<boolean> {
  const config = await loadGlobalConfig(storeDir);
  const normalizedName = name.toLowerCase().trim();

  if (normalizedName === 'official') {
    throw new Error('Cannot remove the official default registry tap. You may disable it instead.');
  }

  const initialLen = config.registries.length;
  config.registries = config.registries.filter((r) => r.name.toLowerCase() !== normalizedName);

  if (config.registries.length !== initialLen) {
    await saveGlobalConfig(storeDir, config);
    return true;
  }
  return false;
}

export async function getActiveRegistrySources(
  storeDir: string,
  projectDir?: string
): Promise<RegistrySourceConfig[]> {
  const globalConfig = await loadGlobalConfig(storeDir);
  const active: RegistrySourceConfig[] = [...globalConfig.registries.filter((r) => r.enabled)];

  // Check project manifest for extra project-level registry sources
  const resolvedProj = projectDir || findProjectRoot();
  const manifest = await loadProjectManifest(resolvedProj);
  if (manifest && manifest.registries && Array.isArray(manifest.registries)) {
    for (const projReg of manifest.registries) {
      if (projReg.enabled && !active.some((r) => r.url === projReg.url)) {
        active.push(projReg);
      }
    }
  }

  return active;
}
