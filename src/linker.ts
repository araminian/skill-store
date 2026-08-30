import { symlink, readlink, lstat, unlink, rm, mkdir, cp, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, resolve } from 'path';
import type { LinkMode } from './types.js';
import { getSkillPath } from './store.js';

export interface LinkResult {
  symlinkPath: string;
  sourceSkillPath: string;
  mode: LinkMode;
  isExisting: boolean;
}

export async function isSymlink(path: string): Promise<boolean> {
  try {
    const stats = await lstat(path);
    return stats.isSymbolicLink();
  } catch {
    return false;
  }
}

export async function getSymlinkDestination(path: string): Promise<string | null> {
  try {
    if (await isSymlink(path)) {
      const target = await readlink(path);
      return resolve(dirname(path), target);
    }
    return null;
  } catch {
    return null;
  }
}

export async function isLinkValid(path: string): Promise<{ exists: boolean; isValid: boolean; destination?: string }> {
  try {
    const isLink = await isSymlink(path);
    if (!isLink) {
      const exists = existsSync(path);
      return { exists, isValid: exists };
    }

    const destination = await getSymlinkDestination(path);
    if (!destination) {
      return { exists: true, isValid: false };
    }

    const destExists = existsSync(destination);
    return {
      exists: true,
      isValid: destExists,
      destination,
    };
  } catch {
    return { exists: false, isValid: false };
  }
}

export async function createSkillLink(
  storeDir: string,
  skillName: string,
  targetDestinationPath: string,
  preferredMode: LinkMode = 'symlink'
): Promise<LinkResult> {
  const sourceSkillPath = getSkillPath(storeDir, skillName);
  if (!existsSync(sourceSkillPath)) {
    throw new Error(`Skill "${skillName}" not found in skill-store at ${sourceSkillPath}`);
  }

  // Ensure parent directory exists
  await mkdir(dirname(targetDestinationPath), { recursive: true });

  // Check if destination already exists
  if (existsSync(targetDestinationPath) || (await isSymlink(targetDestinationPath))) {
    const dest = await getSymlinkDestination(targetDestinationPath);
    if (dest === sourceSkillPath) {
      return {
        symlinkPath: targetDestinationPath,
        sourceSkillPath,
        mode: 'symlink',
        isExisting: true,
      };
    }

    // Existing link or folder points somewhere else -> remove it first
    await removeSkillLink(targetDestinationPath);
  }

  let finalMode: LinkMode = preferredMode;

  if (preferredMode === 'symlink') {
    try {
      // Use 'junction' on Windows or directory symlink
      await symlink(sourceSkillPath, targetDestinationPath, 'junction');
    } catch {
      // Fallback to copy mode if symlink fails (e.g. Windows unprivileged user)
      await cp(sourceSkillPath, targetDestinationPath, { recursive: true });
      finalMode = 'copy';
    }
  } else {
    await cp(sourceSkillPath, targetDestinationPath, { recursive: true });
    finalMode = 'copy';
  }

  return {
    symlinkPath: targetDestinationPath,
    sourceSkillPath,
    mode: finalMode,
    isExisting: false,
  };
}

export async function removeSkillLink(targetDestinationPath: string): Promise<boolean> {
  try {
    if (await isSymlink(targetDestinationPath)) {
      await unlink(targetDestinationPath);
      return true;
    }

    if (existsSync(targetDestinationPath)) {
      await rm(targetDestinationPath, { recursive: true, force: true });
      return true;
    }

    return false;
  } catch {
    return false;
  }
}
