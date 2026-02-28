---
title: CLI Reference
description: Complete reference for all Forge CLI commands — core, skills, channels, secrets, keys, and security.
order: 1
---

# CLI Reference

Forge is a single binary with subcommands for every stage of the agent lifecycle. Default port for `forge serve` is **8080**.

## Core Commands

| Command | Description |
|---|---|
| `forge init` | Interactive wizard — walks through provider, key validation, channel, skills, egress review, passphrase, and generation |
| `forge build` | Compile skills, validate configuration, generate Dockerfile + K8s manifests + egress allowlist |
| `forge run` | Dev mode — runs the agent from the current directory in a single interactive session |
| `forge serve` | Service mode — multi-session, SSE streaming, structured logs |
| `forge serve --with slack` | Start the agent with a Slack channel connector |
| `forge serve --with telegram` | Start the agent with a Telegram channel connector |
| `forge package` | Build a container image using Docker, Podman, or Buildah |
| `forge package --prod` | Production build — rejects dev-open egress configurations |
| `forge export` | Export AgentSpec JSON for Initializ Command import |
| `forge validate` | Run schema validation, command compatibility, and requirements checks |

## Skills Commands

| Command | Description |
|---|---|
| `forge skills validate` | Per-skill requirement validation (runs the autowire pipeline) |
| `forge skills validate <path>` | Validate a single skill directory |
| `forge skills list` | List all skills with trust levels and source tier |
| `forge skills trust-report <name>` | Show the full trust report for a specific skill |
| `forge skills autowire [--dry-run]` | Run the autowire pipeline explicitly (scan → parse → security → trust) |
| `forge skills refresh` | Re-scan local skills and re-fetch remote skills (when implemented) |
| `forge skills promote <name>` | Admin action: promote an `under_review` skill to `trusted` |
| `forge skills block <name>` | Admin action: force a skill to `failed` status |
| `forge skills add <name>` | Add a skill from the embedded registry — copies SKILL.md + scripts, checks env/secrets, deduplicates .env |
| `forge skills audit` | Run a security audit with risk scores and policy checks |
| `forge skills audit --format json` | Machine-readable audit output |
| `forge skills sign --key <path>` | Sign a skill directory with an Ed25519 key |
| `forge skills keygen <name>` | Generate an Ed25519 key pair in `~/.forge/keys/` |

## Channel Commands

| Command | Description |
|---|---|
| `forge channel add slack` | Interactive Slack setup — prompts for bot token and validates it |
| `forge channel add telegram` | Interactive Telegram setup — prompts for bot token and validates it |

Channels run **with** the agent via `forge serve --with <channel>`, not as separate processes.

## Secret Commands

| Command | Description |
|---|---|
| `forge secret set <KEY> [VALUE]` | Store a secret in the encrypted file (prompts for value if omitted) |
| `forge secret get <KEY>` | Retrieve a secret (shows source: encrypted-file or env) |
| `forge secret list` | List all stored secret keys |
| `forge secret delete <KEY>` | Delete a secret from the encrypted file |

Add `--local` to any secret command to operate on the agent-local secret file (`<cwd>/.forge/secrets.enc`) instead of the global one (`~/.forge/secrets.enc`).

## Key Commands

| Command | Description |
|---|---|
| `forge key generate [--name X]` | Generate an Ed25519 signing keypair |
| `forge key trust <pubkey-file>` | Add a public key to the trusted keyring |
| `forge key list` | List signing and trusted keys |

## Security Commands

| Command | Description |
|---|---|
| `forge security egress show` | Display the derived egress allowlist with source annotations |

## Common Workflows

### Create and run an agent

```bash
forge init my-agent
cd my-agent
forge run
```

### Build and serve with Slack

```bash
forge build
forge serve --with slack
```

### Add a skill and rebuild

```bash
forge skills add summarize
forge build
forge run
```

### Audit skills and check egress

```bash
forge skills audit
forge security egress show
```

## Not Real Commands

The following are **not valid** Forge commands:

- `forge run --bundle` — there is no bundle concept for local execution
- `forge serve --bundle` — same as above
- `forge channel slack --agent URL` — channels start WITH the agent via `--with`, not as separate processes
