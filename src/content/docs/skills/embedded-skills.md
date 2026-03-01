---
title: Embedded Skills Reference
description: "The 6 built-in skills that ship with Forge — always available, always trusted, no installation required."
order: 1
editUrl: https://github.com/initializ/useforge.ai/edit/main/src/content/docs/skills/embedded-skills.md
---

# Embedded Skills Reference

Forge ships with 6 embedded skills compiled into the binary via `go:embed`. These skills are always trusted, available offline, and shown in the `forge init` wizard. You never need to install or configure them separately — they are part of every Forge installation.

## Embedded Skills Registry

| ID | Name | Category | Bins | Keys | Egress | Registration |
|---|---|---|---|---|---|---|
| `summarize` | Summarize | — | `summarize` | one_of: OPENAI_API_KEY, ANTHROPIC_API_KEY, XAI_API_KEY, GEMINI_API_KEY | (via model provider) | Script -> SkillTool |
| `github` | GitHub | — | `gh` | GH_TOKEN | api.github.com | Binary -> system prompt |
| `weather` | Weather | — | `curl` | none | wttr.in, api.open-meteo.com | Binary -> system prompt |
| `tavily-search` | Tavily Web Search | — | `curl`, `jq` | TAVILY_API_KEY | api.tavily.com | Script -> SkillTool |
| `tavily-research` | Tavily Deep Research | — | `curl`, `jq` | TAVILY_API_KEY | api.tavily.com | Script -> SkillTool (2 tools) |
| `k8s-incident-triage` | K8s Incident Triage | sre | `kubectl` | none | $K8S_API_DOMAIN | Binary -> system prompt |

**Registration types:**

- **Script -> SkillTool** — the skill has a `scripts/` directory. Each `## Tool:` section in SKILL.md becomes a named tool the LLM calls directly.
- **Binary -> system prompt** — the skill's full SKILL.md body is injected into the system prompt catalog. The LLM loads instructions on demand via `read_skill` and invokes actions through `cli_execute`.

## Adding Embedded Skills

To add any embedded skill to your project, use `forge skills add`:

```bash
forge skills add weather
```

This copies the SKILL.md and all scripts into your project's `skills/` directory, checks for required environment variables, and deduplicates `.env` entries. You can then customize the skill's instructions or extend it with additional tools.

To see all available embedded skills:

```bash
forge skills list
```

## Deep Dive: k8s-incident-triage

The `k8s-incident-triage` skill is the most complex embedded skill. It provides a structured Kubernetes incident triage workflow designed for on-call engineers and SREs.

### Metadata

- **Category:** sre
- **Tags:** kubernetes, incident-response, triage, reliability, observability, kubectl, oncall, runbooks

### Environment Variables

All environment variables are optional — the skill works with kubectl defaults when they are not set.

| Variable | Description |
|---|---|
| `KUBECONFIG` | Path to kubeconfig file |
| `K8S_API_DOMAIN` | Kubernetes API server domain (used for dynamic egress) |
| `DEFAULT_NAMESPACE` | Namespace to triage if none specified |
| `TRIAGE_MAX_PODS` | Maximum number of pods to inspect (limits scope) |
| `TRIAGE_LOG_LINES` | Number of log lines to retrieve per container |

### Dynamic Egress

The `K8S_API_DOMAIN` variable is expanded at runtime and added to the egress allowlist. This means the skill works with any Kubernetes cluster without hardcoding API server domains in the allowlist.

### Denied Tools

The skill declares two denied tools:

```yaml
denied_tools:
  - http_request
  - web_search
```

This prevents the LLM from bypassing `kubectl` to reach the Kubernetes API directly or searching the web for cluster information. All cluster interaction must go through `kubectl`.

### 7-Step Triage Workflow

The skill guides the LLM through a structured 7-step triage process:

1. **Preconditions** — verify kubectl is available and the target namespace exists
2. **Health snapshot** — `kubectl get pods` to identify unhealthy pods
3. **Events** — `kubectl get events --sort-by=.lastTimestamp` to find recent issues
4. **Describe** — `kubectl describe pod` on flagged pods for detailed status
5. **Node diagnostics** — `kubectl describe node` if pods are in Pending or node-related states
6. **Logs** — `kubectl logs` on crashing or restarting containers
7. **Metrics** — `kubectl top pods` to check resource consumption

### Detection Heuristics

The skill recognizes these common failure patterns:

- **CrashLoop** — containers in CrashLoopBackOff
- **OOMKilled** — containers killed by the OOM killer
- **Image Pull** — ImagePullBackOff or ErrImagePull
- **Scheduling** — pods stuck in Pending due to resource constraints
- **Probe Failure** — readiness or liveness probes failing
- **PVC/Volume** — volume mount failures or pending PVCs
- **Node Pressure** — MemoryPressure, DiskPressure, or PIDPressure conditions
- **Rollout Stuck** — deployments with unavailable replicas

### Dual Input

The skill accepts both natural language and structured JSON input:

```
triage payments-prod
```

```json
{"namespace": "payments-prod", "max_pods": 20, "log_lines": 100}
```

### Safety Constraints

The skill is strictly read-only. It uses only these kubectl operations:

- `get`, `describe`, `logs`, `top`

It never executes:

- `apply`, `patch`, `delete`, `exec`, `port-forward`, `scale`, `rollout restart`

It never prints Secret values. All output is safe to share in incident channels.

## Deep Dive: tavily-research

The `tavily-research` skill demonstrates the async two-tool pattern — a design for skills that perform long-running operations without blocking the LLM.

### Two-Tool Architecture

The skill registers two tools:

1. **`tavily_research`** — submits a research request and returns a `request_id` immediately
2. **`tavily_research_poll`** — handles internal polling (10-second intervals, up to 280 seconds) and returns the complete report

### How It Works

When the LLM calls `tavily_research`, the submit script fires a request to the Tavily API and returns a `request_id`. The LLM then calls `tavily_research_poll` with that `request_id`. The poll script blocks internally, checking for results every 10 seconds for up to 280 seconds. The LLM calls `tavily_research_poll` once and receives the complete research report when it finishes.

### Timeout Handling

The skill declares `timeout_hint: 300` in its frontmatter. This tells the `SkillCommandExecutor` to allow up to 300 seconds before killing the process, preventing premature termination of the poll script.

### Scripts

The skill includes two scripts in its `scripts/` directory:

- `tavily-research.sh` — the submit script
- `tavily-research-poll.sh` — the poll script

Each script corresponds to a `## Tool:` section in the SKILL.md.

## What's Next

Learn how to build your own skills in [Writing Custom Skills](/docs/skills/writing-custom-skills).
