---
title: forge.yaml Schema
description: "Complete field-by-field reference for forge.yaml — every configuration option with types, defaults, and examples."
order: 2
editUrl: https://github.com/initializ/useforge.ai/edit/main/src/content/docs/reference/forge-yaml-schema.md
---

# forge.yaml Schema

This is the complete field-by-field reference for `forge.yaml`. Every configuration option is listed with its type, default value, and description. For a guided walkthrough with context, see [Configuration](/docs/getting-started/configuration).

## Top-Level Fields

| Field | Type | Default | Description |
|---|---|---|---|
| `agent_id` | string | — | Unique identifier for the agent. Generated from the project name during `forge init`. |
| `version` | string | — | Semantic version of the agent (e.g., `0.1.0`). |
| `framework` | string | `"forge"` | Runtime framework. `"forge"` (default), `"crewai"`, `"langchain"`. `"custom"` is accepted as a backward-compatible alias for `"forge"`. |

## `model.*`

Configure the primary LLM provider and automatic failover chain.

| Field | Type | Default | Description |
|---|---|---|---|
| `model.provider` | string | — | LLM provider: `openai`, `anthropic`, `gemini`, `ollama`. |
| `model.name` | string | provider default | Model name (e.g., `gpt-4o`, `claude-sonnet-4-20250514`). If omitted, the provider's default model is used. |
| `model.fallbacks` | list | `[]` | Ordered list of fallback providers. Tried sequentially when the primary provider fails. |
| `model.fallbacks[*].provider` | string | — | Fallback provider name (`openai`, `anthropic`, `gemini`, `ollama`). |
| `model.fallbacks[*].name` | string | — | Fallback model name. |

Example:

```yaml
model:
  provider: openai
  name: gpt-4o
  fallbacks:
    - provider: anthropic
      name: claude-sonnet-4-20250514
    - provider: gemini
      name: gemini-2.5-flash
```

## `memory.*`

Session persistence and long-term cross-session memory.

| Field | Type | Default | Description |
|---|---|---|---|
| `memory.persistence` | bool | `true` | Enable session memory persistence. When `true`, conversation history survives agent restarts. |
| `memory.sessions_dir` | string | `.forge/sessions` | Directory where session files are stored. |
| `memory.trigger_ratio` | float | `0.6` | Compaction trigger threshold. When the conversation fills this fraction of the context budget, older messages are summarized. |
| `memory.char_budget` | int | `0` (auto) | Character budget for session context. `0` means auto-detect from the model's context window. |
| `memory.long_term` | bool | `false` | Enable long-term cross-session memory. Uses embedding-based vector search combined with keyword matching. |
| `memory.memory_dir` | string | `.forge/memory` | Directory where long-term memory data is stored. |
| `memory.embedding_provider` | string | auto | Embedding provider for long-term memory. Auto-detected from the configured LLM provider if not set. |
| `memory.embedding_model` | string | `""` | Specific embedding model. Empty string uses the provider's default embedding model. |
| `memory.vector_weight` | float | `0.7` | Weight for vector similarity in hybrid retrieval scoring. Must sum to 1.0 with `keyword_weight`. |
| `memory.keyword_weight` | float | `0.3` | Weight for keyword overlap in hybrid retrieval scoring. Must sum to 1.0 with `vector_weight`. |
| `memory.decay_half_life_days` | int | `7` | Temporal decay half-life in days for daily memory logs. Older memories score progressively lower. |

Example:

```yaml
memory:
  persistence: true
  sessions_dir: .forge/sessions
  trigger_ratio: 0.6
  char_budget: 0
  long_term: true
  memory_dir: .forge/memory
  embedding_provider: openai
  embedding_model: ""
  vector_weight: 0.7
  keyword_weight: 0.3
  decay_half_life_days: 7
```

## `skills.*`

| Field | Type | Default | Description |
|---|---|---|---|
| `skills.path` | string | `SKILL.md` | Path to the top-level skill file. This is the root skill that the agent loads on startup. Individual skills live in `skills/<name>/SKILL.md`. |

Example:

```yaml
skills:
  path: SKILL.md
```

## `tools[*].*`

Built-in tools your agent can invoke. Each entry has a name and optional tool-specific configuration.

| Field | Type | Default | Description |
|---|---|---|---|
| `tools[*].name` | string | — | Tool name. Built-in tools: `cli_execute`, `web_search`, `http_request`, `json_parse`, `read_skill`. |
| `tools[*].config` | object | `{}` | Tool-specific configuration. Contents vary by tool. |
| `tools[*].config.allowed_binaries` | list | auto | (`cli_execute` only) Allowed binary names. Skills that declare `requires.bins` are merged automatically during `forge build`. |
| `tools[*].config.timeout` | string | `120s` | (`cli_execute` only) Maximum execution time for a single command invocation. |
| `tools[*].config.provider` | string | `tavily` | (`web_search` only) Search provider: `tavily` or `perplexity`. |

Example:

```yaml
tools:
  - name: cli_execute
    config:
      allowed_binaries: [summarize, curl]
      timeout: 120s
  - name: web_search
    config:
      provider: tavily
  - name: http_request
  - name: json_parse
```

## `channels`

| Field | Type | Default | Description |
|---|---|---|---|
| `channels` | list | `[]` | Channel connectors to enable. Supported values: `slack`, `telegram`. Channels run alongside the agent via `forge serve --with <channel>`. |

Example:

```yaml
channels:
  - slack
  - telegram
```

## `secrets.*`

| Field | Type | Default | Description |
|---|---|---|---|
| `secrets.providers` | list | `["encrypted-file", "env"]` | Secret provider chain, checked in order. The first provider that has the requested secret wins. |

Supported providers:

| Provider | Storage | Description |
|---|---|---|
| `encrypted-file` | `.forge/secrets.enc` | AES-256-GCM encrypted file. Requires `FORGE_PASSPHRASE`. |
| `env` | Environment variables | Falls back to reading from the process environment. |

Example:

```yaml
secrets:
  providers:
    - encrypted-file
    - env
```

## `egress.*`

Network-level domain control for outbound requests.

| Field | Type | Default | Description |
|---|---|---|---|
| `egress.profile` | string | `standard` | Security posture: `strict` (deny by default), `standard` (balanced, allow known domains), `permissive` (minimal restriction for development). |
| `egress.mode` | string | profile default | Enforcement mode: `deny-all` (block all non-localhost), `allowlist` (permit computed allowlist only), `dev-open` (allow all, rejected by `--prod`). |
| `egress.capabilities` | list | `[]` | Capability bundles that auto-expand to domain sets. For example, `slack` adds `slack.com`, `hooks.slack.com`, and `api.slack.com`. |
| `egress.allowed_domains` | list | `[]` | Explicit domain allowlist. Supports wildcard subdomains (e.g., `*.github.com`). |

Example:

```yaml
egress:
  profile: standard
  mode: allowlist
  capabilities:
    - slack
    - telegram
  allowed_domains:
    - custom-api.example.com
    - "*.github.com"
```

## Full Example

A complete `forge.yaml` using every section:

```yaml
agent_id: my-agent
version: 0.1.0
framework: forge

model:
  provider: openai
  name: gpt-4o
  fallbacks:
    - provider: anthropic
      name: claude-sonnet-4-20250514
    - provider: gemini
      name: gemini-2.5-flash

memory:
  persistence: true
  sessions_dir: .forge/sessions
  trigger_ratio: 0.6
  char_budget: 0
  long_term: true
  memory_dir: .forge/memory
  embedding_provider: openai
  embedding_model: ""
  vector_weight: 0.7
  keyword_weight: 0.3
  decay_half_life_days: 7

skills:
  path: SKILL.md

tools:
  - name: cli_execute
    config:
      allowed_binaries: [summarize, curl, kubectl]
      timeout: 120s
  - name: web_search
    config:
      provider: tavily
  - name: http_request
  - name: json_parse

channels:
  - slack
  - telegram

secrets:
  providers:
    - encrypted-file
    - env

egress:
  profile: standard
  mode: allowlist
  capabilities:
    - slack
    - telegram
  allowed_domains:
    - custom-api.example.com
    - "*.github.com"
```

## What's Next

- [Environment Variables](/docs/reference/environment-variables) — complete reference for API keys, config overrides, and channel tokens
