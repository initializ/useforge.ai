---
title: Docker
description: "Package your Forge agent as a container — Dockerfile generation, production builds, and runtime configuration."
order: 1
editUrl: https://github.com/initializ/useforge.ai/edit/main/src/content/docs/deployment/docker.md
---

Forge agents can be packaged as container images and deployed to Docker, Kubernetes, or air-gapped environments.

## Building Container Images

`forge package` builds your agent into a container image using Docker, Podman, or Buildah — whichever is available on your system. It reads the generated Dockerfile from `.forge-output/` and produces a tagged image.

```bash
# Build a container image (auto-detects Docker/Podman/Buildah)
forge package

# Production build (rejects dev tools and dev-open egress)
forge package --prod

# Build and push to registry
forge package --registry ghcr.io/myorg --push

# Generate docker-compose with channel sidecars
forge package --with-channels

# Export for Initializ Command platform
forge export --pretty --include-schemas
```

`forge package` generates a Dockerfile, Kubernetes manifests, and NetworkPolicy. Use `--prod` to strip dev tools and enforce strict egress. Use `--verify` to smoke-test the built container.

## Production Build Checks

Production builds (`--prod`) enforce:

- No `dev-open` egress mode
- No dev-only tools (`local_shell`, `local_file_browser`)
- Secret provider chain must include `env` (not just `encrypted-file`)
- `.dockerignore` must exist if a Dockerfile is generated

## Docker Compose

```bash
forge package --with-channels
```

This generates a `docker-compose.yaml` with:
- An `agent` service running the A2A server
- Adapter services (e.g., `slack-adapter`, `telegram-adapter`) connecting to the agent

## Secrets in Containers

The encrypted-file provider does not work in containers. There is no TTY available for passphrase input, so the provider cannot decrypt the secrets file. You must use the `env` provider in production.

### Secret Safety Build Stage

When you run `forge package --prod`, Forge checks that your agent has an `env` provider configured. If the agent relies solely on the encrypted-file provider without an env fallback, the build is blocked. This prevents you from deploying a container that cannot access its secrets at runtime.

### Passing Secrets at Runtime

Pass secrets as environment variables when you start the container:

```bash
docker run -p 8080:8080 \
  -e OPENAI_API_KEY=sk-... \
  -e SLACK_BOT_TOKEN=xoxb-... \
  my-agent:latest
```

For sensitive values, use Docker's `--env-file` option or your orchestrator's secret management (Kubernetes Secrets, AWS Secrets Manager, etc.).

## .dockerignore

The generated Dockerfile includes a stage that produces a `.dockerignore` file automatically. This excludes sensitive files from the build context:

- `*.enc` — encrypted secret files
- `secrets.enc` — the main secrets store
- `.forge/` — local Forge configuration

You do not need to create or maintain a `.dockerignore` manually.

## Running the Container

The default port is **8080**. Your agent listens for HTTP and SSE traffic on this port inside the container.

```bash
docker run -p 8080:8080 \
  -e OPENAI_API_KEY=sk-... \
  my-agent:latest
```

To run with a channel connector, set the appropriate environment variables:

```bash
docker run -p 8080:8080 -p 3000:3000 \
  -e OPENAI_API_KEY=sk-... \
  -e SLACK_BOT_TOKEN=xoxb-... \
  -e SLACK_SIGNING_SECRET=... \
  my-agent:latest
```

## Build Artifacts

`forge build` produces the following files in `.forge-output/`:

| Artifact | Purpose |
|---|---|
| `agent-spec.json` | Full agent specification for import and validation |
| `skill-index.json` | Index of all resolved skills and their metadata |
| `Dockerfile` | Generated Dockerfile for container builds |
| `k8s/` | Kubernetes manifests (Deployment, Service, NetworkPolicy) |
| `egress_allowlist.json` | Resolved domain allowlist with source annotations |
| `checksums.json` | SHA-256 checksums of all build artifacts for integrity verification |

## .forge-output/ Is Ephemeral

The `.forge-output/` directory is listed in `.gitignore` by default. It is regenerated on every `forge build` invocation, so you should not commit it or depend on its contents between builds. Treat it as a build cache — always run `forge build` before `forge package` to ensure the artifacts are fresh.

## What's Next

Learn how to deploy your containerized agent to a cluster in [Kubernetes](/docs/deployment/kubernetes).
