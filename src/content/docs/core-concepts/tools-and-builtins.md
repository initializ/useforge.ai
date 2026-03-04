---
title: "Tools & Builtins"
description: "The complete tool system — 8 built-in tools, 3 adapters, skill tools, conditional tools, and egress enforcement."
order: 3
editUrl: https://github.com/initializ/useforge.ai/edit/main/src/content/docs/core-concepts/tools-and-builtins.md
---

# Tools & Builtins

Tools are the agent's hands. Every action your Forge agent takes in the world — fetching a URL, parsing data, searching the web, running a script — goes through the tool system. Tools have structured inputs (JSON Schema), structured outputs, and consistent enforcement of egress rules and timeouts.

This page covers every tool type: the 8 built-in tools, 3 adapter tools, skill-derived tools, and conditional tools.

## Builtin Tools

These 9 tools are always available to every Forge agent. They cover the most common operations an LLM agent needs.

| Tool | Purpose | Egress Enforcement |
|---|---|---|
| `http_request` | GET/POST/PUT/DELETE with headers, body, timeout | Yes — EgressTransportFromContext |
| `json_parse` | Parse JSON strings | No |
| `csv_parse` | Parse CSV data | No |
| `datetime_now` | Current timestamp in configurable format/timezone | No |
| `uuid_generate` | Generate UUIDs | No |
| `math_calculate` | Arithmetic calculations | No |
| `web_search` | Quick web lookups (Tavily or Perplexity provider) | Yes — EgressClientFromContext |
| `read_skill` | Load full SKILL.md instructions on demand | No (filesystem only) |
| `file_create` | Generate downloadable files (written to disk and uploaded to channels) | No (filesystem only) |

Tools that make no network calls have no egress enforcement. Tools that do (`http_request`, `web_search`) are wrapped by the egress enforcer so they can only reach allowed domains.

### file_create

The `file_create` tool generates downloadable files that are both written to disk and uploaded to the user's channel (Slack/Telegram). Files are stored in `.forge/files/`.

- Accepts a filename with extension and full content as text
- Returns filename, content, MIME type, and absolute disk path
- Supports common extensions: `.md`, `.json`, `.yaml`, `.py`, `.ts`, `.csv`, `.html`, etc.
- **Security**: filenames containing path separators or traversal patterns (`..`) are rejected

## Adapter Tools

Adapters bridge your agent to external tool ecosystems. Each adapter handles protocol translation and applies egress enforcement to outbound requests.

| Tool | Purpose | Egress Enforcement |
|---|---|---|
| `mcp_call` | Call tools on MCP servers via JSON-RPC | Yes |
| `webhook_call` | POST JSON payloads to webhook URLs | Yes |
| `openapi_call` | Call OpenAPI-described endpoints | Yes |

Adapters let you connect your agent to existing infrastructure without writing custom tool code. For example, `mcp_call` speaks the Model Context Protocol so your agent can use tools exposed by any MCP-compatible server.

## Skill Tool Auto-Registration

Script-backed skills are automatically registered as first-class LLM tools at runtime. This is how your custom scripts become callable tools without any glue code.

The registration process works like this:

1. During autowire, Forge discovers skills with a `scripts/` directory
2. Each script is wrapped in a `SkillTool` that handles invocation, timeout, and environment isolation
3. The `InputSpec` table in the SKILL.md is converted to a JSON Schema via `InputSpecToSchema`, giving the LLM a structured definition of what arguments the tool accepts
4. The tool is registered with the agent's tool set, alongside builtins

**Naming convention:** Tool names use underscores (e.g., `tavily_research`), while script filenames use hyphens (e.g., `tavily-research.sh`). Forge maps between them automatically.

Each skill tool runs through the `SkillCommandExecutor`, which provides:

- **Timeout enforcement** — configurable per-skill via `metadata.forge.timeout_hint` (default: 120s)
- **Environment isolation** — only explicitly declared environment variables are passed to the script
- **Structured I/O** — input is passed as JSON on stdin, output is read from stdout

## Conditional Tools

These tools are only registered when specific conditions are met:

| Tool | Condition | Purpose |
|---|---|---|
| `memory_search` | Long-term memory enabled | Hybrid search over agent memory |
| `memory_get` | Long-term memory enabled | Read specific memory files |
| `cli_execute` | Configured or auto-derived from skills | Run allowlisted binaries |
| `schedule_set` | Scheduling configured | Create or update a recurring cron schedule |
| `schedule_list` | Scheduling configured | List all active and inactive schedules |
| `schedule_delete` | Scheduling configured | Remove an LLM-created schedule |
| `schedule_history` | Scheduling configured | View execution history for scheduled tasks |

Conditional tools are not part of the `builtins.All()` set. They are added to the agent's tool set during compilation based on your configuration and the skills you have installed.

## cli_execute

`cli_execute` is the bridge between binary-backed skills and execution. When the LLM reads a binary-backed skill's instructions (via `read_skill`) and decides to act, it invokes `cli_execute` to run the required binary.

The tool implements seven security layers:

1. **Binary allowlist** — only binaries listed in `allowed_binaries` can be executed
2. **Path resolution** — binaries are resolved to absolute paths via `exec.LookPath` at startup
3. **Argument validation** — rejects `$(`, backticks, or newlines to prevent injection
4. **Timeout enforcement** — configurable per invocation (default: 120s)
5. **No shell** — uses `exec.CommandContext` directly, not `sh -c` — no shell expansion
6. **Environment isolation** — only variables listed in `env_passthrough` are available to the subprocess
7. **Output limits** — prevents memory exhaustion (default: 1MB)

Both `allowed_binaries` and `env_passthrough` are auto-derived from skill metadata. When a skill declares `metadata.forge.requires.bins: [curl]`, Forge automatically adds `curl` to the binary allowlist. When a skill declares required or optional environment variables, those are added to `env_passthrough`. You can also configure these manually in `forge.yaml`.

## web_search

The `web_search` tool supports two providers:

| Provider | Style | Default |
|---|---|---|
| **Tavily** | Structured results with titles, URLs, snippets | Yes |
| **Perplexity** | Conversational, synthesized answers | No |

The tool's description is crafted to guide the LLM toward `tavily_research` (a skill tool from the Tavily skill) for in-depth research tasks, while using `web_search` for quick lookups. This distinction helps the LLM choose the right tool for the job — `web_search` for a fast factual check, `tavily_research` for deep multi-source investigation.

## denied_tools

Skills can declare tools that should be removed from the agent's tool set when that skill is active. This is useful for skills that need tight control over the agent's behavior.

For example, the `k8s-incident-triage` skill denies `http_request` and `web_search` to prevent the agent from making arbitrary network calls during incident response. The agent should use only the skill's own tools and `cli_execute` with `kubectl`.

Denied tools are specified in the skill's SKILL.md frontmatter and enforced during AgentSpec compilation.

## Egress Enforcement

All tools that make HTTP requests are subject to egress enforcement. The mechanism works at the transport layer:

- **`EgressTransportFromContext`** — wraps `http.RoundTripper`. Used by `http_request` and adapter tools. Every outbound request is checked against the allowlist before the connection is established.
- **`EgressClientFromContext`** — provides an `*http.Client` with the egress transport already configured. Used by `web_search`.

When no egress enforcer is set in the context (e.g., during testing), tools fall back to `http.DefaultTransport` with no domain restrictions.

This means egress enforcement is always-on in production but opt-in during development, giving you a safe default without friction in local workflows.

## What's Next

- [Channels](/docs/core-concepts/channels) — connect your agent to Slack and Telegram
