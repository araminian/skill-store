import { join } from 'path';
import { homedir } from 'os';
import { resolveStoreDir } from '../store.js';
import { getSkill, getAllSkills, addLink } from '../registry.js';
import { detectActiveAgents, getAgentConfig, getAllAgentConfigs } from '../agents.js';
import { createSkillLink } from '../linker.js';
import { addSkillToManifest, findProjectRoot } from '../project-manifest.js';
import { promptSelect } from '../ui/prompts.js';
import { colors } from '../ui/colors.js';
import type { AgentConfig, LinkMode, SkillRecord } from '../types.js';

export interface LinkOptions {
  global?: boolean;
  agent?: string;
  copy?: boolean;
  noSave?: boolean;
  storeDir?: string;
  projectDir?: string;
}

export async function runLink(
  skillNameInput?: string,
  options: LinkOptions = {}
): Promise<{ skill: SkillRecord; linkedPaths: string[] } | null> {
  const storeDir = resolveStoreDir(options.storeDir);
  const allSkills = await getAllSkills(storeDir);

  if (allSkills.length === 0) {
    throw new Error('Skill store is empty. Use "skill-store fetch <source>" to add skills first.');
  }

  let skillName = skillNameInput;

  if (!skillName) {
    const chosen = await promptSelect(
      'Select a skill from the store to link:',
      allSkills.map((s) => ({
        value: s.name,
        label: s.name,
        hint: s.description.slice(0, 60),
      }))
    );
    if (!chosen) {
      console.log(colors.warning('No skill selected.'));
      return null;
    }
    skillName = chosen;
  }

  const skill = await getSkill(storeDir, skillName);
  if (!skill) {
    throw new Error(
      `Skill "${skillName}" is not in the store. Available: ${allSkills.map((s) => s.name).join(', ')}`
    );
  }

  const isGlobal = Boolean(options.global);
  const projectDir = options.projectDir ? options.projectDir : findProjectRoot();
  const targetDir = isGlobal ? homedir() : projectDir;

  let targetAgents: AgentConfig[] = [];

  if (options.agent) {
    if (options.agent === 'all') {
      targetAgents = getAllAgentConfigs();
    } else {
      const cfg = getAgentConfig(options.agent);
      if (!cfg) {
        throw new Error(`Unknown agent: "${options.agent}". Run "skill-store doctor" to see supported agents.`);
      }
      targetAgents = [cfg];
    }
  } else {
    targetAgents = detectActiveAgents(targetDir, isGlobal);
  }

  const mode: LinkMode = options.copy ? 'copy' : 'symlink';
  const linkedPaths: string[] = [];

  for (const agent of targetAgents) {
    const targetPath = isGlobal
      ? join(agent.globalSkillsDir, skill.name)
      : join(targetDir, agent.skillsDir, skill.name);

    const res = await createSkillLink(storeDir, skill.name, targetPath, mode);

    await addLink(storeDir, {
      skillName: skill.name,
      targetType: isGlobal ? 'global' : 'project',
      targetDir,
      agent: agent.name,
      symlinkPath: targetPath,
      mode: res.mode,
    });

    linkedPaths.push(targetPath);
    console.log(
      colors.success(
        `Linked ${colors.highlight(skill.name)} -> ${colors.dim(targetPath)} (${agent.displayName})`
      )
    );
  }

  // Update project manifest (skill-store.json) if linking into project
  if (!isGlobal && !options.noSave) {
    await addSkillToManifest(projectDir, skill.name, {
      source: skill.provenance.ownerRepo || skill.provenance.url,
      ref: skill.provenance.ref,
      subpath: skill.provenance.subpath,
      agents: targetAgents.map((a) => a.name),
      mode,
    });
  }

  return { skill, linkedPaths };
}
