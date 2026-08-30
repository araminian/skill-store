import { resolve } from 'path';
import { existsSync } from 'fs';
import { resolveStoreDir, getSourceCachePath, copySkillToStore } from '../store.js';
import { getSkill, getAllSkills, registerSkill } from '../registry.js';
import { cloneOrUpdateRepo } from '../git.js';
import { scanForSkills } from '../skill-scanner.js';
import { colors } from '../ui/colors.js';
import type { SkillRecord } from '../types.js';

export interface UpdateOptions {
  storeDir?: string;
}

export async function runUpdate(
  skillNameInput?: string,
  options: UpdateOptions = {}
): Promise<SkillRecord[]> {
  const storeDir = resolveStoreDir(options.storeDir);
  const allSkills = await getAllSkills(storeDir);

  if (allSkills.length === 0) {
    console.log(colors.warning('Skill store is empty. Nothing to update.'));
    return [];
  }

  let skillsToUpdate = allSkills;

  if (skillNameInput) {
    const matched = allSkills.filter(
      (s) => s.name.toLowerCase() === skillNameInput.toLowerCase()
    );
    if (matched.length === 0) {
      throw new Error(`Skill "${skillNameInput}" not found in skill-store.`);
    }
    skillsToUpdate = matched;
  }

  console.log(colors.info(`Updating ${skillsToUpdate.length} skill(s) in store...\n`));
  const updatedRecords: SkillRecord[] = [];

  for (const skill of skillsToUpdate) {
    if (skill.provenance.type === 'local') {
      console.log(colors.dim(`  Skipping local skill "${skill.name}" (points to local path).`));
      continue;
    }

    console.log(colors.bold(`  Updating ${colors.highlight(skill.name)}...`));
    const sourceKey = skill.provenance.ownerRepo || skill.provenance.url;
    const cacheDir = getSourceCachePath(storeDir, sourceKey);

    try {
      const gitResult = await cloneOrUpdateRepo(skill.provenance.url, cacheDir, skill.provenance.ref);
      const scannedDir = skill.provenance.subpath ? resolve(cacheDir, skill.provenance.subpath) : cacheDir;

      const discovered = await scanForSkills(scannedDir);
      const updatedSkill = discovered.find((s) => s.name.toLowerCase() === skill.name.toLowerCase()) || discovered[0];

      if (!updatedSkill) {
        console.log(colors.warning(`    Skill "${skill.name}" could not be found in updated source.`));
        continue;
      }

      await copySkillToStore(storeDir, skill.name, updatedSkill.dirPath);

      const updatedRecord: SkillRecord = {
        ...skill,
        description: updatedSkill.description,
        metadata: updatedSkill.metadata,
        provenance: {
          ...skill.provenance,
          commitSha: gitResult.commitSha,
          fetchedAt: new Date().toISOString(),
        },
        updatedAt: new Date().toISOString(),
      };

      await registerSkill(storeDir, updatedRecord);
      updatedRecords.push(updatedRecord);
      console.log(colors.success(`    Updated ${skill.name} (SHA: ${gitResult.commitSha?.slice(0, 7) || 'latest'})`));
    } catch (err: any) {
      console.log(colors.error(`    Failed to update ${skill.name}: ${err?.message || err}`));
    }
  }

  console.log(colors.success(`\nCompleted updates. All symlinked projects are up to date.`));
  return updatedRecords;
}
