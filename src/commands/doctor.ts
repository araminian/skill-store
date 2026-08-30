import { existsSync } from 'fs';
import { resolveStoreDir, getStoreSkillsDir, getStoreSourcesDir } from '../store.js';
import { loadRegistry, saveRegistry } from '../registry.js';
import { isLinkValid } from '../linker.js';
import { isGitAvailable } from '../git.js';
import { getAllAgentConfigs } from '../agents.js';
import { colors } from '../ui/colors.js';
import type { SkillLinkReference } from '../types.js';

export interface DoctorOptions {
  prune?: boolean;
  storeDir?: string;
}

export async function runDoctor(options: DoctorOptions = {}): Promise<void> {
  const storeDir = resolveStoreDir(options.storeDir);
  console.log(colors.bold(`\nSkill Store Health & Diagnostic Report\n`));

  // 1. Check Store Directory
  console.log(colors.bold('Store Layout:'));
  console.log(`  Store Root:    ${colors.dim(storeDir)} ${existsSync(storeDir) ? colors.green('✔ OK') : colors.yellow('⚠ Missing')}`);
  console.log(`  Skills Dir:    ${colors.dim(getStoreSkillsDir(storeDir))} ${existsSync(getStoreSkillsDir(storeDir)) ? colors.green('✔ OK') : colors.yellow('⚠ Missing')}`);
  console.log(`  Sources Cache: ${colors.dim(getStoreSourcesDir(storeDir))} ${existsSync(getStoreSourcesDir(storeDir)) ? colors.green('✔ OK') : colors.yellow('⚠ Missing')}`);

  // 2. Check Git
  console.log();
  console.log(colors.bold('Environment:'));
  const gitOk = await isGitAvailable();
  console.log(`  Git CLI:       ${gitOk ? colors.green('✔ Available') : colors.red('✖ Not Found (Required for remote repos)')}`);

  // 3. Check Registry & Links
  console.log();
  console.log(colors.bold('Registry & References:'));
  const registry = await loadRegistry(storeDir);
  const skillCount = Object.keys(registry.skills).length;
  console.log(`  Total Skills:  ${colors.highlight(String(skillCount))}`);
  console.log(`  Total Links:   ${colors.highlight(String(registry.links.length))}`);

  const validLinks: SkillLinkReference[] = [];
  const brokenLinks: SkillLinkReference[] = [];

  for (const link of registry.links) {
    const status = await isLinkValid(link.symlinkPath);
    if (status.isValid && status.exists) {
      validLinks.push(link);
    } else {
      brokenLinks.push(link);
    }
  }

  if (brokenLinks.length > 0) {
    console.log();
    console.log(colors.warning(`  Found ${brokenLinks.length} broken or dangling link(s):`));
    for (const broken of brokenLinks) {
      console.log(`    - ${colors.accent(broken.skillName)} (${broken.agent}): ${colors.red(broken.symlinkPath)}`);
    }

    if (options.prune) {
      registry.links = validLinks;
      await saveRegistry(storeDir, registry);
      console.log(colors.success(`\n  ✔ Pruned ${brokenLinks.length} broken link references from registry.`));
    } else {
      console.log(colors.dim(`\n  Tip: Run "skill-store doctor --prune" or "skill-store prune" to clean broken links.`));
    }
  } else {
    console.log(`  Link Health:   ${colors.green('✔ All links valid and pointing to store')}`);
  }

  // 4. Supported Agents
  console.log();
  console.log(colors.bold('Supported AI Agents:'));
  const allAgents = getAllAgentConfigs();
  for (const agent of allAgents) {
    const localExists = agent.detectInstalled(process.cwd());
    const globalExists = agent.detectInstalled();
    const statusText = localExists
      ? colors.green('project detected')
      : globalExists
      ? colors.blue('global detected')
      : colors.dim('not detected');
    console.log(`  - ${colors.bold(agent.displayName.padEnd(22))} (${agent.skillsDir.padEnd(20)}) -> ${statusText}`);
  }

  console.log();
}
