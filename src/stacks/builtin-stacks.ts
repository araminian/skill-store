import type { StackDefinition } from '../types.js';

export const BUILTIN_STACKS: Record<string, StackDefinition> = {
  'security/audit': {
    id: 'security/audit',
    name: 'Security & Defense Audit',
    category: 'security',
    description: 'Security auditing, Git guardrails, and safe code execution',
    tags: ['security', 'audit', 'git', 'guardrails'],
    origin: 'builtin',
    skills: [
      {
        name: 'git-guardrails-claude-code',
        source: 'mattpocock/skills',
        subpath: 'skills/git-guardrails-claude-code',
        reason: 'Prevents destructive git operations and accidental branch deletions',
      },
    ],
  },
};
