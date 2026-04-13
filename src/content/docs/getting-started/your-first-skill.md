---
title: Your First Skill
description: Walk through creating your first custom skill — a binary-backed site checker and a script-backed word counter.
order: 3
editUrl: https://github.com/initializ/useforge.ai/edit/main/src/content/docs/getting-started/your-first-skill.md
---

Skills are a progressive disclosure mechanism for defining agent capabilities in a structured, human-readable format. They compile into container artifacts during `forge build`.

## Overview

Skills bridge the gap between high-level capability descriptions and the tool-calling system. Each skill lives in its own subdirectory under `skills/` with a `SKILL.md` file that defines what the agent can do. Forge compiles these into JSON artifacts and prompt text for the container.

## SKILL.md Format

Skills are defined in Markdown files inside `skills/<skill-name>/SKILL.md`. Each file supports optional YAML frontmatter and two body formats.

```markdown
---
name: weather
icon: weather
category: utilities
tags:
  - weather
  - forecast
  - api
description: Weather data skill
metadata:
  forge:
    requires:
      bins:
        - curl
      env:
        required: []
        one_of: []
        optional: []
---
## Tool: weather_current

Get current weather for a location.

**Input:** location (string) - City name or coordinates
**Output:** Current temperature, conditions, humidity, and wind speed

## Tool: weather_forecast

Get weather forecast for a location.

**Input:** location (string), days (integer: 1-7)
**Output:** Daily forecast with high/low temperatures and conditions
```

Each `## Tool:` heading defines a tool the agent can call. The frontmatter declares binary dependencies and environment variable requirements. Skills compile into JSON artifacts and prompt text during `forge build`.

### YAML Frontmatter

Top-level fields:

| Field | Required | Description |
|-------|----------|-------------|
| `name` | yes | Skill identifier (kebab-case) |
| `icon` | yes | Emoji displayed in the TUI skill picker |
| `category` | yes | Grouping for `forge skills list --category` (e.g., `sre`, `developer`, `research`, `utilities`) |
| `tags` | yes | Discovery keywords for `forge skills list --tags` (kebab-case) |
| `description` | yes | One-line summary |

The `metadata.forge.requires` block declares runtime dependencies:

- **`bins`** -- Binary dependencies that must be in `$PATH` at runtime
- **`env.required`** -- Environment variables that must be set
- **`env.one_of`** -- At least one of these environment variables must be set
- **`env.optional`** -- Optional environment variables for extended functionality

Frontmatter is parsed by `ParseWithMetadata()` in `forge-skills/parser/parser.go` and feeds into the compilation pipeline.

### Legacy List Format

```markdown
# Agent Skills

- translate
- summarize
- classify
```

Single-word list items (no spaces, max 64 characters) create name-only skill entries. This format is simpler but provides less metadata.

## Skill Registry

Forge ships with a built-in skill registry. Add skills to your project with a single command:

```bash
# Add a skill from the registry
forge skills add tavily-research

# Validate skill requirements
forge skills validate

# Audit skill security
forge skills audit --embedded
```

`forge skills add` copies the skill's SKILL.md and any associated scripts into your project's `skills/` directory. It validates binary and environment requirements, checks for existing values in your environment, `.env` file, and encrypted secrets, and prompts only for truly missing values with a suggestion to use `forge secrets set` for sensitive keys.

## Skills as First-Class Tools

Script-backed skills are automatically registered as **first-class LLM tools** at runtime. When a skill has scripts in `skills/scripts/`, Forge:

1. Parses the skill's SKILL.md for tool definitions, descriptions, and input schemas
2. Creates a named tool for each `## Tool:` entry (e.g., `tavily_research` becomes a tool the LLM can call directly)
3. Executes the skill's shell script with JSON input when the LLM invokes it

This means the LLM sees skill tools alongside builtins like `web_search` and `http_request` -- no generic `cli_execute` indirection needed.

For skills **without** scripts (binary-backed skills like `k8s-incident-triage`), Forge injects the full skill instructions into the system prompt. The complete SKILL.md body -- including triage steps, detection heuristics, output structure, and safety constraints -- is included inline so the LLM follows the skill protocol without needing an extra tool call. Skills are invoked via `cli_execute` with the declared binary dependencies.

## Skill Categories & Tags

All embedded skills must declare `category`, `tags`, and `icon` in their frontmatter. Categories and tags must be lowercase kebab-case.

```markdown
---
name: k8s-incident-triage
icon: k8s
category: sre
tags:
  - kubernetes
  - incident-response
  - triage
---
```

Use categories and tags to filter skills:

```bash
# List skills by category
forge skills list --category sre

# Filter by tags (AND semantics — skill must have all listed tags)
forge skills list --tags kubernetes,incident-response
```

## Built-in Skills

| Skill | Category | Description | Scripts |
|-------|----------|-------------|---------|
| `github` | developer | Clone repos, create issues/PRs, query GitHub API, and manage git workflows | `github-clone.sh`, `github-checkout.sh`, `github-commit.sh`, `github-push.sh`, `github-create-pr.sh`, `github-status.sh`, `github-list-prs.sh`, `github-get-user.sh`, `github-list-stargazers.sh`, `github-list-forks.sh`, `github-pr-author-profiles.sh`, `github-stargazer-profiles.sh` |
| `code-agent` | developer | Autonomous code generation, modification, and project scaffolding | -- (builtin tools) |
| `weather` | utilities | Get weather data for a location | -- (binary-backed) |
| `tavily-search` | research | Search the web using Tavily AI search API | `tavily-search.sh` |
| `tavily-research` | research | Deep multi-source research via Tavily API | `tavily-research.sh`, `tavily-research-poll.sh` |
| `k8s-incident-triage` | sre | Read-only Kubernetes incident triage using kubectl | -- (binary-backed) |
| `k8s-cost-visibility` | sre | Estimate K8s infrastructure costs (compute, storage, LoadBalancer) with cost attribution reports | `k8s-cost-visibility.sh` |
| `k8s-pod-rightsizer` | sre | Analyze workload metrics and produce CPU/memory rightsizing recommendations | -- (binary-backed) |
| `code-review` | developer | AI-powered code review for diffs and files (supports Anthropic API, OpenAI Chat Completions, and OpenAI Responses/Codex API with streaming) | `code-review-diff.sh`, `code-review-file.sh` |
| `code-review-standards` | developer | Initialize and manage code review standards | -- (template-based) |
| `code-review-github` | developer | Post code review results to GitHub PRs | -- (binary-backed) |
| `codegen-react` | developer | Scaffold and iterate on Vite + React apps | `codegen-react-scaffold.sh`, `codegen-react-read.sh`, `codegen-react-write.sh`, `codegen-react-run.sh` |
| `codegen-html` | developer | Scaffold standalone Preact + HTM apps (zero dependencies) | `codegen-html-scaffold.sh`, `codegen-html-read.sh`, `codegen-html-write.sh` |
