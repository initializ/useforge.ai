---
title: "Forge vs AWS Bedrock AgentCore"
description: "How Forge compares to AWS Bedrock AgentCore — cross-cloud portability, on-prem deployment, and open-standard skill format vs AWS-native managed runtime."
competitor: "AgentCore"
order: 10
category: "managed-runtime"
---

# Forge vs AWS Bedrock AgentCore

How Forge compares to AWS Bedrock AgentCore — cross-cloud portability, on-prem deployment, and the open Agent Skills standard versus AWS-native managed hosting.

## TLDR

AWS Bedrock AgentCore is a serverless, fully-managed runtime for AI agents on AWS. It provides session isolation via microVMs, 8-hour execution windows, framework neutrality (LangGraph, CrewAI, Strands, OpenAI Agents SDK), and deep integration with AWS Identity, Cognito, VPC, and CloudWatch. If your stack is AWS-native and you intend to stay there, AgentCore is an excellent choice.

Forge is an open-source agent runtime built on Anthropic's Agent Skills standard, distributed as a single static binary. It runs the same SKILL.md agent on EKS, AKS, GKE, on-prem Kubernetes, bare metal, or air-gapped infrastructure — without binding you to a cloud provider, identity system, or proprietary agent format.

AgentCore optimizes for "production-ready on AWS." Forge optimizes for "production-ready anywhere."

## Different Problems, Different Architectures

AgentCore was built to solve a real, painful problem: AWS customers had prototype agents that worked locally, and operationalizing them on AWS meant assembling ECS or EKS, IAM, Cognito, CloudWatch, VPC networking, and a custom session-isolation layer themselves. AgentCore packages all of that into a managed service. You get session isolation via dedicated microVMs, 8-hour long-running workloads, OAuth-based outbound auth for tools, and observability through CloudWatch — all without provisioning the underlying infrastructure.

Forge was built to solve a different problem: how do you ship the same agent to AWS, Azure, GCP, on-prem Kubernetes, and an air-gapped cluster — and have the security model, audit posture, and operational surface be identical everywhere? Cloud-managed runtimes can't answer that question, because each one runs only in its own cloud. Forge's answer is a single-binary runtime built on an open standard (Anthropic's Agent Skills format), with the security and trust model embedded in the runtime itself rather than provided by the cloud platform underneath.

Both are legitimate answers to the production-agent problem. They differ in where they think the agent should run.

## Feature Comparison

| Capability | Forge | AWS Bedrock AgentCore |
|---|---|---|
| **Where it runs** | Any infrastructure that runs containers (multi-cloud, on-prem, air-gapped, edge) | AWS only |
| **Skill / agent format** | SKILL.md — open Agent Skills standard, markdown + frontmatter | Code in any framework (LangGraph, CrewAI, Strands, OpenAI Agents SDK, custom) |
| **Cloud lock-in** | None | AWS account, region, billing, IAM |
| **Identity binding** | Pluggable — Okta, Entra ID, custom IdPs, none | AWS IAM (SigV4), Cognito, OAuth via AgentCore Identity |
| **Model choice** | Anthropic, OpenAI, Gemini, Ollama, local GGUF via `forge brain` | Any LLM, but ecosystem is Bedrock-centric in practice |
| **Session isolation** | Container-level, optional in-process embedding | Dedicated microVM per session |
| **Long-running execution** | Unlimited (you control the deployment lifecycle) | Up to 8 hours per session |
| **A2A protocol support** | Native (JSON-RPC 2.0) | Native (proxy layer, port 9000) |
| **MCP protocol support** | Native | Native (port 8000/mcp) |
| **Egress security** | Computed-not-declared, per-skill domain allowlists, runtime enforcement | VPC + PrivateLink at the network layer |
| **Trust model** | Autowire pipeline computes trust from skill contents; contributor cannot self-declare | AWS IAM scopes + container isolation |
| **Audit logging** | Structured logs with correlation IDs, agent + skill + tool + egress traces | CloudWatch traces with reasoning steps, tool invocations, model interactions |
| **Pricing model** | Open source — you pay for infrastructure you already own | AWS consumption-based — CPU/memory billed per active second |
| **On-prem / air-gapped** | First-class — single binary, no phone-home, local inference via `forge brain` | Not supported |
| **What you write** | A `SKILL.md` markdown file | Agent code in a framework + `agentcore.yaml` deployment config |

## The Portability Difference

AgentCore is genuinely framework-neutral. You can write your agent in LangGraph, CrewAI, Strands, or the OpenAI Agents SDK and AgentCore will host it. What AgentCore is not neutral about is the cloud. An AgentCore deployment is an AWS resource: it has an ARN, it lives in a region, it bills through your AWS account, and it integrates with CloudWatch, Cognito, and VPC by design. The portability story stops at the framework boundary.

Forge's portability operates at a different layer. A `SKILL.md` file is a markdown document — frontmatter declares requirements (binaries, environment variables, egress domains), the body is LLM instructions, and optional scripts add tools. That document is the agent. The same SKILL.md runs on your laptop via `forge run`, in a Docker container, as a Kubernetes deployment on EKS, AKS, or GKE, as a sidecar in a service pod, as a step in a CI pipeline, or inside an air-gapped on-prem cluster. There is no per-environment rewrite, no cloud-specific deployment manifest, and no managed-service dependency.

If your operational reality is one cloud forever, AgentCore's depth on AWS is a feature. If your operational reality includes multi-cloud, on-prem, regulated, or air-gapped deployment targets, that depth becomes a tax.

## Security Model

AgentCore's security model is excellent within its assumptions. Each session runs in an isolated microVM with dedicated CPU, memory, and filesystem. AgentCore Identity manages inbound auth (IAM, OAuth, Cognito) and outbound auth (OAuth or API keys for third-party tools like Slack, GitHub, Zoom). With GA, AgentCore added VPC and PrivateLink support, letting agents reach into your private subnets without exposure to the public internet. CloudWatch captures full reasoning traces.

Forge takes a different approach to the same set of concerns. Trust is **computed**, not declared: the autowire pipeline scans each SKILL.md frontmatter and any associated scripts, evaluates them against a security policy, and assigns a trust level the contributor cannot override. Egress is enforced at the runtime layer with per-skill allowlists — a skill declared to talk to `api.github.com` cannot make a call to `evil.com`, regardless of what the LLM tries. Denied tools are explicit contracts; certain skills (like Kubernetes triage) explicitly deny `http_request` and `web_search` to prevent the LLM from bypassing the intended access path.

The architectural difference: AgentCore's security model leans on AWS primitives (IAM, VPC, microVM isolation). Forge's security model is embedded in the runtime itself, so it travels with the agent regardless of where it deploys. Both are defensible postures. The right choice depends on whether your security and compliance team is structured around AWS controls or around runtime-native controls.

## Cost and Operational Model

AgentCore is consumption-priced. It charges for CPU/memory only during active processing — eliminating charges during I/O wait while preserving session state. For bursty, low-utilization workloads this is genuinely cost-efficient. For high-throughput or always-on agents (an SRE responder that runs against every alert, a CI agent that runs on every commit, a sidecar that processes every request), consumption pricing at scale becomes a meaningful line item that does not appear in early prototypes.

Forge has no managed runtime fee. You pay for the infrastructure you already own — EC2, EKS, on-prem capacity, whatever you've already budgeted. Your model spend (Anthropic, OpenAI, Gemini, or local) is unchanged. The trade-off is that you operate the runtime: you scale your own Kubernetes deployments, manage your own observability, and run your own update cycle. For organizations that already operate Kubernetes at scale, this is not a new burden. For organizations that don't, AgentCore's managed surface is a real productivity gain.

The strategic question: are you trying to minimize time-to-first-agent-in-prod (favor AgentCore) or minimize long-term unit economics and platform dependency (favor Forge)?

## When to Use AWS Bedrock AgentCore

AgentCore is the right choice when:

- Your organization is AWS-native and intends to remain so.
- You want a fully managed runtime with no operational burden beyond agent code.
- Your agents are bursty or low-utilization, where consumption pricing is favorable.
- You're already invested in CloudWatch, Cognito, and AWS IAM for observability and identity.
- You need framework neutrality across LangGraph, CrewAI, Strands, and OpenAI Agents SDK, and you're comfortable with that framework being your agent format.
- Your distribution targets are AWS Marketplace and AWS-internal consumers.

## When to Use Forge

Forge is the right choice when:

- Your infrastructure spans multiple clouds, or includes on-prem or air-gapped environments.
- Regulatory or sovereignty requirements prohibit running agents in a hyperscaler's hosted runtime.
- You want the same agent definition to deploy unchanged across development, staging, production, and disaster-recovery environments — including DR in a different cloud.
- Your agents are high-throughput or always-on, where managed-runtime consumption pricing compounds unfavorably.
- You want an open standard for the agent format itself (SKILL.md / Agent Skills), so agents are portable across runtimes and reviewable as documents.
- You need local model inference (`forge brain`) for workloads that cannot leave your network.
- Your team prefers operating a single static binary over managing a cloud-provider service relationship.

## The Bottom Line

AgentCore and Forge are both legitimate production runtimes for AI agents. They make different bets about where the agent should run and what should be managed by whom.

AgentCore bets that the agent runs in AWS, billing flows through AWS, identity binds to AWS, and the operational surface should be as thin as possible for AWS-native teams. That bet is well-executed and pays off cleanly for AWS-only organizations.

Forge bets that the agent should run wherever services run — in your VPC, your cluster, your data center, your air-gapped facility — and that the runtime should be open-source, single-binary, and built on an open standard so agents are portable across deployment shapes. That bet pays off for organizations that cannot or will not standardize on a single hyperscaler.

The most honest summary: **AgentCore is AWS's answer to "production agents on AWS." Forge is the answer to "production agents anywhere."**

---

**Also see:** [Forge vs Azure Foundry](/compare/forge-vs-foundry) · [Forge vs Vertex](/compare/forge-vs-vertex) · [Forge vs Claude Managed Agents](/compare/forge-vs-claude-managed-agents)
