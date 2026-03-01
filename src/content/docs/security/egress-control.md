---
title: Egress Control
description: "Control what domains your agent can reach — profiles, modes, domain resolution, and runtime enforcement."
order: 1
editUrl: https://github.com/initializ/useforge.ai/edit/main/src/content/docs/security/egress-control.md
---

# Egress Control

Forge controls what domains your agent can reach. Enforcement happens at both build-time and runtime, so you get a clear allowlist before you deploy and strict filtering once the agent is live.

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

## Domain Resolution

When you run `forge build`, Forge calls `Resolve()` to merge three sources into a single deduplicated, sorted allowlist:

1. **Explicit domains** from `egress.allowed_domains` in `forge.yaml`
2. **Tool-inferred domains** — skills that declare egress domains in their SKILL.md frontmatter (e.g., `web_search` adds `api.tavily.com`, `api.perplexity.ai`)
3. **Capability bundles** — capability names map to known domain sets (e.g., `slack` expands to `slack.com`, `hooks.slack.com`, `api.slack.com`)

All three sources are merged, deduplicated, and sorted alphabetically.

## Runtime Enforcement

The `EgressEnforcer` wraps Go's `http.RoundTripper` interface around the base transport. Every outbound HTTP request passes through it before reaching the network.

Matching rules:

- **Localhost always allowed** — `127.0.0.1`, `::1`, and `localhost` are never blocked regardless of mode
- **Wildcard support** — `*.github.com` matches `api.github.com` (suffix match) but does **not** match `github.com` or `notgithub.com`
- **Port stripping** — `api.openai.com:443` is matched against `api.openai.com`
- **Case insensitive** — `API.OpenAI.COM` matches `api.openai.com`
- **OnAttempt callback** — fires on every request for audit logging, whether allowed or blocked
- **Blocked request error** — returns `egress blocked: domain "X" not in allowlist (mode=allowlist)`

## Context Propagation

The enforcer is injected into the request context via `WithEgressClient` and retrieved with `EgressClientFromContext`. Any code that uses the context-provided HTTP client gets egress enforcement automatically. When no enforcer is present in the context, the client falls back to `http.DefaultTransport`.

## Build-Time Outputs

`forge build` produces two egress-related artifacts:

- **`egress_allowlist.json`** — machine-readable domain allowlist with source annotations (explicit, tool-inferred, or capability)
- **Kubernetes `NetworkPolicy`** — restricts pod egress to allowed domains on ports 80 and 443

You can inspect the resolved allowlist at any time:

```bash
forge security egress show
```

This displays every allowed domain, its source, and the active mode.

## Configuration

Add egress settings to your `forge.yaml`:

```yaml
egress:
  profile: standard
  mode: allowlist
  capabilities:
    - slack
  allowed_domains:
    - custom-api.example.com
    - "*.github.com"
```

## What's Next

Learn how Forge evaluates skill trustworthiness in the [Trust Model](/docs/security/trust-model).
