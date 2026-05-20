---
title: "Forge vs AgentCore"
description: "Cross-cloud agent runtime vs AWS-native serverless hosting. When portability and on-prem matter."
competitor: "AgentCore"
order: 10
category: "managed-runtime"
seeAlso: "forge-vs-foundry"
---

# Forge vs AgentCore

## TLDR

> _Placeholder — full comparison content will be added per instruction doc 02 (AgentCore)._

AWS Bedrock AgentCore is a serverless agent runtime fully managed by AWS. It's the right choice when your stack is AWS-centric and you want to outsource operations. Forge is the right choice when you need to run the same agent across clouds, on-prem, or air-gapped — on infrastructure you already operate.

## When AgentCore is the better fit

- Your workloads already live entirely in AWS and you bill through AWS.
- You want zero operational responsibility for the agent runtime itself.
- Bedrock-hosted models are the foundation of your model strategy.

## When Forge is the better fit

- You need the same agent to run in your VPC, in a different cloud, or air-gapped.
- You want to keep model choice open and bring your own keys.
- You want to ship agents as standard Agent Skills (SKILL.md) that aren't coupled to a specific cloud control plane.
