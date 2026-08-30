# skill-store

> Centralized Agent Skills Store & Intelligent Project Linker for AI Coding Agents (Claude Code, Cursor, Codex, OpenCode, and Universal Agent Standards).

---

## Background & Inspiration

The open agent skills ecosystem was pioneered by [vercel-labs/skills](https://github.com/vercel-labs/skills) (`npx skills`), introducing a standardized way to fetch and install agent skills.

`skill-store` is built on and extends this concept by introducing a **centralized package-store architecture** (similar to how `pnpm` manages packages). Instead of installing duplicate skill copies across many repositories or installing every skill globally and filling up the AI context window, `skill-store` lets you maintain a single local repository of skills (`~/.skill-store/`) and link only the specific skills each project needs via fast, intelligent symlinks and reference tracking.

---

## The Problem

When developing with AI coding assistants (like Claude Code, Cursor, Codex, Roo, etc.), installing every skill globally into `~/.claude/skills` or `~/.agents/skills` clutters the LLM context window with unnecessary tool definitions and prompts across all repositories.

Conversely, downloading skills manually into every individual project creates duplication, makes updating skills tedious, and risks inconsistency across projects and team members.

## The Solution: `skill-store`

`skill-store` provides a centralized, local skill store (`~/.skill-store/`) with fast, declarative linking:

1. **Centralized Store (`~/.skill-store`)**: Fetch and maintain all your favorite skills in one central location.
2. **Selective Project Linking**: Pick only the specific skills each project needs via fast, lightweight symlinks (`.claude/skills/`, `.agents/skills/`, etc.).
3. **One-Command Updates**: Update upstream repositories once in the store, and all linked projects instantly reflect the changes.
4. **Reference Safety Guard**: Prevent accidental breakage when deleting skills from the store by tracking bidirectional project links.
5. **Team Reproducibility**: Commit a lightweight `skill-store.json` manifest so teammates can reproduce the exact skill setup with `skill-store install`.

---

## Installation

```bash
# Global install via npm / pnpm / bun
npm install -g @araminian/skill-store

# Or run directly with npx / pnpm dlx / bunx
npx @araminian/skill-store --help

# Or clone and build locally
git clone https://github.com/araminian/skill-store.git
cd skill-store
pnpm install
pnpm build
```

---

## Quick Start & Core Commands

### 1. Fetch skills into your central store

Download skills from GitHub repositories, URLs, or local directories into `~/.skill-store`:

```bash
# Fetch from GitHub repo
skill-store fetch vercel-labs/agent-skills

# Fetch specific branch/tag
skill-store fetch vercel-labs/agent-skills@v1.2.0

# Fetch a specific skill from a multi-skill repo
skill-store fetch vercel-labs/agent-skills --skill react-doctor

# Fetch and immediately link to the current project
skill-store fetch vercel-labs/agent-skills --link
```

### 2. Hierarchical Skill Stacks & Presets (`skill-store stack`)

Instead of linking skills one-by-one, use curated community stacks or create your own:

```bash
# List all stacks grouped dynamically by category
skill-store stack list

# Filter stacks by category (e.g. frontend, backend, devops, security, ai, quality)
skill-store stack list frontend

# Apply a stack (auto-fetches missing skills and creates project symlinks)
skill-store stack use frontend/nextjs
# Or use the convenient short name:
skill-store stack use nextjs

# Inspect stack inheritance (e.g. nextjs extends react), tags, and active status
skill-store stack show nextjs

# Save current linked skills into a reusable stack (project or global)
skill-store stack save my-org/fullstack --skills react-doctor,api-design
skill-store stack save custom/my-global-stack --global

# Sync catalogs from community & custom registry taps
skill-store stack sync

# Unlink all skills belonging to a stack
skill-store stack unlink nextjs
```

### 3. Registry Taps & Private Catalogs (`skill-store registry`)

Configure custom or private company stack registries alongside the official community catalog:

```bash
# List configured registry sources
skill-store registry list

# Add a custom or internal registry tap (GitHub raw URL or local JSON file)
skill-store registry add team-infra https://raw.githubusercontent.com/my-org/stacks/main/stacks.json

# Remove a registry tap
skill-store registry remove team-infra
```

### 4. Link individual skills to your project or globally

Link skills from `~/.skill-store` into your active project's agent directories:

```bash
# Link a skill into current project
skill-store link react-doctor

# Mark and link a skill globally (~/.claude/skills, ~/.agents/skills)
skill-store link git-helper --global

# Target a specific AI agent directory
skill-store link react-doctor --agent claude-code
skill-store link react-doctor --agent cursor
```

### 3. List and inspect skills

```bash
# List all skills in central store and active link counts
skill-store list

# List skills linked to current project
skill-store list --project

# List globally linked skills
skill-store list --global

# Inspect skill provenance, files, and referencing projects
skill-store info react-doctor
```

### 4. Update skills

Pull upstream changes into the store. All symlinked projects are automatically updated in real-time:

```bash
# Update all skills in store
skill-store update

# Update a specific skill
skill-store update react-doctor
```

### 5. Safe Removal & Reference Protection

When removing a skill, `skill-store` checks whether any projects actively reference it:

```bash
# Safe removal (prompts with interactive options if projects reference it)
skill-store remove react-doctor

# Automatically unlink from all referencing projects before removing
skill-store remove react-doctor --clean-links

# Force removal
skill-store remove react-doctor --force
```

### 6. Team Manifest & CI Restore

When you link skills in a project, `skill-store.json` is automatically updated:

```json
{
  "skills": {
    "react-doctor": {
      "source": "vercel-labs/agent-skills",
      "subpath": "skills/react-doctor",
      "agents": ["claude-code", "agents"]
    }
  }
}
```

Teammates or CI runners simply run:
```bash
skill-store install
```

### 7. Diagnostics & Pruning

```bash
# Check store health, link integrity, and detected agents
skill-store doctor

# Prune broken links from deleted project directories
skill-store prune
```

---

## Directory Layout

```
~/.skill-store/
├── registry.json             # Central database of skills & project references
├── skills/                   # Canonical skill directories
│   ├── react-doctor/
│   │   └── SKILL.md
│   └── git-commit-helper/
│       └── SKILL.md
└── sources/                  # Cached git repositories for upstream updates
    └── github_vercel-labs_agent-skills/
```

---

## Supported AI Agents

- **Universal Standard**: `.agents/skills` & `~/.agents/skills`
- **Claude Code**: `.claude/skills` & `~/.claude/skills`
- **Cursor**: `.cursor/skills` & `~/.cursor/skills`
- **Codex**: `.codex/skills` & `~/.codex/skills`
- **Windsurf**: `.windsurf/skills` & `~/.windsurf/skills`
- **OpenClaw**: `.openclaw/skills` & `~/.openclaw/skills`
- **Cline**: `.cline/skills` & `~/.cline/skills`
- **Roo Code**: `.roo/skills` & `~/.roo/skills`
- **GitHub Copilot**: `.github/skills` & `~/.copilot/skills`

---

## Running Tests

```bash
pnpm test
```

---

## Acknowledgments

Special thanks to the [Vercel Labs team](https://github.com/vercel-labs) for creating [skills](https://github.com/vercel-labs/skills) and establishing the open format for AI agent skills.

---

## License

MIT
