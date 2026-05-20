---
title: "Forge vs Microsoft Foundry Agent Service"
description: "How Forge compares to Microsoft Foundry Agent Service — open standard, identity neutrality, and cross-cloud deployment vs the Microsoft-integrated agent platform."
competitor: "Foundry"
order: 11
category: "managed-runtime"
---

# Forge vs Microsoft Foundry Agent Service

How Forge compares to Microsoft Foundry Agent Service — open standard, identity neutrality, and cross-cloud deployment versus a Microsoft-integrated agent platform.

## TLDR

Microsoft Foundry Agent Service is a fully managed platform for building, deploying, and scaling AI agents on Azure. It provides Entra-based agent identity, content safety filters, VNet isolation, observability via Application Insights, and native publishing to Microsoft 365, Teams, and Copilot. Each agent can use any framework (Microsoft Agent Framework, LangGraph) and any model from the Foundry model catalog. If your organization is Microsoft-native — Entra ID for identity, M365 for productivity, Teams as the primary collaboration surface — Foundry is the integrated path.

Forge is an open-source agent runtime built on Anthropic's Agent Skills standard, distributed as a single static binary. It runs the same SKILL.md agent on any cloud or on-prem infrastructure, with pluggable identity, model-neutral execution, and no managed-platform dependency.

Foundry optimizes for "production agents inside the Microsoft ecosystem." Forge optimizes for "production agents regardless of ecosystem."

## Different Problems, Different Architectures

Foundry was designed for Microsoft-shop enterprises. The product makes one bet very well: that your identity is Entra ID, your data lives in Azure storage, your conversation state belongs in Cosmos DB, your observability flows through Application Insights, and your agents will be consumed inside Microsoft 365, Teams, or Copilot Studio. For organizations whose technology stack matches that profile, Foundry is the highest-velocity path from agent prototype to production — most of the integration work is already done.

Forge makes no assumptions about ecosystem. It runs as a single static Go binary, accepts any LLM provider (Anthropic, OpenAI, Azure OpenAI, Gemini, local GGUF), integrates with any identity provider through its standard contracts, and deploys to any container runtime. It assumes your agent must live alongside services that may or may not be in Azure, and that your identity, observability, and publishing surfaces may be drawn from a heterogeneous stack.

Both are coherent architectural choices. They serve different organizational realities.

## Feature Comparison

| Capability | Forge | Microsoft Foundry Agent Service |
|---|---|---|
| **Where it runs** | Any container runtime — Azure, AWS, GCP, on-prem, air-gapped | Azure only |
| **Skill / agent format** | SKILL.md — open Agent Skills standard | Prompt agent (no-code) or Hosted agent (code in Microsoft Agent Framework, LangGraph, etc.) |
| **Cloud lock-in** | None | Azure subscription, region, resource provider, Cosmos DB |
| **Identity** | Pluggable — Entra, Okta, custom IdPs, none | Microsoft Entra ID (each agent gets a dedicated Entra identity) |
| **State persistence** | In-container, agent-managed, or external store of your choice | Customer-provisioned Cosmos DB account required for BCDR |
| **Model choice** | Anthropic, OpenAI, Azure OpenAI, Gemini, Ollama, local GGUF | Foundry model catalog (Azure OpenAI primary, others available) |
| **Network isolation** | Container-level + per-skill egress allowlists | VNet, private endpoints, BYO Azure resources |
| **Content safety** | Skill-level deny lists, computed trust, audit logging | Integrated Prompt Shields, XPIA mitigation, content filters |
| **Distribution surfaces** | CLI, Docker, K8s, Slack, Telegram, A2A, custom | Microsoft 365, Teams, Copilot Studio, BizChat, Entra Agent Registry |
| **A2A protocol** | Native (JSON-RPC 2.0) | Native (preview) |
| **MCP protocol** | Native | Native |
| **Versioning / publishing** | Git-based + Forge Hub signing | Built-in version snapshots and publish workflow |
| **Pricing model** | Open source — pay for your own infrastructure | Azure consumption — managed resource + Cosmos DB + model + storage |
| **On-prem / air-gapped** | First-class — single binary, local inference via `forge brain` | Not supported |
| **What you write** | A `SKILL.md` markdown file | Code (Agent Framework / LangGraph) or no-code portal config |

## The Ecosystem Assumption

Foundry is built around the premise that an agent is most valuable when it lives inside Microsoft's productivity surfaces. The published-agent endpoint integrates natively with Teams and Copilot. Identity flows through Entra. Knowledge grounding uses Azure AI Search. Tools are exposed via Azure Logic Apps and Azure Functions. The Entra Agent Registry serves as the discovery layer for shared agents across an organization.

For a Microsoft-native enterprise, this is exactly right. The integration depth means an agent built in Foundry can be consumed by users in Teams the same day, with no glue code, no auth bridging, and no observability work beyond turning on Application Insights.

Forge starts from a different premise: the agent's distribution surface is part of what the customer needs to choose. A Forge agent can be deployed as a Slack bot, a Telegram bot, an A2A endpoint, a Kubernetes sidecar, a CLI tool, or a CI step. Identity binds to whatever the customer's identity stack actually is — Entra is supported, but so is Okta, Ping, AWS IAM, or no external IdP at all. State persistence uses whatever store the customer already operates. Observability flows wherever the customer already collects logs.

The trade-off is real: Foundry's integrated experience cannot be reproduced by Forge for a Microsoft-shop customer, and Forge's portability cannot be reproduced by Foundry for a multi-cloud or non-Microsoft customer.

## Identity and State

Foundry's identity model is one of its strongest features and one of its strongest constraints. Each agent gets a dedicated Entra identity, with fine-grained RBAC through Microsoft Entra and Azure RBAC. End users authenticate through Entra; agents act on their behalf using delegated permissions. This is a clean, well-engineered model — for Entra-centric organizations.

For organizations that use a different identity stack (Okta is the most common alternative in enterprises today), Foundry's Entra-binding is an architectural friction. You can bridge Okta to Entra, but you've now added an identity translation layer to every agent invocation.

The state persistence requirement is similar. Foundry Agent Service relies on a customer-provisioned Cosmos DB account for business continuity and disaster recovery — agent state and conversation history are preserved through Cosmos. Cosmos DB is a fine product, but it is an opinionated dependency: every Foundry agent deployment includes a Cosmos DB account, with its own pricing, capacity model, and operational surface.

Forge has no equivalent dependency. State is held in the container, in an external store the customer already operates (Redis, Postgres, S3, whatever), or in encrypted files on disk for single-agent deployments. The runtime does not require any specific managed-service relationship.

## Security and Safety

Foundry's safety story leans on Microsoft's integrated content safety stack — Prompt Shields for prompt injection mitigation, Spotlighting for cross-prompt injection attacks, PII protection, and integration with Microsoft Defender for Cloud for threat detection. For organizations already running on Microsoft Defender and Microsoft Purview, this is a meaningful integration.

Forge's safety model is embedded in the runtime: egress is enforced per-skill at the network layer, trust is computed (not declared) by the autowire pipeline, denied tools are explicit contracts in SKILL.md frontmatter, and audit logs are structured with correlation IDs at the agent / skill / tool / egress level. The model is content-safety-neutral — you can layer Microsoft Defender on top of a Forge deployment in Azure, or layer GuardDuty on top in AWS, or run an open-source content filter for an on-prem deployment.

Both models are defensible. Foundry's wins on out-of-the-box integration with Microsoft's security ecosystem; Forge's wins on portability of the security model across deployment environments.

## When to Use Microsoft Foundry Agent Service

Foundry is the right choice when:

- Your organization runs on Microsoft Entra ID and Microsoft 365.
- Your primary distribution surfaces for the agent are Teams, Copilot, BizChat, or the Entra Agent Registry.
- You want a fully managed runtime with deep integration into Azure observability and security tooling.
- You're comfortable with a Cosmos DB dependency for state and BCDR.
- You need rapid path from no-code portal agents to production-grade hosted agents in the same platform.
- Your model strategy centers on Azure OpenAI.
- You want Microsoft Defender for Cloud and Microsoft Purview integration for security and compliance.

## When to Use Forge

Forge is the right choice when:

- Your identity stack is not Entra ID (Okta, Ping, custom IdPs, or no external IdP).
- Your infrastructure includes non-Azure clouds, on-prem, or air-gapped environments.
- You want the same agent definition to deploy unchanged across Azure, AWS, GCP, and on-prem.
- You need a model-neutral runtime that doesn't tilt toward Azure OpenAI in practice.
- Your distribution targets include Slack, Telegram, CLI, A2A endpoints, Kubernetes sidecars, or CI integration — not Teams and Copilot.
- You want an open-source runtime with no managed-service dependency or vendor billing surface.
- You need agents to run in air-gapped environments with local model inference.
- You prefer an open standard for the agent format (SKILL.md) over a platform-specific format.

## The Bottom Line

Foundry and Forge are both well-designed for their respective audiences. Foundry is the Microsoft platform answer to enterprise agents — deeply integrated, opinionated about identity and state, optimized for the M365 ecosystem. Forge is the open-source, cross-cloud answer — deliberately neutral about identity, state, model, and distribution surface, optimized for portability and on-prem deployment.

The choice is rarely close in practice. Microsoft-native enterprises will get more value faster from Foundry. Non-Microsoft or multi-cloud organizations will get more value over time from Forge. The honest framing is that **Foundry is Microsoft's answer to "agents inside our ecosystem," and Forge is the answer to "agents that don't pick an ecosystem."**

---

**Also see:** [Forge vs AgentCore](/compare/forge-vs-agentcore) · [Forge vs Gemini Enterprise](/compare/forge-vs-vertex) · [Forge vs Claude Managed Agents](/compare/forge-vs-claude-managed-agents)
