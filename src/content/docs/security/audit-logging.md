---
title: Audit Logging
description: "Structured NDJSON audit events — event types, correlation threading, hook integration, progress tracking, and guardrails."
order: 5
editUrl: https://github.com/initializ/useforge.ai/edit/main/src/content/docs/security/audit-logging.md
---

# Audit Logging

Structured NDJSON audit events provide an immutable trail of all runtime activity. Every request, tool execution, egress attempt, and LLM call is recorded with a correlation ID for end-to-end tracing.

## Event Structure

Every audit event follows a consistent JSON structure:

```json
{
  "ts": "2026-02-27T10:00:00Z",
  "event": "session_start",
  "correlation_id": "a1b2c3d4e5f67890",
  "task_id": "task-1",
  "fields": {}
}
```

- **`ts`** — UTC timestamp in RFC 3339 format
- **`event`** — one of the defined event types
- **`correlation_id`** — unique 16-hex-character ID linking all events in a request
- **`task_id`** — the task being processed
- **`fields`** — event-specific data

## Event Types

| Event | Emitted When |
|---|---|
| `session_start` | Handler receives a task request |
| `session_end` | Handler completes (includes final state) |
| `tool_exec` | Before/after each tool execution (phase: start/end) |
| `egress_allowed` | Outbound HTTP request passes enforcer |
| `egress_blocked` | Outbound HTTP request blocked by enforcer |
| `llm_call` | After each LLM API call (includes token count) |
| `guardrail_check` | Guardrail evaluation (reserved) |

## Correlation Threading

Every incoming request gets a unique `correlation_id` — a 16-hex-character string generated via `crypto/rand`. Both the `CorrelationID` and `TaskID` propagate through the Go context, so every event emitted during a request shares the same correlation ID.

This lets you filter a log stream to trace a single request from start to finish.

## NDJSON Output

Audit events are written as newline-delimited JSON to stderr. Output is thread-safe via `sync.Mutex`. Timestamps are auto-set to UTC RFC 3339 at emission time.

## Full Example

Here is a complete trace of a single request:

```json
{"ts":"2026-02-27T10:00:00Z","event":"session_start","correlation_id":"a1b2c3d4e5f67890","task_id":"task-1"}
{"ts":"2026-02-27T10:00:01Z","event":"tool_exec","correlation_id":"a1b2c3d4e5f67890","task_id":"task-1","fields":{"tool":"http_request","phase":"start"}}
{"ts":"2026-02-27T10:00:01Z","event":"egress_allowed","correlation_id":"a1b2c3d4e5f67890","task_id":"task-1","fields":{"domain":"api.openai.com","mode":"allowlist"}}
{"ts":"2026-02-27T10:00:01Z","event":"tool_exec","correlation_id":"a1b2c3d4e5f67890","task_id":"task-1","fields":{"tool":"http_request","phase":"end"}}
{"ts":"2026-02-27T10:00:02Z","event":"llm_call","correlation_id":"a1b2c3d4e5f67890","task_id":"task-1","fields":{"tokens":493}}
{"ts":"2026-02-27T10:00:02Z","event":"session_end","correlation_id":"a1b2c3d4e5f67890","task_id":"task-1","fields":{"state":"completed"}}
```

## Hook Integration

The `HookContext` carries both the `TaskID` and `CorrelationID` at all hook points. This means audit events can be emitted from any hook in the lifecycle:

- `BeforeLLMCall`
- `AfterLLMCall`
- `BeforeToolExec`
- `AfterToolExec`
- `OnError`
- `OnProgress`

## Progress Tracking

Audit events power live progress indicators in web and chat UIs:

- **`BeforeToolExec`** emits `{phase: "tool_start", tool: "<name>", message: "Running <name>..."}`
- **`AfterToolExec`** emits `{phase: "tool_end", tool: "<name>", message: "<name> completed"}` or `{phase: "tool_end", tool: "<name>", message: "<name> failed"}`

When you use the A2A HTTP server (`forge serve`), these events are streamed via SSE to connected clients. This enables real-time progress indicators in web dashboards and chat interfaces.

## Thread Safety

All audit event output is protected by a `sync.Mutex`. Multiple goroutines can emit events concurrently without interleaving or corruption.

## Guardrails

Forge includes built-in guardrails that evaluate content before it reaches the LLM or the user:

| Guardrail | What It Checks | Detection Method |
|---|---|---|
| `content_filter` | Blocked words and phrases (configurable word list) | Case-insensitive substring matching |
| `no_pii` | Email addresses, phone numbers, SSNs | Regex pattern matching |
| `jailbreak_protection` | Common jailbreak phrases and prompt injection attempts | Pattern matching against known jailbreak templates |

### Modes

Each guardrail runs in one of two modes:

| Mode | Behavior | Use Case |
|---|---|---|
| **Enforce** | Blocks the request and returns an error to the caller | Production environments, compliance-critical agents |
| **Warn** | Logs a warning audit event (`guardrail_check`) but allows the request to proceed | Development, monitoring, gradual rollout |

### Configuration

Guardrails are configured via `PolicyScaffold` and enabled with the `--enforce-guardrails` flag:

```bash
# Enforce mode — violations are errors
forge run --enforce-guardrails

# Warn mode (default) — violations are logged
forge run
```

### Audit Events

Guardrail evaluations emit `guardrail_check` audit events:

```json
{"event":"guardrail_check","correlation_id":"...","fields":{"guardrail":"no_pii","mode":"enforce","result":"blocked","detail":"email address detected"}}
{"event":"guardrail_check","correlation_id":"...","fields":{"guardrail":"content_filter","mode":"warn","result":"flagged","detail":"blocked word: <word>"}}
```

## Note on File-Based Logging

Audit events currently write to stderr only. File-based audit logging is not yet implemented but can be added by wrapping the output writer with `io.MultiWriter` to tee events to both stderr and a log file.

## What's Next

Learn about the skills that ship with Forge in [Embedded Skills](/docs/skills/embedded-skills).
