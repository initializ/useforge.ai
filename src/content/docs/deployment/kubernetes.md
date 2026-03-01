---
title: Kubernetes
description: "Deploy Forge agents to Kubernetes — generated manifests, NetworkPolicy for egress, secrets, and Initializ Command export."
order: 2
editUrl: https://github.com/initializ/useforge.ai/edit/main/src/content/docs/deployment/kubernetes.md
---

# Kubernetes

`forge build` generates Kubernetes manifests in `.forge-output/k8s/`. These manifests cover the core resources you need to run your agent in a cluster — a Deployment, a Service, and a NetworkPolicy for egress enforcement.

## Generated Manifests

| Manifest | Purpose |
|---|---|
| `deployment.yaml` | Runs the agent container with environment variable references for secrets |
| `service.yaml` | Exposes the agent on port 8080 within the cluster |
| `networkpolicy.yaml` | Restricts pod egress to allowed domains on ports 80 and 443 |

You can apply them directly with `kubectl`:

```bash
kubectl apply -f .forge-output/k8s/
```

Or use them as a starting point and customize for your environment.

## NetworkPolicy

The generated NetworkPolicy restricts your agent's pod to only the domains in your egress allowlist. Traffic is limited to ports 80 and 443 (HTTP and HTTPS).

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: my-agent-egress
spec:
  podSelector:
    matchLabels:
      app: my-agent
  policyTypes:
    - Egress
  egress:
    - to: []
      ports:
        - port: 80
          protocol: TCP
        - port: 443
          protocol: TCP
```

This policy enforces the same restrictions at the network level that the Forge egress enforcer applies at the application level. Even if application-level enforcement were bypassed, the pod cannot reach unauthorized domains.

Your cluster must have a NetworkPolicy controller (Calico, Cilium, etc.) for these policies to take effect. Without one, the manifests are accepted but not enforced.

## Secrets

Pass your API keys and tokens as Kubernetes Secrets. Create the secret:

```bash
kubectl create secret generic my-agent-secrets \
  --from-literal=OPENAI_API_KEY=sk-... \
  --from-literal=SLACK_BOT_TOKEN=xoxb-... \
  --from-literal=SLACK_SIGNING_SECRET=...
```

Reference it in your Deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-agent
spec:
  replicas: 1
  selector:
    matchLabels:
      app: my-agent
  template:
    metadata:
      labels:
        app: my-agent
    spec:
      containers:
        - name: agent
          image: my-agent:latest
          ports:
            - containerPort: 8080
          envFrom:
            - secretRef:
                name: my-agent-secrets
```

The generated Deployment in `.forge-output/k8s/` already includes `envFrom` references. You just need to create the Secret with the expected name.

## Channel Services

If your agent uses channel connectors, you need to expose the channel ports in addition to the main agent port.

| Channel | Port | Inbound Traffic |
|---|---|---|
| Slack | 3000 | Webhook events from Slack |
| Telegram | 3001 | Not required for long polling (default) |

For Slack, you need a Service and Ingress (or LoadBalancer) to route webhook traffic from Slack to port 3000:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-agent-slack
spec:
  selector:
    app: my-agent
  ports:
    - port: 3000
      targetPort: 3000
      name: slack-webhook
```

Telegram uses long polling by default, so it does not require an inbound port or Ingress. The agent makes outbound requests to the Telegram API to fetch updates.

## Initializ Command Export

Forge agents can be exported for direct import into Initializ Command, the managed deployment platform.

```bash
forge export
```

This generates an AgentSpec JSON file that Command can import. The full pipeline looks like this:

```bash
# 1. Build artifacts and manifests
forge build

# 2. Export agent specification
forge export

# 3. Import into Initializ Command
# (done through the Command UI or CLI)
```

Command handles container registry, secrets injection, networking, and scaling. The exported AgentSpec carries all the metadata Command needs to deploy your agent without additional configuration.

## What's Next

Review the full [Production Checklist](/docs/deployment/production-checklist) before deploying your agent to a live environment.
