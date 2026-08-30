import { homedir } from 'os';
import { join } from 'path';

export const DEFAULT_STORE_DIR_NAME = '.skill-store';

export function getDefaultStoreDir(): string {
  if (process.env.SKILL_STORE_DIR && process.env.SKILL_STORE_DIR.trim().length > 0) {
    return process.env.SKILL_STORE_DIR.trim();
  }
  return join(homedir(), DEFAULT_STORE_DIR_NAME);
}

export const SKILLS_SUBDIR = 'skills';
export const SOURCES_SUBDIR = 'sources';
export const REGISTRY_FILE = 'registry.json';
export const PROJECT_MANIFEST_FILE = 'skill-store.json';
export const SKILL_MD_FILENAME = 'SKILL.md';
export const REGISTRY_VERSION = 1;
