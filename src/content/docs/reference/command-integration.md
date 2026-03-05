---
title: Command Platform Integration
description: "Integrate Forge agents with the Command platform — compile, validate, and run agents via the forge-core Go library."
order: 7
editUrl: https://github.com/initializ/useforge.ai/edit/main/src/content/docs/reference/command-integration.md
---

`forge-core` (`github.com/initializ/forge/forge-core`) is a pure Go library that Command imports to compile, validate, and run Forge agents. It has zero CLI, Docker, or Kubernetes dependencies.

## Shared Runtime Base Image Pattern

Unlike `forge build` which generates per-agent Dockerfiles with language-specific base images, Command uses a **shared runtime base image**:

1. **No per-agent container builds**: Command does not run `forge build` or generate Dockerfiles. Instead, it imports agents via their AgentSpec JSON.

2. **Shared base image**: Command maintains a single runtime base image that includes the Forge agent runtime, common language runtimes, and the A2A server.

3. **Agent loading flow**:
```
AgentSpec JSON → forgecore.Compile() → Runtime configuration
              → forgecore.NewRuntime() → LLM executor with injected tools
```

## Importing forge-core

```go
import (
    forgecore "github.com/initializ/forge/forge-core"
    "github.com/initializ/forge/forge-core/types"
    "github.com/initializ/forge/forge-core/agentspec"
    "github.com/initializ/forge/forge-core/skills"
    "github.com/initializ/forge/forge-core/llm"
    "github.com/initializ/forge/forge-core/runtime"
    "github.com/initializ/forge/forge-core/security"
    "github.com/initializ/forge/forge-core/tools"
    "github.com/initializ/forge/forge-core/validate"
)
```

## Compile API

```go
result, err := forgecore.Compile(forgecore.CompileRequest{
    Config:       cfg,
    PluginConfig: pluginCfg,
    SkillEntries: skillEntries,
})
// result.Spec           — *agentspec.AgentSpec
// result.CompiledSkills — *skills.CompiledSkills
// result.EgressConfig   — *security.EgressConfig
// result.Allowlist      — []byte (JSON)
```

## Validate API

```go
valResult := forgecore.ValidateConfig(cfg)
schemaErrs, err := forgecore.ValidateAgentSpec(jsonData)
compatResult := forgecore.ValidateCommandCompat(spec)
simResult := forgecore.SimulateImport(spec)
```

## Runtime API

```go
executor := forgecore.NewRuntime(forgecore.RuntimeConfig{
    LLMClient:     myLLMClient,
    Tools:         toolRegistry,
    Hooks:         hookRegistry,
    SystemPrompt:  "You are ...",
    MaxIterations: 10,
    Guardrails:    guardrailEngine,
    Logger:        logger,
})

resp, err := executor.Execute(ctx, task, message)
```

## Override Patterns

### Model Override

```go
client, _ := providers.NewClient("anthropic", llm.ClientConfig{
    APIKey: os.Getenv("ANTHROPIC_API_KEY"),
    Model:  "claude-sonnet-4-20250514",
})
```

### Tool Restriction

```go
reg := tools.NewRegistry()
builtins.RegisterAll(reg)
filtered := reg.Filter([]string{"http_request", "json_parse"})
```

### Egress Tightening

```go
egressCfg, _ := security.Resolve(
    "strict",
    "allowlist",
    orgAllowedDomains,
    toolNames,
    capabilities,
)
```

### Skill Gating

```go
var approved []skills.SkillEntry
for _, entry := range allEntries {
    if isApproved(entry.Name) {
        approved = append(approved, entry)
    }
}
result, _ := forgecore.Compile(forgecore.CompileRequest{
    Config:       cfg,
    SkillEntries: approved,
})
```

## API Stability

forge-core follows semantic versioning. The following are stable:

| API | Stability |
|-----|-----------|
| `forgecore.Compile()` | Stable |
| `forgecore.ValidateConfig()` | Stable |
| `forgecore.ValidateAgentSpec()` | Stable |
| `forgecore.NewRuntime()` | Stable |
| `types.ForgeConfig` struct | Stable |
| `agentspec.AgentSpec` struct | Stable |
| `llm.Client` interface | Stable |
| `runtime.ToolExecutor` interface | Stable |
| `security.EgressConfig` struct | Stable |
| `skills.SkillEntry` struct | Stable |
