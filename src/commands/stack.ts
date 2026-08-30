import { resolveStoreDir, isSkillInStore } from '../store.js';
import { loadAllStacks, getStack, saveGlobalStack, saveProjectStack, removeGlobalStack, removeProjectStack } from '../stacks/stack-manager.js';
import { syncRegistries } from '../stacks/registry-fetcher.js';
import { getLinksForProject, getGlobalLinks } from '../registry.js';
import { runFetch } from './fetch.js';
import { runLink } from './link.js';
import { runUnlink } from './unlink.js';
import { findProjectRoot } from '../project-manifest.js';
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
  category?: string;
  extends?: string;
  sync?: boolean;
  storeDir?: string;
  projectDir?: string;
}

function normalizeSkillItem(item: string | StackSkillItem): StackSkillItem {
  if (typeof item === 'string') {
    return { name: item };
  }
  return item;
}

export async function runStackSync(options: StackCommandOptions = {}): Promise<void> {
  const storeDir = resolveStoreDir(options.storeDir);
  const projectDir = options.projectDir || findProjectRoot();

  console.log(colors.info('Syncing community & custom stack registries...\n'));
  const res = await syncRegistries(storeDir, projectDir, true);

  if (res.errors.length > 0) {
    for (const err of res.errors) {
      console.log(colors.warning(`  ⚠ ${err}`));
    }
  }

  console.log(
    colors.success(
      `\n✔ Synced ${res.syncedSources} registry source(s) (${res.totalStacks} available community stacks).`
    )
  );
}

export async function runStackList(
  categoryFilter?: string,
  options: StackCommandOptions = {}
): Promise<void> {
  const storeDir = resolveStoreDir(options.storeDir);
  const projectDir = options.projectDir || findProjectRoot();

  if (options.sync) {
    await runStackSync(options);
  }

  const allStacks = await loadAllStacks(storeDir, projectDir);
  let stackList = Object.values(allStacks);

  // Deduplicate by ID
  const uniqueStacksMap = new Map<string, StackDefinition>();
  for (const s of stackList) {
    uniqueStacksMap.set(s.id.toLowerCase(), s);
  }
  stackList = Array.from(uniqueStacksMap.values());

  const targetCategory = categoryFilter || options.category;
  if (targetCategory) {
    const filterNorm = targetCategory.toLowerCase().trim();
    stackList = stackList.filter((s) => s.category.toLowerCase() === filterNorm);
  }

  console.log(
    colors.bold(
      `\nAvailable Skill Stacks${targetCategory ? ` [Category: ${colors.highlight(targetCategory)}]` : ''}:\n`
    )
  );

  if (stackList.length === 0) {
    console.log(colors.dim(`  No stacks found${targetCategory ? ` in category "${targetCategory}"` : ''}.`));
    console.log(colors.dim('  Run "skill-store stack sync" to refresh community catalogs.\n'));
    return;
  }

  // Group by category
  const categories = Array.from(new Set(stackList.map((s) => s.category))).sort();

  for (const cat of categories) {
    const catStacks = stackList.filter((s) => s.category === cat);
    console.log(colors.bold(colors.underline(`Category: ${cat.toUpperCase()}`)));

    const table = renderTable(catStacks, [
      {
        header: 'ID',
        render: (s) => colors.accent(colors.bold(s.id)),
        minWidth: 20,
      },
      {
        header: 'Origin',
        render: (s) => {
          if (s.origin === 'project') return colors.blue('[project]');
          if (s.origin === 'global') return colors.magenta('[global]');
          if (s.origin === 'community') return colors.green('[community]');
          return colors.dim('[builtin]');
        },
        minWidth: 13,
      },
      {
        header: 'Skills',
        render: (s) => colors.yellow(`${s.skills.length} skills`),
        minWidth: 10,
      },
      {
        header: 'Description',
        render: (s) => colors.dim(s.description.slice(0, 50)),
        minWidth: 35,
      },
    ]);

    console.log(table);
    console.log();
  }

  console.log(colors.dim('  Apply a stack: ') + colors.highlight('skill-store stack use <id-or-name>'));
  console.log(colors.dim('  Show details:  ') + colors.highlight('skill-store stack show <id-or-name>'));
  console.log(colors.dim('  Filter category:') + colors.highlight('skill-store stack list <category>\n'));
}

export async function runStackShow(
  stackIdentifierInput?: string,
  options: StackCommandOptions = {}
): Promise<void> {
  const storeDir = resolveStoreDir(options.storeDir);
  const projectDir = options.projectDir || findProjectRoot();
  const allStacks = await loadAllStacks(storeDir, projectDir);

  let stackIdentifier = stackIdentifierInput;
  if (!stackIdentifier) {
    const chosen = await promptSelect(
      'Select a stack to inspect:',
      Object.values(allStacks).map((s) => ({
        value: s.id,
        label: `${s.id} (${s.name})`,
        hint: `[${s.category}] ${s.description.slice(0, 45)}`,
      }))
    );
    if (!chosen) return;
    stackIdentifier = chosen;
  }

  const stack = await getStack(stackIdentifier, storeDir, projectDir);
  if (!stack) {
    throw new Error(
      `Stack "${stackIdentifier}" not found. Run "skill-store stack list" to view available stacks.`
    );
  }

  const isGlobal = Boolean(options.global);
  const activeLinks = isGlobal
    ? await getGlobalLinks(storeDir)
    : await getLinksForProject(storeDir, projectDir);

  const activeSkillNames = new Set(activeLinks.map((l) => l.skillName.toLowerCase()));

  console.log();
  console.log(colors.bold(`Stack: ${colors.highlight(stack.name)} (${colors.dim(stack.id)})`));
  console.log(colors.dim('─'.repeat(55)));
  console.log(`${colors.bold('Category:')}    ${colors.accent(stack.category)}`);
  console.log(`${colors.bold('Origin:')}      ${stack.origin || 'builtin'}`);
  if (stack.extends) {
    console.log(`${colors.bold('Extends:')}     ${colors.yellow(stack.extends)}`);
  }
  if (stack.tags && stack.tags.length > 0) {
    console.log(`${colors.bold('Tags:')}        ${stack.tags.join(', ')}`);
  }
  console.log(`${colors.bold('Description:')} ${stack.description}`);
  console.log();
  console.log(colors.bold(`Resolved Skills (${stack.skills.length}):`));

  for (const item of stack.skills) {
    const norm = normalizeSkillItem(item);
    const isInstalled = await isSkillInStore(storeDir, norm.name);
    const isLinked = activeSkillNames.has(norm.name.toLowerCase());

    const badges = [];
    if (isLinked) {
      badges.push(colors.green('✔ linked in project'));
    } else if (isInstalled) {
      badges.push(colors.blue('in store'));
    } else {
      badges.push(colors.yellow('needs download'));
    }

    const reason = norm.reason ? colors.dim(`- ${norm.reason}`) : '';
    const sourceHint = norm.source ? colors.gray(`(${norm.source})`) : '';
    console.log(`  • ${colors.accent(colors.bold(norm.name.padEnd(20)))} ${badges.join(' ')} ${sourceHint}`);
    if (reason) {
      console.log(`    ${reason}`);
    }
  }
  console.log();
}

export async function runStackUse(
  stackIdentifierInput?: string,
  options: StackCommandOptions = {}
): Promise<void> {
  const storeDir = resolveStoreDir(options.storeDir);
  const projectDir = options.projectDir || findProjectRoot();

  if (options.sync) {
    await runStackSync(options);
  }

  const allStacks = await loadAllStacks(storeDir, projectDir);

  let stackIdentifier = stackIdentifierInput;
  if (!stackIdentifier) {
    const chosen = await promptSelect(
      'Select a stack to apply:',
      Object.values(allStacks).map((s) => ({
        value: s.id,
        label: `${s.id} (${s.name})`,
        hint: `[${s.category}] ${s.description.slice(0, 45)}`,
      }))
    );
    if (!chosen) return;
    stackIdentifier = chosen;
  }

  const stack = await getStack(stackIdentifier, storeDir, projectDir);
  if (!stack) {
    throw new Error(
      `Stack "${stackIdentifier}" not found. Run "skill-store stack list" to see available stacks.`
    );
  }

  console.log(
    colors.info(
      `Applying stack "${colors.highlight(stack.name)}" (${colors.dim(stack.id)}) with ${stack.skills.length} skills...\n`
    )
  );

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

  console.log(colors.success(`\n✔ Stack "${stack.name}" (${stack.id}) applied successfully!`));
}

export async function runStackSave(
  stackIdOrName: string,
  options: StackCommandOptions = {}
): Promise<void> {
  const storeDir = resolveStoreDir(options.storeDir);
  const projectDir = options.projectDir || findProjectRoot();
  const isGlobal = Boolean(options.global);

  let skillNames: string[] = [];

  if (options.skills) {
    skillNames = options.skills.split(',').map((s) => s.trim()).filter(Boolean);
  } else {
    const links = isGlobal
      ? await getGlobalLinks(storeDir)
      : await getLinksForProject(storeDir, projectDir);

    skillNames = Array.from(new Set(links.map((l) => l.skillName)));
  }

  if (skillNames.length === 0) {
    throw new Error('No skills to save into stack. Link some skills first or pass --skills a,b,c.');
  }

  const category = options.category || (stackIdOrName.includes('/') ? stackIdOrName.split('/')[0]! : 'custom');
  const canonicalId = stackIdOrName.includes('/') ? stackIdOrName : `${category}/${stackIdOrName}`;

  const stack: StackDefinition = {
    id: canonicalId,
    name: stackIdOrName.includes('/') ? stackIdOrName.split('/').slice(1).join('/') : stackIdOrName,
    category,
    description: options.description || `Custom ${isGlobal ? 'global' : 'project'} stack with ${skillNames.length} skills`,
    extends: options.extends,
    skills: skillNames,
    origin: isGlobal ? 'global' : 'project',
  };

  if (isGlobal) {
    await saveGlobalStack(storeDir, stack);
    console.log(colors.success(`Saved global stack "${colors.highlight(canonicalId)}" to ~/.skill-store/stacks.json`));
  } else {
    await saveProjectStack(projectDir, stack);
    console.log(colors.success(`Saved project stack "${colors.highlight(canonicalId)}" to skill-store.json`));
  }
}

export async function runStackUnlink(
  stackIdentifier: string,
  options: StackCommandOptions = {}
): Promise<void> {
  const storeDir = resolveStoreDir(options.storeDir);
  const projectDir = options.projectDir || findProjectRoot();
  const stack = await getStack(stackIdentifier, storeDir, projectDir);

  if (!stack) {
    throw new Error(`Stack "${stackIdentifier}" not found.`);
  }

  console.log(colors.info(`Unlinking skills from stack "${colors.highlight(stack.name)}" (${stack.id})...`));

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

export async function runStackRemove(
  stackIdentifier: string,
  options: StackCommandOptions = {}
): Promise<void> {
  const storeDir = resolveStoreDir(options.storeDir);
  const projectDir = options.projectDir || findProjectRoot();
  const isGlobal = Boolean(options.global);

  let removed = false;
  if (isGlobal) {
    removed = await removeGlobalStack(storeDir, stackIdentifier);
  } else {
    removed = await removeProjectStack(projectDir, stackIdentifier);
    if (!removed) {
      removed = await removeGlobalStack(storeDir, stackIdentifier);
    }
  }

  if (removed) {
    console.log(colors.success(`✔ Removed custom stack "${colors.highlight(stackIdentifier)}".`));
  } else {
    throw new Error(`Custom stack "${stackIdentifier}" not found (community/built-in stacks cannot be removed).`);
  }
}
