---
title: Secret Management
description: "Encrypted secret storage with per-agent isolation — AES-256-GCM encryption, provider chain, and runtime resolution."
order: 3
editUrl: https://github.com/initializ/useforge.ai/edit/main/src/content/docs/security/secret-management.md
---

# Secret Management

Forge provides encrypted secret storage with per-agent isolation. Secrets are encrypted at rest using AES-256-GCM and resolved at runtime through a provider chain.

## Provider Interface

Every secret provider implements three methods:

- `Name()` — returns the provider's identifier
- `Get(key)` — retrieves a single secret by key
- `List()` — returns all available keys

## Providers

Forge ships with three provider implementations:

| Provider | Purpose |
|---|---|
| EncryptedFileProvider | AES-256-GCM encrypted JSON file with Argon2id key derivation |
| EnvProvider | Reads secrets from environment variables (with optional prefix) |
| ChainProvider | Chains multiple providers — first match wins, `GetWithSource` returns source |

The `ChainProvider` iterates through its providers in order and returns the first match. This lets you override encrypted secrets with environment variables or vice versa.

## Encryption Scheme

The EncryptedFileProvider uses a straightforward binary format:

```
salt (16 bytes) || nonce (12 bytes) || AES-GCM ciphertext
```

- **Plaintext** is JSON: `{"KEY": "value", ...}`
- **Key derivation** uses Argon2id with parameters: time=1, memory=64 MB, threads=4, keyLen=32
- **Atomic writes** follow the temp-file pattern: write to temp, fsync, then rename
- **File permissions** are set to `0600` (owner read/write only)

## Per-Agent Files

Secrets are stored in two locations, with agent-local taking priority:

| Location | Purpose | When Used |
|---|---|---|
| `<agent-dir>/.forge/secrets.enc` | Agent-local secrets | `forge secret set --local`, runtime (primary) |
| `~/.forge/secrets.enc` | Global secrets | `forge secret set` (default), runtime (fallback) |

## Runtime Resolution Chain

At runtime, Forge resolves secrets in this order:

1. **Agent-local encrypted file** — `<agent-dir>/.forge/secrets.enc`
2. **Global encrypted file** — `~/.forge/secrets.enc`
3. **Environment variables** — via the EnvProvider

The first provider that has the key wins.

## Passphrase Prompting

Forge handles passphrase input differently depending on the environment:

- **TTY available** — prompts interactively via `term.ReadPassword` (input is hidden)
- **Not a TTY (CI/CD)** — skips the encrypted provider gracefully and falls back to environment variables
- **`FORGE_PASSPHRASE` env var** — set this for automation to avoid interactive prompts entirely

## Smart Init Flow

When you first interact with secrets, Forge handles initialization automatically:

- **Global file exists** — prompts once for your passphrase and validates it by attempting decryption
- **No global file** — prompts twice (enter + confirm) to create a new encrypted store

## CLI Commands

```bash
# Store a secret (prompts for value if omitted)
forge secret set <KEY> [VALUE]

# Retrieve a secret (shows which provider it came from)
forge secret get <KEY>

# List all stored secret keys
forge secret list

# Delete a secret from the encrypted file
forge secret delete <KEY>
```

Add `--local` to any command to operate on the agent-local secret file instead of the global one:

```bash
forge secret set OPENAI_API_KEY --local
```

## Secret Safety Build Stage

When you run `forge package --prod`, Forge checks that your secret configuration is production-ready. A build that relies solely on the encrypted-file provider without an env provider fallback is blocked. This ensures secrets can be injected via environment variables in container deployments rather than baking encrypted files into images.

## Git and Docker Exclusions

Forge automatically manages exclusion rules to prevent secrets from leaking:

- **`.gitignore`** includes `.forge/` — encrypted files never enter version control
- **`.dockerignore`** includes `*.enc` and `secrets.enc` — encrypted files are excluded from container builds

## What's Next

Learn how Forge signs build artifacts for supply chain integrity in [Build Signing](/docs/security/build-signing).
