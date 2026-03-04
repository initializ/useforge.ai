---
title: "Web Dashboard (forge ui)"
description: "Manage agents from the browser — dashboard, interactive chat, agent creation wizard, config editor, and skill builder."
order: 5
editUrl: https://github.com/initializ/useforge.ai/edit/main/src/content/docs/reference/web-dashboard.md
---

Forge includes a local web dashboard for managing agents from the browser — no CLI needed after launch.

## Launch

```bash
# Launch the dashboard
forge ui

# Specify workspace and port
forge ui --dir /path/to/workspace --port 4200

# Launch without auto-opening browser
forge ui --no-open
```

Opens `http://localhost:4200` with a full-featured SPA for the complete agent lifecycle.

## Dashboard

The main view discovers all agents in the workspace directory and shows their status in real-time via SSE (Server-Sent Events).

| Feature | Description |
|---------|-------------|
| Agent discovery | Auto-scans workspace for `forge.yaml` files |
| Start / Stop | Start and stop agents with one click |
| Daemon processes | Agents run as background daemons via `forge serve` — they survive UI shutdown |
| Live status | Real-time state updates (stopped, starting, running, errored) |
| Passphrase unlock | Prompts for `FORGE_PASSPHRASE` when agents have encrypted secrets |
| Auto-rescan | Detects new agents after creation |
| Unified management | All agents (UI-started or CLI-started) get identical Start/Stop controls |

### Agent Lifecycle

The UI manages agents as daemon processes using `forge serve start` / `forge serve stop` under the hood. This means:

- **Agents survive UI shutdown** — closing the dashboard does not kill running agents.
- **Restart detection** — restarting the UI auto-discovers running agents via `.forge/serve.json` and TCP probing.
- **Unified view** — agents started from the CLI (`forge serve start`) and agents started from the UI appear identically.

## Interactive Chat

Click any running agent to open a chat interface that streams responses via the A2A protocol.

| Feature | Description |
|---------|-------------|
| Streaming responses | Real-time token streaming with progress indicators |
| Markdown rendering | Code blocks, tables, lists rendered inline |
| Session history | Browse and resume previous conversations |
| Tool call visibility | See which tools the agent invokes during execution |

## Create Agent Wizard

A multi-step wizard (web equivalent of `forge init`) that walks through the full agent setup:

| Step | What it does |
|------|-------------|
| Name | Set agent name with live slug preview |
| Provider | Select LLM provider (OpenAI, Anthropic, Gemini, Ollama, Custom) |
| Model & Auth | Pick from provider-specific model lists; OpenAI supports API key or browser OAuth login, plus optional Organization ID |
| Channels | Select Slack/Telegram with inline token collection |
| Tools | Select builtin tools; web_search shows Tavily vs Perplexity provider choice |
| Skills | Browse registry skills by category with inline env var collection |
| Fallback | Select backup LLM providers with API keys for automatic failover |
| Env & Security | Add extra env vars; set passphrase for AES-256-GCM secret encryption |
| Review | Summary of all selections before creation |

## Config Editor

Edit `forge.yaml` for any agent with a Monaco-based YAML editor:

| Feature | Description |
|---------|-------------|
| Syntax highlighting | YAML language support with Monaco editor |
| Live validation | Validate config against the forge schema without saving |
| Save with validation | Server-side validation before writing to disk |
| Keyboard shortcut | Cmd/Ctrl+S to save |
| Restart integration | Restart agent after config changes |

## Skills Browser

Browse the built-in skill registry with filtering and detail view:

| Feature | Description |
|---------|-------------|
| Grid view | Skill cards showing name, description, category, tags |
| Category filter | Filter skills by category |
| Detail panel | Click a skill to view its full SKILL.md content |
| Env requirements | Shows required, one-of, and optional env vars per skill |

## Skill Builder

An AI-powered conversational tool for creating custom skills. Access it via the **Build Skill** button on any agent card.

### How It Works

The Skill Builder uses the agent's own LLM provider to power a chat conversation that generates valid SKILL.md files and optional helper scripts. It automatically selects a stronger code-generation model when available (e.g. `gpt-4.1` for OpenAI, `claude-opus-4-6` for Anthropic).

### Features

| Feature | Description |
|---------|-------------|
| Conversational design | Describe what you want in plain language; the AI generates the skill |
| Live streaming | LLM responses stream token-by-token via SSE |
| Artifact extraction | Automatically parses `skill.md` and `script:` code fences from the response |
| SKILL.md preview | Live preview panel with syntax highlighting |
| Script preview | View generated helper scripts alongside the SKILL.md |
| Validation | Server-side validation checks name format, required fields, egress domains, and uniqueness |
| One-click save | Save the validated skill directly to the agent's `skills/` directory |

### Workflow

1. **Open** the Skill Builder from an agent card
2. **Describe** the skill you want (e.g. "Create a skill that queries Jira issues")
3. **Iterate** — the AI asks about requirements, security constraints, and env vars
4. **Review** — inspect the generated SKILL.md and scripts in the preview panel
5. **Validate** — check for errors and warnings before saving
6. **Save** — writes `skills/{name}/SKILL.md` and `skills/{name}/scripts/` to the agent directory

## Architecture

The dashboard is a single Go module (`forge-ui`) embedded into the `forge` binary:

- **Daemon-based lifecycle** — the UI delegates to `forge serve start/stop` via `exec.Command`, so agents are independent OS processes that survive UI restarts.
- **Scanner as source of truth** — reads `.forge/serve.json` and does TCP probes to detect running agents.
- **Embedded frontend** — Preact + HTM SPA with no build step required.
- **Tree-shaken Monaco** — YAML-only Monaco editor bundle (~615KB).
