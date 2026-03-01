---
title: Trust Model
description: "How Forge evaluates skill trust — trust levels, autowire pipeline, security analysis, and trust management."
order: 2
editUrl: https://github.com/initializ/useforge.ai/edit/main/src/content/docs/security/trust-model.md
---

# Trust Model

Trust is computed, not declared. Contributors cannot set their own trust level. Every skill goes through an automated evaluation pipeline that assigns a trust level based on validation results, security analysis, and source tier.

## Trust Levels

| Level | Value | Visible | Executable | Used For |
|---|---|---|---|---|
| Failed | -1 | No | No | Skills that fail validation or security analysis |
| Untrusted | 0 | Yes | No | Discovered but not evaluated, or failed remote signature |
| Under Review | 1 | Yes | No | Has warnings, pending admin promotion |
| Trusted | 2 | Yes | Yes | Passed all gates — fully active |

Only skills at trust level **Trusted (2)** are executable at runtime. Everything else is visible for inspection but cannot run.

## Trust Rules by Tier

Trust evaluation depends on where the skill comes from.

### Embedded Skills

Always **Trusted**. These are curated by Forge maintainers and ship with the binary.

### Local Skills (strict)

Local skills in your project's `skills/` directory follow strict rules:

- Validation failure --> **Failed**
- Security critical finding --> **Failed**
- Security warning --> **Under Review**
- All checks clean --> **Trusted**

### Remote Skills (leveled, pending)

Remote skills go through additional verification:

- Failed at remote source --> **Failed** (never shown in listings)
- Invalid signature --> **Untrusted**
- Untrusted registry --> capped at **Under Review**
- Trusted registry + all checks clean --> **Trusted**

## Autowire Pipeline

When you run `forge build` or `forge skills autowire`, every skill directory goes through four stages:

```
Directory Scanner --> Frontmatter Parser --> Security Analyzer --> Trust Evaluator
   Find dirs          Parse YAML           Verify hints        Assign trust
   with SKILL.md      + validate           vs actual content   level
```

The pipeline runs automatically during `forge build`. You can also run it explicitly:

```bash
forge skills autowire --dry-run
```

## Security Analyzer Checks

The security analyzer runs seven checks against each skill. Critical findings block the skill entirely. Warnings flag it for review.

| Check | What | Severity |
|---|---|---|
| Egress/network mismatch | `trust_hints.requires_network: false` but egress domains declared | Critical |
| Shell/scripts mismatch | `trust_hints.requires_shell: false` but `scripts/` exists | Critical |
| Dangerous script patterns | `curl\|sh`, `eval`, `rm -rf /`, `chmod 777` | Critical |
| Hardcoded secrets in scripts | `API_KEY=...` patterns | Critical |
| Broad binary request | Requiring `bash`, `sh` directly | Warning |
| Overly permissive egress | Wildcard patterns, CDN domains | Warning |
| Env var leak risk | Scripts that echo/print secrets | Warning |

## Trust Hints and Consistency Verification

The `trust_hints` block in SKILL.md frontmatter is optional. When present, the autowire pipeline verifies these hints against actual skill contents. A mismatch is treated as a trust violation.

For example, if a skill declares `requires_network: false` but also lists egress domains, the security analyzer flags this as a critical inconsistency and the skill is marked **Failed**.

Skills without `trust_hints` skip consistency checks entirely. They are still evaluated by the other security analyzer checks.

## CLI Commands

Manage trust levels with these commands:

```bash
# Full trust report for a skill
forge skills trust-report <name>

# Promote a skill from under_review to trusted
forge skills promote <name>

# Force a skill to failed status
forge skills block <name>

# Security audit with risk scores
forge skills audit
```

The `promote` and `block` commands are admin actions that override the computed trust level. Use them when you have reviewed a skill manually and want to change its status.

## What's Next

Learn how Forge stores and resolves secrets in [Secret Management](/docs/security/secret-management).
