import { mkdir, cp, rm, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { getDefaultStoreDir, SKILLS_SUBDIR, SOURCES_SUBDIR, REGISTRY_FILE } from './constants.js';

export function resolveStoreDir(customStoreDir?: string): string {
  return customStoreDir || getDefaultStoreDir();
}

export function getStoreSkillsDir(storeDir: string): string {
  return join(storeDir, SKILLS_SUBDIR);
}

export function getStoreSourcesDir(storeDir: string): string {
  return join(storeDir, SOURCES_SUBDIR);
}

export function getSkillPath(storeDir: string, skillName: string): string {
  return join(getStoreSkillsDir(storeDir), skillName);
}

export function getSourceCachePath(storeDir: string, sourceKey: string): string {
  // Normalize sourceKey into a safe directory name (e.g. github_owner_repo)
  const safeName = sourceKey.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  return join(getStoreSourcesDir(storeDir), safeName);
}

export async function ensureStoreLayout(storeDir: string): Promise<{
  skillsDir: string;
  sourcesDir: string;
  registryPath: string;
}> {
  const skillsDir = getStoreSkillsDir(storeDir);
  const sourcesDir = getStoreSourcesDir(storeDir);
  const registryPath = join(storeDir, REGISTRY_FILE);

  await mkdir(skillsDir, { recursive: true });
  await mkdir(sourcesDir, { recursive: true });

  return { skillsDir, sourcesDir, registryPath };
}

export async function isSkillInStore(storeDir: string, skillName: string): Promise<boolean> {
  const path = getSkillPath(storeDir, skillName);
  return existsSync(path);
}

export async function copySkillToStore(
  storeDir: string,
  skillName: string,
  sourceDir: string
): Promise<string> {
  await ensureStoreLayout(storeDir);
  const targetDir = getSkillPath(storeDir, skillName);

  // If existing target exists, remove it first
  if (existsSync(targetDir)) {
    await rm(targetDir, { recursive: true, force: true });
  }

  await cp(sourceDir, targetDir, { recursive: true });
  return targetDir;
}

export async function deleteSkillFromStore(storeDir: string, skillName: string): Promise<void> {
  const targetDir = getSkillPath(storeDir, skillName);
  if (existsSync(targetDir)) {
    await rm(targetDir, { recursive: true, force: true });
  }
}
