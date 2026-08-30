#!/usr/bin/env node

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { runFetch } from './commands/fetch.js';
import { runLink } from './commands/link.js';
import { runUnlink } from './commands/unlink.js';
import { runList } from './commands/list.js';
import { runInfo } from './commands/info.js';
import { runUpdate } from './commands/update.js';
import { runRemove } from './commands/remove.js';
import { runInstall } from './commands/install.js';
import { runDoctor } from './commands/doctor.js';
import {
  runStackList,
  runStackUse,
  runStackShow,
  runStackSave,
  runStackUnlink,
  runStackRemove,
  runStackSync,
} from './commands/stack.js';
import {
  runRegistryList,
  runRegistryAdd,
  runRegistryRemove,
} from './commands/registry.js';
import { colors } from './ui/colors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getVersion(): string {
  try {
    const pkgPath = join(__dirname, '..', 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    return pkg.version || '1.0.0';
  } catch {
    return '1.0.0';
  }
}

function showBanner(): void {
  console.log();
  console.log(colors.accent(colors.bold('  ███████╗██╗  ██╗██╗██╗     ██╗         ███████╗████████╗ ██████╗ ██████╗ ███████╗')));
  console.log(colors.accent(colors.bold('  ██╔════╝██║ ██╔╝██║██║     ██║         ██╔════╝╚══██╔══╝██╔═══██╗██╔══██╗██╔════╝')));
  console.log(colors.accent(colors.bold('  ███████╗█████╔╝ ██║██║     ██║   █████╗███████╗   ██║   ██║   ██║██████╔╝█████╗  ')));
  console.log(colors.accent(colors.bold('  ╚════██║██╔═██╗ ██║██║     ██║   ╚════╝╚════██║   ██║   ██║   ██║██╔══██╗██╔══╝  ')));
  console.log(colors.accent(colors.bold('  ███████║██║  ██╗██║███████╗███████╗    ███████║   ██║   ╚██████╔╝██║  ██║███████╗')));
  console.log(colors.accent(colors.bold('  ╚══════╝╚═╝  ╚═╝╚═╝╚══════╝╚══════╝    ╚══════╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚══════╝')));
  console.log();
  console.log(`  ${colors.bold('Centralized Agent Skills Store & Project Linker')} ${colors.dim(`v${getVersion()}`)}`);
  console.log();
}

function showHelp(): void {
  showBanner();
  console.log(colors.bold('USAGE:'));
  console.log(`  ${colors.accent('skill-store')} ${colors.yellow('<command>')} ${colors.dim('[options]')}\n`);

  console.log(colors.bold('STORE COMMANDS (Manage Central ~/.skill-store):'));
  console.log(`  ${colors.yellow('fetch')} ${colors.dim('<source>')}       Download skills into store (e.g. owner/repo, git URL, ./path)`);
  console.log(`  ${colors.yellow('list')}                List all skills in store with active reference counts`);
  console.log(`  ${colors.yellow('info')} ${colors.dim('<skill>')}        Show skill provenance, files, and referencing projects`);
  console.log(`  ${colors.yellow('update')} ${colors.dim('[skill]')}      Pull latest upstream changes into store`);
  console.log(`  ${colors.yellow('remove')} ${colors.dim('<skill>')}      Safely remove skill from store (with project reference guard)\n`);

  console.log(colors.bold('SKILL STACKS & PRESETS:'));
  console.log(`  ${colors.yellow('stack list')} ${colors.dim('[category]')} List available stacks grouped by category (or filter by category)`);
  console.log(`  ${colors.yellow('stack use')} ${colors.dim('<id-or-name>')}  Auto-fetch missing skills and link all skills in stack`);
  console.log(`  ${colors.yellow('stack show')} ${colors.dim('<id-or-name>')} Inspect stack inheritance, skills, and active link status`);
  console.log(`  ${colors.yellow('stack save')} ${colors.dim('<id>')}         Save linked skills (or --skills a,b) into a reusable stack`);
  console.log(`  ${colors.yellow('stack sync')}           Refresh community stack catalogs from all registry sources`);
  console.log(`  ${colors.yellow('stack unlink')} ${colors.dim('<id>')}       Unlink all skills belonging to a stack`);
  console.log(`  ${colors.yellow('stack remove')} ${colors.dim('<id>')}       Delete a custom stack definition\n`);

  console.log(colors.bold('REGISTRY SOURCES (Taps):'));
  console.log(`  ${colors.yellow('registry list')}        List configured remote/local registry sources`);
  console.log(`  ${colors.yellow('registry add')} ${colors.dim('<n> <u>')}  Add custom community/private registry source`);
  console.log(`  ${colors.yellow('registry remove')} ${colors.dim('<n>')} Remove a registry source\n`);

  console.log(colors.bold('PROJECT & GLOBAL COMMANDS (Link/Unlink):'));
  console.log(`  ${colors.yellow('link')} ${colors.dim('[skill]')}        Link skill from store into current project`);
  console.log(`  ${colors.yellow('link')} ${colors.dim('[skill] --global')} Link skill into global agent directories`);
  console.log(`  ${colors.yellow('unlink')} ${colors.dim('<skill>')}      Unlink skill from project or global agents`);
  console.log(`  ${colors.yellow('install')}             Restore all skills defined in project's skill-store.json\n`);

  console.log(colors.bold('DIAGNOSTICS & CLEANUP:'));
  console.log(`  ${colors.yellow('doctor')}              Validate symlinks, agent directories, and store health`);
  console.log(`  ${colors.yellow('prune')}               Clean up broken symlinks and dead references\n`);

  console.log(colors.bold('OPTIONS:'));
  console.log(`  ${colors.dim('-g, --global')}          Target global agent directories (~/.claude, ~/.agents)`);
  console.log(`  ${colors.dim('-p, --project')}         Target or list current project skills only`);
  console.log(`  ${colors.dim('-a, --agent <name>')}    Target specific agent (e.g. claude-code, cursor, agents, all)`);
  console.log(`  ${colors.dim('-l, --link')}            Automatically link after fetching into store`);
  console.log(`  ${colors.dim('--all')}                 Select all skills without interactive prompts`);
  console.log(`  ${colors.dim('--skill <name>')}        Select specific skill from multi-skill repository`);
  console.log(`  ${colors.dim('--skills <a,b,c>')}      Comma-separated skills when saving a stack`);
  console.log(`  ${colors.dim('--category <cat>')}      Category for stack (e.g. frontend, backend, devops)`);
  console.log(`  ${colors.dim('--extends <parent>')}    Parent stack ID to inherit skills from`);
  console.log(`  ${colors.dim('--sync')}                Sync community catalogs before executing stack command`);
  console.log(`  ${colors.dim('-c, --clean-links')}     Automatically unlink referencing projects on remove`);
  console.log(`  ${colors.dim('-f, --force')}           Force operation ignoring warnings/errors`);
  console.log(`  ${colors.dim('--store-dir <path>')}    Override central store directory path`);
  console.log(`  ${colors.dim('-v, --version')}         Show CLI version`);
  console.log(`  ${colors.dim('-h, --help')}            Show this help text\n`);

  console.log(colors.bold('EXAMPLES:'));
  console.log(`  ${colors.dim('$')} skill-store stack list`);
  console.log(`  ${colors.dim('$')} skill-store stack list frontend`);
  console.log(`  ${colors.dim('$')} skill-store stack use frontend/nextjs`);
  console.log(`  ${colors.dim('$')} skill-store stack save custom/my-stack --skills react-doctor,api-design`);
  console.log(`  ${colors.dim('$')} skill-store registry add team https://raw.githubusercontent.com/org/stacks/main/stacks.json\n`);
}

interface ParsedArgs {
  command: string;
  args: string[];
  flags: {
    global?: boolean;
    project?: boolean;
    agent?: string;
    link?: boolean;
    all?: boolean;
    skill?: string;
    skills?: string;
    category?: string;
    extends?: string;
    description?: string;
    sync?: boolean;
    cleanLinks?: boolean;
    force?: boolean;
    copy?: boolean;
    noSave?: boolean;
    storeDir?: string;
    prune?: boolean;
    help?: boolean;
    version?: boolean;
  };
}

function parseCliArgs(rawArgs: string[]): ParsedArgs {
  const flags: ParsedArgs['flags'] = {};
  const positional: string[] = [];

  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i]!;

    if (arg === '--help' || arg === '-h') {
      flags.help = true;
    } else if (arg === '--version' || arg === '-v') {
      flags.version = true;
    } else if (arg === '--global' || arg === '-g') {
      flags.global = true;
    } else if (arg === '--project' || arg === '-p') {
      flags.project = true;
    } else if (arg === '--all') {
      flags.all = true;
    } else if (arg === '--link' || arg === '-l') {
      flags.link = true;
    } else if (arg === '--sync') {
      flags.sync = true;
    } else if (arg === '--clean-links' || arg === '-c') {
      flags.cleanLinks = true;
    } else if (arg === '--force' || arg === '-f') {
      flags.force = true;
    } else if (arg === '--copy') {
      flags.copy = true;
    } else if (arg === '--no-save') {
      flags.noSave = true;
    } else if (arg === '--prune') {
      flags.prune = true;
    } else if (arg === '--agent' || arg === '-a') {
      flags.agent = rawArgs[++i];
    } else if (arg.startsWith('--agent=')) {
      flags.agent = arg.split('=')[1];
    } else if (arg === '--skill') {
      flags.skill = rawArgs[++i];
    } else if (arg.startsWith('--skill=')) {
      flags.skill = arg.split('=')[1];
    } else if (arg === '--skills') {
      flags.skills = rawArgs[++i];
    } else if (arg.startsWith('--skills=')) {
      flags.skills = arg.split('=')[1];
    } else if (arg === '--category') {
      flags.category = rawArgs[++i];
    } else if (arg.startsWith('--category=')) {
      flags.category = arg.split('=')[1];
    } else if (arg === '--extends') {
      flags.extends = rawArgs[++i];
    } else if (arg.startsWith('--extends=')) {
      flags.extends = arg.split('=')[1];
    } else if (arg === '--description') {
      flags.description = rawArgs[++i];
    } else if (arg.startsWith('--description=')) {
      flags.description = arg.split('=')[1];
    } else if (arg === '--store-dir') {
      flags.storeDir = rawArgs[++i];
    } else if (arg.startsWith('--store-dir=')) {
      flags.storeDir = arg.split('=')[1];
    } else if (!arg.startsWith('-')) {
      positional.push(arg);
    }
  }

  const command = positional[0] || '';
  const args = positional.slice(1);

  return { command, args, flags };
}

export async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const { command, args, flags } = parseCliArgs(argv);

  if (flags.version || command === 'version') {
    console.log(`skill-store v${getVersion()}`);
    return;
  }

  if (flags.help || !command || command === 'help') {
    showHelp();
    return;
  }

  try {
    switch (command.toLowerCase()) {
      case 'fetch':
      case 'add': {
        const source = args[0];
        if (!source) {
          throw new Error('Please provide a source to fetch (e.g. owner/repo, git URL, or local path)');
        }
        await runFetch(source, {
          skill: flags.skill,
          all: flags.all,
          link: flags.link,
          global: flags.global,
          agent: flags.agent,
          storeDir: flags.storeDir,
        });
        break;
      }

      case 'link':
      case 'use': {
        const skillName = args[0];
        await runLink(skillName, {
          global: flags.global,
          agent: flags.agent,
          copy: flags.copy,
          noSave: flags.noSave,
          storeDir: flags.storeDir,
        });
        break;
      }

      case 'unlink': {
        const skillName = args[0];
        await runUnlink(skillName, {
          global: flags.global,
          agent: flags.agent,
          all: flags.all,
          storeDir: flags.storeDir,
        });
        break;
      }

      case 'list':
      case 'ls': {
        await runList({
          project: flags.project,
          global: flags.global,
          storeDir: flags.storeDir,
        });
        break;
      }

      case 'info': {
        const skillName = args[0];
        if (!skillName) {
          throw new Error('Please specify a skill name (e.g. skill-store info <skill-name>)');
        }
        await runInfo(skillName, { storeDir: flags.storeDir });
        break;
      }

      case 'update':
      case 'up': {
        const skillName = args[0];
        await runUpdate(skillName, { storeDir: flags.storeDir });
        break;
      }

      case 'remove':
      case 'rm':
      case 'purge': {
        const skillName = args[0];
        if (!skillName) {
          throw new Error('Please specify a skill name to remove (e.g. skill-store remove <skill-name>)');
        }
        await runRemove(skillName, {
          force: flags.force,
          cleanLinks: flags.cleanLinks,
          storeDir: flags.storeDir,
        });
        break;
      }

      case 'stack':
      case 'stacks': {
        const subCommand = (args[0] || 'list').toLowerCase();
        const stackArg = args[1];

        switch (subCommand) {
          case 'list':
          case 'ls':
            await runStackList(stackArg, {
              global: flags.global,
              category: flags.category,
              sync: flags.sync,
              storeDir: flags.storeDir,
            });
            break;

          case 'sync':
            await runStackSync({ storeDir: flags.storeDir });
            break;

          case 'use':
          case 'apply':
            await runStackUse(stackArg, {
              global: flags.global,
              agent: flags.agent,
              copy: flags.copy,
              sync: flags.sync,
              storeDir: flags.storeDir,
            });
            break;

          case 'show':
          case 'info':
            await runStackShow(stackArg, {
              global: flags.global,
              storeDir: flags.storeDir,
            });
            break;

          case 'save':
          case 'create':
            if (!stackArg) {
              throw new Error('Please specify an ID/name for the stack (e.g. skill-store stack save <id>)');
            }
            await runStackSave(stackArg, {
              global: flags.global,
              skills: flags.skills,
              category: flags.category,
              extends: flags.extends,
              description: flags.description,
              storeDir: flags.storeDir,
            });
            break;

          case 'unlink':
          case 'eject':
            if (!stackArg) {
              throw new Error('Please specify a stack to unlink (e.g. skill-store stack unlink <id>)');
            }
            await runStackUnlink(stackArg, {
              global: flags.global,
              agent: flags.agent,
              storeDir: flags.storeDir,
            });
            break;

          case 'remove':
          case 'rm':
          case 'delete':
            if (!stackArg) {
              throw new Error('Please specify a custom stack to remove (e.g. skill-store stack remove <id>)');
            }
            await runStackRemove(stackArg, {
              global: flags.global,
              storeDir: flags.storeDir,
            });
            break;

          default:
            // Check if subCommand is actually a category for listing (e.g. "skill-store stack frontend")
            // or a stack name to apply
            if (['frontend', 'backend', 'security', 'devops', 'ai', 'quality'].includes(subCommand)) {
              await runStackList(subCommand, {
                global: flags.global,
                sync: flags.sync,
                storeDir: flags.storeDir,
              });
            } else {
              await runStackUse(subCommand, {
                global: flags.global,
                agent: flags.agent,
                copy: flags.copy,
                sync: flags.sync,
                storeDir: flags.storeDir,
              });
            }
            break;
        }
        break;
      }

      case 'registry':
      case 'registries': {
        const subCommand = (args[0] || 'list').toLowerCase();
        const regName = args[1];
        const regUrl = args[2];

        switch (subCommand) {
          case 'list':
          case 'ls':
            await runRegistryList({ storeDir: flags.storeDir });
            break;

          case 'add':
            if (!regName || !regUrl) {
              throw new Error('Usage: skill-store registry add <name> <url>');
            }
            await runRegistryAdd(regName, regUrl, { storeDir: flags.storeDir });
            break;

          case 'remove':
          case 'rm':
            if (!regName) {
              throw new Error('Usage: skill-store registry remove <name>');
            }
            await runRegistryRemove(regName, { storeDir: flags.storeDir });
            break;

          default:
            console.log(colors.error(`Unknown registry command: "${subCommand}"`));
            console.log(colors.dim('Available: skill-store registry [list | add | remove]'));
            process.exit(1);
        }
        break;
      }

      case 'install':
      case 'restore': {
        await runInstall({ storeDir: flags.storeDir });
        break;
      }

      case 'doctor': {
        await runDoctor({
          prune: flags.prune,
          storeDir: flags.storeDir,
        });
        break;
      }

      case 'prune': {
        await runDoctor({
          prune: true,
          storeDir: flags.storeDir,
        });
        break;
      }

      default:
        console.log(colors.error(`Unknown command: "${command}"`));
        console.log(colors.dim('Run "skill-store --help" to see available commands.'));
        process.exit(1);
    }
  } catch (err: any) {
    console.error(colors.error(err?.message || String(err)));
    process.exit(1);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
