import { resolveStoreDir, isSkillInStore } from '../store.js';
import { loadProjectManifest, findProjectRoot } from '../project-manifest.js';
import { runFetch } from './fetch.js';
import { runLink } from './link.js';
import { colors } from '../ui/colors.js';

export interface InstallOptions {
  storeDir?: string;
  projectDir?: string;
}

export async function runInstall(options: InstallOptions = {}): Promise<void> {
  const storeDir = resolveStoreDir(options.storeDir);
  const projectDir = options.projectDir ? options.projectDir : findProjectRoot();
  const manifest = await loadProjectManifest(projectDir);

  if (!manifest || !manifest.skills || Object.keys(manifest.skills).length === 0) {
    console.log(
      colors.warning(`No skills defined in ${projectDir}/skill-store.json to install.`)
    );
    console.log(colors.dim('Use "skill-store link <skill>" to add skills to this project.'));
    return;
  }

  const skillEntries = Object.entries(manifest.skills);
  console.log(
    colors.info(
      `Installing ${skillEntries.length} skill(s) defined in skill-store.json for project: ${colors.highlight(projectDir)}\n`
    )
  );

  for (const [skillName, entry] of skillEntries) {
    console.log(colors.bold(`Processing skill "${skillName}"...`));

    const inStore = await isSkillInStore(storeDir, skillName);
    if (!inStore) {
      if (!entry.source) {
        console.log(
          colors.error(`  Skill "${skillName}" is not in store and has no source URL specified in manifest.`)
        );
        continue;
      }

      console.log(colors.dim(`  Skill not found in store. Fetching from ${entry.source}...`));
      await runFetch(entry.source, {
        skill: skillName,
        all: true,
        storeDir,
      });
    }

    // Link skill into project
    if (entry.agents && entry.agents.length > 0) {
      for (const agent of entry.agents) {
        await runLink(skillName, {
          agent,
          copy: entry.mode === 'copy',
          noSave: true, // already in manifest
          storeDir,
          projectDir,
        });
      }
    } else {
      await runLink(skillName, {
        copy: entry.mode === 'copy',
        noSave: true,
        storeDir,
        projectDir,
      });
    }
  }

  console.log(colors.success(`\nProject skills successfully installed and linked.`));
}
