---
title: Channels
description: Connect your agent to Slack and Telegram — webhooks, polling, large response handling, and channel setup.
order: 4
editUrl: https://github.com/initializ/useforge.ai/edit/main/src/content/docs/core-concepts/channels.md
---

# Channels

Channels connect your agent to messaging platforms. Instead of interacting through the CLI or HTTP API, your users talk to the agent in Slack or Telegram, and the agent responds in the same thread.

Channels run **with** the agent process — they are not separate services. You start them with `forge serve --with <channel>`.

## Channel Overview

| Channel | Mode | Default Port | Features |
|---|---|---|---|
| Slack | Webhook | 3000 | HMAC-SHA256 signature verification, replay protection (5-min window), URL verification challenge, file upload for large responses |
| Telegram | Polling (default), Webhook | 3001 | Long polling (30s timeout), typing indicator, markdown-to-HTML conversion, document upload for large responses |

Both channels are designed for outbound-first operation — your agent processes incoming messages and sends responses back through the platform's API.

## Slack

The Slack channel receives events via webhook on port 3000. When a user mentions your bot or sends it a direct message, Slack delivers the event to your agent's webhook endpoint.

### Security

- **HMAC-SHA256 signature verification** — every incoming request is verified against your signing secret. Invalid signatures are rejected.
- **Replay protection** — requests older than 5 minutes are rejected to prevent replay attacks.
- **URL verification challenge** — Forge automatically responds to Slack's URL verification challenge during setup, so you do not need to handle it manually.

### Required Environment Variables

| Variable | Purpose |
|---|---|
| `SLACK_BOT_TOKEN` | OAuth token for sending messages and uploading files |
| `SLACK_SIGNING_SECRET` | Used to verify incoming webhook signatures |

### Setup

```bash
forge channel add slack
```

This runs an interactive setup that prompts you for your bot token and signing secret, validates them against the Slack API, and writes the configuration to `forge.yaml` and the secrets to `.env`.

## Telegram

The Telegram channel uses long polling by default on port 3001. It periodically fetches new updates from the Telegram Bot API, so you do not need to expose a public URL.

### Features

- **Long polling** — fetches updates with a 30-second timeout, keeping latency low without constant requests
- **Typing indicator** — sends a "typing..." indicator every 4 seconds while the agent is processing a response, so users know the agent is working
- **Markdown-to-HTML conversion** — the agent's markdown responses are converted to Telegram-compatible HTML for proper formatting

### Required Environment Variables

| Variable | Purpose |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Bot token from BotFather |

### Setup

```bash
forge channel add telegram
```

This runs an interactive setup that prompts you for your bot token, validates it against the Telegram Bot API, and writes the configuration to `forge.yaml` and the secret to `.env`.

## Running with Channels

Start your agent with a channel connector:

```bash
forge serve --with slack
```

```bash
forge serve --with telegram
```

The channel starts **with** the agent as part of the same process. There is no separate channel service to deploy or manage. The agent listens on port 8080 for HTTP/SSE traffic and the channel listens on its own port (3000 for Slack, 3001 for Telegram).

You can run multiple channels simultaneously:

```bash
forge serve --with slack --with telegram
```

## Large Response Handling

When an agent response exceeds 4096 characters, Forge uses a split-and-upload strategy instead of dumping a wall of text into the chat.

### How It Works

1. **`SplitSummaryAndReport`** extracts the first paragraph (up to 600 characters) as a summary
2. The summary is sent as a regular chat message
3. The full response is uploaded as a file:
   - **Slack** — uses `files.upload` to send `research-report.md`
   - **Telegram** — uses `sendDocument` with multipart upload
4. If the file upload fails, Forge falls back to **chunked messages** — splitting the response into chunks (4000 characters for Slack, 4096 for Telegram) and sending them sequentially

### Telegram Retry Logic

If `sendDocument` fails on Telegram, Forge retries without reply context (in case the original message was deleted or inaccessible). If that also fails, it falls back to chunked text messages.

This approach keeps chat threads clean — users get a concise summary inline and can open the full report as a document when they need the details.

## Router Timeout

The channel router uses a 360-second timeout to accommodate long-running skills. Skills like deep research or incident triage can take several minutes, and the default HTTP timeout would cut them off. The 360-second window gives your agent enough time to complete complex tasks before the channel considers the request timed out.

## What's Next

- [Memory System](/docs/core-concepts/memory-system) — session memory for within-task context and long-term memory for cross-session knowledge
