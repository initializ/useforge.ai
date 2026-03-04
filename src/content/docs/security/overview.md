---
title: Security Architecture Overview
description: "Forge's layered security model — network posture, egress enforcement, execution sandboxing, secrets, build integrity, and guardrails."
order: 0
editUrl: https://github.com/initializ/useforge.ai/edit/main/src/content/docs/security/overview.md
---

Forge implements a **layered security model** with six primary defense mechanisms designed to make AI agents safe for enterprise environments.

## Core Security Layers

### 1. Network Posture

Agents use outbound-only connections with zero inbound listeners, preventing public exposure via tunnels or webhooks. This is a fundamental architectural choice — Forge agents never accept incoming connections.

### 2. Egress Enforcement

Three-level validation restricts outbound traffic:

- **In-process HTTP wrapper** validates destinations before requests leave the agent
- **Local proxy** handles subprocess traffic through a controlled gateway
- **Kubernetes NetworkPolicy** enforces pod-level restrictions in production

See [Egress Control](/docs/security/egress-control) for full details.

### 3. Execution Sandboxing

External code runs in restricted environments with:

- **Environment variable isolation** — only declared vars passed through
- **Binary allowlists** for CLI execution
- **Argument validation** blocking shell metacharacters
- **Configurable timeouts** and output limits

### 4. Secrets Management

AES-256-GCM encrypted secret storage with Argon2id key derivation, per-agent isolation, and a three-tier resolution hierarchy.

See [Secret Management](/docs/security/secret-management) for details.

### 5. Build Integrity

Ed25519 signing and SHA-256 checksums verify supply chain artifacts before execution.

See [Build Signing](/docs/security/build-signing) for details.

### 6. Guardrails

Policy engine filters inbound/outbound messages for PII, jailbreak attempts, and custom content rules in enforce or warn modes.

See [Audit Logging](/docs/security/audit-logging) for guardrails configuration.

## Additional Protections

**Audit Logging** tracks all security events as structured NDJSON with correlation IDs for end-to-end tracing across tool execution, egress decisions, and LLM calls.

**Container Security** generates deployment-ready artifacts including NetworkPolicy manifests and enforces production-mode restrictions (no dev tools, no open egress modes).

## Trust Model

Forge evaluates skill trustworthiness through a multi-factor scoring system. See [Trust Model](/docs/security/trust-model) for the full evaluation criteria.
