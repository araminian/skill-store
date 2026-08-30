# Skill Stacks & Presets Guide

> Comprehensive guide to using, authoring, inheriting, sharing, and contributing Skill Stacks in `skill-store`.

---

## Table of Contents
1. [What are Skill Stacks?](#1-what-are-skill-stacks)
2. [Hierarchy & Precedence](#2-hierarchy--precedence)
3. [Canonical IDs & Open Categories](#3-canonical-ids--open-categories)
4. [Stack Inheritance (`extends`)](#4-stack-inheritance-extends)
5. [Complete CLI Reference](#5-complete-cli-reference)
6. [Authoring Custom Stacks](#6-authoring-custom-stacks)
7. [Registry Taps & Private Catalogs](#7-registry-taps--private-catalogs)
8. [How to Contribute to the Community Registry](#8-how-to-contribute-to-the-community-registry)
9. [JSON Schema Reference](#9-json-schema-reference)

---

## 1. What are Skill Stacks?

A **Skill Stack** is a curated, versioned bundle of complementary AI agent skills designed for a specific technology, workflow, or role. 

Instead of searching for and linking individual skills one by one across multiple agent configurations, a single command applies an entire curated suite:

```bash
skill-store stack use frontend/nextjs
```

When applied, `skill-store`:
1. Inspects your local store (`~/.skill-store/`).
2. Automatically downloads any missing skills from their remote repositories.
3. Creates symlinks in your project's agent directories (`.claude/skills/`, `.agents/skills/`, etc.).
4. Records the configuration in `skill-store.json` so teammates can reproduce it with `skill-store install`.

---

## 2. Hierarchy & Precedence

`skill-store` supports a three-tiered stack architecture:

```
┌────────────────────────────────────────────────────────┐
│  1. Project Stacks (skill-store.json)                  │  <-- Highest Precedence (Overrides all)
├────────────────────────────────────────────────────────┤
│  2. Global User Stacks (~/.skill-store/stacks.json)    │  <-- Overrides Community
├────────────────────────────────────────────────────────┤
│  3. Community / Built-in Stacks (registry/stacks.json) │  <-- Base Defaults
└────────────────────────────────────────────────────────┘
```

- **Project Stacks (`skill-store.json`):** Committed directly in a repository. Allows teams to customize or override stacks specifically for that codebase.
- **Global User Stacks (`~/.skill-store/stacks.json`):** Stored in your home directory. Ideal for personal workflows you want available across all repositories on your machine.
- **Community / Built-in Stacks:** Distributed via the official community catalog or custom registry taps.

If a project defines a stack with the same ID as a community stack (e.g. `frontend/nextjs`), the project's definition wins.

---

## 3. Canonical IDs & Open Categories

Every stack has a **canonical unique identifier** in the format `<category>/<name>`:

| Canonical ID | Category | Short Name | Description |
| :--- | :--- | :--- | :--- |
| `frontend/react` | `frontend` | `react` | React performance and accessibility suite |
| `frontend/nextjs` | `frontend` | `nextjs` | Next.js App Router, Tailwind CSS, and UI design |
| `backend/fastapi` | `backend` | `fastapi` | Python FastAPI, Pydantic v2, and OpenAPI design |
| `backend/node-api` | `backend` | `node-api` | Node.js REST & GraphQL API best practices |
| `security/audit` | `security` | `audit` | SAST code security review and secret scanning |
| `devops/ci-cd` | `devops` | `ci-cd` | Docker optimization and GitHub Actions workflows |
| `ai/agents` | `ai` | `agents` | Prompt engineering and Model Context Protocol (MCP) |
| `quality/review` | `quality` | `review` | PR code review and test-driven development |

### Dynamic / Open Categories
Categories are **not fixed or hardcoded**. You or your team can introduce any category:
- `mobile/react-native`, `mobile/flutter`, `mobile/ios-swift`
- `data/pyspark`, `data/dbt`, `data/analytics`
- `internal/core-platform`, `internal/billing`

### Smart Short-Name Resolution
You don't need to type the full canonical ID if the short name is unique:

```bash
# Both of these resolve to frontend/nextjs:
skill-store stack use frontend/nextjs
skill-store stack use nextjs
```

If multiple categories share a name (e.g., `frontend/graphql` and `backend/graphql`), the CLI displays an interactive prompt asking you to choose.

---

## 4. Stack Inheritance (`extends`)

Stacks can **inherit from and extend** other stacks. This eliminates duplication and allows creating specialized sub-stacks.

### Example: `frontend/nextjs` extends `frontend/react`

```
┌──────────────────────────────────────┐
│  frontend/react (Parent Stack)       │
│  • react-doctor                      │
│  • accessibility                     │
└───────────────────┬──────────────────┘
                    │ extends
                    ▼
┌──────────────────────────────────────┐
│  frontend/nextjs (Child Stack)       │
│  • frontend-design                   │
│  • tailwind-wizard                   │
└──────────────────────────────────────┘
                    │
                    ▼ (Resolved Result)
┌──────────────────────────────────────┐
│  Resolved Next.js Suite (4 Skills)   │
│  1. react-doctor       (from parent) │
│  2. accessibility      (from parent) │
│  3. frontend-design    (from child)  │
│  4. tailwind-wizard    (from child)  │
└──────────────────────────────────────┘
```

### Inheritance Rules:
1. **Skill Merging:** Parent skills are resolved first; child skills are added on top.
2. **Skill Overrides:** If a child defines a skill with the same name as a parent skill, the child's version (e.g. custom `subpath`, `ref`, or `reason`) overrides the parent.
3. **Tag Merging:** Tags from parent and child stacks are merged and deduplicated.
4. **Circular Dependency Guard:** The stack resolver automatically detects circular loops (e.g. `A extends B extends A`) and throws a descriptive error.

---

## 5. Complete CLI Reference

### Browsing & Inspecting Stacks

```bash
# List all stacks grouped by category
skill-store stack list

# Filter by a specific category
skill-store stack list frontend
skill-store stack list backend

# Inspect a stack (shows inheritance chain, tags, and active status of each skill)
skill-store stack show nextjs
skill-store stack show frontend/nextjs
```

### Applying & Unlinking Stacks

```bash
# Apply a stack to the current project
skill-store stack use frontend/nextjs
# (alias: apply)
skill-store stack apply nextjs

# Apply globally (~/.claude/skills, ~/.agents/skills)
skill-store stack use security/audit --global

# Target a specific AI agent directory
skill-store stack use backend/fastapi --agent cursor

# Unlink all skills belonging to a stack from current project
skill-store stack unlink nextjs
# (alias: eject)
skill-store stack eject nextjs
```

### Saving & Managing Custom Stacks

```bash
# Save currently linked project skills into a project stack (in skill-store.json)
skill-store stack save my-project-stack

# Save specific skills into a custom stack
skill-store stack save custom/web-suite --skills react-doctor,api-design,dockerfile-expert

# Save a global stack (saved to ~/.skill-store/stacks.json)
skill-store stack save my-global-tools --global --skills git-helper,secret-scanner

# Specify an inheritance parent when creating a stack
skill-store stack save custom/my-nextjs --extends frontend/nextjs --skills custom-audit

# Remove a custom stack definition
skill-store stack remove custom/my-nextjs
skill-store stack remove my-global-tools --global
```

### Syncing Registries

```bash
# Manually fetch latest community and custom registry catalogs
skill-store stack sync

# Sync and immediately list
skill-store stack list --sync
```

---

## 6. Authoring Custom Stacks

### A. In `skill-store.json` (Project Stacks)

Add a `"stacks"` section to your project's `skill-store.json`:

```json
{
  "skills": {
    "react-doctor": {
      "source": "vercel-labs/agent-skills",
      "subpath": "skills/react-doctor"
    }
  },
  "stacks": {
    "my-team/fullstack": {
      "category": "my-team",
      "description": "Acme Corp fullstack web standard",
      "extends": "frontend/nextjs",
      "skills": [
        {
          "name": "internal-auth",
          "source": "https://github.com/acme/internal-skills.git",
          "subpath": "skills/auth",
          "reason": "Internal SSO and token handling standards"
        }
      ]
    }
  }
}
```

### B. In `~/.skill-store/stacks.json` (Global User Stacks)

```json
{
  "version": 1,
  "stacks": {
    "personal/reviewer": {
      "category": "personal",
      "description": "My favorite code review skills",
      "skills": [
        { "name": "code-review", "source": "vercel-labs/agent-skills" },
        { "name": "secret-scanner", "source": "vercel-labs/agent-skills" }
      ]
    }
  }
}
```

---

## 7. Registry Taps & Private Catalogs

You can configure external community registries or internal company taps alongside the official registry:

```bash
# View configured registry taps
skill-store registry list

# Add an internal team repository tap (raw JSON URL or local file)
skill-store registry add acme-corp https://raw.githubusercontent.com/acme/agent-stacks/main/stacks.json

# Add a local file tap for offline/development environments
skill-store registry add local-tap file:///Users/armin/stacks/custom-stacks.json

# Remove a custom registry tap
skill-store registry remove acme-corp
```

### Caching
- Registry catalogs are cached in `~/.skill-store/community-stacks.json` with a **24-hour TTL**.
- If offline, `skill-store` seamlessly falls back to the local cache and bundled built-in stacks.

---

## 8. How to Contribute to the Community Registry

We welcome community submissions of new stacks!

### Step-by-Step Contribution Guide:

1. **Fork the Repository:** Fork [araminian/skill-store](https://github.com/araminian/skill-store).
2. **Edit `registry/stacks.json`:** Add your stack definition following the JSON schema:
   ```json
   {
     "id": "mobile/flutter",
     "name": "Flutter & Dart Suite",
     "category": "mobile",
     "description": "Flutter widget architecture, state management, and performance audit",
     "tags": ["flutter", "dart", "mobile"],
     "skills": [
       {
         "name": "flutter-architect",
         "source": "flutter-community/agent-skills",
         "subpath": "skills/flutter-architect",
         "reason": "Widget tree optimization and clean architecture"
       }
     ]
   }
   ```
3. **Run Tests & Validation:**
   ```bash
   pnpm test
   ```
4. **Submit a Pull Request:** Open a PR against `main`. Once merged, your stack is instantly available to all `skill-store` users worldwide!

---

## 9. JSON Schema Reference

The formal schema is located at `registry/schema.json`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "required": ["id", "name", "description", "category", "skills"],
  "properties": {
    "id": { "type": "string", "pattern": "^[a-z0-9-]+(/[a-z0-9-]+)+$" },
    "name": { "type": "string" },
    "description": { "type": "string" },
    "category": { "type": "string" },
    "tags": { "type": "array", "items": { "type": "string" } },
    "extends": { "type": "string" },
    "skills": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["name"],
        "properties": {
          "name": { "type": "string" },
          "source": { "type": "string" },
          "subpath": { "type": "string" },
          "ref": { "type": "string" },
          "reason": { "type": "string" },
          "optional": { "type": "boolean" }
        }
      }
    }
  }
}
```
