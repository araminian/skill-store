import { homedir } from 'os';
import { resolveStoreDir } from '../store.js';
import { getAllSkills, getLinksForSkill, getLinksForProject, getGlobalLinks } from '../registry.js';
import { findProjectRoot } from '../project-manifest.js';
import { renderTable } from '../ui/table.js';
import { colors } from '../ui/colors.js';

export interface ListOptions {
  project?: boolean;
  global?: boolean;
  storeDir?: string;
  projectDir?: string;
}

export async function runList(options: ListOptions = {}): Promise<void> {
  const storeDir = resolveStoreDir(options.storeDir);
  const isGlobal = Boolean(options.global);
  const isProject = Boolean(options.project);
  const projectDir = options.projectDir ? options.projectDir : findProjectRoot();

  if (isProject) {
    const links = await getLinksForProject(storeDir, projectDir);
    console.log(colors.bold(`\nSkills linked in project: ${colors.highlight(projectDir)}\n`));

    if (links.length === 0) {
      console.log(colors.dim('  No skills linked in this project yet.'));
      console.log(colors.dim('  Run "skill-store link <skill-name>" to link a skill.\n'));
      return;
    }

    const table = renderTable(links, [
      { header: 'Skill', render: (l) => colors.accent(l.skillName), minWidth: 20 },
      { header: 'Agent', render: (l) => colors.magenta(l.agent), minWidth: 15 },
      { header: 'Mode', render: (l) => colors.dim(l.mode), minWidth: 10 },
      { header: 'Symlink Path', render: (l) => colors.dim(l.symlinkPath) },
    ]);

    console.log(table);
    console.log();
    return;
  }

  if (isGlobal) {
    const links = await getGlobalLinks(storeDir);
    console.log(colors.bold(`\nGlobally linked skills (${homedir()}):\n`));

    if (links.length === 0) {
      console.log(colors.dim('  No global skills linked yet.'));
      console.log(colors.dim('  Run "skill-store link <skill-name> --global" to mark a skill global.\n'));
      return;
    }

    const table = renderTable(links, [
      { header: 'Skill', render: (l) => colors.accent(l.skillName), minWidth: 20 },
      { header: 'Agent', render: (l) => colors.magenta(l.agent), minWidth: 15 },
      { header: 'Symlink Path', render: (l) => colors.dim(l.symlinkPath) },
    ]);

    console.log(table);
    console.log();
    return;
  }

  // List all skills in central store
  const allSkills = await getAllSkills(storeDir);
  console.log(colors.bold(`\nSkill Store (${colors.highlight(storeDir)}):\n`));

  if (allSkills.length === 0) {
    console.log(colors.dim('  No skills in store yet.'));
    console.log(colors.dim('  Run "skill-store fetch <source>" to download skills.\n'));
    return;
  }

  // Pre-fetch link counts
  const items = await Promise.all(
    allSkills.map(async (skill) => {
      const links = await getLinksForSkill(storeDir, skill.name);
      const projectCount = links.filter((l) => l.targetType === 'project').length;
      const globalCount = links.filter((l) => l.targetType === 'global').length;

      let linkStatus = '';
      if (projectCount > 0 && globalCount > 0) {
        linkStatus = `${projectCount} proj, ${globalCount} global`;
      } else if (projectCount > 0) {
        linkStatus = `${projectCount} proj`;
      } else if (globalCount > 0) {
        linkStatus = `${globalCount} global`;
      } else {
        linkStatus = 'unlinked';
      }

      return {
        skill,
        linkStatus,
        source: skill.provenance.ownerRepo || skill.provenance.url,
      };
    })
  );

  const table = renderTable(items, [
    { header: 'Skill Name', render: (item) => colors.accent(item.skill.name), minWidth: 20 },
    {
      header: 'Description',
      render: (item) => colors.dim(item.skill.description.slice(0, 50)),
      minWidth: 40,
    },
    { header: 'Source', render: (item) => colors.gray(item.source), minWidth: 25 },
    {
      header: 'Active Links',
      render: (item) =>
        item.linkStatus === 'unlinked'
          ? colors.dim(item.linkStatus)
          : colors.green(item.linkStatus),
      minWidth: 15,
    },
  ]);

  console.log(table);
  console.log();
}
