---
title: Your First Skill
description: Walk through creating your first custom skill — a binary-backed site checker and a script-backed word counter.
order: 3
editUrl: https://github.com/initializ/useforge.ai/edit/main/src/content/docs/getting-started/your-first-skill.md
---

# Your First Skill

Skills are the building blocks that give your Forge agent real capabilities. Each skill is a directory containing a `SKILL.md` file that describes what the skill does, what it needs, and how the LLM should use it.

There are two types of skills:

- **Binary-backed skills** — rely on external binaries (like `curl` or `summarize`). The LLM reads the SKILL.md instructions on demand and invokes actions through the `cli_execute` built-in tool.
- **Script-backed skills** — include a `scripts/` directory with shell scripts that are registered as first-class LLM tools at runtime. The LLM calls them directly by name.

This guide walks you through creating one of each.

## Adding an Embedded Skill

Before writing a custom skill, try adding one from the embedded registry. Forge ships with several built-in skills you can add with a single command:

```bash
forge skills add weather
```

This copies the skill's `SKILL.md` and any scripts into your project's `skills/weather/` directory, checks for required environment variables, and deduplicates `.env` entries.

The resulting `skills/weather/SKILL.md` looks like this:

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

# Weather

You can look up current weather conditions and forecasts for any location.

## Constraints

- Always include the location name and current temperature
- Use Fahrenheit for US locations, Celsius for everywhere else
- Provide a short natural-language summary of conditions
```

You can inspect the trust level of the newly added skill at any time:

```bash
forge skills list
```

## Creating a Binary-Backed Skill

A binary-backed skill has no `scripts/` directory. The LLM loads the SKILL.md instructions when it needs them (progressive disclosure) and invokes the required binary through `cli_execute`.

You will build a `site-check` skill that uses `curl` to determine whether a website is reachable.

### Directory Structure

```
skills/site-check/
└── SKILL.md
```

Create the directory:

```bash
mkdir -p skills/site-check
```

### Write the SKILL.md

Create `skills/site-check/SKILL.md` with the following contents:

```yaml
---
name: site-check
description: Check whether a website is reachable and report its HTTP status.
metadata:
  forge:
    requires:
      bins:
        - curl
      env:
        required: []
        one_of: []
        optional: []
    egress_domains: []
    trust_hints:
      requires_network: true
      requires_filesystem: false
      requires_shell: true
      max_execution_seconds: 15
---

# Site Check

You can check whether a website is up and reachable.

## Instructions

When asked to check if a site is up, run the following command using cli_execute:

    curl -s -o /dev/null -w "%{http_code}" --max-time 10 <URL>

Interpret the result:

- **200-299** — the site is up and healthy
- **301, 302** — the site is redirecting (include the redirect target)
- **403** — the site is blocking the request
- **404** — the specific page was not found
- **500-599** — the site has a server-side error
- **000 or timeout** — the site is unreachable

## Constraints

- Always include the HTTP status code in your response
- If the site is unreachable, say so clearly — do not speculate on the cause
- Only check URLs the user explicitly provides
```

Because `egress_domains` is empty, this skill inherits whatever egress rules you have configured in `forge.yaml`. If you want to restrict it to specific domains, list them explicitly.

## Creating a Script-Backed Skill

A script-backed skill includes a `scripts/` directory. Each script becomes a tool the LLM can call directly, with structured input and output. This gives you tighter control over execution and argument validation.

You will build a `word-count` skill that counts words in text input.

### Directory Structure

```
skills/word-count/
├── SKILL.md
└── scripts/
    └── word-count.sh
```

Create the directories:

```bash
mkdir -p skills/word-count/scripts
```

### Write the SKILL.md

Create `skills/word-count/SKILL.md`:

```yaml
---
name: word-count
description: Count words, lines, and characters in text input.
metadata:
  forge:
    requires:
      bins: []
      env:
        required: []
        one_of: []
        optional: []
    egress_domains: []
    trust_hints:
      requires_network: false
      requires_filesystem: false
      requires_shell: true
      max_execution_seconds: 10
---

# Word Count

You can count words, lines, and characters in any text the user provides.

## Tool: word_count

Count words, lines, and characters in the provided text.

### InputSpec

| Field | Type   | Required | Description            |
|-------|--------|----------|------------------------|
| text  | string | yes      | The text to analyze    |

### Output

Returns a JSON object with `words`, `lines`, and `characters` counts.

## Constraints

- Return exact counts — do not estimate
- Handle empty input gracefully by returning zeroes
```

The `## Tool: word_count` section tells Forge to register a tool named `word_count`. The `InputSpec` table defines the JSON schema for the tool's arguments. At runtime, the LLM calls `word_count` directly with `{"text": "..."}`.

### Write the Script

Create `skills/word-count/scripts/word-count.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Input is passed as JSON via stdin
TEXT=$(cat | jq -r '.text // ""')

if [ -z "$TEXT" ]; then
  echo '{"words": 0, "lines": 0, "characters": 0}'
  exit 0
fi

WORDS=$(echo "$TEXT" | wc -w | tr -d ' ')
LINES=$(echo "$TEXT" | wc -l | tr -d ' ')
CHARS=$(echo "$TEXT" | wc -c | tr -d ' ')

echo "{\"words\": $WORDS, \"lines\": $LINES, \"characters\": $CHARS}"
```

Make the script executable:

```bash
chmod +x skills/word-count/scripts/word-count.sh
```

**Naming convention:** Tool names use underscores (`word_count`), script filenames use hyphens (`word-count.sh`). Forge maps between them automatically.

## Build and Run

Once your skills are in place, run the autowire pipeline to discover and evaluate them:

```bash
forge build
```

`forge build` scans your `skills/` directory, parses each SKILL.md, validates requirements (are the required binaries installed? are required env vars set?), evaluates trust, and generates the skill index.

Then start your agent:

```bash
forge run
```

Your agent now has access to both `site-check` (via progressive disclosure and `cli_execute`) and `word-count` (as a directly callable tool). Try asking it to "check if example.com is up" or "count the words in this paragraph."

## Trust Evaluation

When `forge build` runs, each skill passes through the **autowire pipeline**:

1. **Scanner** — discovers SKILL.md files in the `skills/` directory
2. **Parser** — extracts frontmatter and markdown body
3. **Security Analyzer** — checks for mismatches between declared trust hints and actual skill contents (e.g., declaring `requires_network: false` while listing egress domains)
4. **Trust Evaluator** — assigns a trust level based on the analysis

The result is one of three trust levels:

| Trust Level   | Meaning                                                      |
|---------------|--------------------------------------------------------------|
| **Trusted**   | Clean analysis, no findings. The skill runs without restriction. |
| **UnderReview** | Warnings found. The skill runs but is flagged for review. Use `forge skills promote <name>` to approve it. |
| **Failed**    | Critical findings. The skill is blocked from running until the issues are resolved. |

Trust is computed, not declared. A skill's trust hints are verified against its actual contents. You can inspect the full trust report for any skill:

```bash
forge skills trust-report site-check
```

## What's Next

- [SKILL.md Format](/docs/core-concepts/skill-md-format) — deep dive into every frontmatter field and the markdown body conventions
- [Configuration](/docs/getting-started/configuration) — customize model providers, tools, channels, memory, and egress rules in `forge.yaml`
