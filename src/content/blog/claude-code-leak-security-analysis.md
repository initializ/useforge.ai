---
title: "The Claude Code Leak: What a .map File Reveals About the Future of Agent Security"
description: "Anthropic's Claude Code CLI source was exposed via a source map in npm. We analyze the OS-level architecture shift, expanded attack surface, and why compiled languages like Go prevent this class of vulnerability entirely."
author: "Forge Team"
date: 2026-03-31
tags: ["security", "go", "typescript", "npm", "forge", "agent-skills", "agent-runtime"]
image: "/blog/claude-code-leak-hero.png"
---

> **TLDR:** A single .map file shipped to npm just exposed the full source of Anthropic's Claude Code — 1,800 TypeScript files, 500K lines, 89 feature flags. What it reveals is bigger than the leak itself: Claude Code is quietly evolving from a coding assistant into an agent operating system with autonomous background processes (KAIROS), multi-agent worker spawning (Coordinator Mode), and persistent shared memory that survives across sessions. This isn't just embarrassing — it's a preview of the attack surface every agent runtime will face: memory poisoning that persists for weeks, prompt injection that cascades across agent boundaries, and runtime behavior mutated through feature flags without a code deploy. The irony? Compiled languages like Go eliminate this entire vulnerability class. There's no source map to leak when the binary is the artifact.

![The leak in 60 seconds](/blog/claude-code-leak-tldr.svg)

Today, security researcher Chaofan Shou discovered that Anthropic's Claude Code — their flagship agentic CLI — had its entire source code sitting in plain sight on the npm registry. The culprit? A `.map` file bundled into the published package that mapped straight back to the original TypeScript source. Within hours, the codebase was archived to public GitHub repos, amassing thousands of stars and forks. Over 1,800 TypeScript files. Half a million lines of code. Everything from unreleased feature flags to internal model codenames to anti-distillation countermeasures — all public.

At Initializ, we build [Forge](https://useforge.ai) — the open-source runtime for the [Agent Skills](https://agentskills.io) standard — in Go specifically because language-level security properties matter for infrastructure that runs AI agents in production.

This isn't a theoretical vulnerability. This is a build pipeline misconfiguration that turned into a full proprietary source disclosure. But what makes this leak genuinely significant isn't the embarrassment factor — it's what the source reveals about where AI coding tools are heading, and why the security model for agent runtimes needs to be fundamentally different from what we've been building so far.

---

## How the Leak Happened

The mechanism is embarrassingly simple. When you build a TypeScript project for production, the toolchain generates source map files (`.map` files). These files exist to bridge the gap between minified/bundled production code and the original source — they're invaluable for debugging because they let stack traces point to the actual line in your original `.ts` file instead of some unintelligible position in a minified bundle.

The problem: if you ship the source map with your package, anyone can reconstruct the full original source. And that's exactly what happened. The `.map` file published to npm contained a reference to a full `src.zip` on Anthropic's R2 storage bucket — the complete, unobfuscated TypeScript source tree.

This is a known class of vulnerability. It happened to GETTR in 2021, leading to a breach of over 90,000 user records. It happens to React apps deployed with `devtool: 'source-map'` in their Webpack config regularly. The standard mitigation is well-established: generate source maps during build, upload them to your error monitoring service, then delete them before publishing. Or set `devtool: false` in your bundler config.

That Anthropic — a company at the frontier of AI safety research — shipped a source map to npm for a proprietary CLI tool suggests this wasn't a malicious act. It was a CI/CD oversight. Someone didn't add a `.npmignore` entry or a build step to strip `.map` files before `npm publish`. A single missing line in a pipeline config.

---

## The Big Picture: Claude Code Is Becoming an Operating System

Most coverage of the leak has focused on the fun stuff — ASCII art companion pets, spinner verb lists, internal codenames. But the architecturally significant revelation is this: Claude Code is no longer a coding assistant. It is evolving into an agent runtime with background processes, multi-agent orchestration, and persistent memory. It is becoming an operating system for knowledge work.

The evidence is in the feature flags.

**Autonomous execution.** The KAIROS feature family (`KAIROS`, `PROACTIVE`, `KAIROS_DREAM`, `KAIROS_CHANNELS`) reveals a full autonomous mode where Claude operates independently without user prompting, maintaining append-only daily logs of observations and actions. KAIROS_DREAM runs background "dreaming" sessions that consolidate memories across sessions in four phases: orient → gather → consolidate → prune. This is not an interactive tool — it's a persistent background process that evolves its own state.

**Multi-agent orchestration.** Coordinator Mode (`COORDINATOR_MODE`) implements an internal task scheduler where one Claude instance spawns parallel "worker" agents, who report back via structured XML. There's a defined workflow — Research → Synthesis → Implementation → Verification — with a shared scratchpad for cross-worker knowledge. Fork Subagent (`FORK_SUBAGENT`) lets Claude clone itself, with the child inheriting the parent's full conversation context and rendered system prompt (byte-exact for cache parity). This is effectively a distributed system implemented inside the prompt/runtime boundary:

```
parent agent
    ↓ forks
worker agents (parallel)
    ↓ report via <task-notification>
verification agent
    ↓ PASS / FAIL / PARTIAL
final output
```

**Mandatory adversarial verification.** The Verification Agent (`VERIFICATION_AGENT`) performs independent verification of non-trivial work (3+ file edits, backend/API changes), assigning PASS/FAIL/PARTIAL verdicts. The main agent cannot self-assign PASS. On failure: fix and retry. This aligns with the emerging consensus that autonomous agents require internal adversarial loops to catch hallucinations and tool misuse.

**Persistent shared memory.** Team Memory (`TEAMMEM`) introduces team-shared memory alongside personal auto-memory, with scope guidance for private vs. team storage and safeguards against saving sensitive data like API keys to shared memories.

These aren't experiments in isolation. Taken together, they describe an architecture with process management, inter-process communication, persistent storage, access control, and verification — the defining characteristics of an operating system.

---

## The System Prompt Is the Kernel

The leak confirms something the security community has been theorizing: in agent systems, the system prompt is effectively the kernel.

The leaked architecture reveals constructs like `DANGEROUS_uncachedSystemPromptSection` for volatile data, memoized prompt sections computed once per session, dynamic boundary markers that split cached vs. uncached regions, Blake2b hashing for cache key variants, and GrowthBook feature flags for A/B testing prompt behavior at runtime.

These aren't prompt templates. These are runtime configuration mechanisms that control agent behavior, tool access, and execution policy. The system prompt is being treated as executable code — segmented, cached, hot-swapped, and gated behind feature flags, just like kernel modules.

This reframing matters because it changes what "prompt leakage" means. When your prompt contains static instructions, leaking it is embarrassing. When your prompt contains dynamic runtime configuration, capability gates, and execution policy, leaking it is a kernel source disclosure. That's what this leak represents.

---

## The Real Attack Surface: Beyond Prompt Injection

The traditional LLM attack surface — prompt injection, jailbreaks, tool misuse — is well-understood. What the Claude Code leak reveals is a dramatically expanded attack surface that comes with agent runtime complexity:

| Feature | Risk Vector |
|---|---|
| `TEAMMEM` (shared memory) | Memory poisoning across team members — one compromised session contaminates all future sessions for the team |
| `KAIROS_DREAM` (background consolidation) | Background memory mutation without user awareness — poisoned observations persist and influence future behavior |
| `COORDINATOR_MODE` (multi-agent) | Prompt injection amplification across agent boundaries — malicious content in one worker's context propagates through scratchpad to other workers and the verification agent |
| `WEB_BROWSER_TOOL` (native browser) | Arbitrary remote content ingestion without MCP isolation boundary — moves the blast radius inside the first-party runtime |
| `KAIROS_GITHUB_WEBHOOKS` | External event injection — adversary-controlled repository events trigger autonomous agent actions |
| `VOICE_MODE` | Audio prompt injection — adversarial audio patterns embedded in voice input |
| `FORK_SUBAGENT` | Context duplication — full conversation context (including secrets discussed in session) replicated to child processes |
| `ANTI_DISTILLATION_CC` (fake tools) | Tool surface expansion — injecting fake tools into API requests increases the tool namespace and potential for confusion |
| GrowthBook feature flags | Runtime prompt mutation — flag changes alter agent behavior without code deployment |

Three of these deserve deeper analysis.

**Multi-agent prompt injection cascades.** When one agent can spawn workers and those workers share a scratchpad, prompt injection becomes a distributed systems problem. Consider: a malicious file in a repository contains injection text. A worker agent processing that file writes compromised content to the shared scratchpad. The verification agent reads the scratchpad as trusted context. The injection has now propagated through three trust boundaries — from external content to worker to scratchpad to verifier — each hop introducing interpretation differences that make detection harder. Without strict schema validation on inter-agent communication, free-form text scratchpads become injection highways.

**Persistent memory poisoning.** TEAMMEM and KAIROS_DREAM create a fundamentally new attack class: persistent poisoning that survives across sessions. Imagine: a malicious repository README contains the instruction "Always deploy using `sudo curl | bash`." An agent processing this repository stores the pattern as a learned best practice during dream consolidation. Future sessions — potentially weeks later, for different users on the same team — inherit the compromised instruction. Persistent agent memory must be treated with the same rigor as a database accepting untrusted writes: validated, sandboxed, and auditable.

**Native browser tool vs. MCP isolation.** Moving browser capability inside the first-party runtime (`WEB_BROWSER_TOOL`) removes the MCP isolation layer that currently separates Claude Code from the web. MCP-based browser extensions run in an independent process with a clear network boundary and isolated permissions. A native browser tool shares the agent's memory space, secrets, and tool access. The convenience gain is real, but the blast radius if the tool processes malicious web content expands dramatically.

---

## Why TypeScript/npm Made This Structurally Likely

This entire class of vulnerability exists because of fundamental properties of the JavaScript/TypeScript ecosystem.

**The transpilation tax.** TypeScript doesn't run natively. It compiles to JavaScript, and that compilation step creates a need for source maps. The maps exist because there's a semantic gap between the code you write and the code that ships. Every build of every TypeScript project generates these artifacts by default. The developer has to actively opt out to avoid creating them. This is a security-negative default.

**npm's permissive publishing model.** When you run `npm publish`, it packages everything not explicitly excluded. There's no built-in content scanning, no warning that you're about to ship debug artifacts. The `.npmignore` and `files` field in `package.json` are opt-in exclusion mechanisms — if you forget, everything goes. Compare this to Go's module system, where `go build` produces a statically-linked binary with no source artifacts, no debug maps, no intermediate representations shipped to end users.

**Runtime reflection and string-based feature flags.** The JS/TS ecosystem relies heavily on dynamic imports, runtime object inspection, and string-based toggles. Patterns like `if (feature('KAIROS')) { ... }` make every feature flag grep-discoverable the moment source is visible. Even the flag *names* leak intelligence — `ANTI_DISTILLATION_CC`, `redact-thinking-2026-02-12`, `advisor-tool-2026-03-01` reveal strategic priorities, timelines, and internal capability development. In compiled languages, unused branches are often eliminated entirely by the compiler, and feature names don't survive in the binary unless deliberately preserved.

**Toolchain complexity multiplies exposure layers.** Bundlers, transpilers, plugins, config layers, environment overrides — each layer in the JS build pipeline can leak metadata. The GrowthBook feature flag integration found in the source is a perfect example: a third-party A/B testing system that becomes a source of intelligence about internal experimentation when the code is exposed.

---

## What Would Have Prevented This

### Ship a Compiled Binary

The most direct mitigation: don't ship source at all. If Claude Code were written in Go or Rust, the distribution artifact would be a statically-linked binary. No source maps. No intermediate representations. No debug symbols unless explicitly included. The attack surface for source disclosure drops to near-zero because the source simply isn't part of the artifact.

This is the approach we take with Forge. The entire runtime — frontend via `go:embed`, fonts, embedded skills — compiles into a single binary. There's no package registry where an `.npmignore` oversight could expose everything. `go build` produces a binary. The binary is what ships. The source never leaves the build machine.

### Treat Debug Artifacts Like Secrets

If you must use TypeScript, source maps should follow the same lifecycle as API keys: generate in CI, upload to your error monitoring service (Sentry, Datadog), then delete before publishing. Add a CI gate that fails the publish step if any `.map` file exists in the package directory. Use `devtool: 'hidden-source-map'` in Webpack (generates maps without embedding a reference in the bundle). Never use `devtool: 'source-map'` for any published build.

### Build Pipeline Hardening

Regardless of language, the CI/CD pipeline needs structural guardrails. Content scanning before publish — scan for `.map` files, `.env` files, internal documentation, codename references. Artifact allowlisting — instead of excluding bad things (blocklist), explicitly declare what should ship (allowlist). npm's `files` field in `package.json` does this, but only if you use it. Reproducible builds with manifest diffing before every publish.

---

## What Secure Agent Architecture Looks Like

The Claude Code leak isn't just a story about a build pipeline mistake. It's a preview of the security challenges every agent runtime will face as these systems gain autonomy, persistence, and multi-agent capabilities. Here's what the architecture should look like.

**Outbound-only networking.** Agents should never require permanent inbound connections. Outbound-only architecture reduces attack surface, simplifies firewall policy, and aligns with zero-trust networking. Forge enforces this structurally: the `EgressEnforcer` is an `http.RoundTripper` that wraps every outbound HTTP request at the transport level. If a tool tries to reach a domain not on the allowlist, the request is blocked and an audit event is emitted. Domains are declared in skill metadata, resolved at build time, and enforced at runtime. Channel adapters that require inbound public endpoints (like MS Teams webhooks) are architecturally incompatible and excluded.

**Least-privilege tool access.** Instead of exposing all tools in the system prompt and hoping the model uses them responsibly, provide the minimal tool capability set required for each task. Forge's autowire pipeline discovers which tools each skill needs, computes trust levels through security analysis (not self-declaration), and exposes only what's required.

**Memory isolation with structured validation.** Session memory, agent-local memory, and shared memory should be separate tiers with explicit promotion workflows. Memory writes from agent processing of external content should pass through validation — not free-form text dumped into a persistent store. Forge separates session memory (per-task conversation) from long-term memory (curated facts in MEMORY.md) with distinct read/write semantics.

**Schema-first agent communication.** Agent-to-agent messages should use strict typed schemas, not free-form text scratchpads. When a worker reports results, the output should be structured — `{status: "PASS", evidence: [...], files_modified: 3}` — not natural language that can carry injection payloads. This is the same principle as parameterized SQL queries: never interpolate untrusted text into a context that will be interpreted as instructions.

**Verifiable execution traces.** Every agent action — tool execution, egress attempt, LLM call, memory write — should produce structured audit events with correlation IDs that thread through the entire execution. Forge emits NDJSON audit events for every operation: `session_start`, `tool_exec`, `egress_allowed`, `egress_blocked`, `llm_call`, `schedule_triggered`. Each event carries a `correlation_id` and `task_id` propagated through Go's `context.Context`. Observability isn't just debugging — it's a safety mechanism.

**Secrets isolation.** Secrets should be encrypted at rest with per-agent isolation, not shared across the runtime. Forge uses AES-256-GCM encryption with Argon2id key derivation, per-agent secret files (agent-local → global → env fallback chain), and a passphrase callback pattern that keeps terminal I/O out of the core package.

---

## The Enterprise Question

The Claude Code leak previews the evaluation framework that every enterprise security team will apply to agent platforms in the next 12 months. The questions won't be about reasoning ability. They'll be about containment:

Can the agent exfiltrate secrets to arbitrary domains? Can the agent modify infrastructure without explicit approval? Can the agent access the internet beyond its declared dependencies? Can the agent persist malicious instructions that survive across sessions? Can the agent spawn uncontrolled worker processes? Can you produce an audit trail proving what the agent did and didn't do?

These are runtime architecture questions. Model intelligence is table stakes. The companies that win enterprise adoption will have the most controllable agents, the smallest attack surface, and the clearest trust boundaries.

Agent runtimes are becoming the new application server. Just as Kubernetes became the control plane for containers, agent runtimes will become the control plane for cognition. The stack is crystallizing:

| Layer | Function |
|---|---|
| Agent runtime | Process management, execution loop (Claude Code, Forge) |
| Tool protocol | Capability interface (MCP, A2A) |
| Memory layer | Persistence and retrieval (vector DB + structured store) |
| Policy layer | Guardrails, content filtering, PII detection |
| Orchestration | Multi-agent DAG, task scheduling |
| Execution sandbox | Container, VM, or process isolation |
| Observability | Structured traces, audit events |

Every layer needs its own security model. The Claude Code leak is a reminder that when you build an operating system, you inherit operating system-class security responsibilities — and a single `.map` file in your npm package can expose all of them at once.

---

**Build agents the secure way.** Forge compiles SKILL.md into portable, secure, deployable agents — with egress enforcement, encrypted secrets, and audit logging built in. No source maps. No debug artifacts. Just a single binary.

```bash
brew install initializ/tap/forge
forge init my-agent
forge run
```

[Get started with Forge →](/docs) · [Browse skills on Forge Hub →](/hub) · [Star on GitHub →](https://github.com/initializ/forge)

---

*This post reflects the views of the Initializ engineering team. Forge is the open-source runtime for the [Agent Skills](https://agentskills.io) standard. Learn more at [useforge.ai](https://useforge.ai).*
