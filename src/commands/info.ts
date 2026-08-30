import { existsSync } from 'fs';
import { resolveStoreDir, getSkillPath } from '../store.js';
import { getSkill, getLinksForSkill } from '../registry.js';
import { colors } from '../ui/colors.js';

export interface InfoOptions {
  storeDir?: string;
}

export async function runInfo(skillName: string, options: InfoOptions = {}): Promise<void> {
  const storeDir = resolveStoreDir(options.storeDir);
  const skill = await getSkill(storeDir, skillName);

  if (!skill) {
    throw new Error(`Skill "${skillName}" not found in skill-store.`);
  }

  const skillPath = getSkillPath(storeDir, skill.name);
  const links = await getLinksForSkill(storeDir, skill.name);

  console.log();
  console.log(colors.bold(`Skill: ${colors.highlight(skill.name)}`));
  console.log(colors.dim('─'.repeat(50)));
  console.log(`${colors.bold('Description:')}   ${skill.description}`);
  console.log(`${colors.bold('Store Path:')}    ${colors.dim(skillPath)} (exists: ${existsSync(skillPath) ? 'yes' : 'no'})`);
  console.log(`${colors.bold('Installed:')}     ${new Date(skill.installedAt).toLocaleString()}`);
  console.log(`${colors.bold('Last Updated:')}  ${new Date(skill.updatedAt).toLocaleString()}`);

  console.log();
  console.log(colors.bold('Source Provenance:'));
  console.log(`  ${colors.dim('Type:')}        ${skill.provenance.type}`);
  console.log(`  ${colors.dim('URL:')}         ${skill.provenance.url}`);
  if (skill.provenance.ownerRepo) {
    console.log(`  ${colors.dim('Repo:')}        ${skill.provenance.ownerRepo}`);
  }
  if (skill.provenance.ref) {
    console.log(`  ${colors.dim('Ref/Branch:')}  ${skill.provenance.ref}`);
  }
  if (skill.provenance.commitSha) {
    console.log(`  ${colors.dim('Commit SHA:')}  ${skill.provenance.commitSha}`);
  }
  if (skill.provenance.subpath) {
    console.log(`  ${colors.dim('Subpath:')}     ${skill.provenance.subpath}`);
  }

  console.log();
  console.log(colors.bold(`Active References (${links.length}):`));
  if (links.length === 0) {
    console.log(colors.dim('  Not currently linked to any projects or global agents.'));
  } else {
    for (const link of links) {
      const typeTag = link.targetType === 'global' ? colors.magenta('[global]') : colors.blue('[project]');
      console.log(`  ${typeTag} ${colors.bold(link.agent)}: ${colors.dim(link.symlinkPath)}`);
    }
  }
  console.log();
}
