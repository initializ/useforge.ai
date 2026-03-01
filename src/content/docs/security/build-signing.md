---
title: Build Signing
description: "Ed25519 signing of build artifacts — checksums, signatures, key management, and runtime verification."
order: 4
editUrl: https://github.com/initializ/useforge.ai/edit/main/src/content/docs/security/build-signing.md
---

# Build Signing

Forge supports Ed25519 signing of build artifacts for supply chain integrity. When a signing key is available, `forge build` computes checksums of all generated files, signs the manifest, and embeds the signature for downstream verification.

## Signing Stage

The signing stage runs as the **last stage** in the build pipeline. It performs three steps:

1. Computes SHA-256 checksums of all generated files
2. Produces a `checksums.json` manifest
3. If a signing key is available, signs the manifest with Ed25519 and adds the signature and key ID

## checksums.json Format

The manifest contains file checksums, a timestamp, and an optional signature:

```json
{
  "version": "1",
  "checksums": {
    "agent-spec.json": "a1b2c3...",
    "Dockerfile": "d4e5f6..."
  },
  "timestamp": "2026-02-28T10:00:00Z",
  "signature": "<base64 Ed25519 signature>",
  "key_id": "signing-key"
}
```

When no signing key is available, the `signature` and `key_id` fields are omitted and `checksums.json` serves as an unsigned integrity manifest.

## Key Management

| Command | Action |
|---|---|
| `forge key generate` | Creates `~/.forge/signing-key.pem` + `~/.forge/signing-key.pub` |
| `forge key generate --name X` | Creates `~/.forge/X.pem` + `~/.forge/X.pub` |
| `forge key trust <file.pub>` | Copies public key to `~/.forge/trusted-keys/` |
| `forge key list` | Lists signing key and all trusted keys |

## Key Format

Keys are base64-encoded raw Ed25519 bytes:

- **Private key** — 64 bytes, stored in a `.pem` file with `0600` permissions (owner read/write only)
- **Public key** — 32 bytes, stored in a `.pub` file, safe to share and distribute

## Runtime Verification

`VerifyBuildOutput(outputDir)` checks the integrity and authenticity of a build:

1. If `checksums.json` does not exist, verification is skipped (signing is optional)
2. Verifies the SHA-256 checksum of every file listed in the manifest
3. If a signature is present, verifies it against all keys in `trust.DefaultKeyring()`
4. On mismatch, returns an error with details about which file or signature failed

## Trust Keyring

`DefaultKeyring()` loads all `.pub` files from `~/.forge/trusted-keys/`. Any public key placed in this directory is trusted for signature verification.

To trust a teammate's key:

```bash
forge key trust teammate-signing-key.pub
```

To list all trusted keys:

```bash
forge key list
```

## What's Next

Learn how Forge records runtime activity for auditing in [Audit Logging](/docs/security/audit-logging).
