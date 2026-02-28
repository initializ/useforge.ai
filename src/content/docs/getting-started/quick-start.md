---
title: Quick Start
description: Create and run your first Forge agent in under 60 seconds.
order: 2
---

# Quick Start

This guide walks you through creating a new agent, examining the generated files, and running it locally.

## Initialize a New Agent

```bash
forge init my-agent
```

This launches the interactive TUI wizard with 10 steps:

1. **Agent Name** — text input, auto-generates a slug
2. **Model Provider** — select from OpenAI, Anthropic, Gemini, Ollama, or Custom
3. **API Key** — masked input with live validation (skipped for Ollama)
4. **Fallback Providers** — optionally add backup LLM providers
5. **Channel** — choose None, Slack, or Telegram
6. **Tools** — select built-in tools to enable
7. **Skills** — pick from embedded skills (Summarize, GitHub, Weather, Tavily Search, etc.)
8. **Egress Review** — review the auto-derived domain allowlist
9. **Secrets Passphrase** — encrypt your API keys at rest
10. **Summary + Generate** — confirm and scaffold the project

> For CI/CD, use non-interactive mode: `forge init --non-interactive --name my-agent --provider openai --fallbacks anthropic,gemini`

## Examine Generated Files

After initialization, your project directory looks like this:

```
my-agent/
├── forge.yaml            # Agent configuration
├── .env                  # Secrets (gitignored)
├── .env.example          # Template for required secrets
├── SKILL.md              # Top-level skill definition
├── skills/               # Additional skills
├── .forge/
│   ├── secrets.enc       # Encrypted secrets (AES-256-GCM)
│   └── sessions/         # Session memory persistence
└── .forge-output/        # Build artifacts (gitignored)
```

Key files:

- **`forge.yaml`** — your agent's configuration: model provider, tools, skills, channels, egress rules
- **`SKILL.md`** — the top-level skill definition that describes what your agent does
- **`.env.example`** — lists all required environment variables for your chosen skills

## Run in Dev Mode

```bash
cd my-agent
forge run
```

This starts a single interactive session. Type messages, and the agent responds using your configured LLM provider and skills. Press `Ctrl+C` to exit.

## Build for Production

```bash
forge build
```

This compiles your agent and generates production artifacts:

| Artifact | Purpose |
|---|---|
| `agent-spec.json` | Complete agent specification (exportable to Initializ Command) |
| `skill-index.json` | Autowire-generated skill index with trust levels |
| `egress_allowlist.json` | Machine-readable domain allowlist with source annotations |
| `Dockerfile` | Container image definition |
| `k8s/` | Kubernetes manifests including NetworkPolicy for egress |
| `checksums.json` | SHA-256 checksums + optional Ed25519 signature |

## What's Next

- [Your First Skill](/docs/getting-started/your-first-skill) — write a custom SKILL.md
- [SKILL.md Format](/docs/core-concepts/skill-md-format) — understand the skill definition format
- [CLI Reference](/docs/reference/cli-reference) — explore all available commands
