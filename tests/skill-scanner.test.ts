import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { existsSync } from 'fs';
import {
  parseFrontmatter,
  parseSkillDirectory,
  scanForSkills,
} from '../src/skill-scanner.ts';

describe('Skill Scanner', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'skill-scanner-test-'));
  });

  afterEach(async () => {
    if (existsSync(tempDir)) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('parses YAML frontmatter properly', () => {
    const content = `---
name: test-skill
description: A helpful test skill
tags:
  - testing
  - ai
---

# Test Skill Instructions
Here is how to use it.`;

    const { data, content: body } = parseFrontmatter(content);
    expect(data.name).toBe('test-skill');
    expect(data.description).toBe('A helpful test skill');
    expect(Array.isArray(data.tags)).toBe(true);
    expect(body).toContain('# Test Skill Instructions');
  });

  it('discovers skills in single and multi-skill directory structures', async () => {
    // Structure:
    // tempDir/
    //   skills/
    //     skill-one/SKILL.md
    //     skill-two/SKILL.md
    //   single-skill/SKILL.md

    const skill1Dir = join(tempDir, 'skills', 'skill-one');
    const skill2Dir = join(tempDir, 'skills', 'skill-two');
    const singleDir = join(tempDir, 'single-skill');

    await mkdir(skill1Dir, { recursive: true });
    await mkdir(skill2Dir, { recursive: true });
    await mkdir(singleDir, { recursive: true });

    await writeFile(
      join(skill1Dir, 'SKILL.md'),
      '---\nname: skill-one\ndescription: First skill\n---\nBody 1'
    );
    await writeFile(
      join(skill2Dir, 'SKILL.md'),
      '---\nname: skill-two\ndescription: Second skill\n---\nBody 2'
    );
    await writeFile(
      join(singleDir, 'SKILL.md'),
      '# Single Skill\nThis is a single standalone skill.'
    );

    const skills = await scanForSkills(tempDir);
    expect(skills.length).toBe(3);

    const names = skills.map((s) => s.name).sort();
    expect(names).toEqual(['single-skill', 'skill-one', 'skill-two']);
  });
});
