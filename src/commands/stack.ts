import { resolveStoreDir, isSkillInStore } from '../store.js';
import { loadAllStacks, getStack, saveGlobalStack, saveProjectStack, removeGlobalStack, removeProjectStack } from '../stacks/stack-manager.js';
import { getLinksForProject, getGlobalLinks } from '../registry.js';
import { runFetch } from './fetch.js';
import { runLink } from './link.js';
import { runUnlink } from './unlink.js';
import { findProjectRoot, loadProjectManifest } from '../project-manifest.js';
import { renderTable } from '../ui/table.js';
import { colors } from '../ui/colors.js';
import { promptSelect } from '../ui/prompts.js';
import type { StackDefinition, StackSkillItem } from '../types.js';

export interface StackCommandOptions {
  global?: boolean;
  agent?: string;
  copy?: boolean;
  skills?: string;
  description?: string;
  storeDir?: string;
  projectDir?: string;
}

function normalizeSkillItem(item: string | StackSkillItem): StackSkillItem {
  if (typeof item === 'string') {
    return { name: item };
  }
  return item;
}

export async function runStackList(options: StackCommandOptions = {}): Promise<void> {
  const storeDir = resolveStoreDir(options.storeDir);
  const projectDir = options.projectDir || findProjectRoot();
  const allStacks = await loadAllStacks(storeDir, projectDir);
  const stackList = Object.values(allStacks);

  console.log(colors.bold(`\nAvailable Skill Stacks (Presets):\n`));

  if (stackList.length === 0) {
    console.log(colors.dim('  No stacks found.'));
    return;
  }

  const table = renderTable(stackList, [
    {
      header: 'Stack Name',
      render: (s) => colors.accent(colors.bold(s.name)),
      minWidth: 18,
    },
    {
      header: 'Origin',
      render: (s) => {
        if (s.origin === 'project') return colors.blue('[project]');
        if (s.origin === 'global') return colors.magenta('[global]');
        return colors.green('[built-in]');
      },
      minWidth: 12,
    },
    {
      header: 'Skills',
      render: (s) => colors.yellow(`${s.skills.length} skills`),
      minWidth: 10,
    },
    {
      header: 'Description',
      render: (s) => colors.dim(s.description.slice(0, 55)),
      minWidth: 40,
    },
  ]);

  console.log(table);
  console.log();
  console.log(colors.dim('  Apply a stack: ') + colors.highlight('skill-store stack use <stack-name>'));
  console.log(colors.dim('  Show details:  ') + colors.highlight('skill-store stack show <stack-name>\n'));
}

export async function runStackShow(stackNameInput?: string, options: StackCommandOptions = {}): Promise<void> {
  const storeDir = resolveStoreDir(options.storeDir);
  const projectDir = options.projectDir || findProjectRoot();
  const allStacks = await loadAllStacks(storeDir, projectDir);

  let stackName = stackNameInput;
  if (!stackName) {
    const chosen = await promptSelect(
      'Select a stack to inspect:',
      Object.values(allStacks).map((s) => ({
        value: s.name,
        label: `${s.name} (${s.origin || 'builtin'})`,
        hint: s.description.slice(0, 50),
      }))
    );
    if (!chosen) return;
    stackName = chosen;
  }

  const stack = await getStack(stackName, storeDir, projectDir);
  if (!stack) {
    throw new Error(`Stack "${stackName}" not found. Run "skill-store stack list" to see available stacks.`);
  }

  const isGlobal = Boolean(options.global);
  const activeLinks = isGlobal
    ? await getGlobalLinks(storeDir)
    : await getLinksForProject(storeDir, projectDir);

  const activeSkillNames = new Set(activeLinks.map((l) => l.skillName.toLowerCase()));

  console.log();
  console.log(colors.bold(`Stack: ${colors.highlight(stack.name)}`));
  console.log(colors.dim('─'.repeat(50)));
  console.log(`${colors.bold('Origin:')}      ${stack.origin || 'builtin'}`);
  console.log(`${colors.bold('Description:')} ${stack.description}`);
  console.log();
  console.log(colors.bold(`Skills (${stack.skills.length}):`));

  for (const item of stack.skills) {
    const norm = normalizeSkillItem(item);
    const isInstalled = await isSkillInStore(storeDir, norm.name);
    const isLinked = activeSkillNames.has(norm.name.toLowerCase());

    const statusBadges = [];
    if (isLinked) {
      statusBadges.push(colors.green('✔ linked'));
    } else if (isInstalled) {
      statusBadges.push(colors.blue('in store'));
    } else {
      statusBadges.push(colors.yellow('needs download'));
    }

    const sourceHint = norm.source ? colors.dim(`(${norm.source})`) : '';
    console.log(`  - ${colors.accent(colors.bold(norm.name.padEnd(20)))} ${statusBadges.join(' ')} ${sourceHint}`);
  }
  console.log();
}

export async function runStackUse(stackNameInput?: string, options: StackCommandOptions = {}): Promise<void> {
  const storeDir = resolveStoreDir(options.storeDir);
  const projectDir = options.projectDir || findProjectRoot();
  const allStacks = await loadAllStacks(storeDir, projectDir);

  let stackName = stackNameInput;
  if (!stackName) {
    const chosen = await promptSelect(
      'Select a stack to apply:',
      Object.values(allStacks).map((s) => ({
        value: s.name,
        label: `${s.name} (${s.origin || 'builtin'})`,
        hint: s.description.slice(0, 50),
      }))
    );
    if (!chosen) return;
    stackName = chosen;
  }

  const stack = await getStack(stackName, storeDir, projectDir);
  if (!stack) {
    throw new Error(`Stack "${stackName}" not found. Run "skill-store stack list" to see available stacks.`);
  }

  console.log(colors.info(`Applying stack "${colors.highlight(stack.name)}" (${stack.skills.length} skills)...\n`));

  for (const item of stack.skills) {
    const norm = normalizeSkillItem(item);
    const inStore = await isSkillInStore(storeDir, norm.name);

    if (!inStore) {
      if (norm.source) {
        console.log(colors.dim(`  Skill "${norm.name}" not in store. Auto-fetching from ${norm.source}...`));
        try {
          await runFetch(norm.source, {
            skill: norm.name,
            all: true,
            storeDir,
          });
        } catch (err: any) {
          console.log(colors.warning(`  Could not auto-fetch "${norm.name}": ${err?.message || err}`));
        }
      } else {
        console.log(colors.warning(`  Skill "${norm.name}" is not in store and has no source URL.`));
      }
    }

    // Link skill
    try {
      await runLink(norm.name, {
        global: options.global,
        agent: options.agent,
        copy: options.copy,
        storeDir,
        projectDir,
      });
    } catch (err: any) {
      console.log(colors.error(`  Failed to link "${norm.name}": ${err?.message || err}`));
    }
  }

  console.log(colors.success(`\n✔ Stack "${stack.name}" applied successfully!`));
}

export async function runStackSave(stackName: string, options: StackCommandOptions = {}): Promise<void> {
  const storeDir = resolveStoreDir(options.storeDir);
  const projectDir = options.projectDir || findProjectRoot();
  const isGlobal = Boolean(options.global);

  let skillNames: string[] = [];

  if (options.skills) {
    skillNames = options.skills.split(',').map((s) => s.trim()).filter(Boolean);
  } else {
    // Capture currently linked skills
    const links = isGlobal
      ? await getGlobalLinks(storeDir)
      : await getLinksForProject(storeDir, projectDir);

    skillNames = Array.from(new Set(links.map((l) => l.skillName)));
  }

  if (skillNames.length === 0) {
    throw new Error('No skills to save into stack. Link some skills first or pass --skills a,b,c.');
  }

  const stack: StackDefinition = {
    name: stackName,
    description: options.description || `Custom ${isGlobal ? 'global' : 'project'} stack with ${skillNames.length} skills`,
    skills: skillNames,
    origin: isGlobal ? 'global' : 'project',
  };

  if (isGlobal) {
    await saveGlobalStack(storeDir, stack);
    console.log(colors.success(`Saved global stack "${colors.highlight(stackName)}" to ~/.skill-store/stacks.json`));
  } else {
    await saveProjectStack(projectDir, stack);
    console.log(colors.success(`Saved project stack "${colors.highlight(stackName)}" to skill-store.json`));
  }
}

export async function runStackUnlink(stackName: string, options: StackCommandOptions = {}): Promise<void> {
  const storeDir = resolveStoreDir(options.storeDir);
  const projectDir = options.projectDir || findProjectRoot();
  const stack = await getStack(stackName, storeDir, projectDir);

  if (!stack) {
    throw new Error(`Stack "${stackName}" not found.`);
  }

  console.log(colors.info(`Unlinking skills from stack "${colors.highlight(stack.name)}"...`));

  for (const item of stack.skills) {
    const norm = normalizeSkillItem(item);
    try {
      await runUnlink(norm.name, {
        global: options.global,
        agent: options.agent,
        storeDir,
        projectDir,
      });
    } catch {
      // Continue unlinking remaining
    }
  }

  console.log(colors.success(`\n✔ Unlinked all active skills from stack "${stack.name}".`));
}

export async function runStackRemove(stackName: string, options: StackCommandOptions = {}): Promise<void> {
  const storeDir = resolveStoreDir(options.storeDir);
  const projectDir = options.projectDir || findProjectRoot();
  const isGlobal = Boolean(options.global);

  let removed = false;
  if (isGlobal) {
    removed = await removeGlobalStack(storeDir, stackName);
  } else {
    removed = await removeProjectStack(projectDir, stackName);
    if (!removed) {
      // Try global as fallback
      removed = await removeGlobalStack(storeDir, stackName);
    }
  }

  if (removed) {
    console.log(colors.success(`Removed stack "${colors.highlight(stackName)}".`));
  } else {
    throw new Error(`Custom stack "${stackName}" not found (built-in stacks cannot be removed).`);
  }
}
