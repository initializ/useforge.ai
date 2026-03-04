---
title: Framework Plugins
description: "Extend Forge with framework plugins — support CrewAI, LangChain, and custom frameworks in the build pipeline."
order: 6
editUrl: https://github.com/initializ/useforge.ai/edit/main/src/content/docs/reference/framework-plugins.md
---

Forge uses a plugin system to support multiple AI agent frameworks. Each framework plugin adapts a specific framework to the Forge build pipeline, handling project detection, configuration extraction, and A2A wrapper generation.

## Supported Frameworks

| Framework | Plugin | Languages | Wrapper |
|-----------|--------|-----------|---------|
| CrewAI | `crewai.Plugin` | Python | `crewai_wrapper.py` |
| LangChain | `langchain.Plugin` | Python | `langchain_wrapper.py` |
| Custom | `custom.Plugin` | Python, TypeScript, Go | None (agent is the wrapper) |

## Plugin Interface

Every framework plugin implements `plugins.FrameworkPlugin`:

```go
type FrameworkPlugin interface {
    Name() string
    DetectProject(dir string) (bool, error)
    ExtractAgentConfig(dir string) (*AgentConfig, error)
    GenerateWrapper(config *AgentConfig) ([]byte, error)
    RuntimeDependencies() []string
}
```

## How Plugins Work in the Build Pipeline

1. **Detection** — The `FrameworkAdapterStage` checks the `framework` field in `forge.yaml`. If set, it looks up the plugin by name. Otherwise, it calls `DetectProject()` on each registered plugin to auto-detect.

2. **Extraction** — `ExtractAgentConfig()` reads framework-specific source files and produces an `AgentConfig` struct.

3. **Wrapper Generation** — `GenerateWrapper()` produces an A2A-compliant HTTP server wrapper that launches the framework agent.

4. **Output** — The wrapper is written to the build output directory and referenced in the Dockerfile entrypoint.

## Writing a Custom Plugin

To add support for a new framework:

1. Create a new package under `internal/plugins/yourframework/`.

2. Implement the `FrameworkPlugin` interface:

```go
package yourframework

import "github.com/initializ/forge/internal/plugins"

type Plugin struct{}

func (p *Plugin) Name() string { return "yourframework" }

func (p *Plugin) DetectProject(dir string) (bool, error) {
    return false, nil
}

func (p *Plugin) ExtractAgentConfig(dir string) (*plugins.AgentConfig, error) {
    return &plugins.AgentConfig{
        Name:        "my-agent",
        Description: "Agent built with YourFramework",
    }, nil
}

func (p *Plugin) GenerateWrapper(config *plugins.AgentConfig) ([]byte, error) {
    return nil, nil
}

func (p *Plugin) RuntimeDependencies() []string {
    return []string{"yourframework>=1.0"}
}
```

3. Register the plugin in `internal/cmd/build.go`.

## Hook System

Forge also has a general-purpose plugin hook system for extending the build lifecycle:

```go
type Plugin interface {
    Name() string
    Version() string
    Init(config map[string]any) error
    Hooks() []HookPoint
    Execute(ctx context.Context, hook HookPoint, data map[string]any) error
}
```

Available hook points: `pre-build`, `post-build`, `pre-push`, `post-push`.
