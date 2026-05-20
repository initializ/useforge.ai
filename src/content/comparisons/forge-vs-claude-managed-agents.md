---
title: "Forge vs Claude Managed Agents"
description: "How Forge compares to Claude Managed Agents — same Agent Skills standard, different deployment locus. Self-hosted, multi-model, on-prem capable vs Anthropic-hosted sessions."
competitor: "Claude Managed Agents"
order: 13
category: "managed-runtime"
---

# Forge vs Claude Managed Agents

How Forge compares to Claude Managed Agents — the same Agent Skills standard, deployed in different places. Self-hosted, multi-model, on-prem-capable versus Anthropic-orchestrated sessions on Anthropic's models.

## TLDR

Claude Managed Agents is Anthropic's hosted runtime for autonomous agent sessions. A session is created (typically webhook-triggered), the agent loop runs on Anthropic's orchestration layer, tools execute either in Anthropic-managed cloud containers or — as of May 2026 — in self-hosted sandboxes on customer infrastructure. The runtime is well-engineered for long-running task patterns like "PagerDuty webhook fires → triage → propose remediation → human approves → apply," with built-in observability, session state, and integration through MCP.

Forge is an open-source agent runtime that consumes the same SKILL.md format Anthropic created. Instead of running as orchestrated sessions on Anthropic's infrastructure, a Forge agent compiles into a single static binary or container and runs entirely on your infrastructure — your Kubernetes cluster, your VPC, your on-prem environment, your air-gapped network — with the model provider of your choice.

Both runtimes execute Agent Skills. The choice between them is about **what stays under your control** and **what models the agent can use**, not what skills can do.

## The Honest Framing

Claude Managed Agents and Forge are not adversarial products. They are two runtimes for the same open standard, optimized for different deployment shapes. The SKILL.md format Anthropic created is the shared substrate — a skill written for one runtime can, in principle, run on the other. That portability is a feature of the standard, not a position any single runtime owns.

Anthropic's May 2026 release of self-hosted sandboxes and MCP tunnels closed a meaningful part of the deployment-locus gap. Tool execution, the agent's filesystem, and network egress can now stay inside the customer's environment while Anthropic handles orchestration. For many enterprise scenarios that previously required a self-hosted runtime, Managed Agents is now a viable option.

What remains structurally different:

- **The agent loop and model inference still run on Anthropic's infrastructure.** Even with a self-hosted sandbox, every reasoning step routes through the Anthropic API.
- **Claude models only.** Managed Agents is built around Anthropic's models. That is a coherent product choice and not changing.
- **Session-shaped execution.** Managed Agents is optimized for `create a session → do the work → end the session`. Other deployment shapes — long-running services, sidecars, libraries, CI steps — are not the design target.

Forge exists for the workloads where those constraints are blocking: organizations that need air-gapped deployment with local model inference, multi-model agent fleets, or deployment shapes other than per-session execution. The page below explains when each runtime applies.

## Feature Comparison

| Capability | Forge | Claude Managed Agents |
|---|---|---|
| **Where the agent loop runs** | Your infrastructure | Anthropic's orchestration layer |
| **Where tools execute** | Your infrastructure | Anthropic cloud containers, or self-hosted sandboxes on your infrastructure (public beta, May 2026) |
| **Where model inference runs** | Any provider, including local (`forge brain` + GGUF) | Anthropic's models, via Anthropic's API |
| **Skill format** | SKILL.md (Anthropic's open Agent Skills standard) | SKILL.md (Anthropic's open Agent Skills standard) |
| **Model provider** | Anthropic, OpenAI, Gemini, Ollama, local GGUF | Anthropic only |
| **Execution model** | Long-running process, container, sidecar, CLI, library, A2A endpoint, cron, CI step | Stateful session per task (`client.beta.sessions.create`) |
| **Trigger model** | Cron, webhook, A2A, CLI, programmatic, in-process | API call (typically webhook-triggered) |
| **State persistence** | In-container, external store of your choice, or stateless | Persistent session filesystem + conversation history (server-side) |
| **Reaching private services** | Direct — agent runs inside the network | MCP tunnels (research preview) or self-hosted MCP servers reachable from the sandbox |
| **Egress security** | Computed-not-declared per-skill allowlists, runtime-enforced | Your network policy (self-hosted sandbox) or Anthropic's egress controls (cloud) |
| **Audit logging** | Local logs to your SIEM | Anthropic Console + logs; sandbox logs in your environment |
| **Identity binding** | Pluggable — any IdP or none | Anthropic API key + environment key |
| **Human-in-the-loop** | Skill-level approval gates (`i_accept_risk: true` pattern) | Session-steering events; tool-level approval patterns |
| **Pricing model** | Open source — your infrastructure + your model API spend | Anthropic API token usage (model + managed orchestration) |
| **On-prem / air-gapped** | First-class with `forge brain` local inference | Not supported — orchestration always requires Anthropic API access |
| **Multi-model agents** | Native | Anthropic models only |

## Where the Lines Actually Sit

The cleanest way to think about the choice: **which parts of the system need to be under your control?**

If you only need tool execution, filesystem, and network egress inside your environment — and you're comfortable with the agent loop and model calls running on Anthropic — Claude Managed Agents with a self-hosted sandbox is well-suited. Anthropic's orchestration handles session lifecycle, observability, and the model loop. Your worker handles tool execution against your private services.

If you need the agent loop itself, the model inference, and the runtime substrate inside your environment — for air-gapped deployment, sovereign-cloud requirements, true offline operation, or compliance regimes that won't permit a managed-API dependency — Forge is the runtime designed for that. The single binary runs in your network with whatever model provider you choose, including local inference.

For workloads that fit naturally inside Anthropic's orchestration model (event-driven, session-shaped, Claude-powered), Managed Agents is more turnkey. For workloads outside that shape — long-running services, sidecars, library integrations, A2A endpoints, multi-model fleets, or fully offline operation — Forge is the natural fit.

## The Model Question

Claude Managed Agents runs on Claude. That is by design and is not a deficiency for organizations that have standardized on Anthropic models. But several enterprise scenarios point the other way:

- **Multi-model strategy.** Some organizations use Anthropic for code, OpenAI for general reasoning, Gemini for grounded queries, and a local model for sensitive data — all in the same agent fleet. Managed Agents cannot serve this directly.
- **Vendor concentration risk.** Some compliance regimes and procurement teams explicitly require multiple LLM providers in production. A runtime bound to one provider is a procurement obstacle.
- **Local inference requirements.** Workloads in defense, healthcare, and finance often require that the LLM run on-premises or in a sovereign cloud, with no external API calls. Forge's `forge brain` supports local GGUF inference; Managed Agents does not.
- **Cost optimization at scale.** Anthropic models are excellent and priced accordingly. At very high request volumes, mixing in cheaper models for routine subtasks materially changes the economics.

Forge is model-agnostic by design. The same SKILL.md works whether the deployment uses Anthropic, OpenAI, Gemini, or local inference.

## The Deployment Shape Question

Claude Managed Agents executes as a stateful session, created per task, terminated when the work completes. It is excellent for "respond to this event" patterns — webhook fires, agent investigates, agent proposes, human approves, agent applies, session ends. The May 2026 self-hosted sandbox release means that session can run with your tools and your filesystem, but the session shape itself is unchanged.

Forge executes as infrastructure. A Forge agent can be:

- A long-running Kubernetes deployment that watches a queue
- A sidecar in a service pod, processing every request that service handles
- A CI pipeline step that runs on every commit
- A library imported into another Go service for in-process agent calls
- An A2A endpoint called by other agents over JSON-RPC
- A scheduled cron task running on its own infrastructure
- A CLI tool invoked by developers locally

For the "respond to a discrete event" workload, both shapes work; Managed Agents is more turnkey. For the other deployment shapes, Forge is the natural fit and the session-per-task model is awkward or impossible.

## When to Use Claude Managed Agents

Claude Managed Agents is the right choice when:

- Anthropic models are your standard for agent reasoning.
- Your agent's workload is event-driven (webhook in, work done, session ends).
- You're comfortable running the agent loop on Anthropic's orchestration layer.
- Your tool execution, filesystem, and network requirements can be addressed either by Anthropic-managed containers or by a self-hosted sandbox.
- You want the fastest path to a working agent without operating your own runtime.
- The agent's required actions are well-suited to per-session execution with steering and human-in-the-loop checkpoints.

## When to Use Forge

Forge is the right choice when:

- Your agent must run end-to-end inside your network, including the agent loop and model inference.
- Regulatory, sovereignty, or contractual requirements prohibit running the agent loop through a vendor's API.
- Your deployment shape is not a per-session workload — it's a sidecar, a CI step, an always-on service, an A2A endpoint, or a library call.
- Your model strategy is multi-provider, or requires local inference for sensitive data.
- You need true air-gapped operation where no managed API is reachable.
- You operate at a scale or cost-sensitivity where managed-runtime pricing compounds unfavorably.
- You want the agent's runtime to be open-source, portable, and reviewable end-to-end.

## The Bottom Line

Claude Managed Agents and Forge are not competitors in the usual sense. They are two execution environments for the same open standard, optimized for different deployment realities. Anthropic's May 2026 self-hosted sandbox release narrowed the gap on tool execution, filesystem, and network egress — for many enterprise workloads that previously required a self-hosted runtime, Managed Agents is now a viable choice.

What remains is the structural difference: the agent loop and the model run on Anthropic in Managed Agents, and Forge is the runtime for the workloads where they need to run somewhere else. Multi-model fleets, fully air-gapped deployments, and deployment shapes outside per-session execution are the natural Forge territory.

**The same SKILL.md you write today should be deployable in either runtime tomorrow.** That portability is the point of Anthropic's open Agent Skills standard, and Forge is built to preserve it.

---

**Read the full positioning:** [Forge is the runtime for agents that run next to services →](/blog/agent-runtime-for-services)

**Also see:** [Forge vs AgentCore](/compare/forge-vs-agentcore) · [Forge vs Foundry](/compare/forge-vs-foundry) · [Forge vs Gemini Enterprise](/compare/forge-vs-vertex)
