export type SourceType = 'github' | 'git' | 'local' | 'url';

export interface SourceProvenance {
  type: SourceType;
  url: string;
  ownerRepo?: string;
  ref?: string;
  commitSha?: string;
  subpath?: string;
  fetchedAt: string;
}

export interface SkillMetadata {
  name: string;
  description: string;
  version?: string;
  author?: string;
  license?: string;
  tags?: string[];
  homepage?: string;
  metadata?: Record<string, unknown>;
  rawContent?: string;
}

export interface SkillRecord {
  name: string;
  description: string;
  provenance: SourceProvenance;
  metadata?: Record<string, unknown>;
  storePath: string; // Relative to ~/.skill-store/skills/
  installedAt: string;
  updatedAt: string;
}

export type LinkTargetType = 'project' | 'global';
export type LinkMode = 'symlink' | 'copy';

export interface SkillLinkReference {
  id: string;
  skillName: string;
  targetType: LinkTargetType;
  targetDir: string; // Absolute path to project root or home
  agent: string; // e.g., 'claude-code', 'agents', 'cursor', etc.
  symlinkPath: string; // Absolute path to the symlink or copied folder
  linkedAt: string;
  mode: LinkMode;
}

export interface StoreRegistry {
  version: number;
  skills: Record<string, SkillRecord>;
  links: SkillLinkReference[];
  updatedAt: string;
}

export interface ProjectSkillEntry {
  source?: string;
  ref?: string;
  subpath?: string;
  agents?: string[];
  mode?: LinkMode;
}

export interface ProjectManifest {
  name?: string;
  version?: string;
  description?: string;
  skills: Record<string, ProjectSkillEntry>;
}

export interface AgentConfig {
  name: string;
  displayName: string;
  skillsDir: string; // relative to project root
  globalSkillsDir: string; // absolute path
  detectInstalled: (projectDir?: string) => Promise<boolean> | boolean;
}

export interface ParsedSource {
  type: SourceType;
  raw: string;
  url: string;
  ownerRepo?: string;
  ref?: string;
  subpath?: string;
  skillName?: string;
}

export interface DiscoveredSkill {
  name: string;
  description: string;
  dirPath: string;
  skillMdPath: string;
  metadata?: Record<string, unknown>;
  rawContent: string;
}
