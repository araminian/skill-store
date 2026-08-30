import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { existsSync } from 'fs';
import {
  loadAllStacks,
  getStack,
  saveGlobalStack,
  saveProjectStack,
  removeGlobalStack,
  removeProjectStack,
} from '../src/stacks/stack-manager.js';
import { runStackShow, runStackUse, runStackSave, runStackUnlink, runStackRemove } from '../src/commands/stack.js';
import { copySkillToStore } from '../src/store.js';
import { getLinksForSkill, registerSkill } from '../src/registry.js';
import { isSymlink } from '../src/linker.js';

describe('Skill Stacks & Presets System', () => {
  let storeDir: string;
  let projectDir: string;

  beforeEach(async () => {
    storeDir = await mkdtemp(join(tmpdir(), 'skstore-stacks-store-'));
    projectDir = await mkdtemp(join(tmpdir(), 'skstore-stacks-proj-'));
  });

  afterEach(async () => {
    await rm(storeDir, { recursive: true, force: true });
    await rm(projectDir, { recursive: true, force: true });
  });

  it('loads built-in stacks out of the box', async () => {
    const all = await loadAllStacks(storeDir, projectDir);
    expect(all['security/audit']).toBeDefined();
    expect(all['security/audit']?.category).toBe('security');
    expect(all['security/audit']?.skills.length).toBeGreaterThan(0);
    expect(all['security/audit']?.origin).toBe('builtin');
  });

  it('saves and loads global and project stacks with proper precedence', async () => {
    // 1. Save global stack
    await saveGlobalStack(storeDir, {
      id: 'custom/my-custom-stack',
      name: 'my-custom-stack',
      category: 'custom',
      description: 'My global stack',
      skills: ['skill-a', 'skill-b'],
      origin: 'global',
    });

    let all = await loadAllStacks(storeDir, projectDir);
    expect(all['custom/my-custom-stack']).toBeDefined();
    expect(all['custom/my-custom-stack']?.origin).toBe('global');

    // 2. Save project stack with same name -> overrides global
    await saveProjectStack(projectDir, {
      id: 'custom/my-custom-stack',
      name: 'my-custom-stack',
      category: 'custom',
      description: 'Project specific override',
      skills: ['skill-a', 'skill-c'],
      origin: 'project',
    });

    all = await loadAllStacks(storeDir, projectDir);
    expect(all['custom/my-custom-stack']?.origin).toBe('project');
    expect(all['custom/my-custom-stack']?.description).toBe('Project specific override');

    // 3. Remove project stack -> reverts to global
    await removeProjectStack(projectDir, 'custom/my-custom-stack');
    all = await loadAllStacks(storeDir, projectDir);
    expect(all['custom/my-custom-stack']?.origin).toBe('global');

    // 4. Remove global stack
    await removeGlobalStack(storeDir, 'custom/my-custom-stack');
    all = await loadAllStacks(storeDir, projectDir);
    expect(all['custom/my-custom-stack']).toBeUndefined();
  });

  it('applies a stack to a project and links all skills', async () => {
    // Populate store with 2 test skills
    const skill1Dir = join(storeDir, 'temp-skill-1');
    const skill2Dir = join(storeDir, 'temp-skill-2');
    await mkdir(skill1Dir, { recursive: true });
    await mkdir(skill2Dir, { recursive: true });
    await writeFile(join(skill1Dir, 'SKILL.md'), '# Skill 1');
    await writeFile(join(skill2Dir, 'SKILL.md'), '# Skill 2');

    await copySkillToStore(storeDir, 'test-skill-1', skill1Dir);
    await copySkillToStore(storeDir, 'test-skill-2', skill2Dir);

    const now = new Date().toISOString();
    await registerSkill(storeDir, {
      name: 'test-skill-1',
      description: 'Skill 1',
      provenance: { type: 'local', url: skill1Dir, fetchedAt: now },
      storePath: 'test-skill-1',
      installedAt: now,
      updatedAt: now,
    });
    await registerSkill(storeDir, {
      name: 'test-skill-2',
      description: 'Skill 2',
      provenance: { type: 'local', url: skill2Dir, fetchedAt: now },
      storePath: 'test-skill-2',
      installedAt: now,
      updatedAt: now,
    });

    // Save a custom stack
    await saveProjectStack(projectDir, {
      id: 'test/test-bundle',
      name: 'test-bundle',
      category: 'test',
      description: 'A test stack',
      skills: ['test-skill-1', 'test-skill-2'],
      origin: 'project',
    });

    // Apply stack
    await runStackUse('test/test-bundle', {
      storeDir,
      projectDir,
      agent: 'claude-code',
    });

    // Verify both skills are linked in project
    const link1 = join(projectDir, '.claude', 'skills', 'test-skill-1');
    const link2 = join(projectDir, '.claude', 'skills', 'test-skill-2');

    expect(existsSync(link1)).toBe(true);
    expect(existsSync(link2)).toBe(true);
    expect(await isSymlink(link1)).toBe(true);
    expect(await isSymlink(link2)).toBe(true);

    const links1 = await getLinksForSkill(storeDir, 'test-skill-1');
    expect(links1.length).toBe(1);

    // Unlink the stack
    await runStackUnlink('test/test-bundle', {
      storeDir,
      projectDir,
      agent: 'claude-code',
    });

    expect(existsSync(link1)).toBe(false);
    expect(existsSync(link2)).toBe(false);
  });

  it('saves active project skills as a new stack using stack save', async () => {
    // Populate and link a skill
    const sDir = join(storeDir, 'temp-skill');
    await mkdir(sDir, { recursive: true });
    await writeFile(join(sDir, 'SKILL.md'), '# Temp Skill');
    await copySkillToStore(storeDir, 'my-tool', sDir);

    await runStackSave('custom/dev-stack', {
      skills: 'my-tool,another-tool',
      description: 'Saved stack',
      storeDir,
      projectDir,
    });

    const stack = await getStack('custom/dev-stack', storeDir, projectDir);
    expect(stack).toBeDefined();
    expect(stack?.skills).toEqual(['my-tool', 'another-tool']);
    expect(stack?.origin).toBe('project');
  });
});
