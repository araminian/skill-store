import { describe, it, expect } from 'vitest';
import { parseSource } from '../src/source-parser.ts';

describe('Source Parser', () => {
  it('parses shorthand owner/repo', () => {
    const res = parseSource('vercel-labs/agent-skills');
    expect(res.type).toBe('github');
    expect(res.ownerRepo).toBe('vercel-labs/agent-skills');
    expect(res.url).toBe('https://github.com/vercel-labs/agent-skills.git');
    expect(res.ref).toBeUndefined();
  });

  it('parses shorthand owner/repo with tag/ref', () => {
    const res = parseSource('vercel-labs/agent-skills@v1.5.0');
    expect(res.type).toBe('github');
    expect(res.ownerRepo).toBe('vercel-labs/agent-skills');
    expect(res.ref).toBe('v1.5.0');
  });

  it('parses full GitHub tree URL with subpath', () => {
    const res = parseSource(
      'https://github.com/vercel-labs/agent-skills/tree/main/skills/react-doctor'
    );
    expect(res.type).toBe('github');
    expect(res.ownerRepo).toBe('vercel-labs/agent-skills');
    expect(res.ref).toBe('main');
    expect(res.subpath).toBe('skills/react-doctor');
  });

  it('parses GitHub SSH URL', () => {
    const res = parseSource('git@github.com:vercel-labs/agent-skills.git@feature-branch');
    expect(res.type).toBe('github');
    expect(res.ownerRepo).toBe('vercel-labs/agent-skills');
    expect(res.ref).toBe('feature-branch');
  });

  it('parses local paths', () => {
    const res = parseSource('./my-local-skill');
    expect(res.type).toBe('local');
    expect(res.url).toContain('my-local-skill');
  });
});
