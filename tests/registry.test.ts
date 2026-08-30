import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { existsSync } from 'fs';
import {
  loadRegistry,
  saveRegistry,
  registerSkill,
  unregisterSkill,
  getSkill,
  getAllSkills,
  addLink,
  removeLink,
  getLinksForSkill,
  getLinksForProject,
  getGlobalLinks,
} from '../src/registry.ts';
import {
  ensureStoreLayout,
  getSkillPath,
  isSkillInStore,
  copySkillToStore,
  deleteSkillFromStore,
} from '../src/store.ts';
import type { SkillRecord } from '../src/types.ts';

describe('Registry & Store Management', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'skill-store-test-'));
  });

  afterEach(async () => {
    if (existsSync(tempDir)) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('initializes store directories and empty registry', async () => {
    const layout = await ensureStoreLayout(tempDir);
    expect(existsSync(layout.skillsDir)).toBe(true);
    expect(existsSync(layout.sourcesDir)).toBe(true);

    const registry = await loadRegistry(tempDir);
    expect(registry.version).toBe(1);
    expect(registry.skills).toEqual({});
    expect(registry.links).toEqual([]);
  });

  it('registers and retrieves a skill record', async () => {
    const sampleSkill: SkillRecord = {
      name: 'react-doctor',
      description: 'Audits React components for performance',
      provenance: {
        type: 'github',
        url: 'https://github.com/example/react-doctor',
        ownerRepo: 'example/react-doctor',
        ref: 'main',
        commitSha: 'abcdef123456',
        fetchedAt: new Date().toISOString(),
      },
      storePath: 'react-doctor',
      installedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await registerSkill(tempDir, sampleSkill);

    const fetched = await getSkill(tempDir, 'react-doctor');
    expect(fetched).toBeDefined();
    expect(fetched?.name).toBe('react-doctor');
    expect(fetched?.provenance.ownerRepo).toBe('example/react-doctor');

    const all = await getAllSkills(tempDir);
    expect(all.length).toBe(1);
    expect(all[0]?.name).toBe('react-doctor');

    const unreg = await unregisterSkill(tempDir, 'react-doctor');
    expect(unreg).toBe(true);
    expect(await getSkill(tempDir, 'react-doctor')).toBeUndefined();
  });

  it('tracks project and global links correctly', async () => {
    const link1 = await addLink(tempDir, {
      skillName: 'react-doctor',
      targetType: 'project',
      targetDir: '/Users/test/project-a',
      agent: 'claude-code',
      symlinkPath: '/Users/test/project-a/.claude/skills/react-doctor',
      mode: 'symlink',
    });

    const link2 = await addLink(tempDir, {
      skillName: 'react-doctor',
      targetType: 'project',
      targetDir: '/Users/test/project-b',
      agent: 'agents',
      symlinkPath: '/Users/test/project-b/.agents/skills/react-doctor',
      mode: 'symlink',
    });

    const globalLink = await addLink(tempDir, {
      skillName: 'git-commit-helper',
      targetType: 'global',
      targetDir: '/Users/test',
      agent: 'claude-code',
      symlinkPath: '/Users/test/.claude/skills/git-commit-helper',
      mode: 'symlink',
    });

    expect(link1.id).toBeDefined();
    const skillLinks = await getLinksForSkill(tempDir, 'react-doctor');
    expect(skillLinks.length).toBe(2);

    const projALinks = await getLinksForProject(tempDir, '/Users/test/project-a');
    expect(projALinks.length).toBe(1);
    expect(projALinks[0]?.symlinkPath).toBe('/Users/test/project-a/.claude/skills/react-doctor');

    const globals = await getGlobalLinks(tempDir);
    expect(globals.length).toBe(1);
    expect(globals[0]?.skillName).toBe('git-commit-helper');

    const removed = await removeLink(tempDir, link1.symlinkPath);
    expect(removed).toBe(true);

    const remainingSkillLinks = await getLinksForSkill(tempDir, 'react-doctor');
    expect(remainingSkillLinks.length).toBe(1);
  });
});
