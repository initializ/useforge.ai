---
title: Writing Custom Skills
description: "Create your own skills — SKILL.md frontmatter reference, script conventions, categories, and the async two-tool pattern."
order: 2
editUrl: https://github.com/initializ/useforge.ai/edit/main/src/content/docs/skills/writing-custom-skills.md
---

A skill is a directory containing a `SKILL.md` file and an optional `scripts/` directory. The SKILL.md combines YAML frontmatter (metadata for the runtime) with a markdown body (instructions for the LLM). Skills are directories, not code changes — you never need to edit a central index or registry file.

```
my-skill/
├── SKILL.md
└── scripts/          # optional
    ├── my-tool.sh
    └── my-other-tool.sh
```

## SKILL.md Format

Skills are defined in Markdown files inside `skills/<skill-name>/SKILL.md`. Each file supports optional YAML frontmatter and two body formats.

```markdown
---
name: weather
icon: 🌤️
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

## Two Execution Paths

How a skill integrates with the LLM depends on whether it includes scripts.

### Script-Backed Skills

If your skill has a `scripts/` directory, each `## Tool:` section in SKILL.md becomes a **first-class LLM tool** registered at runtime. The LLM calls these tools directly by name, just like built-in tools. Each script receives JSON arguments as its first argument, writes results to stdout, and writes errors to stderr. The `SkillCommandExecutor` handles timeout and environment isolation.

### Binary-Backed Skills

If your skill has no `scripts/` directory, the full SKILL.md body is injected into the system prompt catalog. The LLM uses the `read_skill` built-in tool to load the skill's instructions on demand, then invokes actions via `cli_execute` with the declared binary dependencies.

This is the **progressive disclosure** model — the LLM only loads detailed skill instructions when it actually needs them, keeping the system prompt compact.

### Legacy List Format

```markdown
# Agent Skills

- translate
- summarize
- classify
```

Single-word list items (no spaces, max 64 characters) create name-only skill entries. This format is simpler but provides less metadata.

## YAML Frontmatter Reference

### Top-Level Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | yes | Skill identifier (kebab-case) |
| `icon` | yes | Emoji displayed in the TUI skill picker |
| `category` | yes | Grouping for `forge skills list --category` (e.g., `sre`, `developer`, `research`, `utilities`) |
| `tags` | yes | Discovery keywords for `forge skills list --tags` (kebab-case) |
| `description` | yes | One-line summary |

### `metadata.forge.requires` Block

The `metadata.forge.requires` block declares runtime dependencies:

- **`bins`** — Binary dependencies that must be in `$PATH` at runtime. Checked via `exec.LookPath` at build time. If a required binary is missing, the skill fails validation.
- **`env.required`** — Environment variables that must be set. Missing any one blocks the skill from running.
- **`env.one_of`** — At least one of these environment variables must be set. Useful for multi-provider skills where you need any one API key.
- **`env.optional`** — Optional environment variables for extended functionality. The skill works without them.

```yaml
metadata:
  forge:
    requires:
      bins:
        - curl
        - jq
      env:
        required:
          - DATABASE_URL
        one_of:
          - OPENAI_API_KEY
          - ANTHROPIC_API_KEY
          - GEMINI_API_KEY
        optional:
          - FIRECRAWL_API_KEY
```

### `metadata.forge.egress_domains`

Domains the skill needs to reach. Added to the egress allowlist during `forge build` and enforced at runtime.

```yaml
egress_domains:
  - api.openweathermap.org
  - api.weatherapi.com
```

### `metadata.forge.denied_tools`

Tools to remove from the LLM's registry when this skill is active. Use this to prevent the LLM from bypassing the skill's intended workflow.

```yaml
denied_tools:
  - http_request
  - web_search
```

For example, `k8s-incident-triage` denies `http_request` and `web_search` to force all cluster interaction through `kubectl`. Without this, the LLM might attempt to reach the Kubernetes API directly via HTTP instead of using `kubectl`, bypassing the read-only safety constraints.

### `metadata.forge.timeout_hint`

Integer (seconds). Tells the `SkillCommandExecutor` how long the skill's tools may take before timing out. Default is `120`. Research-style skills that perform long-running operations typically use `300`.

```yaml
timeout_hint: 300
```

### `metadata.forge.trust_hints` (optional)

Contributor-declared capability hints. The autowire security analyzer **verifies** these against actual skill contents — they are never trusted blindly. A mismatch is a trust violation that blocks the skill.

| Field | Type | Description |
|---|---|---|
| `requires_network` | boolean | Whether the skill makes network calls |
| `requires_filesystem` | boolean | Whether the skill reads/writes files |
| `requires_shell` | boolean | Whether the skill executes shell commands |
| `max_execution_seconds` | integer | Expected maximum execution time |

```yaml
trust_hints:
  requires_network: true
  requires_filesystem: false
  requires_shell: true
  max_execution_seconds: 30
```

Trust is computed, not declared. If you declare `requires_network: false` but list egress domains, the autowire pipeline flags a trust violation. Declaring `requires_filesystem: false` while scripts write to the filesystem is a violation. Declaring `requires_shell: false` while the skill depends on shell binaries is a violation. Mismatches result in a trust violation that blocks the skill from reaching `Trusted` status.

## Markdown Body

The markdown body is everything after the frontmatter closing `---`. It contains the instructions the LLM reads to understand how to use the skill.

The full body is captured by `ParseWithMetadata` into `SkillEntry.Body`. For binary-backed skills, it is injected into the system prompt. For script-backed skills, it is appended to the compiled prompt alongside the tool definitions.

Common sections include:

- **`# Skill Name`** — top-level heading matching the skill name
- **`## Constraints`** — rules and guardrails for the LLM
- **`## Instructions`** — step-by-step guidance for binary-backed skills
- **`## Tool: tool_name`** — for script-backed skills, each tool section describes a callable tool

## Tool Sections for Script-Backed Skills

For script-backed skills, each `## Tool:` section in the markdown body defines a tool that the LLM can call directly. The format is:

```
## Tool: tool_name

Description of what the tool does.

**Input:** param1 (string) - Description, param2 (integer) - Description
**Output:** Description of the output format
```

The `InputSpec` is converted to JSON Schema automatically. Each tool section maps to a script in the `scripts/` directory.

You can also use a table format for complex input specifications:

```
## Tool: tool_name

Description of what the tool does.

### InputSpec

| Field    | Type    | Required | Description          |
|----------|---------|----------|----------------------|
| location | string  | yes      | City name or coords  |
| days     | integer | no       | Forecast days (1-7)  |

### Output

Returns a JSON object with temperature, conditions, and forecast data.
```

## scripts/ Conventions

Follow these rules when writing skill scripts:

- **Hyphens in filenames, underscores in tool names** — a tool named `weather_current` maps to a script named `weather-current.sh`. Forge converts between them automatically.
- **Script receives JSON args as first argument** — parse with `jq` or your language's JSON library.
- **stdout = result** — whatever you write to stdout is returned to the LLM as the tool result.
- **stderr = errors** — error output is captured separately for debugging.
- **Exit code 0 = success** — non-zero exit codes signal failure to the runtime.
- **Timeout and env isolation** — the `SkillCommandExecutor` runs each script with the declared timeout and isolated environment variables.

Example script:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Parse JSON input
LOCATION=$(echo "$1" | jq -r '.location')

# Execute and return result
curl -s "https://wttr.in/${LOCATION}?format=j1" | jq '{
  location: .nearest_area[0].areaName[0].value,
  temp_c: .current_condition[0].temp_C,
  condition: .current_condition[0].weatherDesc[0].value
}'
```

## Skill Categories & Tags

All embedded skills must declare `category`, `tags`, and `icon` in their frontmatter. Categories and tags must be lowercase kebab-case.

```markdown
---
name: k8s-incident-triage
icon: ☸️
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

# Combine both
forge skills list --category sre --tags kubectl,oncall
```

Tags are deduplicated automatically. If you add the same tag twice in the YAML, it appears only once.

## Async Two-Tool Pattern

For skills that perform long-running operations, use the async two-tool pattern. Instead of one tool that blocks for minutes, you split into two:

1. **Submit tool** — starts the operation and returns a `request_id` immediately
2. **Poll tool** — handles internal waiting and returns the complete result

The poll script blocks internally (checking for results at intervals), so the LLM calls it once and receives the complete result when it finishes. This is cleaner than having the LLM poll repeatedly.

Example structure:

```
tavily-research/
├── SKILL.md
└── scripts/
    ├── tavily-research.sh        # submit tool
    └── tavily-research-poll.sh   # poll tool
```

In the SKILL.md:

```
## Tool: tavily_research

Submit a research request.

**Input:** query (string) - The research query
**Output:** JSON with request_id

## Tool: tavily_research_poll

Poll for research results.

**Input:** request_id (string) - The ID from tavily_research
**Output:** Complete research report
```

Set `timeout_hint: 300` (or higher) to prevent the executor from killing the poll script prematurely.

## _template/ Directory

Forge includes a contributor starter template at `forge-skills/local/embedded/_template/`. When contributing a new embedded skill, copy this template as your starting point:

```bash
cp -r forge-skills/local/embedded/_template/ forge-skills/local/embedded/my-skill/
```

The template includes a skeleton SKILL.md with all frontmatter fields and placeholder sections.

## Complete Example: Weather Skill

Here is the complete SKILL.md for the built-in `weather` skill:

```yaml
---
name: weather
description: Get current weather and forecasts
metadata:
  forge:
    requires:
      bins:
        - curl
      env:
        required: []
        one_of: []
        optional: []
    egress_domains:
      - api.openweathermap.org
      - api.weatherapi.com
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

## What's Next

Learn every skills-related CLI command in [Skills CLI Commands](/docs/skills/skills-cli).
