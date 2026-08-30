import { execFile } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import { mkdir, rm } from 'fs/promises';

const execFileAsync = promisify(execFile);

export async function isGitAvailable(): Promise<boolean> {
  try {
    await execFileAsync('git', ['--version']);
    return true;
  } catch {
    return false;
  }
}

export async function getGitCommitSha(repoDir: string): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: repoDir });
    return stdout.trim();
  } catch {
    return undefined;
  }
}

export async function cloneOrUpdateRepo(
  repoUrl: string,
  targetDir: string,
  ref?: string
): Promise<{ commitSha?: string; isNewClone: boolean }> {
  const isGitRepo = existsSync(targetDir) && existsSync(`${targetDir}/.git`);

  if (isGitRepo) {
    try {
      // Fetch latest
      await execFileAsync('git', ['fetch', '--all', '--tags', '--prune'], { cwd: targetDir });

      if (ref) {
        await execFileAsync('git', ['checkout', ref], { cwd: targetDir });
        // Try pulling if it's a tracking branch
        try {
          await execFileAsync('git', ['pull', '--ff-only'], { cwd: targetDir });
        } catch {
          // might be detached HEAD or tag
        }
      } else {
        // Pull default branch
        await execFileAsync('git', ['pull', '--ff-only'], { cwd: targetDir });
      }

      const commitSha = await getGitCommitSha(targetDir);
      return { commitSha, isNewClone: false };
    } catch {
      // If update fails, re-clone from scratch
      await rm(targetDir, { recursive: true, force: true });
    }
  }

  // Fresh clone
  await mkdir(targetDir, { recursive: true });

  const cloneArgs = ['clone', '--depth', '1'];
  if (ref) {
    cloneArgs.push('-b', ref);
  }
  cloneArgs.push(repoUrl, targetDir);

  try {
    await execFileAsync('git', cloneArgs);
  } catch (err: any) {
    // If shallow clone with branch failed (e.g. ref is a full commit SHA or tag not supported in shallow), retry full clone
    if (ref) {
      await rm(targetDir, { recursive: true, force: true });
      await mkdir(targetDir, { recursive: true });
      await execFileAsync('git', ['clone', repoUrl, targetDir]);
      await execFileAsync('git', ['checkout', ref], { cwd: targetDir });
    } else {
      throw new Error(`Failed to clone git repository (${repoUrl}): ${err?.message || err}`);
    }
  }

  const commitSha = await getGitCommitSha(targetDir);
  return { commitSha, isNewClone: true };
}
