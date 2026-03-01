---
title: "Monitoring & Observability"
description: "Monitor your Forge agent — audit logging, correlation IDs, progress tracking, egress monitoring, and integration patterns."
order: 4
editUrl: https://github.com/initializ/useforge.ai/edit/main/src/content/docs/deployment/monitoring.md
---

# Monitoring & Observability

Forge emits structured NDJSON audit events to stderr. Every significant action — LLM calls, tool executions, egress attempts, session lifecycle — is logged as a self-contained JSON line. You pipe this output to your observability stack for alerting, dashboards, and incident investigation.

## Audit Log Output

The audit log is written to **stderr** in NDJSON format (one JSON object per line). Output is thread-safe via `sync.Mutex`, so events from concurrent requests never interleave.

```bash
# Capture audit events to a file while running
forge serve 2>audit.log

# Stream and filter in real time
forge serve 2>&1 | jq 'select(.event == "llm_call")'
```

Each event includes a timestamp, event type, and event-specific fields. There is no separate log configuration — stderr is the single output channel.

## Event Types

Forge emits the following event types:

| Event | Description | Key Fields |
|---|---|---|
| `session_start` | A new request session begins | `correlation_id`, `channel` |
| `session_end` | A request session completes | `correlation_id`, `status`, `duration_ms` |
| `llm_call` | A call to the LLM provider | `correlation_id`, `model`, `input_tokens`, `output_tokens` |
| `tool_start` | A tool or skill begins execution | `correlation_id`, `tool`, `skill` |
| `tool_end` | A tool or skill completes | `correlation_id`, `tool`, `duration_ms`, `error` |
| `egress_allowed` | An outbound HTTP request was permitted | `correlation_id`, `domain`, `source` |
| `egress_blocked` | An outbound HTTP request was blocked | `correlation_id`, `domain`, `mode` |

## Correlation IDs

Every incoming request is assigned a unique 16-hex-character `correlation_id`. All events emitted during that request share the same ID, so you can trace a single user interaction across LLM calls, tool executions, and egress attempts.

Filter all events for a specific request:

```bash
forge serve 2>&1 | jq 'select(.correlation_id == "a1b2c3d4e5f67890")'
```

This is especially useful for debugging multi-step skill executions where a single user message triggers several tool calls and LLM roundtrips.

## Progress Tracking

Forge tracks progress through the request lifecycle using `tool_start` and `tool_end` events. These events fire for every hook and skill execution, giving you visibility into what your agent is doing at any moment.

For web-based UIs, Forge supports SSE (Server-Sent Events) streaming. The `ProgressEmitter` in the request context pushes progress updates to connected SSE clients in real time, so your frontend can show a live activity feed without polling.

## Egress Monitoring

The egress enforcer fires an `OnAttempt` callback on every outbound HTTP request, whether it is allowed or blocked. This produces two event types:

- **`egress_allowed`** — the request matched the allowlist and was permitted. Includes the matched domain and its source (explicit, tool-inferred, or capability).
- **`egress_blocked`** — the request did not match any allowed domain and was rejected. Includes the attempted domain and the active mode.

Blocked events are the primary signal for security monitoring. A spike in `egress_blocked` events may indicate a misconfigured skill, a compromised dependency, or an attempted data exfiltration.

## Integration Patterns

### Datadog

Pipe stderr to the Datadog agent. Configure the agent to parse JSON logs:

```bash
forge serve 2>&1 | datadog-agent log --source forge --type json
```

Or use a file-based approach:

```bash
forge serve 2>>/var/log/forge/audit.log
```

Then configure the Datadog agent to tail `/var/log/forge/audit.log` with JSON parsing enabled.

### Splunk

Forward NDJSON events to Splunk's HTTP Event Collector (HEC):

```bash
forge serve 2>&1 | while read -r line; do
  curl -s -X POST https://splunk.example.com:8088/services/collector/event \
    -H "Authorization: Splunk $HEC_TOKEN" \
    -d "{\"event\": $line}"
done
```

For production use, replace the shell loop with Splunk's Universal Forwarder monitoring the audit log file.

### ELK Stack

Use Filebeat to ship audit events to Elasticsearch:

1. Write audit events to a file: `forge serve 2>/var/log/forge/audit.log`
2. Configure Filebeat to monitor `/var/log/forge/audit.log`
3. Set the Filebeat JSON decoder to parse each line
4. Build Kibana dashboards for event types, token usage, and egress patterns

### Generic

For any log aggregator that accepts NDJSON, capture stderr to a file and tail it:

```bash
forge serve 2>audit.log
tail -f audit.log | your-log-shipper
```

## Key Metrics to Alert On

Set up alerts for these conditions in your monitoring platform:

| Condition | Why It Matters |
|---|---|
| `egress_blocked` events | Potential security issue — your agent tried to reach an unauthorized domain |
| High `input_tokens` or `output_tokens` in `llm_call` | Cost monitoring — detect runaway prompts or unexpectedly large responses |
| `session_end` with `status: "error"` | Reliability — your agent failed to complete a user request |
| `tool_end` with `error` field set | Skill failures — a tool or skill crashed during execution |
| No `session_start` events for extended period | Availability — your agent may be down or unreachable |

## File-Based Audit Log

File-based audit logging is not yet implemented as a built-in feature. Currently, the only output channel is stderr. You can capture it to a file using shell redirection (`2>audit.log`) or by adding an `io.MultiWriter` wrapper in a custom entrypoint.

A built-in file output option with rotation and retention is planned for a future release.

## What's Next

Explore the complete command reference in [CLI Reference](/docs/reference/cli-reference).
