---
title: "How Forge Computes Trust for Every Skill"
description: "A deep dive into Forge's trust model — how skills are scanned, analyzed, and assigned trust levels automatically."
author: "Forge Team"
date: 2026-02-27
tags: ["architecture", "security"]
---

# How Forge Computes Trust for Every Skill

Forge does not ask you to decide whether a skill is safe. It computes trust automatically by running every skill through a four-stage autowire pipeline before execution. This post explains each stage, the security checks involved, and how trust levels are assigned.

## The Autowire Pipeline

When Forge encounters a `SKILL.md` file — whether embedded in your project, installed from the local filesystem, or fetched from a remote registry — it passes through four stages:

```
Scanner → Parser → Analyzer → Evaluator
```

Each stage has a single responsibility, and the output of one feeds directly into the next.

### Stage 1: Scanner

The Scanner reads the raw skill file and splits it into two regions: the YAML frontmatter block and the Markdown instruction body. It performs basic validation at this point — confirming the file has valid YAML delimiters, that required fields like `name` and `description` are present, and that the Markdown body is not empty.

If the Scanner cannot parse the file at all, the skill immediately receives a `failed` trust level and is excluded from execution.

### Stage 2: Parser

The Parser takes the structured output from the Scanner and builds an internal skill manifest. This manifest is a normalized data structure that contains:

- **Identity**: name, description, publisher.
- **Declared dependencies**: binary names (`bins`), required environment variables (`env`), optional environment variable groups (`env_one_of`).
- **Declared network surface**: the list of egress domains the skill says it needs.
- **Instruction blocks**: the parsed Markdown sections that will be sent to the model at runtime.

The Parser also extracts inline code blocks from the instruction body and tags them by language. This is important because the Analyzer needs to inspect code snippets for security-relevant patterns.

### Stage 3: Analyzer

The Analyzer is where security evaluation happens. It runs seven independent checks against the skill manifest and the parsed instruction body. Each check produces a finding with a severity level: `info`, `warning`, or `critical`.

#### Check 1 — Binary Dependencies

Forge inspects the `bins` list and compares each entry against a known-safe allowlist. Binaries like `curl`, `jq`, and `git` are common and expected. Binaries like `nc`, `dd`, or `chmod` raise warnings because they can be used for privilege escalation or data exfiltration. An unknown binary that is not on the allowlist produces an `info`-level finding so the Evaluator can factor it in.

#### Check 2 — Environment Variables

Forge verifies that every variable in the `env` list follows naming conventions and does not reference well-known credential variables (like `AWS_SECRET_ACCESS_KEY`) without also declaring an egress domain that justifies needing those credentials. A skill that requests `DATABASE_URL` but declares no egress domains raises a `warning`.

#### Check 3 — Egress Domains

Each domain in the `egress` list is checked for breadth. Wildcard domains like `*.*` or `*.com` are `critical` findings. Broad wildcards like `*.amazonaws.com` are `warning`-level. Specific domains like `api.openai.com` pass cleanly. Forge also cross-references egress domains against a blocklist of known data-exfiltration endpoints.

#### Check 4 — Inline Code Analysis

The Analyzer scans every code block extracted by the Parser. It looks for patterns that suggest dangerous behavior: writing to `/etc`, reading from `/proc`, invoking `eval` or `exec`, opening raw sockets, or downloading and executing remote scripts. Each matched pattern produces a finding tied to the specific line and code block.

#### Check 5 — File System Access

Instruction text is scanned for references to sensitive file paths. A skill that mentions reading from `~/.ssh/`, `/etc/shadow`, or the user's home directory raises a `warning`. References to writing outside the current working directory or the `.forge/` directory produce a `critical` finding.

#### Check 6 — Privilege Escalation

Forge looks for instructions or code that use `sudo`, `su`, `doas`, or capabilities like `CAP_NET_RAW`. Any reference to running commands as root or changing file ownership raises a `critical` finding. Skills should never need elevated privileges in normal operation.

#### Check 7 — Secrets Exposure

The Analyzer checks whether the skill's instructions could cause secrets to leak. This includes patterns like echoing environment variables to stdout, writing them to files, or including them in URLs. A skill that tells the agent to "print the API key for debugging" would trigger a `critical` finding here.

### Stage 4: Evaluator

The Evaluator takes the full list of findings from the Analyzer and computes a final trust level. The logic is deterministic:

| Condition | Trust Level |
|-----------|-------------|
| Zero findings, or all findings are `info` | `trusted` |
| At least one `warning`, zero `critical` | `under_review` |
| At least one `critical` | `untrusted` |
| Scanner or Parser failed entirely | `failed` |

A skill with a `trusted` level runs without restrictions. An `under_review` skill runs but Forge logs additional telemetry and may prompt the user for confirmation depending on the `trust` settings in `forge.yaml`. An `untrusted` skill is blocked by default — it will not execute unless the operator explicitly overrides the trust level in configuration. A `failed` skill never runs.

## Trust Tiers by Skill Source

The source of a skill affects the baseline scrutiny it receives:

- **Embedded skills** — skills that live inside your project's repository. These receive the standard seven-check pipeline. Because you or your team authored them, the Evaluator gives slightly more weight to `info` findings and is less likely to escalate them.
- **Local skills** — skills installed from the filesystem outside your project (for example, from a shared company directory). These receive the same checks but start with no authorship trust. The Evaluator treats them identically to remote skills in terms of scoring.
- **Remote skills** — skills fetched from the Forge skill registry or a third-party URL. These receive the strictest evaluation. Forge additionally verifies the publisher signature, checks the skill's version against known-vulnerable versions, and compares the content hash against the registry's recorded hash to detect tampering.

## Inspecting Trust Results

You do not need to run a skill to see its trust evaluation. The `forge skills audit` command prints the full report:

```bash
forge skills audit SKILL.md
```

The output shows every check, its severity, a one-line explanation, and the final trust level. This is useful during development — you can iterate on your skill file and re-run the audit until you reach the trust level you want.

## Why This Matters

Traditional agent frameworks leave security to the operator. You write a prompt, attach tools, and hope the model does not misuse them. Forge inverts that model. Every skill declares its surface area upfront, and Forge verifies those declarations before the model ever sees the instructions.

The result is that security is not a review step — it is a build step. Trust is computed, not assumed. And because the entire pipeline is deterministic, the same skill file always produces the same trust level, making audits reproducible and diffs meaningful.
