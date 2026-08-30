import type { StackDefinition } from '../types.js';

export const BUILTIN_STACKS: Record<string, StackDefinition> = {
  frontend: {
    name: 'frontend',
    description: 'Frontend development suite: React, UI design, Tailwind, accessibility, and performance',
    origin: 'builtin',
    skills: [
      {
        name: 'react-doctor',
        source: 'vercel-labs/agent-skills',
        subpath: 'skills/react-doctor',
      },
      {
        name: 'frontend-design',
        source: 'vercel-labs/agent-skills',
        subpath: 'skills/frontend-design',
      },
      {
        name: 'accessibility',
        source: 'vercel-labs/agent-skills',
        subpath: 'skills/accessibility',
      },
    ],
  },
  backend: {
    name: 'backend',
    description: 'Backend & API development: API design, databases, error handling, and architecture',
    origin: 'builtin',
    skills: [
      {
        name: 'api-design',
        source: 'vercel-labs/agent-skills',
        subpath: 'skills/api-design',
      },
      {
        name: 'sql-optimizer',
        source: 'vercel-labs/agent-skills',
        subpath: 'skills/sql-optimizer',
      },
    ],
  },
  security: {
    name: 'security',
    description: 'Security & defense: SAST code review, secret scanning, threat modeling, and OWASP audits',
    origin: 'builtin',
    skills: [
      {
        name: 'security-review',
        source: 'vercel-labs/agent-skills',
        subpath: 'skills/security-review',
      },
      {
        name: 'secret-scanner',
        source: 'vercel-labs/agent-skills',
        subpath: 'skills/secret-scanner',
      },
    ],
  },
  devops: {
    name: 'devops',
    description: 'DevOps & Cloud infrastructure: Docker, CI/CD pipelines, and cloud configs',
    origin: 'builtin',
    skills: [
      {
        name: 'dockerfile-expert',
        source: 'vercel-labs/agent-skills',
        subpath: 'skills/dockerfile-expert',
      },
      {
        name: 'github-actions',
        source: 'vercel-labs/agent-skills',
        subpath: 'skills/github-actions',
      },
    ],
  },
  fullstack: {
    name: 'fullstack',
    description: 'Fullstack web development: complete frontend, backend API, and testing suite',
    origin: 'builtin',
    skills: [
      {
        name: 'react-doctor',
        source: 'vercel-labs/agent-skills',
        subpath: 'skills/react-doctor',
      },
      {
        name: 'api-design',
        source: 'vercel-labs/agent-skills',
        subpath: 'skills/api-design',
      },
      {
        name: 'testing-guru',
        source: 'vercel-labs/agent-skills',
        subpath: 'skills/testing-guru',
      },
    ],
  },
};
