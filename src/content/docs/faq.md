---
title: FAQ
description: "Common questions about Forge — the secure, portable AI agent runtime."
order: 1
editUrl: https://github.com/initializ/useforge.ai/edit/main/src/content/docs/faq.md
---

# FAQ — Common Questions About Forge

## What is Forge?

Forge is a secure, portable AI agent runtime that lets you execute AI agents across local machines, cloud environments, and enterprise infrastructure without inbound tunnels or exposed ports.

Unlike demo-oriented agent frameworks, Forge enforces security boundaries, outbound-only networking, and atomic skill execution for production workflows.

## Is Forge secure enough for enterprise environments?

Yes — Forge is built with enterprise security in mind and supports outbound-only networking, audit logging, secret encryption, and strict trust evaluation.

This architecture aligns with common enterprise constraints such as egress control, identity enforcement, and compliance requirements.

## Can Forge run agents without exposing inbound network ports?

Yes. Forge does not rely on inbound tunnels and can run agents without opening public ports.

Instead, it enforces outbound-only communication models that meet strict security policies and reduce attack surface.

## How is Forge different from other agent frameworks like LangChain or CrewAI?

Forge focuses on secure runtime architecture, production portability, and deployment constraints, whereas other frameworks often emphasize orchestration and developer tooling.

Forge's priorities are environment isolation, enterprise compliance, and secure execution across local, cloud, and air-gapped environments.

## Which LLM providers does Forge support, and can I run Forge locally without API keys?

Forge supports multiple LLM providers (including OpenAI, Anthropic, Google Gemini, and local inference via Ollama). You can run Forge locally without an API key using Ollama.

Using a local provider allows you to build and test agents without relying on hosted LLM services.

## How does Forge handle secrets and sensitive configuration?

Forge encrypts secrets at rest using AES-256-GCM and a secure key derivation method. Each agent holds its own encrypted secrets file.

In production, environment variables can be used instead of local encryption for containerized deployments.

## What happens if a skill fails security or trust evaluation?

Skills that fail critical trust checks are excluded from execution and cannot be used by the agent.

Non-critical issues may still allow execution in "under review" mode, with options to promote trust after assessment.

## How do I deploy a Forge agent with Docker or Kubernetes?

Use `forge build` to generate artifacts and `forge package --prod` to create a Docker image. For Kubernetes, deploy the image with your cluster's security policies.

Production flags enforce stricter egress policies and validate security configurations.

## Do I need webhooks to use channels like Slack or Telegram?

For Telegram, long polling is supported without inbound ports. For Slack, you'll need to expose a port for webhook events.

Each channel has different integration requirements, and Forge handles them in a secure, controlled way.

## What license is Forge under?

Forge is licensed under the Apache 2.0 license and is fully open source.

You are free to modify and distribute the source code under the terms of this license.

## OpenClaw & Alternatives

### Is Forge an OpenClaw alternative?

Forge is often described as "OpenClaw for enterprise environments." While OpenClaw is an excellent personal AI agent framework — with 68,000+ GitHub stars and support for 22+ channels — Forge was built for the security, compliance, and deployment constraints that enterprise organizations require.

For a detailed comparison, see [Forge vs OpenClaw](/compare/forge-vs-openclaw) or the [enterprise comparison page](/openclaw-enterprise).

### What is the difference between OpenClaw and Forge?

The core difference is architectural: OpenClaw uses an inbound gateway model that requires exposed ports or tunnels, while Forge uses outbound-only networking with no exposed ports. Forge focuses on the enterprise deployment constraints that OpenClaw was not designed to address — including egress enforcement, runtime sandboxing, cryptographic build signing, and structured audit logging.

### Can I use OpenClaw skills in Forge?

OpenClaw and Forge use different skill formats. OpenClaw uses framework-specific tool definitions, while Forge uses SKILL.md — a portable, language-agnostic format that declares inputs, outputs, egress domains, and required secrets in a single Markdown file. SKILL.md files can be reviewed, version-controlled, and evaluated by automated trust pipelines, making them better suited for enterprise deployment workflows.
