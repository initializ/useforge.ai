---
title: "SKILL.md Format"
description: The anatomy of a SKILL.md file — YAML frontmatter for metadata and markdown body for LLM instructions.
order: 2
---

# SKILL.md Format

Every Forge skill is defined by a `SKILL.md` file. It combines YAML frontmatter (metadata for the runtime) with a markdown body (instructions for the LLM).

## Structure

A SKILL.md has two parts:

1. **YAML frontmatter** — declares the skill's name, requirements, egress domains, and trust hints
2. **Markdown body** — the actual instructions the LLM reads to understand how to use the skill

## Complete Example

Here's a fully annotated SKILL.md for the built-in `summarize` skill:

```yaml
---
name: summarize
description: Summarize URLs, files, PDFs, YouTube videos.
metadata:
  forge:
    requires:
      bins:
        - summarize
      env:
        required: []
        one_of:
          - OPENAI_API_KEY
          - ANTHROPIC_API_KEY
          - GEMINI_API_KEY
        optional:
          - FIRECRAWL_API_KEY
    egress:
      - api.openai.com
    trust_hints:
      requires_network: true
      requires_filesystem: false
      requires_shell: false
      max_execution_seconds: 30
---

# Summarize

You can summarize content from URLs, local files, and PDFs.

## Constraints

- Always provide a concise summary (3-5 bullet points)
- Include key takeaways and action items
- Cite sources when summarizing web content
```

## Frontmatter Fields

### `name` (required)

The skill's unique identifier. Used for resolution, trust reports, and CLI commands.

### `description` (required)

A short human-readable description. Shown in `forge skills list` and the init wizard.

### `metadata.forge.requires`

Declares what the skill needs to run:

- **`bins`** — binary dependencies checked via `exec.LookPath` at build time. If a required binary is missing, the skill fails validation.
- **`env.required`** — environment variables that must be set. Missing any one blocks the skill.
- **`env.one_of`** — at least one of these must be set. Used for multi-provider skills.
- **`env.optional`** — enhance functionality if present, but not required.

### `metadata.forge.egress`

List of domains the skill needs to reach. These are added to the egress allowlist during `forge build` and enforced at runtime.

```yaml
egress:
  - api.openai.com
  - api.tavily.com
```

### `metadata.forge.trust_hints` (optional)

Contributor-declared capability hints. The autowire security analyzer **verifies** these against actual skill contents — they're never trusted blindly.

| Field | Type | Description |
|---|---|---|
| `requires_network` | boolean | Whether the skill makes network calls |
| `requires_filesystem` | boolean | Whether the skill reads/writes files |
| `requires_shell` | boolean | Whether the skill executes shell commands |
| `max_execution_seconds` | integer | Expected maximum execution time |

A mismatch (e.g., declaring `requires_network: false` while having egress domains) is a trust violation that blocks the skill.

### `metadata.forge.timeout_hint`

Integer (seconds). Tells the runtime how long the skill's tools may take. Propagated to the `SkillCommandExecutor` timeout. Research skills typically use `300`. Default: `120`.

## Markdown Body

The markdown body is what the LLM reads to know how to use the skill. Write it as clear instructions.

Common sections include:

- **`# Skill Name`** — top-level heading matching the skill name
- **`## Constraints`** — rules and guardrails for the LLM
- **`## Tool: tool_name`** — for script-backed skills, each tool section describes a callable tool

## Two Execution Paths

### Script-backed Skills

Skills with a `scripts/` directory are automatically registered as **first-class LLM tools** at runtime. Each `## Tool:` section in SKILL.md becomes a named tool (e.g., `tavily_research`) with its own description and JSON schema. The LLM calls them directly, just like built-in tools.

```
my-skill/
├── SKILL.md
└── scripts/
    ├── my-tool.sh
    └── my-other-tool.sh
```

**Naming convention:** Tool names use underscores (`tavily_research`), script filenames use hyphens (`tavily-research.sh`).

Skills can have multiple scripts. For example, `tavily-research` has both a submit script and a poll script, registered as two separate tools.

### Binary-backed Skills

Skills without scripts are listed in the system prompt catalog. The LLM uses the `read_skill` built-in tool to load the full SKILL.md instructions on demand, then invokes actions via `cli_execute`.

This is the **progressive disclosure** model — the LLM only loads detailed skill instructions when it needs them, keeping the system prompt compact.

## Adding Skills to Your Agent

### From the Embedded Registry

```bash
forge skills add summarize
```

This copies the SKILL.md and all scripts into your project's `skills/` directory, checks for required environment variables, and deduplicates `.env` entries.

### Custom Skills

Create a directory in `skills/` with a `SKILL.md`:

```bash
mkdir -p skills/my-skill
# Write your SKILL.md
forge build   # Autowire discovers and evaluates the skill
```

If the skill passes trust evaluation, it's available in `forge run` and `forge serve`. If it's flagged as `under_review`, use `forge skills promote my-skill` to approve it.
