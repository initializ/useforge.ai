---
title: "Forge is the runtime for agents that run next to services"
description: "The agent runtime market split in 2026. One half — desktop assistants and hyperscaler-managed agents — is well-served. The other half — agents that live inside your services, inside your network, on your infrastructure — is what Forge is built for."
author: "Forge Team"
date: 2026-05-19
tags: ["positioning", "agent-runtime", "agent-skills", "enterprise"]
---

At 3am last Tuesday, an alert fired in a Kubernetes cluster running a production service. CPU was pinned, p99 latency was climbing, and the error rate had crossed the SLO. The on-call engineer's phone buzzed. So did a Forge agent running as a sidecar in the same cluster — and it got there first.

It ran the same triage script the engineer would have run: pulled the pod's events, described the deployment, fetched recent logs, checked node pressure. Within forty seconds it had a hypothesis: a node was throttling, and the workload was scheduled in a way that magnified the impact. It posted the triage to the incident channel in Slack and tagged the on-call. The engineer woke up to a thread that already had the diagnosis, the proposed remediation, and a list of the commands to verify it. Time-to-context: under a minute.

That matters more than the saved sleep. The service has SLAs against it, and a slow incident response costs real money on the next review. The faster the triage, the smaller the impact, and the smaller the credit. The Forge agent didn't replace the engineer — it gave her a head start on the work she'd have done anyway, and it did so without anyone being awake.

The agent could not have been a Claude Cowork session. Cowork is a desktop product — it requires a knowledge worker's laptop to be awake. It could not have been a Managed Agent in Anthropic's cloud — the Kubernetes cluster's API was not exposed to the public internet, and parts of the deployment footprint sit inside networks with no outbound path to a vendor API at all. It could not have been an AgentCore deployment — the cluster runs across multiple clouds, not just AWS. It could not have been a Foundry agent — the company's identity stack is not Entra ID.

It was a Forge agent. A `SKILL.md` file authored by the SRE team's senior engineer (who knew the triage process better than anyone), with tool scripts contributed by a platform developer, deployed as a sidecar to the production pod it was monitoring. That is the shape of the agent runtime market that exists today — and it is not the shape most products are built for.

## The agent runtime market split in two

Look at what shipped through 2025 and the first half of 2026, and a pattern becomes obvious. There are two distinct agent runtime markets, and they share almost nothing structurally.

The first is the **desktop and managed-session market**. Claude Cowork ships an autonomous agent that runs on a user's Mac, completing knowledge-worker tasks across files, applications, and SaaS surfaces. Claude Managed Agents hosts session-based execution in Anthropic's cloud, triggered by API calls or webhooks, with sandbox isolation and approval gates. Both are excellent products. Both assume the agent's job is to act on behalf of a user or a discrete event, in a runtime managed by the AI provider.

The second is the **hyperscaler-managed agent market**. AWS Bedrock AgentCore deploys agents as serverless workloads on AWS, with microVM session isolation and AWS-native identity. Azure Foundry Agent Service does the same on Azure, with Entra-based identity, Cosmos DB state persistence, and publishing to Microsoft 365 and Teams. Google's Gemini Enterprise Agent Platform — the rebranded successor to Vertex AI Agent Builder — does the same on GCP, with Gemini grounding and Workspace integration. Each is a high-quality managed runtime that runs in one cloud.

Between them, those products cover an enormous slice of the agent use case: knowledge-worker assembly, event-driven webhook automation, cloud-native agent deployment with managed infrastructure.

What none of them addresses, by design, is the agent that has to run **inside your environment, alongside the services it works with, on infrastructure you already operate, without picking a cloud or a model**. That's the runtime gap. That's where Forge lives.

## What "next to a service" actually means

The phrase "the agent that runs next to a service" needs unpacking, because it's doing real work. It means several specific architectural things at once.

It means the agent is **infrastructure**, not a session. Not "wake up, do a task, terminate" but "live as a long-running process, sidecar, scheduled job, library, or A2A endpoint, the way any other service lives." A Kubernetes deployment. A pod. A CI step. A binary embedded in another Go service.

It means the agent has **direct network reach into your environment**. Not "call our public-facing MCP server from somebody else's cloud" but "talk to the private Prometheus on the cluster-local DNS name, query the internal CMDB that has no public endpoint, hit the build server that lives behind the VPN." Egress declared per-skill and enforced at the runtime layer, but reach that includes the systems your services actually use.

It means the agent's **identity and credentials live where your services' identities live**. Not "this agent has an Anthropic Console identity that holds a PagerDuty token over OAuth" but "this agent has a Kubernetes service account, with a scoped role binding, and reads secrets the way every other pod reads them."

It means the agent is **billed and operated like a service**. Not a consumption-priced managed runtime metered by Anthropic or AWS or Azure, but a workload running on infrastructure you've already paid for, observed through the same Prometheus and SIEM you use for everything else.

Cowork agents don't fit that shape — they assume a person and a desktop. Managed Agents don't fit it — they assume a hosted session in Anthropic's cloud, even with the recent self-hosted sandbox addition that moves tool execution to your infrastructure while orchestration stays on Anthropic's. AgentCore, Foundry, and Gemini Enterprise fit a version of it, but only inside their own clouds, with their own identity systems, on their own model defaults.

Forge fits the full shape, because that's the shape it was built for.

## Five things Forge optimizes for that nothing else does together

### An open standard for the agent itself

SKILL.md is Anthropic's open [Agent Skills standard](https://agentskills.io) — markdown frontmatter declaring requirements, a body of LLM instructions, optional scripts adding tools. It's not Forge's standard; it's Anthropic's, and OpenAI has adopted it too. Forge is a compliant runtime, in the same way Docker was for OCI or Node was for CommonJS.

What that means in practice: a SKILL.md you write today is portable across runtimes. The same skill that runs in Cowork's custom-skill slot, in Claude Managed Agents, or in your own Forge deployment is the same document. That portability is the thing managed-runtime alternatives explicitly do not give you. An AgentCore deployment is an AgentCore agent; a Foundry deployment is a Foundry agent. Move runtimes and you rewrite. With SKILL.md as the artifact, you don't.

### Any infrastructure, including the ones the hyperscalers can't reach

Forge is distributed as a single statically-linked Go binary. It runs on any container runtime: EKS, AKS, GKE, OpenShift, vanilla Kubernetes, Nomad, bare metal, on-prem, air-gapped, IoT edge. The same agent definition deploys unchanged across all of them.

The deployment shapes managed runtimes structurally don't reach include: on-prem clusters that cannot phone home, air-gapped facilities (defense, classified, regulated), sovereign-cloud deployments where customer data cannot leave a specific jurisdiction, edge environments with no reliable internet, and the long tail of "we already run Kubernetes well; we don't need a managed service for this." If any of those describes you, the runtime question reduces to whether you'll build your own or use Forge. We strongly suggest the latter — see [Forge vs AgentCore](/compare/forge-vs-agentcore) and [Forge vs Foundry](/compare/forge-vs-foundry) for the architectural cost of building your own.

### Any model, including the ones you run yourself

A Forge agent can reason with Anthropic, OpenAI, Gemini, an Ollama-served local model, or a GGUF model running via `forge brain` — Forge's built-in local inference path. The model is configured per agent, not per runtime. A skill in your fleet can use Anthropic for code review, Gemini for grounded search, and a local Llama for handling data that cannot leave the network. All in the same deployment.

Managed runtimes pay lip service to model neutrality, but the ecosystem assumptions tell the real story. AgentCore is framework-agnostic but AWS-native; Foundry supports any model but tilts hard toward Azure OpenAI in practice; Gemini Enterprise is Gemini-first in its strongest features. Claude Managed Agents is Anthropic models only, by design — see [Forge vs Claude Managed Agents](/compare/forge-vs-claude-managed-agents) for the structural reason this won't change. If your model strategy is multi-provider — for cost, for vendor concentration reasons, for compliance — Forge's neutrality is structural, not aspirational.

### Production hardening as the default, not the upsell

Every Forge agent runs with computed-not-declared trust: the autowire pipeline scans each SKILL.md and any associated scripts, evaluates them against a security policy, and assigns a trust level the contributor cannot override. Every Forge agent has per-skill egress allowlists, enforced at the runtime layer — a skill declared to talk to `api.github.com` cannot reach `evil.com` regardless of what the LLM tries. Every Forge agent's denied tools are explicit contracts in frontmatter; a Kubernetes triage skill can `denied_tools: [http_request, web_search]` to prevent the LLM from bypassing kubectl. Every Forge agent emits structured audit logs with correlation IDs at the agent, skill, tool, and egress level.

These are not enterprise-tier features. They are part of the open-source runtime. The [Forge Hub](/hub) enterprise additions are signing, RBAC, SLA, and the on-prem registry. You don't buy the security model from us — you start with it. When a compliance team asks "how do we prevent this agent from doing things we didn't authorize," the answer doesn't require a separate paid product.

### Markdown, not code

A SKILL.md is the artifact. Frontmatter declares what the skill needs (binaries, env vars, egress domains, denied tools, timeout hints, trust hints). The body is LLM instructions in plain markdown. Optional scripts in a `scripts/` directory add tools the LLM can call. That's the entire agent.

No Python file to maintain. No framework version to upgrade. No `requirements.txt` to audit. Domain experts can read and review a skill without reading code. Security teams can audit a skill before it executes. SREs can write skills for their runbooks without learning a Python agent framework. The frameworks all assume code. The hyperscaler runtimes all assume code. Forge assumes the agent is a **document** — versionable in git, reviewable in a pull request, signed if needed.

## What Forge is not, on purpose

Honest positioning means stating what a product isn't, especially in a category as crowded as agent runtimes. So:

Forge is not a desktop assistant. If your agent's job is to sit next to a knowledge worker, organize their downloads folder, draft emails, and operate SaaS apps via connectors, **use Claude Cowork**. That's exactly what it was built for, and Forge would be the wrong tool.

Forge is not a hyperscaler-managed runtime. If your organization is 100% AWS and committed to staying there, **use AgentCore**. If you're Microsoft-native with Entra and M365 as your gravity, **use Foundry**. If you're GCP-native with Gemini as your model strategy and Workspace as your distribution surface, **use Gemini Enterprise**. Each is well-engineered for its cloud, and you'll get more value faster from the native option than from re-platforming to Forge. See [Forge vs Vertex](/compare/forge-vs-vertex) for the trade-off detail on the GCP side.

Forge is not a Python framework. If you need rich orchestration primitives, LCEL graph composition, or sophisticated RAG pipelines built in code, use LangChain or CrewAI. Forge can run their logic — wrap it in a script invoked by a SKILL.md skill — but Forge is a runtime, not a framework. The frameworks remain better at the things frameworks are good at.

Forge is not a chat assistant. If you want conversational AI for general questions, use Claude directly, or any other chat product. Forge agents are headless production services that act on systems. They can expose Slack and Telegram channels into already-running agents, but they're not conversation partners; they're workers.

One more clarification on audience, because the positioning is often misread. Forge is not "developers only." Forge serves three distinct audiences who collaborate through the SKILL.md document — domain experts who author skills as markdown (SREs in their author capacity, security engineers, compliance officers, operations leads), developers who write the scripts that extend skills when LLM reasoning isn't enough, and platform engineers who operate the runtime. If you write runbooks today, you can write Forge skills today, with no Python and no framework. The Skill Builder UI is designed for exactly that author audience. What Forge is *not* is a personal-productivity assistant for non-technical users — that's Cowork's job. The distinction is the deployment shape and audience of the agent, not the technical sophistication of the author: an agent built for one person on their machine belongs to Cowork; an agent built for an organization, running as a service, belongs to Forge.

The agent that Forge is built for — the one that runs next to a service, in your environment, on your infrastructure, on your model of choice — is the agent the other products are not built for. That's the entire positioning, stated plainly.

## Where this all maps to the buyer

If you're evaluating Forge, the question to ask yourself is not "does Forge have feature X." Every mature runtime has most features X. The question is one of fit, and it usually reduces to four checks.

**One: where does the agent need to run?** If "in my environment, on my infrastructure, not phoning home to a vendor," Forge fits. If "in a managed runtime with zero operational burden," a hyperscaler product fits better.

**Two: what's the cloud reality?** If "single cloud, deeply integrated, committed to that cloud's roadmap," use that cloud's managed runtime. If "multi-cloud, hybrid, or on-prem," Forge fits.

**Three: what's the model reality?** If "one provider is fine and we're happy to run on their API forever," use that provider's runtime where it exists. If "multiple providers, possibly including local inference for sensitive workloads," Forge's neutrality matters.

**Four: what does the agent actually need to do?** If "respond to one event, execute a discrete task, end the session" — Managed Agents and AgentCore both fit. If "run continuously as a service, observe streams, embed in CI, sidecar a workload, expose an A2A endpoint, get called as a library from another service" — that's Forge.

The math is usually obvious once stated. Forge is the right answer for a specific, growing slice of agent workloads. We don't claim it's the right answer for all of them, and treating it that way would be intellectually dishonest. The agent runtime market is large enough for multiple coherent products, and being clear about which one fits your shape saves everybody time.

## How to actually try Forge

A quickstart that runs locally, in five minutes:

```bash
brew install initializ/tap/forge
forge init my-agent
cd my-agent
# Edit SKILL.md or pick an embedded skill
forge run "triage my kubernetes pods in namespace production"
```

The same agent definition then deploys via `forge package` to a Docker container, to Kubernetes via the generated manifest, or as an A2A endpoint via `forge serve`. No code rewrite between steps.

If you want to see how a real production skill is structured, look at the [k8s-incident-triage skill](/hub/skills/k8s-incident-triage) — a complete production-ready triage agent with detection heuristics, safety constraints, and a step-by-step process. It's the same shape of SKILL.md that powered the 3am triage in the opening of this post.

When you're ready to deploy at enterprise scale, [Forge Hub](/hub) adds signed skills, RBAC, audit, SLA support, and an on-prem registry option for regulated workloads.

## The carve, stated plainly

The agent runtime market is settling into shapes. Desktops get Cowork. Hosted sessions get Managed Agents. Each hyperscaler gets its own managed runtime for its own cloud. And the agent that runs next to a service — in your environment, on your infrastructure, on the model of your choice, on an open standard — gets Forge.

That's the carve. We're going to be honest about it everywhere, because the positioning has to match the reality, and the reality is that no single agent runtime is right for every shape of agent work. Forge is right for the shape Anthropic's products don't reach, the hyperscalers' products can't span, and the frameworks alone don't solve.

If that's the shape of your agent problem, we'd like to help.

<div class="not-prose mt-12 bg-dark-surface border border-dark-border rounded-forge-xl p-8 text-center">
  <h2 class="text-xl font-bold text-heading mb-2">Ready to try Forge?</h2>
  <p class="text-secondary text-sm mb-5">Get started in minutes with the Forge CLI.</p>
  <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
    <a href="/docs/getting-started/installation" class="inline-flex items-center gap-2 px-5 py-2.5 bg-forge-orange hover:bg-forge-deep text-white text-sm font-medium rounded-forge-md transition-colors">
      Get started
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
    </a>
    <a href="/compare/" class="inline-flex items-center gap-2 px-5 py-2.5 border border-dark-border hover:border-gray-500 text-body hover:text-heading text-sm font-medium rounded-forge-md transition-colors">
      Compare Forge
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
    </a>
  </div>
</div>
