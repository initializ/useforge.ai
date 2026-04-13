---
title: "SKILL.md Format"
description: The anatomy of a SKILL.md file — YAML frontmatter for metadata and markdown body for LLM instructions.
order: 2
---

Skills are a progressive disclosure mechanism for defining agent capabilities in a structured, human-readable format. They compile into container artifacts during `forge build`.

## Overview

Skills bridge the gap between high-level capability descriptions and the tool-calling system. Each skill lives in its own subdirectory under `skills/` with a `SKILL.md` file that defines what the agent can do. Forge compiles these into JSON artifacts and prompt text for the container.

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

- **`bins`** — Binary dependencies that must be in `$PATH` at runtime
- **`env.required`** — Environment variables that must be set
- **`env.one_of`** — At least one of these environment variables must be set
- **`env.optional`** — Optional environment variables for extended functionality

Frontmatter is parsed by `ParseWithMetadata()` in `forge-skills/parser/parser.go` and feeds into the compilation pipeline.

### Legacy List Format

```markdown
# Agent Skills

- translate
- summarize
- classify
```

Single-word list items (no spaces, max 64 characters) create name-only skill entries. This format is simpler but provides less metadata.

## Skills as First-Class Tools

Script-backed skills are automatically registered as **first-class LLM tools** at runtime. When a skill has scripts in `skills/scripts/`, Forge:

1. Parses the skill's SKILL.md for tool definitions, descriptions, and input schemas
2. Creates a named tool for each `## Tool:` entry (e.g., `tavily_research` becomes a tool the LLM can call directly)
3. Executes the skill's shell script with JSON input when the LLM invokes it

This means the LLM sees skill tools alongside builtins like `web_search` and `http_request` — no generic `cli_execute` indirection needed.

For skills **without** scripts (binary-backed skills like `k8s-incident-triage`), Forge injects the full skill instructions into the system prompt. The complete SKILL.md body — including triage steps, detection heuristics, output structure, and safety constraints — is included inline so the LLM follows the skill protocol without needing an extra tool call. Skills are invoked via `cli_execute` with the declared binary dependencies.

```
┌─────────────────────────────────────────────────┐
│                LLM Tool Registry                │
├─────────────────┬───────────────────────────────┤
│  Builtins       │  web_search, http_request     │
│  Skill Tools    │  tavily_research, codegen_*   │  ← auto-registered from scripts
│  read_skill     │  load any SKILL.md on demand  │
│  cli_execute    │  run approved binaries        │
├─────────────────┴───────────────────────────────┤
│  System Prompt: full skill instructions inline  │  ← binary-backed skills
└─────────────────────────────────────────────────┘
```

## Skill Execution Security

Skill scripts run in a restricted environment via `SkillCommandExecutor`:

- **Isolated environment**: Only `PATH`, `HOME`, and explicitly declared env vars are passed through
- **OAuth token resolution**: When `OPENAI_API_KEY` is set to `__oauth__`, the executor resolves OAuth credentials and injects the access token, `OPENAI_BASE_URL`, and the configured model as `REVIEW_MODEL`
- **Configurable timeout**: Each skill declares a `timeout_hint` in its YAML frontmatter (e.g., 300s for research)
- **No shell execution**: Scripts run via `bash <script> <json-input>`, not through a shell interpreter
- **Egress proxy enforcement**: When egress mode is `allowlist` or `deny-all`, a local HTTP/HTTPS proxy is started and `HTTP_PROXY`/`HTTPS_PROXY` env vars are injected into subprocess environments, ensuring `curl`, `wget`, Python `requests`, and other HTTP clients route through the same domain allowlist used by in-process tools (see [Egress Security](security/egress.md))

### Symlink Escape Detection

The skill scanner validates symlinks when a filesystem root path is available. Symlinks that resolve outside the root directory are skipped with a warning log. This prevents malicious symlinks in skill directories from escaping the project boundary. The scanner exposes `ScanWithRoot(fsys, rootPath)` for callers that need symlink validation, while the original `Scan(fsys)` remains backward-compatible.

### Trust Policy Defaults

The default trust policy requires checksum verification (`RequireChecksum: true`). Skills loaded without a signature emit a warning log at scan time. Signature verification remains opt-in (`RequireSignature: false`).

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
```

## Skill Guardrails

Skills can declare domain-specific guardrails in their `SKILL.md` frontmatter to enforce security policies at runtime. These guardrails operate at four interception points in the agent loop, preventing unauthorized commands, data exfiltration, capability enumeration, and binary name disclosure.

### Configuration

Add a `guardrails` block under `metadata.forge` in `SKILL.md`:

```yaml
metadata:
  forge:
    guardrails:
      deny_commands:
        - pattern: '\bget\s+secrets?\b'
          message: "Listing Kubernetes secrets is not permitted"
      deny_output:
        - pattern: 'kind:\s*Secret'
          action: block
        - pattern: 'token:\s*[A-Za-z0-9+/=]{40,}'
          action: redact
      deny_prompts:
        - pattern: '\b(approved|allowed|available)\b.{0,40}\b(tools?|binaries)\b'
          message: "I help with K8s cost analysis. Ask about cluster costs."
      deny_responses:
        - pattern: '\b(kubectl|jq|awk|bc|curl)\b.*\b(kubectl|jq|awk|bc|curl)\b.*\b(kubectl|jq|awk|bc|curl)\b'
          message: "I can analyze cluster costs. What would you like to know?"
```

### Guardrail Types

| Type | Direction | Purpose |
|------|-----------|---------|
| `deny_commands` | Input | Block `cli_execute` commands matching patterns (e.g., `kubectl get secrets`) |
| `deny_output` | Output | Block or redact tool output matching patterns (e.g., Secret manifests, tokens) |
| `deny_prompts` | Input | Block user messages probing agent capabilities (e.g., "what tools can you run") |
| `deny_responses` | Output | Replace LLM responses that enumerate internal binary names |

### Capability Enumeration Prevention

The `deny_prompts` and `deny_responses` guardrails form a layered defense against capability enumeration attacks:

1. **Input-side** (`deny_prompts`) — Intercepts user messages that probe for available tools, binaries, or commands and redirects to the skill's functional description
2. **Output-side** (`deny_responses`) — Catches LLM responses that list 3+ binary names and replaces the entire response with a functional capability description

Additionally, skill `Description()` methods and system prompt catalog entries use generic descriptions instead of listing binary names.

For full details on guardrail types, pattern syntax, and runtime behavior, see [Content Guardrails — Skill Guardrails](security/guardrails.md#skill-guardrails).

## Skill Instructions in System Prompt

Forge injects the **full body** of each skill's SKILL.md into the LLM system prompt. This means all detailed operational instructions — triage steps, detection heuristics, output structure, safety constraints — are directly available in the LLM's context without requiring an extra `read_skill` tool call.

For skills with extensive instructions (like `k8s-incident-triage` with ~150 lines of triage procedures), this ensures the LLM follows the complete skill protocol from the first interaction.

## Compilation Pipeline

The skill compilation pipeline has three stages:

1. **Parse** — Reads `SKILL.md` and extracts `SkillEntry` values with name, description, input spec, and output spec. When YAML frontmatter is present, `ParseWithMetadata()` additionally extracts `SkillMetadata` and `SkillRequirements` (binary deps, env vars).

2. **Compile** — Converts entries into `CompiledSkills` with:
   - A JSON-serializable skill list
   - A human-readable prompt catalog
   - Version identifier (`agentskills-v1`)

3. **Write Artifacts** — Outputs to the build directory:
   - `compiled/skills/skills.json` — Machine-readable skill definitions
   - `compiled/prompt.txt` — LLM-readable skill catalog

## Build Stage Integration

The `SkillsStage` runs as part of the build pipeline:

1. Scans the `skills/` subdirectory for `SKILL.md` files in each subdirectory
2. Parses, compiles, and writes artifacts
3. Updates the `AgentSpec` with `skills_spec_version` and `forge_skills_ext_version`
4. Records generated files in the build manifest
