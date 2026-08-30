import { homedir } from 'os';
import { resolveStoreDir } from '../store.js';
import { getLinksForProject, getGlobalLinks, removeLink, getLinksForSkill } from '../registry.js';
import { removeSkillLink } from '../linker.js';
import { removeSkillFromManifest, findProjectRoot } from '../project-manifest.js';
import { colors } from '../ui/colors.js';
import type { SkillLinkReference } from '../types.js';

export interface UnlinkOptions {
  global?: boolean;
  agent?: string;
  all?: boolean;
  storeDir?: string;
  projectDir?: string;
}

export async function runUnlink(
  skillNameInput?: string,
  options: UnlinkOptions = {}
): Promise<SkillLinkReference[]> {
  const storeDir = resolveStoreDir(options.storeDir);
  const isGlobal = Boolean(options.global);
  const projectDir = options.projectDir ? options.projectDir : findProjectRoot();
  const targetDir = isGlobal ? homedir() : projectDir;

  const links = isGlobal
    ? await getGlobalLinks(storeDir)
    : await getLinksForProject(storeDir, targetDir);

  if (links.length === 0) {
    console.log(
      colors.info(
        isGlobal
          ? 'No global skill links found.'
          : `No skill links found in project (${projectDir}).`
      )
    );
    return [];
  }

  let matchedLinks = links;

  if (skillNameInput) {
    matchedLinks = matchedLinks.filter(
      (l) => l.skillName.toLowerCase() === skillNameInput.toLowerCase()
    );
    if (matchedLinks.length === 0) {
      console.log(
        colors.warning(
          `Skill "${skillNameInput}" is not linked in this ${isGlobal ? 'global environment' : 'project'}.`
        )
      );
      return [];
    }
  } else if (!options.all) {
    throw new Error('Please specify a skill name to unlink, or pass --all.');
  }

  if (options.agent) {
    matchedLinks = matchedLinks.filter((l) => l.agent.toLowerCase() === options.agent?.toLowerCase());
  }

  const unlinked: SkillLinkReference[] = [];

  for (const link of matchedLinks) {
    await removeSkillLink(link.symlinkPath);
    await removeLink(storeDir, link.symlinkPath);
    unlinked.push(link);
    console.log(
      colors.success(
        `Unlinked ${colors.highlight(link.skillName)} from ${colors.dim(link.symlinkPath)} (${link.agent})`
      )
    );
  }

  if (!isGlobal && skillNameInput) {
    await removeSkillFromManifest(projectDir, skillNameInput);
  }

  return unlinked;
}
