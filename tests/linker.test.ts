import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { existsSync } from 'fs';
import { createSkillLink, removeSkillLink, isLinkValid, isSymlink } from '../src/linker.ts';
import { copySkillToStore } from '../src/store.ts';

describe('Linker & Symlink Engine', () => {
  let storeDir: string;
  let projectDir: string;
  let sampleSkillDir: string;

  beforeEach(async () => {
    storeDir = await mkdtemp(join(tmpdir(), 'skill-store-test-store-'));
    projectDir = await mkdtemp(join(tmpdir(), 'skill-store-test-proj-'));
    sampleSkillDir = await mkdtemp(join(tmpdir(), 'skill-sample-'));

    await writeFile(join(sampleSkillDir, 'SKILL.md'), '# Sample Skill');
    await copySkillToStore(storeDir, 'sample-skill', sampleSkillDir);
  });

  afterEach(async () => {
    await rm(storeDir, { recursive: true, force: true });
    await rm(projectDir, { recursive: true, force: true });
    await rm(sampleSkillDir, { recursive: true, force: true });
  });

  it('creates and validates a symlink in project agent directory', async () => {
    const targetLinkPath = join(projectDir, '.claude', 'skills', 'sample-skill');

    const result = await createSkillLink(storeDir, 'sample-skill', targetLinkPath, 'symlink');
    expect(result.symlinkPath).toBe(targetLinkPath);
    expect(result.mode).toBe('symlink');

    expect(await isSymlink(targetLinkPath)).toBe(true);

    const validation = await isLinkValid(targetLinkPath);
    expect(validation.isValid).toBe(true);
    expect(validation.exists).toBe(true);
  });

  it('removes symlink cleanly without affecting source', async () => {
    const targetLinkPath = join(projectDir, '.claude', 'skills', 'sample-skill');
    await createSkillLink(storeDir, 'sample-skill', targetLinkPath, 'symlink');

    const removed = await removeSkillLink(targetLinkPath);
    expect(removed).toBe(true);
    expect(existsSync(targetLinkPath)).toBe(false);

    // Store skill still exists
    expect(existsSync(join(storeDir, 'skills', 'sample-skill'))).toBe(true);
  });
});
