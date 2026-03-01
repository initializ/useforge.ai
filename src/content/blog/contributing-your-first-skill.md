---
title: "Contributing Your First Skill to Forge"
description: "How to write, test, and submit a community skill to the Forge skill registry."
author: "Forge Team"
date: 2026-02-26
tags: ["community", "contributing"]
---

# Contributing Your First Skill to Forge

The Forge skill registry is open to community contributions. If you have built a useful agent behavior — a web scraper, a code reviewer, a data pipeline — you can package it as a skill and share it with every Forge user. This guide walks through the full process: writing the skill, testing it, and submitting it for review.

## Skill Naming Conventions

Before you write anything, pick a name. Skill names follow these rules:

- Lowercase kebab-case: `my-skill`, not `MySkill` or `my_skill`.
- Two to five words maximum. Be descriptive but concise: `summarize-url`, `lint-dockerfile`, `translate-json`.
- No generic names. `helper`, `tool`, `agent` are too broad and will be rejected during review.
- Prefix with a namespace if the skill is tied to a specific service: `github-pr-review`, `aws-s3-upload`, `slack-notify`.

## Directory Structure

Each skill in the registry lives in its own directory under `skills/`:

```
forge-skills/
  skills/
    summarize-url/
      SKILL.md
      README.md        # optional — human-readable docs
      examples/        # optional — example inputs/outputs
        basic.md
```

The only required file is `SKILL.md`. Everything else is optional but encouraged.

## Writing the SKILL.md

A skill file has two sections: YAML frontmatter and Markdown instructions.

### Required Frontmatter Fields

```yaml
---
name: summarize-url
description: Fetch a URL and return a concise summary of its content.
bins:
  - curl
env:
  - OPENAI_API_KEY
egress:
  - "*.openai.com"
---
```

| Field | Required | Purpose |
|-------|----------|---------|
| `name` | Yes | Unique skill identifier. Must match the directory name. |
| `description` | Yes | One-line summary. Shown in the skill registry and CLI output. |
| `bins` | No | System binaries the skill depends on. Forge checks they exist before running. |
| `env` | No | Required environment variables. Forge validates they are set. |
| `env_one_of` | No | Groups of env vars where at least one must be set (e.g., `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`). |
| `egress` | No | Allowed outbound domains. Forge blocks all other network traffic at runtime. |

If your skill does not need binaries, environment variables, or network access, you can omit those fields entirely. A skill that only processes text passed to it inline might have frontmatter as minimal as `name` and `description`.

### Writing Instructions

The Markdown body is what the model sees at runtime. Write it as clear, imperative instructions:

```markdown
# Summarize URL

You are a summarization agent.

## Steps

1. Accept a URL from the user.
2. Fetch the page using `curl -sL`.
3. Extract the main content, ignoring navigation, headers, and footers.
4. Produce a summary of no more than 200 words.

## Rules

- Never output raw HTML.
- If the URL returns an error status code, report the error and stop.
- Do not follow more than two redirects.
```

A few guidelines for good instructions:

- **Use numbered steps** for sequential workflows. Models follow ordered lists more reliably than prose paragraphs.
- **State constraints explicitly.** If the skill should not write to disk, say so. If it should limit output length, specify the limit.
- **Avoid ambiguity.** "Summarize the page" is vague. "Return a summary of no more than 200 words covering the main argument" is specific.

## Testing Locally

Before you submit, test your skill with the Forge CLI. There are two commands you should use.

### Audit the Trust Report

```bash
forge skills audit skills/summarize-url/SKILL.md
```

This runs the full autowire pipeline — Scanner, Parser, Analyzer, Evaluator — and prints every finding. You want to see a trust level of `trusted` or at minimum `under_review`. If you see `untrusted` or `failed`, the audit output will tell you exactly which checks flagged issues and at what severity.

Common issues that lower trust:

- Declaring broad egress wildcards like `*.com` instead of specific domains.
- Referencing dangerous binaries (`nc`, `dd`, `chmod`) in the `bins` list.
- Instruction text that mentions sensitive paths like `~/.ssh/` or `/etc/passwd`.
- Code blocks that use `eval`, `exec`, or download-and-run patterns.

Fix these, re-run the audit, and iterate until the trust level is acceptable.

### Run the Skill

```bash
forge run --skill skills/summarize-url/SKILL.md
```

This starts an interactive session using your skill. Test it with real inputs. Make sure the agent follows the instructions correctly, respects the constraints you defined, and produces useful output. Check the audit log at `.forge/audit.log` to confirm that only your declared egress domains were contacted.

## Submitting a Pull Request

Once your skill passes the audit and works correctly, submit it to the forge-skills repository.

1. **Fork the repo**: `gh repo fork initializ/forge-skills --clone`
2. **Create a branch**: `git checkout -b add-summarize-url`
3. **Add your skill directory** under `skills/` with at least the `SKILL.md` file.
4. **Commit and push**: use a clear commit message like `Add summarize-url skill`.
5. **Open a PR**: target the `main` branch. In the PR description, include:
   - What the skill does.
   - The output of `forge skills audit` showing the trust level.
   - Any environment variables or external services required to test it.

## The Review Process

After you open a PR, the following happens:

1. **Automated audit** — a CI job runs `forge skills audit` against your `SKILL.md` and posts the trust report as a PR comment. If the skill scores `untrusted` or `failed`, the CI check fails and you will need to address the findings before review proceeds.
2. **Maintainer review** — a Forge maintainer reviews the skill for quality: clear instructions, appropriate scope, correct frontmatter. They may suggest changes or ask questions.
3. **Trust level assignment** — once the skill is merged, Forge signs it with the registry publisher key and assigns the trust level from the audit. Community skills typically start as `under_review` unless the audit produces zero warnings, in which case they receive `trusted`.

Merged skills appear in the [Skill Hub](/skills) and can be installed by any Forge user with:

```bash
forge skills install summarize-url
```

## Tips for a Smooth Review

- Keep skills focused. One skill, one job. A skill that "fetches URLs, parses JSON, writes files, and sends emails" is trying to do too much and will likely score poorly on trust.
- Declare everything. If your skill uses `curl`, list it in `bins`. If it calls an API, list the domain in `egress`. Undeclared dependencies are the most common reason for trust failures.
- Include examples. A `examples/` directory with sample inputs and expected outputs makes the reviewer's job easier and demonstrates that the skill works.
- Write a README. Not required, but a short `README.md` explaining the use case and any setup steps helps users who discover your skill in the registry.

Contributing skills makes the Forge ecosystem stronger. Every well-written skill is one less thing the next developer has to build from scratch.
