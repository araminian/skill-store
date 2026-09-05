import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { existsSync } from 'fs';
import {
  resolveStackInheritance,
  resolveStackIdentifier,
} from '../src/stacks/stack-resolver.js';
import {
  loadAllStacks,
  getStack,
  saveGlobalStack,
  saveProjectStack,
} from '../src/stacks/stack-manager.js';
import {
  loadGlobalConfig,
  addRegistrySource,
  removeRegistrySource,
} from '../src/config.js';
import {
  syncRegistries,
  getCachedCommunityStacks,
} from '../src/stacks/registry-fetcher.js';
import { runStackUse, runStackSave, runStackUnlink } from '../src/commands/stack.js';
import { copySkillToStore } from '../src/store.js';
import { registerSkill, getLinksForSkill } from '../src/registry.js';
import { isSymlink } from '../src/linker.js';
import type { StackDefinition } from '../src/types.js';

describe('Hierarchical Registry & Stack Inheritance', () => {
  let storeDir: string;
  let projectDir: string;

  beforeEach(async () => {
    storeDir = await mkdtemp(join(tmpdir(), 'skstore-hier-store-'));
    projectDir = await mkdtemp(join(tmpdir(), 'skstore-hier-proj-'));
  });

  afterEach(async () => {
    await rm(storeDir, { recursive: true, force: true });
    await rm(projectDir, { recursive: true, force: true });
  });

  it('correctly resolves stack inheritance and merges skills with parent', () => {
    const mockStacks: Record<string, StackDefinition> = {
      'frontend/react': {
        id: 'frontend/react',
        name: 'React Base',
        category: 'frontend',
        description: 'React Base Stack',
        tags: ['react', 'ui'],
        skills: [
          { name: 'react-doctor', source: 'org/repo', subpath: 'skills/react-doctor' },
          { name: 'accessibility', source: 'org/repo', subpath: 'skills/accessibility' },
        ],
      },
      'frontend/nextjs': {
        id: 'frontend/nextjs',
        name: 'Next.js Pro',
        category: 'frontend',
        description: 'Next.js App Router',
        tags: ['nextjs', 'tailwind'],
        extends: 'frontend/react',
        skills: [
          { name: 'tailwind-wizard', source: 'org/repo', subpath: 'skills/tailwind' },
          // Override accessibility skill reason
          { name: 'accessibility', source: 'org/repo', subpath: 'skills/accessibility', reason: 'Next.js a11y' },
        ],
      },
    };

    const resolved = resolveStackInheritance(mockStacks['frontend/nextjs']!, mockStacks);
    expect(resolved.skills.length).toBe(3);

    const skillNames = resolved.skills.map((s) => (typeof s === 'string' ? s : s.name));
    expect(skillNames).toContain('react-doctor');
    expect(skillNames).toContain('accessibility');
    expect(skillNames).toContain('tailwind-wizard');

    // Tags should be merged
    expect(resolved.tags).toEqual(['react', 'ui', 'nextjs', 'tailwind']);
  });

  it('detects and prevents circular inheritance loops', () => {
    const cyclicStacks: Record<string, StackDefinition> = {
      'test/alpha': {
        id: 'test/alpha',
        name: 'Alpha',
        category: 'test',
        description: 'Alpha stack',
        extends: 'test/beta',
        skills: [{ name: 's1' }],
      },
      'test/beta': {
        id: 'test/beta',
        name: 'Beta',
        category: 'test',
        description: 'Beta stack',
        extends: 'test/alpha',
        skills: [{ name: 's2' }],
      },
    };

    expect(() => {
      resolveStackInheritance(cyclicStacks['test/alpha']!, cyclicStacks);
    }).toThrow(/circular stack inheritance/i);
  });

  it('resolves stacks by canonical ID and short name', async () => {
    const mockStacks: Record<string, StackDefinition> = {
      'frontend/nextjs': {
        id: 'frontend/nextjs',
        name: 'Next.js',
        category: 'frontend',
        description: 'Next.js Stack',
        skills: [{ name: 's1' }],
      },
      'backend/fastapi': {
        id: 'backend/fastapi',
        name: 'FastAPI',
        category: 'backend',
        description: 'Python FastAPI',
        skills: [{ name: 's2' }],
      },
    };

    const fullMatch = await resolveStackIdentifier('frontend/nextjs', mockStacks);
    expect(fullMatch?.id).toBe('frontend/nextjs');

    const shortMatch = await resolveStackIdentifier('fastapi', mockStacks);
    expect(shortMatch?.id).toBe('backend/fastapi');
  });

  it('manages custom registry taps and syncs catalog from local tap file', async () => {
    // 1. Create a custom tap file
    const customTapFile = join(projectDir, 'custom-tap.json');
    await writeFile(
      customTapFile,
      JSON.stringify({
        version: 1,
        stacks: [
          {
            id: 'internal/acme-tools',
            name: 'Acme Tools',
            category: 'internal',
            description: 'Company internal skills',
            skills: [{ name: 'acme-deploy', source: 'acme/tools' }],
          },
        ],
      })
    );

    // 2. Add custom registry source
    await addRegistrySource(storeDir, 'acme-tap', `file://${customTapFile}`);
    const config = await loadGlobalConfig(storeDir);
    expect(config.registries.some((r) => r.name === 'acme-tap')).toBe(true);

    // 3. Sync
    const syncRes = await syncRegistries(storeDir, projectDir, true);
    expect(syncRes.totalStacks).toBeGreaterThan(0);

    // 4. Stacks from custom tap should be in all stacks
    const all = await loadAllStacks(storeDir, projectDir);
    expect(all['internal/acme-tools']).toBeDefined();
    expect(all['internal/acme-tools']?.name).toBe('Acme Tools');

    // 5. Remove tap
    await removeRegistrySource(storeDir, 'acme-tap');
    const updatedConfig = await loadGlobalConfig(storeDir);
    expect(updatedConfig.registries.some((r) => r.name === 'acme-tap')).toBe(false);
  });

  it('automatically migrates legacy jsdelivr official registry URL to raw GitHub URL', async () => {
    const legacyConfig = {
      version: 1,
      defaultRegistry: 'https://cdn.jsdelivr.net/gh/araminian/skill-store@main/registry/stacks.json',
      registries: [
        {
          name: 'official',
          url: 'https://cdn.jsdelivr.net/gh/araminian/skill-store@main/registry/stacks.json',
          enabled: true,
        },
      ],
    };
    const configPath = join(storeDir, 'config.json');
    await writeFile(configPath, JSON.stringify(legacyConfig, null, 2), 'utf-8');

    const config = await loadGlobalConfig(storeDir);
    expect(config.defaultRegistry).toBe(
      'https://raw.githubusercontent.com/araminian/skill-store/main/registry/stacks.json'
    );
    expect(config.registries[0]?.url).toBe(
      'https://raw.githubusercontent.com/araminian/skill-store/main/registry/stacks.json'
    );
  });
});
