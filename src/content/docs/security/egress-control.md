---
title: Egress Control
description: "Control what domains your agent can reach — profiles, modes, domain matching, subprocess proxy, and runtime enforcement."
order: 1
editUrl: https://github.com/initializ/useforge.ai/edit/main/src/content/docs/security/egress-control.md
---

# Egress Control

Forge controls what domains your agent can reach. Enforcement happens at both build-time and runtime, so you get a clear allowlist before you deploy and strict filtering once the agent is live.

Egress security operates at two levels:

1. **Build time** — generates allowlist artifacts and Kubernetes NetworkPolicy manifests
2. **Runtime** — an in-process `EgressEnforcer` validates every outbound HTTP request, and a local `EgressProxy` enforces the same rules on subprocess traffic (skill scripts, `cli_execute`)

## Profiles

Profiles set the overall posture for egress control. You choose a profile in your `forge.yaml` and it determines the default mode.

| Profile | Description | Default Mode |
|---|---|---|
| `strict` | Maximum restriction, deny by default | `deny-all` |
| `standard` | Balanced, allow known domains | `allowlist` |
| `permissive` | Minimal restriction for development | `dev-open` |

## Modes

The mode determines how outbound requests are evaluated at runtime.

| Mode | Behavior |
|---|---|
| `deny-all` | All non-localhost outbound traffic blocked |
| `allowlist` | Only explicitly allowed domains (exact + wildcard) |
| `dev-open` | All traffic allowed (rejected by `--prod`) |

## Domain Matching

Domain matching is handled by `DomainMatcher`, shared by both the in-process enforcer and the subprocess proxy:

- **Exact match** — `api.openai.com` matches `api.openai.com`
- **Wildcard match** — `*.github.com` matches `api.github.com` but **not** `github.com` or `notgithub.com`
- **Port stripping** — `api.openai.com:443` is matched against `api.openai.com`
- **Case insensitive** — `API.OpenAI.COM` matches `api.openai.com`
- **Localhost bypass** — `127.0.0.1`, `::1`, and `localhost` are always allowed in all modes

## Domain Resolution

When you run `forge build`, Forge merges three sources into a single deduplicated, sorted allowlist:

1. **Explicit domains** from `egress.allowed_domains` in `forge.yaml`
2. **Tool-inferred domains** — tools map to known required domains
3. **Capability bundles** — capability names expand to known domain sets

### Tool Domain Inference

| Tool | Inferred Domains |
|------|-----------------|
| `web_search` / `web-search` | `api.tavily.com`, `api.perplexity.ai` |
| `github_api` | `api.github.com`, `github.com` |
| `slack_notify` | `slack.com`, `hooks.slack.com` |
| `openai_completion` | `api.openai.com` |
| `anthropic_api` | `api.anthropic.com` |
| `huggingface_api` | `api-inference.huggingface.co`, `huggingface.co` |
| `google_vertex` | `us-central1-aiplatform.googleapis.com` |
| `sendgrid_email` | `api.sendgrid.com` |
| `twilio_sms` | `api.twilio.com` |
| `aws_bedrock` | `bedrock-runtime.us-east-1.amazonaws.com` |
| `azure_openai` | `openai.azure.com` |
| `tavily_research` | `api.tavily.com` |
| `tavily_search` | `api.tavily.com` |

### Capability Bundles

| Capability | Domains |
|-----------|---------|
| `slack` | `slack.com`, `hooks.slack.com`, `api.slack.com` |
| `telegram` | `api.telegram.org` |

## Runtime Enforcement

### In-Process Enforcer

The `EgressEnforcer` wraps Go's `http.RoundTripper` interface around the base transport. Every outbound HTTP request from in-process Go code (builtins like `http_request`, `web_search`, LLM API calls) passes through it before reaching the network.

- **OnAttempt callback** — fires on every request for audit logging, whether allowed or blocked
- **Blocked request error** — returns `egress blocked: domain "X" not in allowlist (mode=allowlist)`

### Subprocess Egress Proxy

Skill scripts and `cli_execute` subprocesses bypass the Go-level enforcer because they use external tools like `curl` or `wget`. The `EgressProxy` closes this gap:

```
┌─────────────────────────────────────────────────────┐
│                   forge run                         │
│                                                     │
│  In-process HTTP ──→ EgressEnforcer (RoundTripper)  │
│                                                     │
│  Subprocesses ──→ HTTP_PROXY ──→ EgressProxy        │
│  (curl, wget,       127.0.0.1:<port>  (validates    │
│   python, etc.)                        domains)     │
└─────────────────────────────────────────────────────┘
```

1. Before tool registration, Forge starts a local HTTP/HTTPS forward proxy on `127.0.0.1:0` (random port)
2. `HTTP_PROXY`, `HTTPS_PROXY`, `http_proxy`, and `https_proxy` env vars are injected into every subprocess
3. The proxy validates each request's destination hostname against the same `DomainMatcher`
4. Allowed requests are forwarded; blocked requests receive `403 Forbidden`

| Property | Detail |
|----------|--------|
| **Binding** | `127.0.0.1:0` — localhost only, random port, never exposed externally |
| **Lifecycle** | Per `forge run` — starts before tool registration, shuts down on context cancellation |
| **Isolation** | Multiple `forge run` instances each get their own proxy on different ports |
| **HTTPS CONNECT** | Parses host from `CONNECT host:port`, validates domain, blind-relays bytes (no MITM/decryption) |
| **Audit** | Emits `egress_allowed`/`egress_blocked` audit events with `"source": "proxy"` |

### Container Detection

The proxy is skipped in container environments where Kubernetes `NetworkPolicy` handles egress enforcement instead. Container detection checks for `KUBERNETES_SERVICE_HOST` or `/.dockerenv`.

## Context Propagation

The enforcer is injected into the request context via `WithEgressClient` and retrieved with `EgressClientFromContext`. Any code that uses the context-provided HTTP client gets egress enforcement automatically.

## Build-Time Outputs

`forge build` produces two egress-related artifacts:

- **`egress_allowlist.json`** — machine-readable domain allowlist with source annotations (explicit, tool-inferred, or capability)
- **Kubernetes `NetworkPolicy`** — restricts pod egress to allowed domains on ports 80 and 443

You can inspect the resolved allowlist at any time:

```bash
forge security egress show
```

### Production vs Development

| Setting | Production | Development |
|---------|-----------|-------------|
| Profile | `strict` or `standard` | `permissive` |
| Mode | `deny-all` or `allowlist` | `dev-open` |
| Dev tools | Filtered out | Included |
| Network policy | Enforced | Not generated |
| Egress proxy | Active | Skipped |

## Configuration

Add egress settings to your `forge.yaml`:

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

## Audit Events

Both the enforcer and proxy emit structured audit events:

```json
{"event":"egress_allowed","domain":"api.tavily.com","mode":"allowlist"}
{"event":"egress_blocked","domain":"evil.com","mode":"allowlist"}
{"event":"egress_allowed","domain":"api.tavily.com","mode":"allowlist","source":"proxy"}
```

Events without `"source"` come from the in-process enforcer; events with `"source": "proxy"` come from the subprocess proxy.

## What's Next

Learn how Forge evaluates skill trustworthiness in the [Trust Model](/docs/security/trust-model).
