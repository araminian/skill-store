import { resolveStoreDir } from '../store.js';
import { loadGlobalConfig, addRegistrySource, removeRegistrySource, getActiveRegistrySources } from '../config.js';
import { syncRegistries } from '../stacks/registry-fetcher.js';
import { renderTable } from '../ui/table.js';
import { colors } from '../ui/colors.js';

export interface RegistryCommandOptions {
  storeDir?: string;
  projectDir?: string;
}

export async function runRegistryList(options: RegistryCommandOptions = {}): Promise<void> {
  const storeDir = resolveStoreDir(options.storeDir);
  const sources = await getActiveRegistrySources(storeDir, options.projectDir);

  console.log(colors.bold(`\nConfigured Registry Sources (Taps):\n`));

  if (sources.length === 0) {
    console.log(colors.dim('  No active registries configured.'));
    return;
  }

  const table = renderTable(sources, [
    { header: 'Name', render: (s) => colors.accent(colors.bold(s.name)), minWidth: 15 },
    { header: 'Status', render: (s) => (s.enabled ? colors.green('enabled') : colors.dim('disabled')), minWidth: 10 },
    { header: 'Registry URL', render: (s) => colors.dim(s.url) },
  ]);

  console.log(table);
  console.log();
  console.log(colors.dim('  Add custom tap: ') + colors.highlight('skill-store registry add <name> <url>'));
  console.log(colors.dim('  Sync catalogs:  ') + colors.highlight('skill-store stack sync\n'));
}

export async function runRegistryAdd(
  name: string,
  url: string,
  options: RegistryCommandOptions = {}
): Promise<void> {
  const storeDir = resolveStoreDir(options.storeDir);

  if (!name || !url) {
    throw new Error('Usage: skill-store registry add <name> <url>');
  }

  console.log(colors.info(`Adding registry source "${colors.highlight(name)}" -> ${colors.dim(url)}...`));
  await addRegistrySource(storeDir, name, url);

  // Attempt sync immediately
  console.log(colors.dim('  Fetching catalog from new registry source...'));
  const syncRes = await syncRegistries(storeDir, options.projectDir, true);

  if (syncRes.errors.length > 0) {
    console.log(colors.warning(`\nRegistry added, but encountered sync warnings:`));
    for (const err of syncRes.errors) {
      console.log(colors.dim(`  - ${err}`));
    }
  } else {
    console.log(colors.success(`\n✔ Registry "${name}" added and synced (${syncRes.totalStacks} total stacks).`));
  }
}

export async function runRegistryRemove(
  name: string,
  options: RegistryCommandOptions = {}
): Promise<void> {
  const storeDir = resolveStoreDir(options.storeDir);

  if (!name) {
    throw new Error('Usage: skill-store registry remove <name>');
  }

  const removed = await removeRegistrySource(storeDir, name);
  if (removed) {
    console.log(colors.success(`✔ Registry source "${name}" removed.`));
    await syncRegistries(storeDir, options.projectDir, true);
  } else {
    throw new Error(`Registry source "${name}" not found.`);
  }
}
