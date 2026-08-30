import { readFile, writeFile, mkdir, rename } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { randomUUID } from 'crypto';
import type { SkillLinkReference, SkillRecord, StoreRegistry } from './types.js';
import { REGISTRY_FILE, REGISTRY_VERSION } from './constants.js';

export function getRegistryPath(storeDir: string): string {
  return join(storeDir, REGISTRY_FILE);
}

export function createEmptyRegistry(): StoreRegistry {
  return {
    version: REGISTRY_VERSION,
    skills: {},
    links: [],
    updatedAt: new Date().toISOString(),
  };
}

export async function loadRegistry(storeDir: string): Promise<StoreRegistry> {
  const registryPath = getRegistryPath(storeDir);
  if (!existsSync(registryPath)) {
    const empty = createEmptyRegistry();
    await saveRegistry(storeDir, empty);
    return empty;
  }

  try {
    const content = await readFile(registryPath, 'utf-8');
    const parsed = JSON.parse(content) as StoreRegistry;
    if (!parsed.skills) parsed.skills = {};
    if (!parsed.links) parsed.links = [];
    if (!parsed.version) parsed.version = REGISTRY_VERSION;
    return parsed;
  } catch {
    const empty = createEmptyRegistry();
    return empty;
  }
}

export async function saveRegistry(storeDir: string, registry: StoreRegistry): Promise<void> {
  await mkdir(storeDir, { recursive: true });
  const registryPath = getRegistryPath(storeDir);
  const tempPath = `${registryPath}.${randomUUID()}.tmp`;

  registry.updatedAt = new Date().toISOString();
  const serialized = JSON.stringify(registry, null, 2);

  await writeFile(tempPath, serialized, 'utf-8');
  await rename(tempPath, registryPath);
}

export async function registerSkill(storeDir: string, skill: SkillRecord): Promise<void> {
  const registry = await loadRegistry(storeDir);
  registry.skills[skill.name] = skill;
  await saveRegistry(storeDir, registry);
}

export async function unregisterSkill(storeDir: string, skillName: string): Promise<boolean> {
  const registry = await loadRegistry(storeDir);
  if (registry.skills[skillName]) {
    delete registry.skills[skillName];
    await saveRegistry(storeDir, registry);
    return true;
  }
  return false;
}

export async function getSkill(storeDir: string, skillName: string): Promise<SkillRecord | undefined> {
  const registry = await loadRegistry(storeDir);
  return registry.skills[skillName];
}

export async function getAllSkills(storeDir: string): Promise<SkillRecord[]> {
  const registry = await loadRegistry(storeDir);
  return Object.values(registry.skills);
}

export async function addLink(
  storeDir: string,
  linkInput: Omit<SkillLinkReference, 'id' | 'linkedAt'>
): Promise<SkillLinkReference> {
  const registry = await loadRegistry(storeDir);

  // Check if link already exists for exact symlinkPath, update it if so
  const existingIdx = registry.links.findIndex((l) => l.symlinkPath === linkInput.symlinkPath);
  const now = new Date().toISOString();

  const linkRecord: SkillLinkReference = {
    ...linkInput,
    id: existingIdx >= 0 ? registry.links[existingIdx]!.id : randomUUID(),
    linkedAt: now,
  };

  if (existingIdx >= 0) {
    registry.links[existingIdx] = linkRecord;
  } else {
    registry.links.push(linkRecord);
  }

  await saveRegistry(storeDir, registry);
  return linkRecord;
}

export async function removeLink(storeDir: string, symlinkPath: string): Promise<boolean> {
  const registry = await loadRegistry(storeDir);
  const initialLen = registry.links.length;
  registry.links = registry.links.filter((l) => l.symlinkPath !== symlinkPath);

  if (registry.links.length !== initialLen) {
    await saveRegistry(storeDir, registry);
    return true;
  }
  return false;
}

export async function removeLinksForSkill(
  storeDir: string,
  skillName: string
): Promise<SkillLinkReference[]> {
  const registry = await loadRegistry(storeDir);
  const removed: SkillLinkReference[] = [];
  const kept: SkillLinkReference[] = [];

  for (const link of registry.links) {
    if (link.skillName === skillName) {
      removed.push(link);
    } else {
      kept.push(link);
    }
  }

  if (removed.length > 0) {
    registry.links = kept;
    await saveRegistry(storeDir, registry);
  }

  return removed;
}

export async function removeLinksForProject(
  storeDir: string,
  projectDir: string
): Promise<SkillLinkReference[]> {
  const registry = await loadRegistry(storeDir);
  const removed: SkillLinkReference[] = [];
  const kept: SkillLinkReference[] = [];

  for (const link of registry.links) {
    if (link.targetType === 'project' && link.targetDir === projectDir) {
      removed.push(link);
    } else {
      kept.push(link);
    }
  }

  if (removed.length > 0) {
    registry.links = kept;
    await saveRegistry(storeDir, registry);
  }

  return removed;
}

export async function getLinksForSkill(
  storeDir: string,
  skillName: string
): Promise<SkillLinkReference[]> {
  const registry = await loadRegistry(storeDir);
  return registry.links.filter((l) => l.skillName === skillName);
}

export async function getLinksForProject(
  storeDir: string,
  projectDir: string
): Promise<SkillLinkReference[]> {
  const registry = await loadRegistry(storeDir);
  return registry.links.filter((l) => l.targetType === 'project' && l.targetDir === projectDir);
}

export async function getGlobalLinks(storeDir: string): Promise<SkillLinkReference[]> {
  const registry = await loadRegistry(storeDir);
  return registry.links.filter((l) => l.targetType === 'global');
}
