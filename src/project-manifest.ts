import { readFile, writeFile, rm } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import type { ProjectManifest, ProjectSkillEntry } from './types.js';
import { PROJECT_MANIFEST_FILE } from './constants.js';

export function getProjectManifestPath(projectDir: string): string {
  return join(projectDir, PROJECT_MANIFEST_FILE);
}

export function findProjectRoot(startDir = process.cwd()): string {
  let current = startDir;

  while (current !== dirname(current)) {
    if (
      existsSync(join(current, PROJECT_MANIFEST_FILE)) ||
      existsSync(join(current, '.git')) ||
      existsSync(join(current, 'package.json')) ||
      existsSync(join(current, '.claude')) ||
      existsSync(join(current, '.agents'))
    ) {
      return current;
    }
    current = dirname(current);
  }

  return startDir;
}

export async function loadProjectManifest(projectDir: string): Promise<ProjectManifest | null> {
  const manifestPath = getProjectManifestPath(projectDir);
  if (!existsSync(manifestPath)) {
    return null;
  }

  try {
    const raw = await readFile(manifestPath, 'utf-8');
    const parsed = JSON.parse(raw) as ProjectManifest;
    if (!parsed.skills) parsed.skills = {};
    return parsed;
  } catch {
    return null;
  }
}

export async function saveProjectManifest(
  projectDir: string,
  manifest: ProjectManifest
): Promise<void> {
  const manifestPath = getProjectManifestPath(projectDir);
  if (!manifest.skills) {
    manifest.skills = {};
  }
  const content = JSON.stringify(manifest, null, 2) + '\n';
  await writeFile(manifestPath, content, 'utf-8');
}

export async function addSkillToManifest(
  projectDir: string,
  skillName: string,
  entry: ProjectSkillEntry
): Promise<void> {
  let manifest = await loadProjectManifest(projectDir);
  if (!manifest) {
    manifest = {
      skills: {},
    };
  }

  manifest.skills[skillName] = {
    ...manifest.skills[skillName],
    ...entry,
  };

  await saveProjectManifest(projectDir, manifest);
}

export async function removeSkillFromManifest(
  projectDir: string,
  skillName: string
): Promise<boolean> {
  const manifest = await loadProjectManifest(projectDir);
  if (!manifest || !manifest.skills[skillName]) {
    return false;
  }

  delete manifest.skills[skillName];

  if (Object.keys(manifest.skills).length === 0) {
    // If empty, we can keep empty skills object or remove file
    await saveProjectManifest(projectDir, manifest);
  } else {
    await saveProjectManifest(projectDir, manifest);
  }

  return true;
}
