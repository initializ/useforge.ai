---
title: Installation
description: Install Forge and verify it's working — single binary, no runtime dependencies.
order: 1
---

# Installation

Forge is a single statically-linked Go binary. No runtime dependencies, no npm, no Docker required for local development.

## System Requirements

- **macOS** — arm64 (Apple Silicon) or amd64 (Intel)
- **Linux** — amd64 or arm64

## Homebrew (Recommended)

The fastest way to install Forge on macOS or Linux:

```bash
brew install initializ/tap/forge
```

This installs from the [Initializ Homebrew tap](https://github.com/initializ/homebrew-tap) and keeps Forge up to date with `brew upgrade`.

## curl

Download the latest release directly:

```bash
curl -sSL https://github.com/initializ/forge/releases/latest/download/forge-$(uname -s)-$(uname -m).tar.gz | tar xz
sudo mv forge /usr/local/bin/
```

The archive names match `uname` output — e.g., `forge-Darwin-arm64.tar.gz`, `forge-Linux-x86_64.tar.gz`.

## Build from Source

Requires Go 1.25 or later:

```bash
git clone https://github.com/initializ/forge.git
cd forge
go build -o forge ./forge-cli/
sudo mv forge /usr/local/bin/
```

## Verify Installation

```bash
forge --version
```

You should see the installed version number. If you get a "command not found" error, make sure `/usr/local/bin` is in your `PATH`.

## Next Steps

Once installed, head to the [Quick Start](/docs/getting-started/quick-start) guide to create your first agent.
