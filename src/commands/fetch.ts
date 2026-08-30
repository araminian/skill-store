import { resolve } from 'path';
import { existsSync } from 'fs';
import { parseSource } from '../source-parser.js';
import { cloneOrUpdateRepo } from '../git.js';
import { scanForSkills } from '../skill-scanner.js';
import { resolveStoreDir, ensureStoreLayout, getSourceCachePath, copySkillToStore } from '../store.js';
import { registerSkill } from '../registry.js';
import { promptSelectSkills } from '../ui/prompts.js';
import { colors } from '../ui/colors.js';
import { runLink } from './link.js';
import type { SkillRecord, SourceProvenance } from '../types.js';

export interface FetchOptions {
  skill?: string;
  all?: boolean;
  link?: boolean;
  global?: boolean;
  agent?: string;
  storeDir?: string;
}

export async function runFetch(sourceInput: string, options: FetchOptions = {}): Promise<SkillRecord[]> {
  const storeDir = resolveStoreDir(options.storeDir);
  await ensureStoreLayout(storeDir);

  const parsed = parseSource(sourceInput);
  let scannedDir = '';
  let commitSha: string | undefined;

  console.log(colors.info(`Fetching source: ${colors.highlight(parsed.raw)}`));

  if (parsed.type === 'local') {
    if (!existsSync(parsed.url)) {
      throw new Error(`Local path not found: ${parsed.url}`);
    }
    scannedDir = parsed.url;
  } else {
    const sourceKey = parsed.ownerRepo || parsed.url;
    const cacheDir = getSourceCachePath(storeDir, sourceKey);
    console.log(colors.dim(`  Cloning/updating repository in source cache...`));
    const result = await cloneOrUpdateRepo(parsed.url, cacheDir, parsed.ref);
    commitSha = result.commitSha;
    scannedDir = parsed.subpath ? resolve(cacheDir, parsed.subpath) : cacheDir;
  }

  if (!existsSync(scannedDir)) {
    throw new Error(`Target directory does not exist: ${scannedDir}`);
  }

  console.log(colors.dim(`  Scanning for skills...`));
  const discovered = await scanForSkills(scannedDir);

  if (discovered.length === 0) {
    throw new Error(`No skills (with SKILL.md) found in source: ${sourceInput}`);
  }

  let selectedSkills = discovered;

  // Filter if user specified --skill
  if (options.skill) {
    const filtered = discovered.filter(
      (s) => s.name.toLowerCase() === options.skill?.toLowerCase()
    );
    if (filtered.length === 0) {
      throw new Error(
        `Skill "${options.skill}" not found. Available skills: ${discovered.map((s) => s.name).join(', ')}`
      );
    }
    selectedSkills = filtered;
  } else if (!options.all && discovered.length > 1) {
    const chosenNames = await promptSelectSkills(
      discovered.map((s) => ({ name: s.name, description: s.description }))
    );
    if (chosenNames.length === 0) {
      console.log(colors.warning('No skills selected. Aborting.'));
      return [];
    }
    selectedSkills = discovered.filter((s) => chosenNames.includes(s.name));
  }

  const registered: SkillRecord[] = [];
  const now = new Date().toISOString();

  for (const skill of selectedSkills) {
    console.log(colors.dim(`  Importing "${skill.name}" into store...`));
    await copySkillToStore(storeDir, skill.name, skill.dirPath);

    const provenance: SourceProvenance = {
      type: parsed.type,
      url: parsed.url,
      ownerRepo: parsed.ownerRepo,
      ref: parsed.ref,
      commitSha,
      subpath: parsed.subpath,
      fetchedAt: now,
    };

    const record: SkillRecord = {
      name: skill.name,
      description: skill.description,
      provenance,
      metadata: skill.metadata,
      storePath: skill.name,
      installedAt: now,
      updatedAt: now,
    };

    await registerSkill(storeDir, record);
    registered.push(record);
    console.log(colors.success(`Added ${colors.highlight(skill.name)} to store`));
  }

  // If --link option is provided, immediately link
  if (options.link) {
    for (const rec of registered) {
      await runLink(rec.name, {
        global: options.global,
        agent: options.agent,
        storeDir,
      });
    }
  }

  return registered;
}
