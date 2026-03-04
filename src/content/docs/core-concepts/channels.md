---
title: Channels
description: "Connect your agent to Slack and Telegram — Socket Mode, polling, mention-aware filtering, and large response handling."
order: 4
editUrl: https://github.com/initializ/useforge.ai/edit/main/src/content/docs/core-concepts/channels.md
---

# Channels

Channels connect your agent to messaging platforms. Instead of interacting through the CLI or HTTP API, your users talk to the agent in Slack or Telegram, and the agent responds in the same thread.

Channels run **with** the agent process — they are not separate services. You start them with `forge run --with <channel>` or `forge channel serve <channel>`.

## Channel Overview

| Channel | Mode | Default Port | Features |
|---|---|---|---|
| Slack | Socket Mode | 3000 | Outbound-only WebSocket, mention-aware filtering, processing indicators, file upload for large responses |
| Telegram | Polling (default), Webhook | 3001 | Long polling (30s timeout), typing indicator, markdown-to-HTML conversion, document upload for large responses |

Both channels are designed for outbound-first operation — no public URLs or webhooks required. Your agent connects outbound to the platform's API.

## Slack

The Slack channel uses **Socket Mode** — an outbound WebSocket connection to Slack's servers. This eliminates the need for public URLs, webhooks, or inbound tunnels.

### Setup

```bash
forge channel add slack
```

This runs an interactive setup that:
1. Creates a Slack App with Socket Mode enabled
2. Generates an app-level token with `connections:write` scope
3. Enables event subscriptions for `message.channels`, `message.im`, and `app_mention`
4. Adds bot token scopes: `app_mentions:read`, `chat:write`, `channels:history`, `im:history`, `files:write`, `reactions:write`
5. Validates tokens against the Slack API
6. Writes configuration to `forge.yaml` and secrets to `.env`

### Required Environment Variables

| Variable | Purpose |
|---|---|
| `SLACK_BOT_TOKEN` | OAuth token for sending messages and uploading files |
| `SLACK_APP_TOKEN` | App-level token for Socket Mode connection |

### Mention-Aware Filtering

The bot uses intelligent message filtering:

- **Channel messages** — only responds to @mentions
- **Threads** — responds to all messages in threads it participates in
- **Direct messages** — responds to all messages

### Processing Indicators

For queries that take more than a few seconds, the bot provides visual feedback:

- **Eyes reaction** — added to the message when processing starts
- **Status messages** — interim status updates posted for queries exceeding 15 seconds

## Telegram

The Telegram channel uses long polling by default on port 3001. It periodically fetches new updates from the Telegram Bot API, so you do not need to expose a public URL.

### Features

- **Long polling** — fetches updates with a 30-second timeout, keeping latency low without constant requests
- **Typing indicator** — sends a "typing..." indicator every 4 seconds while the agent is processing a response
- **Markdown-to-HTML conversion** — the agent's markdown responses are converted to Telegram-compatible HTML

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
forge run --with slack
```

```bash
forge run --with telegram
```

The channel starts **with** the agent as part of the same process. There is no separate channel service to deploy or manage. The agent listens on port 8080 for HTTP/SSE traffic and the channel listens on its own port (3000 for Slack, 3001 for Telegram).

You can run multiple channels simultaneously:

```bash
forge run --with slack,telegram
```

### Standalone Mode

Run a channel adapter separately from the agent:

```bash
export AGENT_URL=http://localhost:8080
forge channel serve slack
```

This is useful when you want to run the agent and channel adapters as separate processes, for example in different containers.

## Large Response Handling

When an agent response exceeds 4096 characters, Forge uses a split-and-upload strategy instead of dumping a wall of text into the chat.

### How It Works

1. **`SplitSummaryAndReport`** extracts the first paragraph (up to 600 characters) as a summary
2. The summary is sent as a regular chat message
3. The full response is uploaded as a file:
   - **Slack** — uses `files.upload` to send `research-report.md`
   - **Telegram** — uses `sendDocument` with multipart upload
4. If the file upload fails, Forge falls back to **chunked messages** — splitting the response into chunks (4000 characters for Slack, 4096 for Telegram) and sending them sequentially

Large tool outputs are tracked and attached separately to preserve complete, untruncated data.

### Telegram Retry Logic

If `sendDocument` fails on Telegram, Forge retries without reply context (in case the original message was deleted or inaccessible). If that also fails, it falls back to chunked text messages.

## Router Timeout

The channel router uses a 360-second timeout to accommodate long-running skills. Skills like deep research or incident triage can take several minutes, and the default HTTP timeout would cut them off.

## Custom Adapters

Developers can create custom channel adapters by implementing the `ChannelPlugin` interface with methods for initialization, starting, stopping, event normalization, and response delivery.

## What's Next

- [Memory System](/docs/core-concepts/memory-system) — session memory for within-task context and long-term memory for cross-session knowledge
