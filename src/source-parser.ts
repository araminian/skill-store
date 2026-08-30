import { isAbsolute, resolve } from 'path';
import { existsSync } from 'fs';
import type { ParsedSource } from './types.js';

export function parseSource(rawInput: string): ParsedSource {
  const input = rawInput.trim();

  // Check for local file / directory path
  if (
    input.startsWith('./') ||
    input.startsWith('../') ||
    input.startsWith('/') ||
    input.startsWith('~') ||
    existsSync(input)
  ) {
    const fullPath = isAbsolute(input) ? input : resolve(process.cwd(), input);
    return {
      type: 'local',
      raw: input,
      url: fullPath,
    };
  }

  // Check for GitHub tree URL with subpath
  // e.g. https://github.com/owner/repo/tree/branch/subpath/to/skill
  const ghTreeMatch = input.match(
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)(?:\/(.+))?$/
  );
  if (ghTreeMatch) {
    const owner = ghTreeMatch[1]!;
    const repo = ghTreeMatch[2]!.replace(/\.git$/, '');
    const ref = ghTreeMatch[3]!;
    const subpath = ghTreeMatch[4] || undefined;
    return {
      type: 'github',
      raw: input,
      url: `https://github.com/${owner}/${repo}.git`,
      ownerRepo: `${owner}/${repo}`,
      ref,
      subpath,
    };
  }

  // Check for standard HTTP(S) git URL
  // e.g. https://github.com/owner/repo or https://gitlab.com/owner/repo.git
  const httpGitMatch = input.match(/^https?:\/\/([^/]+)\/([^/]+)\/([^/@#]+)(?:@([^#]+))?$/);
  if (httpGitMatch) {
    const host = httpGitMatch[1]!;
    const owner = httpGitMatch[2]!;
    let repo = httpGitMatch[3]!.replace(/\.git$/, '');
    const ref = httpGitMatch[4] || undefined;

    const isGithub = host === 'github.com';
    return {
      type: isGithub ? 'github' : 'git',
      raw: input,
      url: `https://${host}/${owner}/${repo}.git`,
      ownerRepo: `${owner}/${repo}`,
      ref,
    };
  }

  // Check for SSH Git URL
  // e.g. git@github.com:owner/repo.git or git@gitlab.com:owner/repo.git
  const sshMatch = input.match(/^git@([^:]+):([^/]+)\/([^/@#]+)(?:@([^#]+))?$/);
  if (sshMatch) {
    const host = sshMatch[1]!;
    const owner = sshMatch[2]!;
    let repo = sshMatch[3]!.replace(/\.git$/, '');
    const ref = sshMatch[4] || undefined;

    return {
      type: host.includes('github') ? 'github' : 'git',
      raw: input,
      url: `git@${host}:${owner}/${repo}.git`,
      ownerRepo: `${owner}/${repo}`,
      ref,
    };
  }

  // Check for shorthand owner/repo or owner/repo@ref
  // e.g. vercel-labs/agent-skills or vercel-labs/agent-skills@v1.0.0
  const shorthandMatch = input.match(/^([^/]+)\/([^/@#]+)(?:@([^#]+))?$/);
  if (shorthandMatch) {
    const owner = shorthandMatch[1]!;
    const repo = shorthandMatch[2]!.replace(/\.git$/, '');
    const ref = shorthandMatch[3] || undefined;

    return {
      type: 'github',
      raw: input,
      url: `https://github.com/${owner}/${repo}.git`,
      ownerRepo: `${owner}/${repo}`,
      ref,
    };
  }

  // Default fallback to raw URL as git
  return {
    type: 'git',
    raw: input,
    url: input,
  };
}
