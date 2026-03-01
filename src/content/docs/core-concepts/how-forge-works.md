---
title: How Forge Works
description: "Understand Forge's core pipeline — from SKILL.md to a running, secure AI agent."
order: 1
editUrl: https://github.com/initializ/useforge.ai/edit/main/src/content/docs/core-concepts/how-forge-works.md
---

# How Forge Works

Forge turns a SKILL.md into a portable, secure, runnable AI agent. This page walks you through every stage of that pipeline — from directory scanning to the running agent loop — so you understand exactly what happens when you run `forge build` and `forge run`.

## Core Pipeline

The full pipeline from source to running agent looks like this:

```
SKILL.md → autowire (scan → parse → security → trust)
         → discover tools + requirements
         → compile AgentSpec → apply egress security
         → secret safety check → checksum + sign artifacts
         → decrypt secrets → run LLM agent loop
```

Each stage is deterministic and auditable. Nothing is hidden behind magic defaults — you can inspect every intermediate artifact in `.forge-output/`.

## Autowire

Autowire is the build-time pipeline that discovers, validates, and evaluates your skills. It runs automatically during `forge build` and consists of four stages:

### 1. Directory Scanner

The scanner walks your `skills/` directory looking for `SKILL.md` files. Each directory containing a SKILL.md is treated as a skill. The top-level `SKILL.md` in your project root is also discovered as the primary skill.

### 2. Frontmatter Parser

Each SKILL.md is split into YAML frontmatter and a markdown body. The parser extracts structured metadata — name, description, requirements, egress domains, trust hints — and validates it against the expected schema. Malformed frontmatter fails the build.

### 3. Security Analyzer

The security analyzer verifies that a skill's declared trust hints match its actual contents. For example:

- Declaring `requires_network: false` while listing egress domains is a contradiction
- Declaring `requires_shell: false` while requiring binaries is a contradiction
- Declaring `requires_filesystem: true` when nothing in the skill touches the filesystem is a warning

These checks ensure trust hints are honest. Mismatches produce findings that feed into the next stage.

### 4. Trust Evaluator

Based on the security analyzer's findings, each skill receives a computed trust level:

| Trust Level | Meaning |
|---|---|
| **Trusted** | No findings. The skill runs without restriction. |
| **UnderReview** | Warnings found. The skill runs but is flagged. Use `forge skills promote <name>` to approve it. |
| **Failed** | Critical findings. The skill is blocked from running. |

Trust is computed, not declared. A skill cannot assert its own trust level — it earns one through analysis.

## Tool Discovery

After autowire validates your skills, Forge discovers all available tools:

- **8 builtin tools** are always available — `http_request`, `json_parse`, `csv_parse`, `datetime_now`, `uuid_generate`, `math_calculate`, `web_search`, and `read_skill`
- **Skill tools** are auto-registered from scripts in each skill's `scripts/` directory. Each script becomes a first-class tool the LLM can call by name.
- **`cli_execute`** is registered when binary-backed skills are present, allowing the LLM to run allowlisted binaries
- **Conditional tools** (`memory_search`, `memory_get`) are only registered when long-term memory is enabled in your configuration

## AgentSpec Compilation

Once tools are discovered and trust is evaluated, Forge compiles everything into an AgentSpec:

- Skills are compiled into the system prompt. Binary-backed skill bodies are injected inline as a catalog the LLM can browse via `read_skill`.
- Script-backed skills are registered as first-class tools with JSON Schema definitions derived from their `InputSpec` tables.
- The system prompt includes the agent's identity, available tools, skill catalog, and any configured constraints.

The compiled AgentSpec is a self-contained description of your agent that can be exported, versioned, and deployed.

## Egress Security

Forge enforces network egress at runtime so your agent can only reach domains you have explicitly allowed.

The egress allowlist is resolved by merging three sources:

1. **Explicit domains** — listed in `forge.yaml` under `egress.allowed_domains`
2. **Tool-inferred domains** — derived from tool configurations (e.g., `web_search` needs `api.tavily.com`)
3. **Capability bundles** — domains required by enabled capabilities (e.g., LLM provider API endpoints)

The `Resolve()` function merges and deduplicates these sources. At runtime, the `EgressEnforcer` wraps Go's `http.RoundTripper` interface. Every outbound HTTP request passes through this enforcer — if the target domain is not on the allowlist, the request is blocked before it leaves the process.

## Agent Loop

Once the agent is running, the core loop is straightforward:

1. The LLM receives a user message (plus conversation history and system prompt)
2. The LLM selects one or more tools to call based on the message
3. Tools execute with egress enforcement, timeout limits, and env isolation
4. Tool results are fed back to the LLM
5. The LLM generates a response, which is streamed back to the user

This loop repeats for each user message. In `forge run` mode, it runs in a single interactive session. In `forge serve` mode, it handles multiple concurrent sessions over HTTP with SSE streaming.

## Module Architecture

Forge is organized into focused modules with clear dependency boundaries:

| Module | Role |
|---|---|
| **forge-core** | Pure library — autowire, agent loop, egress, memory, tool system. No CLI, no I/O assumptions. |
| **forge-cli** | Thin CLI layer — commands, TUI wizard, output formatting. Depends on forge-core. |
| **forge-plugins** | Channel implementations — Slack, Telegram. Each channel is a separate plugin. |
| **forge-skills** | Skill registry and contracts — defines the skill interface and ships embedded skills. |
| **forge-sdk** | Future SDKs for building skills in other languages (planned). |

The dependency direction flows inward: `forge-cli` depends on `forge-core`, which depends on `forge-skills/contract`. No circular dependencies. The core library has no knowledge of CLI concerns, and channels are pluggable without modifying core.

## Build Outputs

Running `forge build` produces these artifacts in `.forge-output/`:

| Artifact | Purpose |
|---|---|
| `agent-spec.json` | Complete agent specification — exportable to Initializ Command |
| `skill-index.json` | Autowire-generated skill index with trust levels and metadata |
| `egress_allowlist.json` | Machine-readable domain allowlist with source annotations |
| `Dockerfile` | Container image definition for deployment |
| `k8s/` | Kubernetes manifests including NetworkPolicy for egress enforcement |
| `checksums.json` | SHA-256 checksums + optional Ed25519 signature for artifact integrity |

Every artifact is deterministic — the same source produces the same output. The checksums file lets you verify nothing was tampered with between build and deploy.

## What's Next

- [SKILL.md Format](/docs/core-concepts/skill-md-format) — deep dive into every frontmatter field and the markdown body conventions
