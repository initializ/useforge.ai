---
title: Contributing a Skill
description: "How to contribute skills to Forge — embedded skills via PR, project-local skills, and quality guidelines."
order: 4
editUrl: https://github.com/initializ/useforge.ai/edit/main/src/content/docs/skills/contributing-a-skill.md
---

There are two ways to add skills to Forge: contribute an embedded skill via pull request (available to all Forge users) or add a project-local skill (available only in your project). This guide covers both paths and the quality standards that apply.

## Contributing an Embedded Skill

Embedded skills ship with the Forge binary and are available to every user out of the box. To add one, you submit a pull request to the Forge repository. There is no central index or registry file to edit — skills are directories, and the autowire pipeline discovers them automatically.

### Step-by-Step

1. **Fork the repository:**

```bash
git clone https://github.com/initializ/forge.git
cd forge
```

2. **Copy the template:**

```bash
cp -r forge-skills/local/embedded/_template/ forge-skills/local/embedded/my-skill/
```

The `_template/` directory includes a skeleton SKILL.md with all frontmatter fields and placeholder sections.

3. **Write your SKILL.md:**

Edit `forge-skills/local/embedded/my-skill/SKILL.md` with proper frontmatter and LLM instructions. Follow the [Writing Custom Skills](/docs/skills/writing-custom-skills) specification for all available fields.

Here is a minimal example:

```yaml
---
name: my-skill
icon: 🔧
category: utilities
tags:
  - my-tag
description: A short description of what this skill does.
metadata:
  forge:
    requires:
      bins:
        - curl
      env:
        required: []
        one_of: []
        optional: []
    egress_domains:
      - api.example.com
    trust_hints:
      requires_network: true
      requires_filesystem: false
      requires_shell: true
      max_execution_seconds: 30
---

Instructions for the LLM go here. Be specific about what the skill does,
how to use it, and any constraints.

## Constraints

- List guardrails and rules for the LLM
- Be explicit about what the skill should and should not do
```

4. **Optionally add scripts:**

If your skill is script-backed, create a `scripts/` directory:

```bash
mkdir forge-skills/local/embedded/my-skill/scripts/
```

Add your scripts following the [script conventions](/docs/skills/writing-custom-skills#scripts-conventions):

```bash
#!/usr/bin/env bash
set -euo pipefail

# Parse JSON input
INPUT=$(echo "$1" | jq -r '.query')

# Do work and output result to stdout
curl -s "https://api.example.com/search?q=${INPUT}"
```

Make scripts executable:

```bash
chmod +x forge-skills/local/embedded/my-skill/scripts/*.sh
```

5. **Open a pull request:**

Push your branch and open a PR against `main`. You do not need to edit `registry.go`, `skills.json`, or any central index file. The autowire pipeline discovers your skill directory automatically.

### CI Checks

When you open a PR, the following checks run automatically:

| Check | What it does |
|---|---|
| **Frontmatter validation** | Verifies SKILL.md conforms to the schema (required fields, correct types, valid values) |
| **Security analysis** | Scans scripts for unsafe patterns, checks consistency between trust_hints and actual behavior |
| **Trust evaluation** | Runs the autowire pipeline — embedded skills must reach `Trusted` status to merge |
| **Existing tests** | Ensures your skill does not break existing functionality |

If the trust evaluation returns `under_review` or `failed`, the PR is blocked until the issues are resolved. Review the findings in the CI output and adjust your SKILL.md or scripts accordingly.

## Adding a Project-Local Skill

Project-local skills live in your project's `skills/` directory and are available only to your agent. This is the right path for custom, team-specific, or experimental skills.

### Step-by-Step

1. **Create the skill directory:**

```bash
mkdir -p skills/my-skill
```

2. **Write the SKILL.md:**

Create `skills/my-skill/SKILL.md` with the appropriate frontmatter and LLM instructions.

3. **Optionally add scripts:**

```bash
mkdir -p skills/my-skill/scripts
# Add your scripts
chmod +x skills/my-skill/scripts/*.sh
```

4. **Run the build:**

```bash
forge build
```

The autowire pipeline discovers and evaluates your skill. The result is one of three trust levels:

| Result | What happens |
|---|---|
| **Trusted** | The skill is available in `forge run` and `forge serve` without restriction |
| **Under Review** | The skill runs but is flagged. Promote it with `forge skills promote my-skill` |
| **Failed** | The skill is blocked. Forge shows a clear explanation of what failed and why |

5. **Validate independently (optional):**

```bash
forge skills validate skills/my-skill
```

6. **Check the trust report:**

```bash
forge skills trust-report my-skill
```

### Iterating on Local Skills

You can modify your SKILL.md or scripts at any time. Run `forge build` or `forge skills refresh` to re-evaluate. If you fix a trust violation, the skill's trust level updates automatically.

## Compilation Pipeline

The skill compilation pipeline has three stages:

1. **Parse** — Reads `SKILL.md` and extracts `SkillEntry` values with name, description, input spec, and output spec. When YAML frontmatter is present, `ParseWithMetadata()` additionally extracts `SkillMetadata` and `SkillRequirements` (binary deps, env vars).

2. **Compile** — Converts entries into `CompiledSkills` with:
   - A JSON-serializable skill list
   - A human-readable prompt catalog
   - Version identifier (`agentskills-v1`)

3. **Write Artifacts** — Outputs to the build directory:
   - `compiled/skills/skills.json` — Machine-readable skill definitions
   - `compiled/prompt.txt` — LLM-readable skill catalog

## Build Stage Integration

The `SkillsStage` runs as part of the build pipeline:

1. Scans the `skills/` subdirectory for `SKILL.md` files in each subdirectory
2. Parses, compiles, and writes artifacts
3. Updates the `AgentSpec` with `skills_spec_version` and `forge_skills_ext_version`
4. Records generated files in the build manifest

## Quality Guidelines

Whether you are contributing an embedded skill or adding a project-local one, follow these guidelines to ensure your skill is clear, secure, and maintainable.

### Clear Naming

Choose a specific, descriptive name and description. The name should make it obvious what the skill does:

- **Good:** `k8s-incident-triage`, `tavily-search`, `site-check`
- **Avoid:** `helper`, `utils`, `my-tool`

### Minimal Binary Dependencies

Declare only the binaries your skill actually needs. Every binary in `requires.bins` is a hard dependency — if it is missing, the skill fails validation. Prefer common utilities (`curl`, `jq`, `kubectl`) over obscure tools.

### Declare All Egress Domains

List every domain your skill contacts in `egress_domains`. Undeclared egress is blocked at runtime in `allowlist` and `strict` modes. If your skill needs dynamic domains (like `$K8S_API_DOMAIN`), document this clearly.

### Use trust_hints for Transparency

Declare `trust_hints` honestly. They are verified by the autowire pipeline, so mismatches are caught automatically. Honest trust_hints make it easier for reviewers and users to understand your skill's security posture at a glance.

### Write Clear LLM Instructions

The markdown body is what the LLM reads. Write it as if you are instructing a capable but literal assistant:

- Be specific about what the skill does and does not do
- Include constraints and guardrails
- Provide example inputs and expected outputs
- For binary-backed skills, include the exact commands the LLM should run

### Test with forge skills validate

Before submitting a PR or running your agent, validate your skill:

```bash
forge skills validate skills/my-skill
forge skills trust-report my-skill
```

Fix any warnings or errors before proceeding. A skill that passes validation with zero findings is more likely to reach `Trusted` status immediately.

## What's Next

Learn how to package and deploy your agent with [Docker](/docs/deployment/docker).
