---
title: Skills CLI Commands
description: "Every forge skills command — listing, validation, trust management, autowire, and security auditing."
order: 3
editUrl: https://github.com/initializ/useforge.ai/edit/main/src/content/docs/skills/skills-cli.md
---

# Skills CLI Commands

Forge provides a full set of CLI commands for managing skills throughout their lifecycle — from discovery and validation to trust management and security auditing. All skills commands live under the `forge skills` subcommand.

## forge skills list

List all skills with their trust levels, source tier, and metadata. Filterable by category and tags.

**Usage:**

```bash
forge skills list [--category <name>] [--tags <a,b>]
```

**Flags:**

| Flag | Description |
|---|---|
| `--category <name>` | Filter by category (e.g., `sre`) |
| `--tags <a,b>` | Filter by tags, comma-separated (AND semantics) |

**Example:**

```bash
$ forge skills list
NAME                  TRUST      SOURCE     CATEGORY  BINS
summarize             trusted    embedded   —         summarize
github                trusted    embedded   —         gh
weather               trusted    embedded   —         curl
tavily-search         trusted    embedded   —         curl, jq
tavily-research       trusted    embedded   —         curl, jq
k8s-incident-triage   trusted    embedded   sre       kubectl
site-check            trusted    local      —         curl
word-count            under_review local    —         —
```

```bash
$ forge skills list --category sre --tags kubernetes,kubectl
NAME                  TRUST      SOURCE     CATEGORY  BINS
k8s-incident-triage   trusted    embedded   sre       kubectl
```

Tags use AND semantics — a skill must have all specified tags to appear in the results.

**When to use:** To see what skills are available, check their trust status, or filter by category and tags before running your agent.

## forge skills validate

Run the autowire pipeline on all skills in the project. Validates frontmatter schema, binary dependencies, environment variables, and trust hints for every discovered skill.

**Usage:**

```bash
forge skills validate
```

**Example:**

```bash
$ forge skills validate
Validating skills...
  summarize          ok
  github             ok
  weather            ok
  tavily-search      ok
  tavily-research    ok
  k8s-incident-triage ok
  site-check         ok
  word-count         ok (under_review: no trust_hints declared)

8 skills validated, 0 errors, 1 warning
```

**When to use:** After adding or modifying skills, before running `forge build`, or as part of a CI pipeline.

## forge skills validate \<path\>

Validate a single skill directory instead of all skills.

**Usage:**

```bash
forge skills validate <path>
```

**Example:**

```bash
$ forge skills validate skills/weather
Validating skills/weather...
  weather            ok

1 skill validated, 0 errors, 0 warnings
```

**When to use:** When iterating on a specific skill and you want fast feedback without validating the entire project.

## forge skills trust-report \<name\>

Show the full trust report for a specific skill. Includes the trust level, findings from the security analyzer, and details about what was checked.

**Usage:**

```bash
forge skills trust-report <name>
```

**Example:**

```bash
$ forge skills trust-report k8s-incident-triage
Trust Report: k8s-incident-triage
  Trust Level:     trusted
  Source:          embedded
  Category:        sre
  Tags:            kubernetes, incident-response, triage, reliability,
                   observability, kubectl, oncall, runbooks

  Requirements:
    bins:          kubectl (found at /usr/local/bin/kubectl)
    env.required:  (none)
    env.optional:  KUBECONFIG, K8S_API_DOMAIN, DEFAULT_NAMESPACE,
                   TRIAGE_MAX_PODS, TRIAGE_LOG_LINES

  Egress:          $K8S_API_DOMAIN (dynamic)
  Denied Tools:    http_request, web_search

  Security Analysis:
    trust_hints:   all verified, no mismatches
    script scan:   no scripts (binary-backed)
    consistency:   ok

  Findings:        0 critical, 0 warnings
```

**When to use:** To understand why a skill was assigned a particular trust level, to debug trust failures, or to review a skill's security posture before promoting it.

## forge skills autowire

Run the autowire pipeline explicitly. This performs the full scan, parse, security analysis, and trust evaluation sequence.

**Usage:**

```bash
forge skills autowire [--dry-run]
```

**Flags:**

| Flag | Description |
|---|---|
| `--dry-run` | Show what would happen without making changes |

**Example:**

```bash
$ forge skills autowire --dry-run
Autowire pipeline (dry run):
  scan:     8 skills discovered
  parse:    8 SKILL.md files parsed
  security: 0 violations, 1 advisory
  trust:    7 trusted, 1 under_review, 0 failed

No changes written (dry run).
```

**When to use:** When you want to run the autowire pipeline independently of `forge build`, or with `--dry-run` to preview trust evaluations before committing.

## forge skills refresh

Re-scan local skills and re-fetch remote skills (when remote skill sources are implemented). Updates the internal skill index with any changes on disk.

**Usage:**

```bash
forge skills refresh
```

**Example:**

```bash
$ forge skills refresh
Scanning skills directory...
  8 skills found (0 new, 0 removed, 1 modified)
  Re-evaluating modified skills...
  word-count: under_review -> trusted (trust_hints added)
Done.
```

**When to use:** After modifying skill files outside of the normal `forge build` workflow, or when you want to pick up changes without a full rebuild.

## forge skills promote \<name\>

Admin action: promote a skill from `under_review` to `trusted`. This overrides the autowire evaluation and allows the skill to run without restriction.

**Usage:**

```bash
forge skills promote <name>
```

**Example:**

```bash
$ forge skills promote word-count
Promoted word-count: under_review -> trusted
```

**When to use:** When you have reviewed an `under_review` skill and are satisfied that it is safe. This is an explicit trust decision — you are vouching for the skill's behavior.

## forge skills block \<name\>

Admin action: force a skill to `failed` status. This prevents the skill from running regardless of its autowire evaluation.

**Usage:**

```bash
forge skills block <name>
```

**Example:**

```bash
$ forge skills block suspicious-skill
Blocked suspicious-skill: trusted -> failed
```

**When to use:** When you need to immediately disable a skill due to security concerns, unexpected behavior, or policy violations.

## forge skills add \<name\>

Add a skill from the embedded registry to your project. Copies the SKILL.md and all scripts into your project's `skills/` directory, checks for required environment variables, and deduplicates `.env` entries.

**Usage:**

```bash
forge skills add <name>
```

**Example:**

```bash
$ forge skills add weather
Adding weather to skills/weather/...
  Copied SKILL.md
  Checking requirements...
    curl: found at /usr/bin/curl
  No required environment variables.
Done. Run 'forge build' to include weather in your agent.
```

**When to use:** To add a built-in skill to your project. This is the quickest way to give your agent new capabilities.

## forge skills audit

Run a security audit across all skills. Produces risk scores, policy checks, and actionable findings. Use `--format json` for machine-readable output.

**Usage:**

```bash
forge skills audit [--format json]
```

**Flags:**

| Flag | Description |
|---|---|
| `--format json` | Output in JSON format for CI pipelines and tooling |

**Example:**

```bash
$ forge skills audit
Security Audit Report
=====================

  summarize            risk: low      egress: 1 domain    bins: 1
  github               risk: low      egress: 1 domain    bins: 1
  weather              risk: low      egress: 2 domains   bins: 1
  tavily-search        risk: low      egress: 1 domain    bins: 2
  tavily-research      risk: low      egress: 1 domain    bins: 2
  k8s-incident-triage  risk: medium   egress: dynamic     bins: 1
  site-check           risk: low      egress: 0 domains   bins: 1
  word-count           risk: low      egress: 0 domains   bins: 0

Summary: 8 skills, 0 high risk, 1 medium risk, 7 low risk
```

```bash
$ forge skills audit --format json
{
  "skills": [
    {
      "name": "weather",
      "risk": "low",
      "egress_domains": 2,
      "bins": 1,
      "findings": []
    }
  ],
  "summary": {
    "total": 8,
    "high": 0,
    "medium": 1,
    "low": 7
  }
}
```

**When to use:** As part of a security review, in CI pipelines, or before deploying to production. The JSON format integrates with security tooling and dashboards.

## forge skills sign

Sign a skill directory with an Ed25519 key. The signature is stored alongside the skill and verified during trust evaluation.

**Usage:**

```bash
forge skills sign --key <path>
```

**Example:**

```bash
$ forge skills sign --key ~/.forge/keys/my-key.ed25519
Signing skills/weather...
  Signed with key: my-key (fingerprint: abc123...)
  Signature written to skills/weather/.signature
```

**When to use:** Before distributing a skill to others or publishing it. Signatures allow consumers to verify the skill's authenticity and integrity.

## forge skills keygen \<name\>

Generate an Ed25519 key pair for skill signing. Keys are stored in `~/.forge/keys/`.

**Usage:**

```bash
forge skills keygen <name>
```

**Example:**

```bash
$ forge skills keygen my-key
Generated Ed25519 key pair:
  Private: ~/.forge/keys/my-key.ed25519
  Public:  ~/.forge/keys/my-key.ed25519.pub

Keep the private key secure. Share the public key with skill consumers.
```

**When to use:** Before signing skills for the first time. You only need to generate a key pair once.

## forge validate

Not a skills-specific command, but closely related. Runs schema validation, command compatibility checks, and requirements verification across your entire project configuration.

**Usage:**

```bash
forge validate
```

**Example:**

```bash
$ forge validate
Validating forge.yaml...        ok
Validating skills...            ok (8 skills)
Validating egress config...     ok
Validating channel config...    ok

All checks passed.
```

**When to use:** As a comprehensive pre-build check. This covers everything `forge skills validate` does, plus configuration and channel validation.

## What's Next

Learn how to contribute skills back to the Forge project in [Contributing a Skill](/docs/skills/contributing-a-skill).
