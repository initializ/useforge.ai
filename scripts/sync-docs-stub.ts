import fs from 'node:fs';
import path from 'node:path';

/**
 * Generate minimal placeholder docs for `astro dev` without GitHub access.
 * Run `npm run sync:docs` to fetch real content from the forge repo.
 */

const DOCS_CONTENT_DIR = path.resolve('src/content/docs');
const MANIFEST_FILE = path.resolve('src/data/docs-manifest.json');

interface StubPage {
  path: string;
  title: string;
  description: string;
  order?: number;
}

const STUB_PAGES: StubPage[] = [
  // Getting Started
  { path: 'getting-started/installation.md', title: 'Installation', description: 'Install Forge via Homebrew, script, or binary download.', order: 1 },
  { path: 'getting-started/quick-start.md', title: 'Quick Start', description: 'Get a Forge agent running in under 60 seconds.', order: 2 },
  { path: 'getting-started/your-first-skill.md', title: 'Your First Skill', description: 'Create your first agent skill with the SKILL.md format.', order: 3 },
  { path: 'getting-started/configuration.md', title: 'Configuration', description: 'Configure your Forge agent with forge.yaml and environment variables.', order: 4 },
  { path: 'getting-started/contributing.md', title: 'Contributing', description: 'Set up the development environment and contribute to Forge.', order: 5 },

  // Core Concepts
  { path: 'core-concepts/how-forge-works.md', title: 'How Forge Works', description: "Understand Forge's architecture, module system, and data flows.", order: 1 },
  { path: 'core-concepts/skill-md-format.md', title: 'SKILL.md Format', description: 'Define agent skills using the SKILL.md format with YAML frontmatter.', order: 2 },
  { path: 'core-concepts/tools-and-builtins.md', title: 'Tools & Builtins', description: 'Built-in tools, adapter tools, and the pluggable tool system.', order: 3 },
  { path: 'core-concepts/channels.md', title: 'Channels', description: 'Bridge messaging platforms like Slack and Telegram to your AI agent.', order: 4 },
  { path: 'core-concepts/memory-system.md', title: 'Memory System', description: 'Session persistence, context management, and long-term memory.', order: 5 },
  { path: 'core-concepts/runtime-engine.md', title: 'Runtime Engine', description: 'The LLM runtime engine powering tool calling, memory, and hooks.', order: 6 },
  { path: 'core-concepts/hooks.md', title: 'Hooks', description: 'Hook into the agent loop for logging, enforcement, and auditing.', order: 7 },
  { path: 'core-concepts/scheduling.md', title: 'Scheduling', description: 'Built-in cron scheduler for recurring agent tasks.', order: 8 },

  // Security
  { path: 'security/overview.md', title: 'Security Overview', description: "Forge's layered security architecture from network posture to guardrails.", order: 1 },
  { path: 'security/egress-control.md', title: 'Egress Control', description: 'Layered egress security controls for restricting outbound network access.', order: 2 },
  { path: 'security/trust-model.md', title: 'Trust Model', description: 'How Forge evaluates trust for skills, tools, and external services.', order: 3 },
  { path: 'security/secret-management.md', title: 'Secret Management', description: 'AES-256-GCM encrypted secret storage with per-agent isolation.', order: 4 },
  { path: 'security/build-signing.md', title: 'Build Signing', description: 'Ed25519 signing and verification of build artifacts.', order: 5 },
  { path: 'security/audit-logging.md', title: 'Audit Logging', description: 'Structured NDJSON audit logging for runtime security events.', order: 6 },
  { path: 'security/guardrails.md', title: 'Content Guardrails', description: 'Configurable content filtering, PII detection, and jailbreak protection.', order: 7 },

  // Skills
  { path: 'skills/embedded-skills.md', title: 'Embedded Skills', description: 'Built-in skills that ship with Forge: GitHub, Tavily, Kubernetes, codegen, and more.', order: 1 },
  { path: 'skills/writing-custom-skills.md', title: 'Writing Custom Skills', description: 'Create script-backed skills with tools, guardrails, and the compilation pipeline.', order: 2 },
  { path: 'skills/skills-cli.md', title: 'Skills CLI', description: 'CLI commands for managing, validating, and auditing skills.', order: 3 },
  { path: 'skills/contributing-a-skill.md', title: 'Contributing a Skill', description: 'Contribute a skill to the Forge embedded skill registry.', order: 4 },

  // Deployment
  { path: 'deployment/docker.md', title: 'Docker', description: 'Package and deploy Forge agents as Docker containers.', order: 1 },
  { path: 'deployment/kubernetes.md', title: 'Kubernetes', description: 'Deploy Forge agents to Kubernetes with generated manifests and NetworkPolicy.', order: 2 },
  { path: 'deployment/production-checklist.md', title: 'Production Checklist', description: 'Production build checks and deployment best practices.', order: 3 },
  { path: 'deployment/monitoring.md', title: 'Monitoring', description: 'Monitor Forge agents with structured audit events and logging.', order: 4 },

  // Reference
  { path: 'reference/cli-reference.md', title: 'CLI Reference', description: 'Complete reference for all Forge CLI commands.', order: 1 },
  { path: 'reference/forge-yaml-schema.md', title: 'forge.yaml Schema', description: 'Complete YAML schema reference for Forge agent configuration.', order: 2 },
  { path: 'reference/environment-variables.md', title: 'Environment Variables', description: 'All environment variables supported by Forge.', order: 3 },
  { path: 'reference/agent-skills-compatibility.md', title: 'Agent Skills Compatibility', description: 'Compatibility matrix for skills across agent types and LLM providers.', order: 4 },
  { path: 'reference/web-dashboard.md', title: 'Web Dashboard', description: 'Local web dashboard for managing agents from the browser.', order: 5 },
  { path: 'reference/framework-plugins.md', title: 'Framework Plugins', description: 'Plugin system for CrewAI, LangChain, and custom frameworks.', order: 6 },
  { path: 'reference/command-integration.md', title: 'Command Integration', description: 'Integrate Forge agents with the Initializ Command platform.', order: 7 },

  // FAQ
  { path: 'faq.md', title: 'FAQ', description: 'Frequently asked questions about Forge.', order: 1 },
];

function main(): void {
  console.log('🔧 Generating doc stubs for development...');

  fs.mkdirSync(DOCS_CONTENT_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(MANIFEST_FILE), { recursive: true });

  let count = 0;

  for (const page of STUB_PAGES) {
    const outputPath = path.join(DOCS_CONTENT_DIR, page.path);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    // Skip if real content already exists (don't overwrite synced docs)
    if (fs.existsSync(outputPath)) {
      continue;
    }

    const content = [
      '---',
      `title: "${page.title}"`,
      `description: "${page.description}"`,
      ...(page.order !== undefined ? [`order: ${page.order}`] : []),
      '---',
      '',
      `> This is a placeholder. Run \`npm run sync:docs\` to fetch real content from the forge repository.`,
      '',
    ].join('\n');

    fs.writeFileSync(outputPath, content, 'utf-8');
    count++;
    console.log(`  ✓ ${page.path}`);
  }

  // Write stub manifest
  const manifest = {
    syncedAt: new Date().toISOString(),
    ref: 'stub',
    totalDocs: STUB_PAGES.length,
    sections: STUB_PAGES.reduce<Record<string, number>>((acc, p) => {
      const parts = p.path.split('/');
      const section = parts.length > 1 ? parts.slice(0, -1).join('/') : 'root';
      acc[section] = (acc[section] || 0) + 1;
      return acc;
    }, {}),
    entries: [],
  };
  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2), 'utf-8');

  console.log(`\n✓ Generated ${count} stub docs (${STUB_PAGES.length - count} already existed)`);
}

main();
