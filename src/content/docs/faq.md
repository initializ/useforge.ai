---
title: FAQ
description: "Frequently asked questions about Forge — skills, providers, security, deployment, and contributing."
order: 1
editUrl: https://github.com/initializ/useforge.ai/edit/main/src/content/docs/faq.md
---

# FAQ

Answers to the most common questions about Forge, the Agent Skills standard, providers, security, deployment, and contributing.

## What is the Agent Skills standard?

SKILL.md is Anthropic's Agent Skills standard. It combines YAML frontmatter (metadata, dependencies, egress declarations, trust hints) with a markdown body (the system prompt). Forge is an open-source runtime that executes Agent Skills with added security layers: egress control, a computed trust model, build signing, and audit logging.

Skills are portable. Any SKILL.md that conforms to the standard works across compatible runtimes. Forge adds security enforcement on top of the standard but does not modify the format itself.

See [Agent Skills Compatibility](/docs/reference/agent-skills-compatibility) for details on what the standard covers and how Forge extends it.

## What is the Forge Hub?

The Forge Hub is a skill discovery and distribution platform (planned). Currently, skills are either embedded in the Forge binary or added as local directories inside your project's `skills/` folder.

When the remote skill registry launches, the Hub will enable sharing and installing skills from trusted registries. Until then, you can browse available embedded skills with `forge skills list` and add local skills by creating a new directory with a SKILL.md file.

## Which LLM providers does Forge support?

Forge supports four providers:

| Provider | Example Model | API Key Required |
|---|---|---|
| OpenAI | `gpt-5.2-2025-12-11` | Yes |
| Anthropic | `claude-sonnet-4-20250514` | Yes |
| Google Gemini | `gemini-2.5-flash` | Yes |
| Ollama | `llama3` | No (local inference) |

You select your primary provider during `forge init`. Forge also supports automatic failover across providers via fallback chains — if your primary provider is unreachable or returns an error, Forge tries the next provider in the chain.

See [Configuration](/docs/getting-started/configuration) for how to set up providers and fallback chains.

## Can I run Forge without an API key?

Yes. Use Ollama for fully local LLM inference. No API key is required.

Install Ollama, pull a model, and select Ollama as your provider during `forge init`:

```bash
ollama pull llama3
forge init
```

When the init wizard asks for your provider, choose Ollama and specify the model name (e.g., `llama3`). Your agent runs entirely on your machine with no external API calls for inference.

## How does Forge handle secrets?

Secrets are encrypted at rest using AES-256-GCM with Argon2id key derivation. Each agent has a separate encrypted file (`.forge/secrets.enc`), providing per-agent isolation.

In development, secrets are stored in the encrypted file and unlocked with `FORGE_PASSPHRASE`. In production containers, use the `env` provider to pass secrets as environment variables instead — this avoids embedding encryption keys in your container image.

```bash
# Store a secret locally
forge secret set OPENAI_API_KEY

# List stored secrets
forge secret list
```

See [Secret Management](/docs/security/secret-management) for the full encryption design and provider chain.

## What happens if a skill fails trust evaluation?

Skills that fail validation or have critical security findings are assigned **Failed** status and excluded from the agent entirely. They do not appear in skill listings and cannot execute.

Skills with warnings (non-critical findings) get **Under Review** status. They are visible but not executable. You can promote them after reviewing the trust report:

```bash
# View the trust report
forge skills trust-report <name>

# Promote to trusted after review
forge skills promote <name>
```

Trust is computed, not declared. Contributors cannot set their own trust level. The autowire pipeline evaluates every skill automatically during `forge build`.

See [Trust Model](/docs/security/trust-model) for the full evaluation pipeline and trust levels.

## How do I deploy a Forge agent with Docker?

Run `forge build` to generate build artifacts, then `forge package` to build a container image:

```bash
forge build
forge package --prod
```

The `--prod` flag enforces production security: it rejects `dev-open` egress mode and validates that all skills pass trust evaluation.

Pass secrets as environment variables when running the container:

```bash
docker run -p 8080:8080 \
  -e OPENAI_API_KEY=sk-... \
  my-agent:latest
```

The default port is 8080. The container exposes the HTTP/SSE interface for client connections.

See [Docker](/docs/deployment/docker) for the full deployment guide, including multi-stage builds and health checks.

## How do channels work? Do I need webhooks?

It depends on the channel:

- **Telegram** uses long polling by default. No inbound port or public URL is needed. The agent fetches updates from the Telegram Bot API on a 30-second polling cycle.
- **Slack** uses webhooks. You need to expose an inbound port (3000) so Slack can deliver events to your agent.

Both channels run with the agent as part of the same process. You start them with `forge serve`:

```bash
forge serve --with slack
forge serve --with telegram
```

You can run both channels simultaneously:

```bash
forge serve --with slack --with telegram
```

See [Channels](/docs/core-concepts/channels) for setup instructions, security details, and large response handling.

## What is .forge-output/?

The `.forge-output/` directory is generated by `forge build`. It contains the complete build artifacts for your agent:

| File | Purpose |
|---|---|
| `agent-spec.json` | Full agent specification (skills, tools, egress, config) |
| `skill-index.json` | Index of all discovered and evaluated skills |
| `egress_allowlist.json` | Computed egress allowlist with source annotations |
| `Dockerfile` | Container build file |
| `k8s/` | Kubernetes manifests (Deployment, Service, ConfigMap) |
| `checksums.json` | SHA-256 checksums for integrity verification |

This directory is gitignored and regenerated on every build. Never hand-edit files inside `.forge-output/` — your changes will be overwritten on the next `forge build`.

## How do I contribute a skill?

Fork the Forge repo, copy the `_template/` directory, and create your skill:

```bash
cp -r skills/_template skills/my-skill
```

Write your SKILL.md with the required frontmatter and system prompt. No central index file to edit — skills are autodiscovered from directory structure during the autowire pipeline.

Open a pull request. CI runs the autowire pipeline to validate your skill's frontmatter, check for security issues, and compute its trust level.

See [Contributing a Skill](/docs/skills/contributing-a-skill) for the full contribution workflow, SKILL.md template, and review process.

## What is Initializ Command?

Initializ Command is the enterprise agent platform. It provides centralized management, observability, policy enforcement, and team collaboration for agent deployments.

Forge agents export an AgentSpec via `forge export` that Command can import:

```bash
forge export --format agentspec > agent-spec.json
```

This enables you to start with open-source Forge for development and prototyping, then transition to the managed enterprise platform when you need production-grade operations.

## What license is Forge under?

Forge is licensed under **Apache 2.0** — fully open source. You can use, modify, and distribute Forge freely. The license applies to the Forge runtime, CLI, embedded skills, and documentation.
