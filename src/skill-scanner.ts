import { readdir, readFile, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname, basename } from 'path';
import { parse as parseYaml } from 'yaml';
import type { DiscoveredSkill } from './types.js';
import { SKILL_MD_FILENAME } from './constants.js';

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  '.github',
  'dist',
  'build',
  '.skill-store',
  'coverage',
  '.next',
]);

export interface FrontmatterResult {
  data: Record<string, unknown>;
  content: string;
}

export function parseFrontmatter(fileContent: string): FrontmatterResult {
  const trimmed = fileContent.trimStart();
  if (!trimmed.startsWith('---')) {
    return { data: {}, content: fileContent };
  }

  const lines = trimmed.split('\n');
  if (lines[0]?.trim() !== '---') {
    return { data: {}, content: fileContent };
  }

  let closingIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i]?.trim() === '---') {
      closingIndex = i;
      break;
    }
  }

  if (closingIndex === -1) {
    return { data: {}, content: fileContent };
  }

  const yamlText = lines.slice(1, closingIndex).join('\n');
  const bodyText = lines.slice(closingIndex + 1).join('\n').trim();

  try {
    const data = (parseYaml(yamlText) as Record<string, unknown>) || {};
    return { data, content: bodyText };
  } catch {
    return { data: {}, content: bodyText };
  }
}

export async function parseSkillDirectory(skillDirPath: string): Promise<DiscoveredSkill | null> {
  const skillMdPath = join(skillDirPath, SKILL_MD_FILENAME);
  if (!existsSync(skillMdPath)) {
    return null;
  }

  try {
    const rawContent = await readFile(skillMdPath, 'utf-8');
    const { data, content } = parseFrontmatter(rawContent);

    const dirName = basename(skillDirPath);
    const name = typeof data.name === 'string' && data.name.trim().length > 0
      ? data.name.trim()
      : dirName;

    let description = typeof data.description === 'string' && data.description.trim().length > 0
      ? data.description.trim()
      : '';

    // If description is missing in frontmatter, extract first non-empty paragraph or heading
    if (!description && content) {
      const firstLine = content.split('\n').map(l => l.trim()).find(l => l.length > 0);
      if (firstLine) {
        description = firstLine.replace(/^#+\s*/, '').slice(0, 150);
      }
    }

    if (!description) {
      description = `Skill ${name}`;
    }

    return {
      name,
      description,
      dirPath: skillDirPath,
      skillMdPath,
      metadata: data,
      rawContent,
    };
  } catch {
    return null;
  }
}

export async function scanForSkills(
  targetDir: string,
  maxDepth = 4,
  currentDepth = 0
): Promise<DiscoveredSkill[]> {
  if (currentDepth > maxDepth || !existsSync(targetDir)) {
    return [];
  }

  const results: DiscoveredSkill[] = [];

  // Check if targetDir itself is a skill
  const selfSkill = await parseSkillDirectory(targetDir);
  if (selfSkill) {
    results.push(selfSkill);
    // If this directory is directly a skill, we typically don't look for nested skills inside it
    return results;
  }

  try {
    const entries = await readdir(targetDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name) || entry.name.startsWith('.')) {
          continue;
        }

        const childDir = join(targetDir, entry.name);
        const subSkills = await scanForSkills(childDir, maxDepth, currentDepth + 1);
        results.push(...subSkills);
      }
    }
  } catch {
    // Ignore permission or read errors
  }

  return results;
}
