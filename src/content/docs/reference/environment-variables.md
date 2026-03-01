---
title: Environment Variables
description: "Complete reference for all environment variables — API keys, config overrides, skill-specific, and channel tokens."
order: 3
editUrl: https://github.com/initializ/useforge.ai/edit/main/src/content/docs/reference/environment-variables.md
---

# Environment Variables

Forge uses environment variables for API keys, configuration overrides, and runtime settings. Environment variables take precedence over `forge.yaml` values where applicable — the original file is never modified.

## API Keys

These variables authenticate your agent with LLM providers and external services.

| Variable | Description | Required When |
|---|---|---|
| `OPENAI_API_KEY` | OpenAI API key | Using OpenAI as `model.provider` or `embedding_provider` |
| `ANTHROPIC_API_KEY` | Anthropic API key | Using Anthropic as `model.provider` |
| `GEMINI_API_KEY` | Google Gemini API key | Using Gemini as `model.provider` or `embedding_provider` |
| `TAVILY_API_KEY` | Tavily API key | Using Tavily search provider or research-based skills |
| `GH_TOKEN` | GitHub personal access token | Using the GitHub skill for repository operations |

Set API keys in your shell or store them with the secrets provider:

```bash
# Via environment
export OPENAI_API_KEY="sk-..."

# Via Forge secrets (encrypted at rest)
forge secret set OPENAI_API_KEY
```

## Configuration Overrides

These variables override corresponding `forge.yaml` settings at runtime. Useful for CI/CD pipelines and container deployments where you do not want to modify the config file.

| Variable | Description | Example |
|---|---|---|
| `FORGE_PASSPHRASE` | Passphrase for the AES-256-GCM encrypted secrets file | `my-secure-passphrase` |
| `FORGE_MEMORY_PERSISTENCE` | Enable or disable session persistence (overrides `memory.persistence`) | `false` |
| `FORGE_MEMORY_LONG_TERM` | Enable or disable long-term memory (overrides `memory.long_term`) | `true` |
| `FORGE_EMBEDDING_PROVIDER` | Override embedding provider (overrides `memory.embedding_provider`) | `openai` |
| `FORGE_MODEL_FALLBACKS` | Set fallback providers as comma-separated `provider:model` pairs (overrides `model.fallbacks`) | `openai:gpt-4o,gemini:gemini-2.5-flash` |
| `FORGE_THEME` | Override the TUI theme at runtime | (custom theme name) |

Example usage in a Docker environment:

```bash
docker run -e FORGE_PASSPHRASE="my-passphrase" \
           -e FORGE_MEMORY_LONG_TERM=true \
           -e FORGE_MODEL_FALLBACKS="anthropic:claude-sonnet-4-20250514,gemini:gemini-2.5-flash" \
           my-agent:latest
```

## Skill-Specific Variables

Individual skills may require additional environment variables. These are declared in each skill's `SKILL.md` frontmatter under `metadata.forge.requires.env`.

| Variable | Description | Used By |
|---|---|---|
| `KUBECONFIG` | Path to your Kubernetes config file | k8s-incident-triage |
| `K8S_API_DOMAIN` | Kubernetes API server domain (added to egress allowlist dynamically) | k8s-incident-triage |
| `DEFAULT_NAMESPACE` | Default Kubernetes namespace to operate in | k8s-incident-triage |
| `TRIAGE_MAX_PODS` | Maximum number of pods to inspect during triage | k8s-incident-triage |
| `TRIAGE_LOG_LINES` | Number of log lines to fetch per container | k8s-incident-triage |

When you add a skill with `forge skills add`, the CLI checks for required variables and warns you if any are missing. You can validate skill requirements at any time:

```bash
forge skills validate
```

## Channel Tokens

Channel connectors require authentication tokens to communicate with messaging platforms.

| Variable | Description | Required When |
|---|---|---|
| `SLACK_BOT_TOKEN` | Slack bot OAuth token (starts with `xoxb-`) | Using the Slack channel connector |
| `SLACK_SIGNING_SECRET` | Slack signing secret for HMAC request verification | Using the Slack channel connector |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token from BotFather | Using the Telegram channel connector |

Use the interactive channel setup to configure these tokens:

```bash
forge channel add slack      # Prompts for bot token, validates it
forge channel add telegram   # Prompts for bot token, validates it
```

The setup commands store tokens in your secrets provider and validate connectivity before saving.

## Resolution Priority

When the same setting is available in both `forge.yaml` and as an environment variable, the resolution order is:

1. **Environment variable** — highest priority, always wins
2. **Encrypted secrets file** — checked if the env var is not set
3. **`forge.yaml`** — base configuration, lowest priority

This layering lets you keep safe defaults in `forge.yaml`, sensitive values in the encrypted secrets file, and per-deployment overrides in environment variables.

## What's Next

- [Agent Skills Compatibility](/docs/reference/agent-skills-compatibility) — how Forge implements the Agent Skills standard and what it adds beyond the spec
