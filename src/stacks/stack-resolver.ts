import type { StackDefinition, StackSkillItem } from '../types.js';
import { promptSelect, isInteractive } from '../ui/prompts.js';
import { colors } from '../ui/colors.js';

function normalizeSkill(item: string | StackSkillItem): StackSkillItem {
  if (typeof item === 'string') {
    return { name: item };
  }
  return item;
}

export function resolveStackInheritance(
  stack: StackDefinition,
  allStacks: Record<string, StackDefinition>,
  visitedChain: string[] = []
): StackDefinition {
  const currentKey = stack.id.toLowerCase();

  if (visitedChain.includes(currentKey)) {
    throw new Error(
      `Circular stack inheritance detected: ${[...visitedChain, currentKey].join(' -> ')}`
    );
  }

  if (visitedChain.length > 10) {
    throw new Error(`Maximum stack inheritance depth exceeded for stack: ${stack.id}`);
  }

  if (!stack.extends) {
    return { ...stack };
  }

  const parentKey = stack.extends.toLowerCase().trim();
  const parentStack = allStacks[parentKey];

  if (!parentStack) {
    console.log(
      colors.warning(
        `Warning: Parent stack "${stack.extends}" not found for "${stack.id}". Using child skills only.`
      )
    );
    return { ...stack };
  }

  // Recursively resolve parent's ancestors
  const resolvedParent = resolveStackInheritance(parentStack, allStacks, [...visitedChain, currentKey]);

  // Merge parent skills and child skills (child overrides parent with same name)
  const skillsMap = new Map<string, StackSkillItem>();

  for (const pSkill of resolvedParent.skills) {
    const norm = normalizeSkill(pSkill);
    skillsMap.set(norm.name.toLowerCase(), norm);
  }

  for (const cSkill of stack.skills) {
    const norm = normalizeSkill(cSkill);
    skillsMap.set(norm.name.toLowerCase(), norm);
  }

  return {
    ...resolvedParent,
    ...stack,
    tags: Array.from(new Set([...(resolvedParent.tags || []), ...(stack.tags || [])])),
    skills: Array.from(skillsMap.values()),
  };
}

export async function resolveStackIdentifier(
  input: string,
  allStacks: Record<string, StackDefinition>
): Promise<StackDefinition | null> {
  const normalized = input.toLowerCase().trim();

  // 1. Exact match on Canonical ID (e.g. "frontend/nextjs")
  if (allStacks[normalized]) {
    return resolveStackInheritance(allStacks[normalized]!, allStacks);
  }

  // 2. Search by short name or prefix (e.g. "nextjs")
  const matches = Object.values(allStacks).filter((s) => {
    const shortName = s.id.includes('/') ? s.id.split('/').pop()! : s.id;
    return (
      shortName.toLowerCase() === normalized ||
      s.name.toLowerCase() === normalized ||
      s.id.toLowerCase() === normalized
    );
  });

  if (matches.length === 1) {
    return resolveStackInheritance(matches[0]!, allStacks);
  }

  if (matches.length > 1) {
    console.log();
    console.log(colors.warning(`Multiple stacks matched "${input}":`));

    if (!isInteractive()) {
      const ids = matches.map((m) => m.id).join(', ');
      throw new Error(`Ambiguous stack name "${input}". Please specify the full canonical ID: ${ids}`);
    }

    const chosenId = await promptSelect(
      'Select which stack you want to use:',
      matches.map((m) => ({
        value: m.id,
        label: `${m.id} (${m.name})`,
        hint: m.description.slice(0, 50),
      }))
    );

    if (!chosenId) return null;
    return resolveStackInheritance(allStacks[chosenId.toLowerCase()]!, allStacks);
  }

  return null;
}
