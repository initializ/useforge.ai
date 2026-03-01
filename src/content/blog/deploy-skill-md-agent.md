---
title: "Deploy a SKILL.md Agent in 5 Minutes"
description: "Walk through creating a Forge agent from scratch — write a SKILL.md, configure forge.yaml, and run it locally."
author: "Forge Team"
date: 2026-02-28
tags: ["tutorial", "getting-started"]
---

# Deploy a SKILL.md Agent in 5 Minutes

Getting a Forge agent running locally is fast. This tutorial walks you through every step: installing the CLI, scaffolding a project, writing a skill, and watching it execute under Forge's trust model.

## Step 1 — Install the Forge CLI

If you have not installed Forge yet, the quickest path is Homebrew:

```bash
brew install initializ/tap/forge
```

Alternatively, grab the binary directly:

```bash
curl -sSL https://github.com/initializ/forge/releases/latest/download/forge-$(uname -s)-$(uname -m).tar.gz | tar xz
sudo mv forge /usr/local/bin/
```

Verify it is on your PATH:

```bash
forge --version
```

## Step 2 — Scaffold a New Agent

Run `forge init` to create a project directory with the default structure:

```bash
forge init my-agent
cd my-agent
```

This generates two files you care about:

- `SKILL.md` — the skill definition your agent will execute.
- `forge.yaml` — runtime configuration (model provider, trust settings, logging).

It also creates a `.forge/` directory for local cache and audit logs.

## Step 3 — Write Your SKILL.md

Open `SKILL.md` in your editor. A skill file has two parts: YAML frontmatter for metadata and Markdown instructions for the agent.

```markdown
---
name: summarize-url
description: Fetch a web page and return a concise summary.
bins:
  - curl
env:
  - OPENAI_API_KEY
egress:
  - "*.openai.com"
---

# Summarize URL

You are a summarization agent.

## Steps

1. Accept a URL as input from the user.
2. Use `curl` to fetch the page content.
3. Strip HTML tags and extract the main body text.
4. Return a summary of no more than 200 words.

## Constraints

- Do not follow redirects more than twice.
- Do not access any domain other than the one provided and the OpenAI API.
- Never output raw HTML.
```

### What each frontmatter field does

| Field | Purpose |
|-------|---------|
| `name` | Unique identifier for the skill. Use lowercase kebab-case. |
| `description` | One-line summary shown in the skill registry and audit logs. |
| `bins` | System binaries the skill needs at runtime. Forge verifies they exist before execution. |
| `env` | Environment variables the skill requires. Forge checks they are set and non-empty. |
| `egress` | Allowed outbound domains. Any network call to a domain not on this list is blocked. |

## Step 4 — Configure forge.yaml

The generated `forge.yaml` needs a model provider. Open it and set the provider and model:

```yaml
version: 1

model:
  provider: openai
  name: gpt-4o
  temperature: 0.2

trust:
  level: auto          # let Forge compute trust from the SKILL.md
  enforce_egress: true  # block network calls outside declared domains

logging:
  audit: true
  path: .forge/audit.log
```

The `trust.level: auto` setting tells Forge to run its autowire pipeline on the skill before execution. If the skill fails trust evaluation, it will not run.

## Step 5 — Run the Agent

Start the agent with `forge run`:

```bash
forge run
```

Forge executes the following sequence at startup:

1. **Skill scanning** — reads `SKILL.md`, parses frontmatter and instruction blocks.
2. **Trust evaluation** — runs seven security checks against the skill: binary dependencies, environment variables, egress domains, inline code blocks, file system access patterns, privilege escalation indicators, and secrets exposure. Each check produces a severity rating.
3. **Trust level assignment** — based on the check results, Forge assigns one of four trust levels: `trusted`, `under_review`, `untrusted`, or `failed`. Only `trusted` and `under_review` skills are allowed to execute by default.
4. **Egress enforcement** — Forge configures an outbound proxy that only permits traffic to the domains listed in the skill's `egress` field.
5. **Audit logging** — every tool call, model invocation, and network request is written to `.forge/audit.log` with timestamps and request IDs.

Once startup completes, you will see a prompt. Paste a URL and the agent will fetch it, summarize the content, and print the result.

## What to Try Next

- Add a second skill file and watch Forge evaluate both at startup.
- Set `trust.level: strict` in `forge.yaml` to reject any skill that is not `trusted`.
- Run `forge skills audit` to see the full trust report for your skill without executing it.
- Browse the [Skill Hub](/skills) for community skills you can drop into your project.

That is everything you need to go from zero to a running Forge agent. The entire flow — scaffold, write, configure, run — takes less than five minutes once you have the CLI installed.
