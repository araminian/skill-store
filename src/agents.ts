import { homedir } from 'os';
import { join } from 'path';
import { existsSync } from 'fs';
import type { AgentConfig } from './types.js';

const home = homedir();
const claudeHome = process.env.CLAUDE_CONFIG_DIR?.trim() || join(home, '.claude');

export const AGENTS: Record<string, AgentConfig> = {
  agents: {
    name: 'agents',
    displayName: 'Universal (.agents)',
    skillsDir: '.agents/skills',
    globalSkillsDir: join(home, '.agents/skills'),
    detectInstalled: (projectDir?: string) => {
      if (projectDir) {
        return existsSync(join(projectDir, '.agents')) || existsSync(join(projectDir, '.agent'));
      }
      return existsSync(join(home, '.agents')) || existsSync(join(home, '.agent'));
    },
  },
  'claude-code': {
    name: 'claude-code',
    displayName: 'Claude Code',
    skillsDir: '.claude/skills',
    globalSkillsDir: join(claudeHome, 'skills'),
    detectInstalled: (projectDir?: string) => {
      if (projectDir) {
        return existsSync(join(projectDir, '.claude'));
      }
      return existsSync(claudeHome);
    },
  },
  cursor: {
    name: 'cursor',
    displayName: 'Cursor',
    skillsDir: '.cursor/skills',
    globalSkillsDir: join(home, '.cursor/skills'),
    detectInstalled: (projectDir?: string) => {
      if (projectDir) {
        return existsSync(join(projectDir, '.cursor'));
      }
      return existsSync(join(home, '.cursor'));
    },
  },
  codex: {
    name: 'codex',
    displayName: 'Codex',
    skillsDir: '.codex/skills',
    globalSkillsDir: join(home, '.codex/skills'),
    detectInstalled: (projectDir?: string) => {
      if (projectDir) {
        return existsSync(join(projectDir, '.codex'));
      }
      return existsSync(join(home, '.codex'));
    },
  },
  windsurf: {
    name: 'windsurf',
    displayName: 'Windsurf',
    skillsDir: '.windsurf/skills',
    globalSkillsDir: join(home, '.windsurf/skills'),
    detectInstalled: (projectDir?: string) => {
      if (projectDir) {
        return existsSync(join(projectDir, '.windsurf')) || existsSync(join(projectDir, '.codeium'));
      }
      return existsSync(join(home, '.windsurf')) || existsSync(join(home, '.codeium'));
    },
  },
  openclaw: {
    name: 'openclaw',
    displayName: 'OpenClaw',
    skillsDir: '.openclaw/skills',
    globalSkillsDir: join(home, '.openclaw/skills'),
    detectInstalled: (projectDir?: string) => {
      if (projectDir) {
        return existsSync(join(projectDir, '.openclaw'));
      }
      return existsSync(join(home, '.openclaw'));
    },
  },
  cline: {
    name: 'cline',
    displayName: 'Cline',
    skillsDir: '.cline/skills',
    globalSkillsDir: join(home, '.cline/skills'),
    detectInstalled: (projectDir?: string) => {
      if (projectDir) {
        return existsSync(join(projectDir, '.cline'));
      }
      return existsSync(join(home, '.cline'));
    },
  },
  roo: {
    name: 'roo',
    displayName: 'Roo Code',
    skillsDir: '.roo/skills',
    globalSkillsDir: join(home, '.roo/skills'),
    detectInstalled: (projectDir?: string) => {
      if (projectDir) {
        return existsSync(join(projectDir, '.roo'));
      }
      return existsSync(join(home, '.roo'));
    },
  },
  'github-copilot': {
    name: 'github-copilot',
    displayName: 'GitHub Copilot',
    skillsDir: '.github/skills',
    globalSkillsDir: join(home, '.copilot/skills'),
    detectInstalled: (projectDir?: string) => {
      if (projectDir) {
        return existsSync(join(projectDir, '.github'));
      }
      return existsSync(join(home, '.config/github-copilot'));
    },
  },
};

export function getAgentConfig(name: string): AgentConfig | undefined {
  const normalized = name.toLowerCase().trim();
  return AGENTS[normalized];
}

export function getAllAgentConfigs(): AgentConfig[] {
  return Object.values(AGENTS);
}

export function detectActiveAgents(targetDir: string, isGlobal = false): AgentConfig[] {
  const detected: AgentConfig[] = [];

  for (const agent of Object.values(AGENTS)) {
    if (isGlobal) {
      if (agent.detectInstalled()) {
        detected.push(agent);
      }
    } else {
      if (agent.detectInstalled(targetDir)) {
        detected.push(agent);
      }
    }
  }

  // Fallbacks if nothing detected
  if (detected.length === 0) {
    // Default to universal agents
    detected.push(AGENTS.agents!);
    // If claude global exists, also add claude-code
    if (existsSync(claudeHome) && !isGlobal) {
      detected.push(AGENTS['claude-code']!);
    }
  }

  return detected;
}
