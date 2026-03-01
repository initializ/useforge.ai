export interface NavItem {
  label: string;
  href: string;
  items?: NavItem[];
}

export const docsSidebar: NavItem[] = [
  {
    label: 'Getting Started',
    href: '/docs/getting-started/installation',
    items: [
      { label: 'Installation', href: '/docs/getting-started/installation' },
      { label: 'Quick Start', href: '/docs/getting-started/quick-start' },
      { label: 'Your First Skill', href: '/docs/getting-started/your-first-skill' },
      { label: 'Configuration', href: '/docs/getting-started/configuration' },
    ],
  },
  {
    label: 'Core Concepts',
    href: '/docs/core-concepts/how-forge-works',
    items: [
      { label: 'How Forge Works', href: '/docs/core-concepts/how-forge-works' },
      { label: 'SKILL.md Format', href: '/docs/core-concepts/skill-md-format' },
      { label: 'Tools & Builtins', href: '/docs/core-concepts/tools-and-builtins' },
      { label: 'Channels', href: '/docs/core-concepts/channels' },
      { label: 'Memory System', href: '/docs/core-concepts/memory-system' },
    ],
  },
  {
    label: 'Security',
    href: '/docs/security/egress-control',
    items: [
      { label: 'Egress Control', href: '/docs/security/egress-control' },
      { label: 'Trust Model', href: '/docs/security/trust-model' },
      { label: 'Secret Management', href: '/docs/security/secret-management' },
      { label: 'Build Signing', href: '/docs/security/build-signing' },
      { label: 'Audit Logging', href: '/docs/security/audit-logging' },
    ],
  },
  {
    label: 'Skills',
    href: '/docs/skills/embedded-skills',
    items: [
      { label: 'Embedded Skills', href: '/docs/skills/embedded-skills' },
      { label: 'Writing Custom Skills', href: '/docs/skills/writing-custom-skills' },
      { label: 'Skills CLI', href: '/docs/skills/skills-cli' },
      { label: 'Contributing a Skill', href: '/docs/skills/contributing-a-skill' },
    ],
  },
  {
    label: 'Deployment',
    href: '/docs/deployment/docker',
    items: [
      { label: 'Docker', href: '/docs/deployment/docker' },
      { label: 'Kubernetes', href: '/docs/deployment/kubernetes' },
      { label: 'Production Checklist', href: '/docs/deployment/production-checklist' },
      { label: 'Monitoring', href: '/docs/deployment/monitoring' },
    ],
  },
  {
    label: 'Reference',
    href: '/docs/reference/cli-reference',
    items: [
      { label: 'CLI Reference', href: '/docs/reference/cli-reference' },
      { label: 'forge.yaml Schema', href: '/docs/reference/forge-yaml-schema' },
      { label: 'Environment Variables', href: '/docs/reference/environment-variables' },
      { label: 'Agent Skills Compatibility', href: '/docs/reference/agent-skills-compatibility' },
    ],
  },
  {
    label: 'FAQ',
    href: '/docs/faq',
  },
];

export interface FlatNavItem {
  label: string;
  href: string;
  section: string;
}

export function flattenNav(): FlatNavItem[] {
  const flat: FlatNavItem[] = [];
  for (const section of docsSidebar) {
    if (section.items) {
      for (const item of section.items) {
        flat.push({ label: item.label, href: item.href, section: section.label });
      }
    } else {
      flat.push({ label: section.label, href: section.href, section: section.label });
    }
  }
  return flat;
}
