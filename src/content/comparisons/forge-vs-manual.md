---
title: "Running Agent Skills: DIY vs Forge"
description: "What you get with Forge compared to building your own SKILL.md runtime from scratch."
competitor: "DIY"
order: 4
---

# Running Agent Skills: DIY vs Forge

## TLDR

Building your own agent runtime is entirely possible. Organizations do it. But the gap between a working demo and a production-ready system is wider than it appears. This page is not a sales pitch — it is a practical breakdown of the infrastructure you would need to build and maintain if you chose to run SKILL.md-based agents without Forge.

## The Visible Part

Getting an agent to execute a skill is straightforward. Parse some markdown, extract the instructions, pass them to an LLM, execute the result. A competent engineer can build a working prototype in a weekend. The visible part — the part that shows up in demos — is maybe 10% of the total system.

The other 90% is the infrastructure that makes it safe, auditable, and deployable.

## What You Would Need to Build

### Egress Control

Every skill that makes network calls needs to be restricted to its declared domains. This means intercepting outbound connections at the runtime level, maintaining per-skill allowlists, handling DNS resolution edge cases, and deciding what happens when a skill tries to reach an unauthorized destination. You need to handle HTTPS inspection without breaking certificate chains, manage wildcard domain rules, and deal with skills that resolve domains to IP addresses to bypass DNS-level controls.

This is not a proxy configuration. It is a per-execution network policy engine.

### Trust Model

Before a skill runs in production, someone (or something) needs to evaluate whether it should be trusted. A minimal trust pipeline includes scanning the skill artifact for metadata, parsing its declared dependencies and permissions, analyzing those declarations against organizational policy, and producing a trust score or decision. You need to handle versioning — a skill that was trusted at v1.2 may not be trusted at v1.3 if its egress domains changed. You need to handle revocation. You need to handle the case where a skill's trust evaluation is stale.

Forge implements this as a four-stage pipeline: Scanner, Parser, Analyzer, Evaluator. Building an equivalent system is a project in itself.

### Runtime Sandboxing

Skills execute code. That code needs to run in an isolated environment with controlled resource limits — CPU, memory, filesystem access, network access, and execution time. You need to handle the difference between skills that need binary tools (ffmpeg, imagemagick, curl) and skills that are pure LLM interactions. You need to handle cleanup — every skill execution should leave no residual state that could affect the next execution.

### Secret Management

Skills need credentials — API keys, database passwords, service tokens. Those secrets need to be encrypted at rest, decrypted only at execution time, scoped to specific skills (a GitHub skill should not have access to a Stripe API key), rotatable without redeploying skills, and auditable (who accessed which secret, when).

Environment variables in a .env file are not secret management. They are a vulnerability waiting to be exploited.

### Build Signing

When a skill runs in production, you need to verify that the artifact being executed is the same artifact that was reviewed and approved. This means cryptographically signing skill builds, storing signatures alongside artifacts, verifying signatures before execution, and handling key rotation and revocation. Without build signing, there is no guarantee that what is running in production is what was tested.

### Audit Logging

Every skill execution needs to produce structured logs that answer: who invoked it, what skill was executed, what inputs were provided, what network calls were made, what the outcome was, and how long it took. These logs need correlation IDs so that a single agent invocation — which may execute multiple skills — can be traced end-to-end. The logs need to be tamper-evident and shipped to whatever logging infrastructure the organization uses.

Standard application logging (console.log, Python logging) does not meet this bar.

### Deployment Portability

The same skill needs to run identically on a developer laptop, in a cloud container, inside a private VPC, and in an air-gapped environment with no internet access. This means packaging skills with their dependencies, handling binary tool availability across platforms, managing configuration without environment-specific hardcoding, and supporting offline LLM providers for air-gapped deployments.

## What Forge Provides

All of the above, integrated into a single runtime. Egress enforcement is configured per skill in the SKILL.md frontmatter. The trust pipeline runs automatically. Sandboxing is the default execution mode. Secrets are encrypted and scoped. Builds are signed. Audit logs are structured with correlation IDs. Deployment works across local, cloud, VPC, and air-gapped environments without changes to the skill definition.

## The Real Cost of DIY

The engineering effort is not the only cost. There is the ongoing maintenance — every security patch, every edge case discovered in production, every new deployment target, every compliance audit that requires evidence of controls. A dedicated team maintaining a custom agent runtime is a meaningful, ongoing investment.

## The Bottom Line

Building your own agent runtime is a legitimate choice for organizations with specific requirements that no existing framework meets. But for most teams, the hidden complexity behind "just run SKILL.md files" is significantly larger than it appears. Forge exists so that you can focus on building skills that solve problems, rather than building the infrastructure to run them safely.
