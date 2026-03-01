---
title: Docker
description: "Package your Forge agent as a container — Dockerfile generation, production builds, and runtime configuration."
order: 1
editUrl: https://github.com/initializ/useforge.ai/edit/main/src/content/docs/deployment/docker.md
---

# Docker

`forge build` generates a Dockerfile alongside other build artifacts in `.forge-output/`. You use standard container tooling to build and run the image — Forge handles the Dockerfile authoring so you do not need to write one yourself.

## Building the Container

`forge package` builds your agent into a container image using Docker, Podman, or Buildah — whichever is available on your system. It reads the generated Dockerfile from `.forge-output/` and produces a tagged image.

```bash
forge package
```

For production deployments, use the `--prod` flag:

```bash
forge package --prod
```

The `--prod` flag enforces production safety checks. If your agent is configured with `dev-open` egress mode, the build is rejected. You must use `strict` or `standard` egress profiles before packaging for production.

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
