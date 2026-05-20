---
title: "Forge vs Claude Managed Agents"
description: "Self-hosted runtime vs Anthropic-hosted sessions. Same Agent Skills standard, different deployment locus."
competitor: "Claude Managed Agents"
order: 13
category: "managed-runtime"
seeAlso: "forge-vs-agentcore"
---

# Forge vs Claude Managed Agents

## TLDR

> _Placeholder — full comparison content will be added per instruction doc 05 (Claude Managed Agents)._

Claude Managed Agents is Anthropic's hosted agent runtime — sessions, tool calls, and state all live on Anthropic's infrastructure. Forge is the open-source runtime built on the same Agent Skills standard, designed to run in your environment instead of Anthropic's. The agent contract is the same; the deployment locus is different.

## When Claude Managed Agents is the better fit

- You want Anthropic to operate the runtime end-to-end.
- Your data and tools are happy crossing the Anthropic boundary.
- You don't need to run in a private VPC, on-prem, or air-gapped.

## When Forge is the better fit

- You need agents to run inside your own infrastructure — VPC, on-prem, or air-gapped.
- You want the same Agent Skills (SKILL.md) to be portable across Anthropic's runtime and yours.
- You want full control over egress, secrets, audit logs, and the runtime substrate.
