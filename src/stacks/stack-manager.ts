import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import type { GlobalStacksConfig, StackDefinition, StackOrigin } from '../types.js';
import { BUILTIN_STACKS } from './builtin-stacks.js';
import { loadProjectManifest, saveProjectManifest, findProjectRoot } from '../project-manifest.js';

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
    for (const [name, def] of Object.entries(parsed.stacks)) {
      result[name.toLowerCase()] = {
        name,
        description: def.description || `Custom global stack ${name}`,
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

  existing.stacks[stack.name] = {
    description: stack.description,
    skills: stack.skills,
  };

  await writeFile(filePath, JSON.stringify(existing, null, 2) + '\n', 'utf-8');
}

export async function removeGlobalStack(storeDir: string, name: string): Promise<boolean> {
  const filePath = getGlobalStacksPath(storeDir);
  if (!existsSync(filePath)) return false;

  try {
    const raw = await readFile(filePath, 'utf-8');
    const existing = JSON.parse(raw) as GlobalStacksConfig;
    if (!existing.stacks) return false;

    const key = Object.keys(existing.stacks).find((k) => k.toLowerCase() === name.toLowerCase());
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
  for (const [name, def] of Object.entries(manifest.stacks)) {
    result[name.toLowerCase()] = {
      name,
      description: def.description || `Project stack ${name}`,
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

  manifest.stacks[stack.name] = {
    description: stack.description,
    skills: stack.skills,
  };

  await saveProjectManifest(projectDir, manifest);
}

export async function removeProjectStack(projectDir: string, name: string): Promise<boolean> {
  const manifest = await loadProjectManifest(projectDir);
  if (!manifest || !manifest.stacks) return false;

  const key = Object.keys(manifest.stacks).find((k) => k.toLowerCase() === name.toLowerCase());
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

  // 1. Built-in defaults
  const merged: Record<string, StackDefinition> = { ...BUILTIN_STACKS };

  // 2. Global user stacks (override built-ins)
  const globalStacks = await loadGlobalStacks(storeDir);
  for (const [key, stack] of Object.entries(globalStacks)) {
    merged[key] = stack;
  }

  // 3. Project stacks (override global & built-ins)
  const projectStacks = await loadProjectStacks(resolvedProj);
  for (const [key, stack] of Object.entries(projectStacks)) {
    merged[key] = stack;
  }

  return merged;
}

export async function getStack(
  name: string,
  storeDir: string,
  projectDir?: string
): Promise<StackDefinition | undefined> {
  const all = await loadAllStacks(storeDir, projectDir);
  return all[name.toLowerCase().trim()];
}
