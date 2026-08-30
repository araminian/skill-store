import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { existsSync } from 'fs';
import { runFetch } from '../src/commands/fetch.js';
import { runLink } from '../src/commands/link.js';
import { runUnlink } from '../src/commands/unlink.js';
import { runInfo } from '../src/commands/info.js';
import { runRemove } from '../src/commands/remove.js';
import { runInstall } from '../src/commands/install.js';
import { runDoctor } from '../src/commands/doctor.js';
import { getSkill, getLinksForSkill, getAllSkills } from '../src/registry.js';
import { loadProjectManifest } from '../src/project-manifest.js';
import { isSymlink, isLinkValid } from '../src/linker.js';

describe('Skill Store End-to-End Commands', () => {
  let storeDir: string;
  let projectDir: string;
  let localSourceRepo: string;

  beforeEach(async () => {
    storeDir = await mkdtemp(join(tmpdir(), 'skstore-test-store-'));
    projectDir = await mkdtemp(join(tmpdir(), 'skstore-test-proj-'));
    localSourceRepo = await mkdtemp(join(tmpdir(), 'skstore-source-repo-'));

    // Create 2 skills in local source repo
    const skillADir = join(localSourceRepo, 'skills', 'skill-alpha');
    const skillBDir = join(localSourceRepo, 'skills', 'skill-beta');

    await mkdir(skillADir, { recursive: true });
    await mkdir(skillBDir, { recursive: true });

    await writeFile(
      join(skillADir, 'SKILL.md'),
      '---\nname: skill-alpha\ndescription: Alpha Test Skill\n---\n# Alpha Content'
    );

    await writeFile(
      join(skillBDir, 'SKILL.md'),
      '---\nname: skill-beta\ndescription: Beta Test Skill\n---\n# Beta Content'
    );
  });

  afterEach(async () => {
    await rm(storeDir, { recursive: true, force: true });
    await rm(projectDir, { recursive: true, force: true });
    await rm(localSourceRepo, { recursive: true, force: true });
  });

  it('fetches skills from source into store', async () => {
    const fetched = await runFetch(localSourceRepo, {
      all: true,
      storeDir,
    });

    expect(fetched.length).toBe(2);
    const alpha = await getSkill(storeDir, 'skill-alpha');
    const beta = await getSkill(storeDir, 'skill-beta');

    expect(alpha).toBeDefined();
    expect(alpha?.name).toBe('skill-alpha');
    expect(beta).toBeDefined();
    expect(beta?.name).toBe('skill-beta');

    const inStoreAlphaDir = join(storeDir, 'skills', 'skill-alpha');
    expect(existsSync(join(inStoreAlphaDir, 'SKILL.md'))).toBe(true);
  });

  it('links a skill into a project and updates skill-store.json', async () => {
    await runFetch(localSourceRepo, { all: true, storeDir });

    const linkResult = await runLink('skill-alpha', {
      storeDir,
      projectDir,
      agent: 'claude-code',
    });

    expect(linkResult).not.toBeNull();
    const targetLink = join(projectDir, '.claude', 'skills', 'skill-alpha');
    expect(existsSync(targetLink)).toBe(true);
    expect(await isSymlink(targetLink)).toBe(true);

    const valid = await isLinkValid(targetLink);
    expect(valid.isValid).toBe(true);

    // Verify registry tracked link
    const links = await getLinksForSkill(storeDir, 'skill-alpha');
    expect(links.length).toBe(1);
    expect(links[0]?.agent).toBe('claude-code');
    expect(links[0]?.targetDir).toBe(projectDir);

    // Verify project manifest skill-store.json
    const manifest = await loadProjectManifest(projectDir);
    expect(manifest).not.toBeNull();
    expect(manifest?.skills['skill-alpha']).toBeDefined();
  });

  it('unlinks a skill from project and removes from manifest', async () => {
    await runFetch(localSourceRepo, { all: true, storeDir });
    await runLink('skill-alpha', { storeDir, projectDir, agent: 'claude-code' });

    const unlinked = await runUnlink('skill-alpha', { storeDir, projectDir });
    expect(unlinked.length).toBe(1);

    const targetLink = join(projectDir, '.claude', 'skills', 'skill-alpha');
    expect(existsSync(targetLink)).toBe(false);

    const links = await getLinksForSkill(storeDir, 'skill-alpha');
    expect(links.length).toBe(0);

    const manifest = await loadProjectManifest(projectDir);
    expect(manifest?.skills['skill-alpha']).toBeUndefined();
  });

  it('prevents removing a skill from store when actively referenced, and allows --clean-links', async () => {
    await runFetch(localSourceRepo, { all: true, storeDir });
    await runLink('skill-alpha', { storeDir, projectDir, agent: 'claude-code' });

    // Non-interactive removal without --clean-links or --force should fail
    await expect(runRemove('skill-alpha', { storeDir })).rejects.toThrow(
      /active references/i
    );

    // With --clean-links it should remove links and delete from store
    const cleaned = await runRemove('skill-alpha', {
      cleanLinks: true,
      storeDir,
    });

    expect(cleaned).toBe(true);
    expect(await getSkill(storeDir, 'skill-alpha')).toBeUndefined();
    expect(existsSync(join(storeDir, 'skills', 'skill-alpha'))).toBe(false);
    expect(existsSync(join(projectDir, '.claude', 'skills', 'skill-alpha'))).toBe(false);
  });

  it('restores project skills from skill-store.json using install', async () => {
    // 1. Fetch skills into store
    await runFetch(localSourceRepo, { all: true, storeDir });

    // 2. Setup a project with skill-store.json
    await writeFile(
      join(projectDir, 'skill-store.json'),
      JSON.stringify({
        skills: {
          'skill-beta': {
            source: localSourceRepo,
            agents: ['agents'],
            mode: 'symlink',
          },
        },
      })
    );

    // 3. Run install
    await runInstall({ storeDir, projectDir });

    // 4. Verify linked
    const targetLink = join(projectDir, '.agents', 'skills', 'skill-beta');
    expect(existsSync(targetLink)).toBe(true);
    expect(await isSymlink(targetLink)).toBe(true);
  });

  it('runs doctor diagnostics and prunes dead links', async () => {
    await runFetch(localSourceRepo, { all: true, storeDir });
    await runLink('skill-alpha', { storeDir, projectDir, agent: 'claude-code' });

    // Delete project dir to simulate dead reference
    await rm(projectDir, { recursive: true, force: true });

    // Run doctor with prune
    await runDoctor({ prune: true, storeDir });

    const links = await getLinksForSkill(storeDir, 'skill-alpha');
    expect(links.length).toBe(0);
  });
});
