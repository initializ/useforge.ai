---
title: Memory System
description: "Two-tier agent memory — session memory for within-task context and long-term memory for cross-session knowledge."
order: 5
editUrl: https://github.com/initializ/useforge.ai/edit/main/src/content/docs/core-concepts/memory-system.md
---

# Memory System

Forge has a two-tier memory system — **session memory** for context within a single task and **long-term memory** for knowledge that persists across tasks and sessions. Session memory is always active. Long-term memory is opt-in.

## Session Memory

Session memory manages the conversation within a single task. It handles the system prompt, message history, and automatic compaction when the conversation grows too long.

### Memory Struct

The core `Memory` struct holds three things:

1. **System prompt** — the compiled agent instructions, skill catalog, and tool definitions
2. **Conversation messages** — the running history of user messages, assistant responses, and tool calls/results
3. **Compaction summary** — a compressed summary of older messages that were compacted to free up space

### Character Budget

Each model has a character budget derived from its context window. For example, `gpt-4o` with a 128K token context window gets a character budget of approximately 435K characters (applying an 85% safety margin to account for tokenization variance).

The budget ensures your agent never exceeds the model's context window, even with long conversations and large tool outputs.

### Compaction

When the conversation reaches 60% of the character budget, the compactor kicks in. This threshold is configurable via `trigger_ratio` in your memory configuration.

The compaction process:

1. Select the oldest 50% of messages for compaction
2. Summarize them using the LLM (**abstractive** compaction) — the model produces a natural-language summary of what was discussed and decided
3. If the LLM summarization fails, fall back to **extractive** compaction — bullet-point extraction of key facts
4. Replace the compacted messages with the summary

The compactor respects **tool-call group boundaries**. It never orphans a tool result from its corresponding assistant message. If an assistant message triggered a tool call, the tool result stays with it — they are compacted together or not at all.

### Trimming Strategy

Before compaction, Forge applies a two-phase trimming strategy to reclaim space:

- **Phase 1** — replaces old tool results longer than 200 characters with compact placeholders (e.g., `[tool result: 2847 chars, truncated]`). This preserves the fact that a tool was called and returned a result without keeping the full output.
- **Phase 2** — drops the oldest message groups entirely if Phase 1 did not free enough space.

### MemoryStore (Session Persistence)

Sessions are persisted to disk so you can resume a task after restarting the agent.

- One JSON file per task in `.forge/sessions/`
- **Atomic writes** — data is written to a temp file, fsynced, then renamed into place. This prevents corruption if the process crashes mid-write.
- **7-day TTL** — on startup, session files older than 7 days are cleaned up automatically

Session data is JSON because it round-trips Go structs. The LLM never reads these files — they are internal persistence, not knowledge.

## Long-Term Memory

Long-term memory gives your agent the ability to remember things across tasks and sessions. It stores observations in daily markdown logs and makes them searchable via hybrid vector + keyword search.

### Enabling Long-Term Memory

Enable it in `forge.yaml`:

```yaml
memory:
  long_term: true
```

Or via environment variable:

```bash
export FORGE_MEMORY_LONG_TERM=true
```

### Content Format

All LLM-facing content in long-term memory is **markdown**. Daily logs and curated memory files are written as readable markdown that the LLM can understand directly. JSON is only used for the internal vector index — the LLM never sees it.

### Components

| Component | Purpose |
|---|---|
| **FileStore** | Manages the `.forge/memory/` directory — daily logs (`YYYY-MM-DD.md`) and the curated `MEMORY.md` |
| **Chunker** | Splits markdown into ~400-token overlapping chunks, paragraph-aware to avoid cutting mid-thought |
| **FileVectorStore** | JSON-backed in-memory vector storage for embedding vectors |
| **HybridSearcher** | Combines vector cosine similarity + keyword overlap + temporal decay for ranking |
| **Manager** | Orchestrates indexing and search, implements the `MemoryFlusher` interface |

### File Layout

```
.forge/memory/
├── MEMORY.md           # Curated facts (evergreen, agent/user-editable)
├── 2026-02-26.md       # Today's observation log
├── 2026-02-25.md       # Yesterday's log
└── index/
    └── index.json      # Embedding vectors (internal)
```

- **`MEMORY.md`** — a curated file of important facts, preferences, and context. Both the agent and you can edit this file. It is treated as evergreen (no temporal decay in search).
- **Daily logs** — the agent appends observations during each task. These are timestamped and subject to temporal decay in search ranking.
- **`index/index.json`** — the vector index. This is an internal file — do not edit it manually.

## Hybrid Search Pipeline

When the agent calls `memory_search`, the query goes through a 5-step pipeline:

### 1. Vector Search

The query is embedded using the configured embedding provider. The top `k * 3` candidates are fetched from the vector store by cosine similarity. Over-fetching (3x) ensures enough candidates survive the subsequent scoring stages.

### 2. Keyword Scoring

Each candidate's text is scored for query-term overlap. This catches results that are relevant by keyword match but may have drifted in embedding space.

### 3. Temporal Decay

Recent memories are weighted higher than old ones:

```
score *= exp(-ln(2) / halfLife * ageDays)
```

`MEMORY.md` is exempt from temporal decay — its score multiplier is always 1.0, reflecting its role as evergreen curated knowledge.

### 4. Score Merge

The final score combines both signals:

```
final = 0.7 * vectorScore + 0.3 * keywordScore
```

Vector similarity gets the higher weight because embeddings capture semantic meaning, while keyword overlap acts as a precision boost.

### 5. Sort and Truncate

Results are sorted by final score (descending) and truncated to the requested `top-k` (default: 5).

## Embedder Providers

Forge supports multiple embedding providers. The embedder is resolved automatically based on your configuration.

| Provider | Model | Dimensions | Endpoint |
|---|---|---|---|
| OpenAI | text-embedding-3-small | 1536 | POST /v1/embeddings |
| Gemini | (OpenAI-compatible) | 1536 | generativelanguage.googleapis.com |
| Ollama | nomic-embed-text | 768 | localhost:11434/v1/embeddings |
| Anthropic | -- | -- | No embedding API (auto-falls back) |

**Auto-resolution order:** config-specified provider, then environment-detected provider, then primary LLM provider, then fallback providers in order, then nil (keyword-only search).

If you are using Anthropic as your LLM provider and have no other provider configured, long-term memory falls back to keyword-only search since Anthropic does not offer an embedding API.

## Memory Tools

Two tools are registered when long-term memory is enabled:

### memory_search

Search over agent memory using hybrid vector + keyword search.

```yaml
Input:  {"query": "deployment configuration", "max_results": 5}
Output: Ranked chunks with source file, line range, and relevance score
```

### memory_get

Read the raw content of a specific memory file.

```yaml
Input:  {"path": "MEMORY.md"}
Output: Raw file content
```

These tools are **not** part of `builtins.All()`. They are only registered when long-term memory is enabled in your configuration. If long-term memory is disabled, the LLM does not see these tools and cannot attempt to call them.

## MemoryFlusher

Before the compactor discards old messages, the `MemoryFlusher` extracts key observations from the messages about to be removed and appends them to today's daily log (e.g., `2026-02-28.md`).

This ensures important context is not lost when session memory compacts. The flusher applies different extraction limits based on content type:

- **Research results** — up to 5000 characters extracted (research tends to contain dense, valuable information)
- **General conversation** — up to 2000 characters extracted

After flushing, the new observations are chunked and indexed for search.

## Graceful Degradation

The memory system degrades gracefully when components are unavailable:

- **No embedder configured** — falls back to keyword-only search. Results are less semantically precise but still functional.
- **No memory directory** — skips silently. The agent works without long-term memory.
- **Corrupted index** — rebuilds the index from source markdown files on next startup.

Your agent never crashes because of a memory issue. It may lose some recall quality, but it keeps running.

## Memory Configuration

All memory settings live under the `memory` key in `forge.yaml`:

| Field | Type | Default | Description |
|---|---|---|---|
| `long_term` | boolean | `false` | Enable long-term memory |
| `trigger_ratio` | float | `0.6` | Compaction triggers at this fraction of the character budget |
| `embedder.provider` | string | (auto) | Embedding provider: `openai`, `gemini`, `ollama` |
| `embedder.model` | string | (provider default) | Embedding model name |
| `embedder.endpoint` | string | (provider default) | Custom embedding endpoint URL |
| `search.top_k` | integer | `5` | Number of results returned by `memory_search` |
| `search.half_life_days` | float | `7.0` | Half-life for temporal decay (days) |
| `search.vector_weight` | float | `0.7` | Weight of vector score in the final merge |
| `search.keyword_weight` | float | `0.3` | Weight of keyword score in the final merge |

Example configuration:

```yaml
memory:
  long_term: true
  trigger_ratio: 0.6
  embedder:
    provider: openai
  search:
    top_k: 10
    half_life_days: 14
```

## What's Next

- [Egress Control](/docs/security/egress-control) — understand how Forge enforces network egress at the transport layer
