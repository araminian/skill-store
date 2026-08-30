import type { StackDefinition } from '../types.js';

export const BUILTIN_STACKS: Record<string, StackDefinition> = {
  'frontend/react': {
    id: 'frontend/react',
    name: 'React Baseline',
    category: 'frontend',
    description: 'Core React suite: performance audit, anti-pattern detection, and accessibility',
    tags: ['react', 'ui', 'accessibility'],
    origin: 'builtin',
    skills: [
      {
        name: 'react-doctor',
        source: 'vercel-labs/agent-skills',
        subpath: 'skills/react-doctor',
        reason: 'Audits React components for performance and re-render issues',
      },
      {
        name: 'accessibility',
        source: 'vercel-labs/agent-skills',
        subpath: 'skills/accessibility',
        reason: 'WCAG accessibility guidelines and keyboard navigation',
      },
    ],
  },
  'frontend/nextjs': {
    id: 'frontend/nextjs',
    name: 'Next.js Pro Suite',
    category: 'frontend',
    description: 'Complete Next.js App Router, React 19, Tailwind CSS, and UI design suite',
    tags: ['nextjs', 'react', 'tailwind', 'ui'],
    extends: 'frontend/react',
    origin: 'builtin',
    skills: [
      {
        name: 'frontend-design',
        source: 'vercel-labs/agent-skills',
        subpath: 'skills/frontend-design',
        reason: 'Modern UI design principles, layout hierarchy, and micro-interactions',
      },
      {
        name: 'tailwind-wizard',
        source: 'vercel-labs/agent-skills',
        subpath: 'skills/tailwind',
        reason: 'Tailwind CSS v4 optimization and responsive utilities',
      },
    ],
  },
  'backend/node-api': {
    id: 'backend/node-api',
    name: 'Node.js REST & GraphQL',
    category: 'backend',
    description: 'Backend API development with robust schema design and error handling',
    tags: ['nodejs', 'api', 'rest', 'graphql'],
    origin: 'builtin',
    skills: [
      {
        name: 'api-design',
        source: 'vercel-labs/agent-skills',
        subpath: 'skills/api-design',
        reason: 'RESTful & GraphQL API best practices and contract design',
      },
      {
        name: 'sql-optimizer',
        source: 'vercel-labs/agent-skills',
        subpath: 'skills/sql-optimizer',
        reason: 'Query performance optimization and indexing advice',
      },
    ],
  },
  'backend/fastapi': {
    id: 'backend/fastapi',
    name: 'Python FastAPI & Pydantic',
    category: 'backend',
    description: 'Modern async Python backend, Pydantic v2 validations, and OpenAPI schema',
    tags: ['python', 'fastapi', 'pydantic', 'backend'],
    origin: 'builtin',
    skills: [
      {
        name: 'api-design',
        source: 'vercel-labs/agent-skills',
        subpath: 'skills/api-design',
        reason: 'OpenAPI and REST design standards',
      },
      {
        name: 'sql-optimizer',
        source: 'vercel-labs/agent-skills',
        subpath: 'skills/sql-optimizer',
        reason: 'SQLAlchemy and database query optimization',
      },
    ],
  },
  'security/audit': {
    id: 'security/audit',
    name: 'Security & Defense Audit',
    category: 'security',
    description: 'SAST code security auditing, OWASP vulnerability detection, and threat modeling',
    tags: ['security', 'audit', 'sast', 'owasp'],
    origin: 'builtin',
    skills: [
      {
        name: 'security-review',
        source: 'vercel-labs/agent-skills',
        subpath: 'skills/security-review',
        reason: 'Automated security code review for vulnerabilities',
      },
      {
        name: 'secret-scanner',
        source: 'vercel-labs/agent-skills',
        subpath: 'skills/secret-scanner',
        reason: 'Detects leaked API keys, tokens, and credentials',
      },
    ],
  },
  'devops/ci-cd': {
    id: 'devops/ci-cd',
    name: 'DevOps & GitHub Actions',
    category: 'devops',
    description: 'Docker containerization, GitHub Actions workflows, and deployment automation',
    tags: ['devops', 'docker', 'ci-cd', 'github-actions'],
    origin: 'builtin',
    skills: [
      {
        name: 'dockerfile-expert',
        source: 'vercel-labs/agent-skills',
        subpath: 'skills/dockerfile-expert',
        reason: 'Multi-stage Dockerfile optimization and minimal image footprint',
      },
      {
        name: 'github-actions',
        source: 'vercel-labs/agent-skills',
        subpath: 'skills/github-actions',
        reason: 'CI/CD workflow authoring, caching, and security hardening',
      },
    ],
  },
  'ai/agents': {
    id: 'ai/agents',
    name: 'AI Agent & Prompt Engineering',
    category: 'ai',
    description: 'Custom agent development, prompt distillation, MCP tools, and evaluator suites',
    tags: ['ai', 'prompts', 'mcp', 'agents'],
    origin: 'builtin',
    skills: [
      {
        name: 'prompt-engineer',
        source: 'vercel-labs/agent-skills',
        subpath: 'skills/prompt-engineer',
        reason: 'Distills and optimizes system prompts for LLM agents',
      },
      {
        name: 'mcp-builder',
        source: 'vercel-labs/agent-skills',
        subpath: 'skills/mcp-builder',
        reason: 'Model Context Protocol tool implementation and schema validation',
      },
    ],
  },
  'quality/review': {
    id: 'quality/review',
    name: 'Code Quality & Refactoring',
    category: 'quality',
    description: 'Automated PR code review, refactoring patterns, and test coverage expansion',
    tags: ['quality', 'code-review', 'refactor', 'tests'],
    origin: 'builtin',
    skills: [
      {
        name: 'code-review',
        source: 'vercel-labs/agent-skills',
        subpath: 'skills/code-review',
        reason: 'Comprehensive code reviews for maintainability and bugs',
      },
      {
        name: 'testing-guru',
        source: 'vercel-labs/agent-skills',
        subpath: 'skills/testing-guru',
        reason: 'Test-driven development, edge case generation, and unit tests',
      },
    ],
  },
};
