import { resolveStoreDir, deleteSkillFromStore } from '../store.js';
import { getSkill, getLinksForSkill, unregisterSkill, removeLinksForSkill } from '../registry.js';
import { removeSkillLink } from '../linker.js';
import { removeSkillFromManifest } from '../project-manifest.js';
import { promptSelect, isInteractive } from '../ui/prompts.js';
import { colors } from '../ui/colors.js';

export interface RemoveOptions {
  force?: boolean;
  cleanLinks?: boolean;
  storeDir?: string;
}

export async function runRemove(
  skillName: string,
  options: RemoveOptions = {}
): Promise<boolean> {
  const storeDir = resolveStoreDir(options.storeDir);
  const skill = await getSkill(storeDir, skillName);

  if (!skill) {
    throw new Error(`Skill "${skillName}" not found in skill-store.`);
  }

  const links = await getLinksForSkill(storeDir, skill.name);

  if (links.length > 0) {
    if (options.cleanLinks) {
      console.log(colors.info(`Cleaning ${links.length} active link(s) before removal...`));
      for (const link of links) {
        await removeSkillLink(link.symlinkPath);
        if (link.targetType === 'project') {
          await removeSkillFromManifest(link.targetDir, skill.name);
        }
      }
      await removeLinksForSkill(storeDir, skill.name);
    } else if (options.force) {
      console.log(
        colors.warning(
          `Force removing "${skill.name}". ${links.length} active project/global symlink(s) may now be broken.`
        )
      );
      await removeLinksForSkill(storeDir, skill.name);
    } else {
      // Safety guard triggered!
      console.log();
      console.log(
        colors.warning(
          `Cannot safely remove "${skill.name}": it is currently linked in ${links.length} location(s):`
        )
      );

      for (const link of links) {
        const typeTag = link.targetType === 'global' ? colors.magenta('[global]') : colors.blue('[project]');
        console.log(`  - ${typeTag} ${link.agent}: ${colors.dim(link.symlinkPath)}`);
      }
      console.log();

      if (!isInteractive()) {
        throw new Error(
          `Skill "${skill.name}" has ${links.length} active references. Run with --clean-links to unlink automatically, or --force to delete anyway.`
        );
      }

      const choice = await promptSelect('How would you like to proceed?', [
        { value: 'cancel', label: '1. Cancel (safe, keep skill in store)' },
        { value: 'clean', label: '2. Unlink from all projects and remove from store' },
        { value: 'force', label: '3. Keep broken symlinks and force remove from store' },
      ]);

      if (!choice || choice === 'cancel') {
        console.log(colors.info('Removal cancelled. No changes made.'));
        return false;
      }

      if (choice === 'clean') {
        console.log(colors.info(`Unlinking from all ${links.length} location(s)...`));
        for (const link of links) {
          await removeSkillLink(link.symlinkPath);
          if (link.targetType === 'project') {
            await removeSkillFromManifest(link.targetDir, skill.name);
          }
        }
        await removeLinksForSkill(storeDir, skill.name);
      } else if (choice === 'force') {
        await removeLinksForSkill(storeDir, skill.name);
      }
    }
  }

  // Delete from store on disk
  await deleteSkillFromStore(storeDir, skill.name);
  // Unregister in registry.json
  await unregisterSkill(storeDir, skill.name);

  console.log(colors.success(`Removed skill ${colors.highlight(skill.name)} from store.`));
  return true;
}
