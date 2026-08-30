import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { existsSync } from 'fs';
import {
  loadProjectManifest,
  saveProjectManifest,
  addSkillToManifest,
  removeSkillFromManifest,
} from '../src/project-manifest.ts';

describe('Project Manifest Manager (skill-store.json)', () => {
  let projectDir: string;

  beforeEach(async () => {
    projectDir = await mkdtemp(join(tmpdir(), 'skill-proj-manifest-'));
  });

  afterEach(async () => {
    await rm(projectDir, { recursive: true, force: true });
  });

  it('adds and removes skills in skill-store.json', async () => {
    expect(await loadProjectManifest(projectDir)).toBeNull();

    await addSkillToManifest(projectDir, 'react-doctor', {
      source: 'vercel-labs/agent-skills',
      subpath: 'skills/react-doctor',
      agents: ['claude-code'],
      mode: 'symlink',
    });

    const manifest = await loadProjectManifest(projectDir);
    expect(manifest).not.toBeNull();
    expect(manifest?.skills['react-doctor']).toBeDefined();
    expect(manifest?.skills['react-doctor']?.source).toBe('vercel-labs/agent-skills');

    const removed = await removeSkillFromManifest(projectDir, 'react-doctor');
    expect(removed).toBe(true);

    const updated = await loadProjectManifest(projectDir);
    expect(updated?.skills['react-doctor']).toBeUndefined();
  });
});
