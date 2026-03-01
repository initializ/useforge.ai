---
title: Agent Skills Compatibility
description: "How Forge implements the Agent Skills standard — SKILL.md format, metadata.forge namespace, and the three-layer stack."
order: 4
editUrl: https://github.com/initializ/useforge.ai/edit/main/src/content/docs/reference/agent-skills-compatibility.md
---

# Agent Skills Compatibility

Forge is an open-source runtime for Anthropic's Agent Skills standard. Every skill is defined by a `SKILL.md` file that works with or without Forge. This page explains how Forge implements the standard, what it adds, and why skills remain portable.

## SKILL.md as Standard Format

A SKILL.md file has two parts:

1. **YAML frontmatter** — structured metadata for the runtime
2. **Markdown body** — natural-language instructions for the LLM

The frontmatter fields `name` and `description` are universal. Any runtime that understands the Agent Skills standard can read them. The `metadata` section is namespaced, allowing runtime-specific extensions without breaking compatibility.

```yaml
---
name: summarize
description: Summarize URLs, files, PDFs, YouTube videos.
metadata:
  forge:
    requires:
      bins: [summarize]
    egress:
      - api.openai.com
---

# Summarize

You can summarize content from URLs, local files, and PDFs.
```

A SKILL.md works without Forge. Any agent runtime that reads markdown can use the body as LLM instructions. The frontmatter metadata is ignored by runtimes that do not recognize the namespace.

## `metadata.forge` Namespace

Forge extends the standard through the `metadata.forge` namespace. Other runtimes can safely ignore this section.

| Field | Purpose |
|---|---|
| `metadata.forge.requires` | Binary and environment dependencies. Validated at build time via `exec.LookPath` and env checks. |
| `metadata.forge.egress_domains` | Domain allowlist entries. Merged into the egress allowlist during `forge build`. |
| `metadata.forge.denied_tools` | Tools to exclude when this skill is active. Prevents conflicting tool usage. |
| `metadata.forge.timeout_hint` | Execution timeout in seconds. Propagated to the `SkillCommandExecutor`. Default: `120`. |
| `metadata.forge.trust_hints` | Capability declarations (`requires_network`, `requires_filesystem`, `requires_shell`, `max_execution_seconds`). Verified by the autowire security analyzer — never trusted blindly. |

Other namespaces (e.g., `metadata.clawdbot`, `metadata.langchain`) are tolerated and ignored by Forge. Your skill can include metadata for multiple runtimes simultaneously.

## Three-Layer Stack

Forge sits between the universal skill format and the distribution layer:

```
Agent Skills Standard  <-- Universal skill format (SKILL.md)
       |
     Forge             <-- Open-source runtime (egress, trust, signing, audit)
       |
   Forge Hub           <-- Skill discovery and distribution
```

- **Agent Skills Standard** defines the portable format. A SKILL.md is a skill definition that any runtime can read.
- **Forge** is the runtime that adds security, trust evaluation, and operational features.
- **Forge Hub** is the discovery and distribution layer where you browse, search, and install skills.

Each layer is independent. You can use SKILL.md files without Forge, use Forge without Forge Hub, or use all three together.

## What Forge Adds Beyond the Standard

The Agent Skills standard defines what a skill _is_. Forge defines how a skill is _evaluated, secured, and operated_.

### Egress Security

Domain-level network control. Every outbound HTTP request passes through the `EgressEnforcer`. Skills declare which domains they need, and Forge blocks everything else.

### Trust Model

Computed trust evaluation via the autowire pipeline. Trust is computed, not declared — the runtime analyzes skill contents, verifies `trust_hints` against actual behavior, and assigns a trust level. A skill that declares `requires_network: false` while listing egress domains fails validation.

### Build Signing

Ed25519 artifact verification. You can sign skill directories and verify signatures before deployment. Signed skills carry cryptographic proof of origin.

### Audit Logging

NDJSON event trail for every tool invocation, egress attempt, and skill load. Provides a complete audit record for compliance and debugging.

### Memory System

Session persistence and long-term cross-session memory. The memory system is runtime infrastructure — skills benefit from it without needing to implement anything.

### Channel Connectors

Slack and Telegram integration. Channels connect your agent to messaging platforms and run alongside the agent via `forge serve --with <channel>`.

## Design Principles

These principles guide how skills interact with the Forge runtime:

- **Skills are LLM-facing content, not Go code.** A SKILL.md is markdown that the LLM reads. Scripts in the `scripts/` directory are executables, not importable packages.

- **Adding a skill never requires touching forge-core.** Drop a SKILL.md into `skills/` and run `forge build`. The autowire pipeline discovers it automatically.

- **No central index file to edit.** Skills are discovered by scanning the `skills/` directory tree. There is no manifest, registry file, or import map to maintain.

- **Skills are portable across runtimes.** The `metadata.forge` namespace is additive. A SKILL.md without it is still a valid skill. A SKILL.md with it works in any runtime that ignores unknown namespaces.

- **No lock-in.** SKILL.md works without Forge. `forge export` generates an AgentSpec JSON file you can import into Initializ Command or any compatible orchestrator.

## What's Next

- [FAQ](/docs/faq) — common questions about Forge, skills, and deployment
