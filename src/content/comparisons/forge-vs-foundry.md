---
title: "Forge vs Foundry"
description: "Open-standard runtime vs Microsoft-integrated agent platform. When Entra and Cosmos DB aren't your stack."
competitor: "Foundry"
order: 11
category: "managed-runtime"
seeAlso: "forge-vs-vertex"
---

# Forge vs Foundry

## TLDR

> _Placeholder — full comparison content will be added per instruction doc 03 (Foundry)._

Azure Foundry Agent Service is a tightly-integrated agent platform built on top of Microsoft's identity, data, and AI stack. It's the right choice when your organization runs on Entra, Cosmos DB, and Azure OpenAI. Forge is the right choice when you want a portable, open-standard runtime that doesn't assume any particular identity provider or data layer.

## When Foundry is the better fit

- Entra ID is your identity layer and Cosmos DB is your operational data store.
- Azure OpenAI and Microsoft-hosted models are your strategy.
- You want Microsoft to handle the agent platform end-to-end.

## When Forge is the better fit

- You need to run the same agent across Microsoft, non-Microsoft, and on-prem environments.
- You want to keep identity, storage, and model decisions decoupled from the agent runtime.
- You want to ship agents as portable Agent Skills (SKILL.md) instead of platform-specific bindings.
