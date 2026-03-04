---
title: CLI Reference
description: "Complete reference for all Forge CLI commands — init, build, run, serve, export, package, skills, channels, secrets, keys, schedule, tool, and ui."
order: 1
editUrl: https://github.com/initializ/useforge.ai/edit/main/src/content/docs/reference/cli-reference.md
---

# CLI Reference

Forge is a single binary with subcommands for every stage of the agent lifecycle. Default port for `forge run` is **8080**.

## Global Flags

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--config` | | `forge.yaml` | Config file path |
| `--verbose` | `-v` | `false` | Enable verbose output |
| `--output-dir` | `-o` | `.` | Output directory |

## `forge init`

Initialize a new agent project.

```bash
forge init [name] [flags]
```

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--name` | `-n` | | Agent name |
| `--framework` | `-f` | | Framework: `crewai`, `langchain`, or `custom` |
| `--language` | `-l` | | Language: `python`, `typescript`, or `go` |
| `--model-provider` | `-m` | | Model provider: `openai`, `anthropic`, `ollama`, or `custom` |
| `--channels` | | | Channel adapters (e.g., `slack,telegram`) |
| `--tools` | | | Builtin tools to enable (e.g., `web_search,http_request`) |
| `--skills` | | | Registry skills to include (e.g., `github,weather`) |
| `--api-key` | | | LLM provider API key |
| `--org-id` | | | OpenAI Organization ID (enterprise) |
| `--from-skills` | | | Path to a SKILL.md file for auto-configuration |
| `--non-interactive` | | `false` | Skip interactive prompts |

```bash
# Interactive mode (default)
forge init my-agent

# Non-interactive with all options
forge init my-agent \
  --framework langchain \
  --language python \
  --model-provider openai \
  --channels slack,telegram \
  --non-interactive

# With builtin tools and registry skills
forge init my-agent \
  --framework custom \
  --model-provider openai \
  --tools web_search,http_request \
  --skills github \
  --api-key sk-... \
  --non-interactive

# OpenAI enterprise with organization ID
forge init my-agent \
  --model-provider openai \
  --api-key sk-... \
  --org-id org-xxxxxxxxxxxxxxxxxxxxxxxx \
  --non-interactive
```

## `forge build`

Build the agent container artifact. Runs the full 8-stage build pipeline.

```bash
forge build [flags]
```

Uses global `--config` and `--output-dir` flags. Output is written to `.forge-output/` by default.

## `forge validate`

Validate agent spec and forge.yaml.

```bash
forge validate [flags]
```

| Flag | Default | Description |
|------|---------|-------------|
| `--strict` | `false` | Treat warnings as errors |
| `--command-compat` | `false` | Check Command platform import compatibility |

## `forge run`

Run the agent locally with an A2A-compliant dev server.

```bash
forge run [flags]
```

| Flag | Default | Description |
|------|---------|-------------|
| `--port` | `8080` | Port for the A2A dev server |
| `--host` | `""` (all interfaces) | Bind address |
| `--shutdown-timeout` | `0` (immediate) | Graceful shutdown timeout |
| `--mock-tools` | `false` | Use mock runtime instead of subprocess |
| `--enforce-guardrails` | `false` | Enforce guardrail violations as errors |
| `--model` | | Override model name |
| `--provider` | | LLM provider: `openai`, `anthropic`, `gemini`, or `ollama` |
| `--env` | `.env` | Path to .env file |
| `--with` | | Channel adapters (e.g., `slack,telegram`) |

```bash
# Run with defaults
forge run

# Run with mock tools on custom port
forge run --port 9090 --mock-tools

# Run with LLM provider and channels
forge run --provider openai --model gpt-4o --with slack

# Container deployment
forge run --host 0.0.0.0 --shutdown-timeout 30s
```

## `forge serve`

Manage the agent as a background daemon process.

```bash
forge serve [start|stop|status|logs] [flags]
```

| Subcommand | Description |
|------------|-------------|
| `start` (default) | Start the daemon in background |
| `stop` | Send SIGTERM (10s timeout, SIGKILL fallback) |
| `status` | Show PID, listen address, health check |
| `logs` | Tail `.forge/serve.log` |

| Flag | Default | Description |
|------|---------|-------------|
| `--port` | `8080` | HTTP server port |
| `--host` | `127.0.0.1` | Bind address (secure default) |
| `--with` | | Channel adapters |

```bash
# Start daemon (secure defaults)
forge serve

# Start on custom port
forge serve start --port 9090 --host 0.0.0.0

# Stop the daemon
forge serve stop

# Check status (PID, uptime, health)
forge serve status

# View recent logs
forge serve logs
```

The daemon forks `forge run` in the background with `setsid`, writes state to `.forge/serve.json`, and redirects output to `.forge/serve.log`.

## `forge export`

Export agent spec for Command platform import.

```bash
forge export [flags]
```

| Flag | Default | Description |
|------|---------|-------------|
| `--output` | `{agent_id}-forge.json` | Output file path |
| `--pretty` | `false` | Format JSON with indentation |
| `--include-schemas` | `false` | Embed tool schemas inline |
| `--simulate-import` | `false` | Print simulated import result |
| `--dev` | `false` | Include dev-category tools in export |

```bash
# Export with defaults
forge export

# Pretty-print with embedded schemas
forge export --pretty --include-schemas

# Simulate Command import
forge export --simulate-import
```

## `forge package`

Build a container image for the agent.

```bash
forge package [flags]
```

| Flag | Default | Description |
|------|---------|-------------|
| `--push` | `false` | Push image to registry after building |
| `--platform` | | Target platform (e.g., `linux/amd64`) |
| `--no-cache` | `false` | Disable layer cache |
| `--dev` | `false` | Include dev tools in image |
| `--prod` | `false` | Production build (rejects dev tools and dev-open egress) |
| `--verify` | `false` | Smoke-test container after build |
| `--registry` | | Registry prefix (e.g., `ghcr.io/org`) |
| `--builder` | | Force builder: `docker`, `podman`, or `buildah` |
| `--skip-build` | `false` | Skip re-running forge build |
| `--with-channels` | `false` | Generate docker-compose.yaml with channel adapters |

```bash
# Build image with auto-detected builder
forge package

# Build and push to registry
forge package --registry ghcr.io/myorg --push

# Production build
forge package --prod

# Generate docker-compose with channels
forge package --with-channels
```

## `forge schedule`

Manage cron schedules.

```bash
forge schedule list
```

Lists all configured cron schedules (both YAML-defined and LLM-created). See [Scheduling](/docs/core-concepts/scheduling) for configuration details.

## `forge tool`

Manage and inspect agent tools.

```bash
# List all available tools
forge tool list

# Show tool details and input schema
forge tool describe <name>
```

## `forge ui`

Launch the local web dashboard.

```bash
# Launch with defaults
forge ui

# Specify workspace and port
forge ui --dir /path/to/workspace --port 4200

# Launch without auto-opening browser
forge ui --no-open
```

See [Web Dashboard](/docs/reference/web-dashboard) for full documentation.

## Skills Commands

| Command | Description |
|---|---|
| `forge skills add <name>` | Add a skill from the embedded registry |
| `forge skills list` | List all skills with trust levels and source tier |
| `forge skills list --category sre` | Filter by category |
| `forge skills list --tags kubernetes` | Filter by tags |
| `forge skills validate` | Per-skill requirement validation (runs the autowire pipeline) |
| `forge skills validate <path>` | Validate a single skill directory |
| `forge skills trust-report <name>` | Show the full trust report for a specific skill |
| `forge skills autowire [--dry-run]` | Run the autowire pipeline explicitly |
| `forge skills refresh` | Re-scan local skills and re-fetch remote skills |
| `forge skills promote <name>` | Admin action: promote an `under_review` skill to `trusted` |
| `forge skills block <name>` | Admin action: force a skill to `failed` status |
| `forge skills audit` | Run a security audit with risk scores and policy checks |
| `forge skills audit --format json` | Machine-readable audit output |
| `forge skills sign --key <path>` | Sign a skill directory with an Ed25519 key |
| `forge skills keygen <name>` | Generate an Ed25519 key pair in `~/.forge/keys/` |

## Channel Commands

| Command | Description |
|---|---|
| `forge channel add slack` | Interactive Slack setup — prompts for tokens and validates |
| `forge channel add telegram` | Interactive Telegram setup — prompts for bot token and validates |
| `forge channel serve <channel>` | Run a standalone channel adapter (requires `AGENT_URL` env var) |
| `forge channel list` | List available channel adapters |
| `forge channel status` | Show configured channels from `forge.yaml` |

Channels run **with** the agent via `forge run --with <channel>`, not as separate processes.

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
