---
title: Production Checklist
description: "Everything to verify before deploying a Forge agent to production — egress, secrets, trust, signing, memory, and monitoring."
order: 3
editUrl: https://github.com/initializ/useforge.ai/edit/main/src/content/docs/deployment/production-checklist.md
---

# Production Checklist

Before deploying your Forge agent to a live environment, work through each section below. Every item has a clear check and, where applicable, a command you can run to verify.

## Egress Security

Your agent's outbound network access must be locked down in production.

- **Use `strict` or `standard` profile.** Never deploy with the `permissive` profile. The `dev-open` mode allows all outbound traffic and is intended only for local development.
- **Review the allowlist.** Inspect every domain your agent can reach:
  ```bash
  forge security egress show
  ```
- **Build with `--prod`.** This rejects builds that use `dev-open` egress mode:
  ```bash
  forge package --prod
  ```

## Secrets

Container deployments require the `env` provider. The encrypted-file provider needs a TTY for passphrase input and will not work in containers.

- **Configure the `env` provider.** Your agent must resolve secrets from environment variables in production.
- **Pass API keys via environment variables or Kubernetes Secrets.** Use `docker run -e` flags, `--env-file`, or `envFrom` in your Deployment manifest.
- **Never commit `.env` files.** Ensure `.env` is in your `.gitignore`. Forge adds this by default, but verify it has not been removed.

## Trust

Every skill your agent uses must be verified before production deployment.

- **Audit all skills:**
  ```bash
  forge skills audit
  ```
  This shows the trust status of every skill in your agent.
- **No `under_review` or `failed` skills in production.** If any skill has not passed trust verification, resolve it before deploying.
- **Review individual trust reports:**
  ```bash
  forge skills trust-report <skill-name>
  ```
  This shows the full verification history and current status for a specific skill.

## Build Signing

Sign your build artifacts to ensure supply chain integrity.

- **Generate a signing key:**
  ```bash
  forge key generate
  ```
  This creates a key pair at `~/.forge/signing-key.pem` and `~/.forge/signing-key.pub`.
- **Build with signing.** `forge build` automatically uses your signing key if it exists at `~/.forge/signing-key.pem`. No additional flags are needed.
- **Share public keys with your team:**
  ```bash
  forge key trust <file.pub>
  ```
  This adds a teammate's public key to your trusted key ring.
- **Verification is automatic.** The `VerifyBuildOutput` stage checks signatures on deploy. If a build artifact has been tampered with, verification fails and the deploy is blocked.

## Memory

Configure memory appropriately for your deployment environment.

- **Set `char_budget` for your model.** This controls how much session memory is included in each prompt. Set it based on your model's context window and your cost tolerance.
- **Configure `decay_half_life_days` for long-term memory.** This determines how quickly memories fade. Shorter values are appropriate for fast-moving tasks; longer values for persistent knowledge bases.
- **Use a persistent volume in Kubernetes.** Memory is stored on disk. If your pod restarts without a persistent volume, long-term memory is lost. Mount a PersistentVolumeClaim at the memory directory.

## Monitoring

Route audit events to your observability stack.

- **Capture the audit log.** Forge emits structured NDJSON to stderr. Route it to your SIEM or log aggregator:
  ```bash
  forge serve 2>audit.log
  ```
- **Alert on `egress_blocked` events.** These indicate your agent attempted to reach a domain outside the allowlist, which may signal a misconfigured skill or a security issue.
- **Track `llm_call` token usage.** Monitor token consumption per request to control costs and detect anomalies.

## Channels

Verify channel configuration before exposing your agent to users.

- **Slack:** Ensure `SLACK_SIGNING_SECRET` is set. Without it, webhook signature verification is disabled and your endpoint accepts unauthenticated requests.
- **Telegram:** Long polling is the default mode and does not require an inbound port. If you are using webhook mode, ensure your Ingress is configured and TLS-terminated.

## Testing

Run the full validation suite before deploying.

- **Schema and requirements validation:**
  ```bash
  forge validate
  ```
- **Per-skill validation (for CI):**
  ```bash
  forge skills validate
  ```
- **Clean build:**
  ```bash
  forge build
  ```
  The build must succeed without errors or warnings.

## What's Next

Set up observability for your running agent in [Monitoring & Observability](/docs/deployment/monitoring).
