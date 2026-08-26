import manifest from './docs-manifest.json';

export interface NavItem {
  label: string;
  href: string;
  description?: string;
  items?: NavItem[];
}

export interface FlatNavItem {
  label: string;
  href: string;
  section: string;
}

// ─── Manifest ────────────────────────────────────────────────────────────────
// `docs-manifest.json` is written by `scripts/sync-docs.ts` on every docs sync.
// It lists every synced doc page, so we build the sidebar FROM it — that way a
// newly synced page can never be silently orphaned from navigation. See the
// completeness guarantee in `buildSidebar()`.

interface ManifestEntry {
  section: string;
  slug: string;
  title: string;
  order?: number;
  outputPath: string; // e.g. "getting-started/installation.md"
}

const entries = (manifest.entries as ManifestEntry[]) ?? [];

// ─── Curation ────────────────────────────────────────────────────────────────
// The ONLY hand-maintained parts: section grouping/labels/descriptions, the
// preferred reading order within each section, and clean labels where a page's
// frontmatter title is too verbose. Anything not listed here still appears —
// it's just placed at the end of its section (grouped sections) or the end of
// the sidebar (unknown sections), and warned about at build time.

interface SectionMeta {
  id: string; // matches ManifestEntry.section
  label: string;
  description?: string;
  order?: string[]; // preferred slug order; unlisted slugs are appended
  flat?: boolean; // render as a single top-level link (uses its one page)
}

const SECTION_META: SectionMeta[] = [
  {
    id: 'getting-started',
    label: 'Getting Started',
    description: 'Install Forge, create your first agent, and configure providers.',
    order: ['installation', 'quick-start', 'your-first-skill', 'configuration', 'ship-to-production', 'contributing'],
  },
  {
    id: 'core-concepts',
    label: 'Core Concepts',
    description: 'Understand the architecture, SKILL.md format, tools, channels, and runtime.',
    order: [
      'how-forge-works',
      'skill-md-format',
      'tools-and-builtins',
      'channels',
      'memory-system',
      'context-compression',
      'runtime-engine',
      'hooks',
      'scheduling',
      'binary-dependencies',
      'observability-tracing',
    ],
  },
  {
    id: 'security',
    label: 'Security',
    description: 'Egress control, trust evaluation, auth, secrets, and audit logging.',
    order: [
      'overview',
      'egress-control',
      'trust-model',
      'authentication',
      'secret-management',
      'build-signing',
      'guardrails',
      'audit-logging',
      'audit-tamper-evidence',
      'admission',
      'platform-policy',
      'tenancy',
      'workflow-correlation',
    ],
  },
  {
    id: 'skills',
    label: 'Skills',
    description: 'Embedded skills, writing custom skills, and contributing.',
    order: ['embedded-skills', 'writing-custom-skills', 'skills-cli', 'contributing-a-skill'],
  },
  {
    id: 'mcp',
    label: 'MCP',
    description: 'Connect Model Context Protocol servers, with OAuth and delegated consent.',
    order: ['index', 'configuration', 'cli-reference', 'audit-events', 'delegated-consent', 'troubleshooting'],
  },
  {
    id: 'deployment',
    label: 'Deployment',
    description: 'Docker, Kubernetes, scheduling, production checklists, and monitoring.',
    order: ['docker', 'kubernetes', 'scheduler-kubernetes', 'production-checklist', 'monitoring'],
  },
  {
    id: 'reference',
    label: 'Reference',
    description: 'CLI reference, configuration schema, and platform integration.',
    order: [
      'cli-reference',
      'forge-yaml-schema',
      'environment-variables',
      'agent-skills-compatibility',
      'web-dashboard',
      'framework-plugins',
      'library-modules',
      'browser-tools',
      'command-integration',
    ],
  },
  {
    id: 'root',
    label: 'FAQ',
    description: 'Common questions about Forge.',
    flat: true,
  },
];

// Clean labels for pages whose frontmatter title is too verbose or inconsistent
// for a sidebar. Keyed by "<section>/<slug>". Falls back to the manifest title.
const LABEL_OVERRIDES: Record<string, string> = {
  'security/overview': 'Overview',
  'security/authentication': 'Authentication',
  'security/audit-tamper-evidence': 'Audit Tamper Evidence',
  'security/admission': 'Admission',
  'security/tenancy': 'Tenancy',
  'core-concepts/observability-tracing': 'Observability',
  'mcp/index': 'Overview',
  'mcp/configuration': 'Configuration',
  'mcp/cli-reference': 'CLI Reference',
  'mcp/audit-events': 'Audit Events',
  'mcp/troubleshooting': 'Troubleshooting',
  'mcp/delegated-consent': 'Delegated Consent',
};

// ─── Build ───────────────────────────────────────────────────────────────────

function href(entry: ManifestEntry): string {
  return '/docs/' + entry.outputPath.replace(/\.md$/, '');
}

function label(entry: ManifestEntry): string {
  return LABEL_OVERRIDES[`${entry.section}/${entry.slug}`] ?? entry.title;
}

function toNavItem(entry: ManifestEntry): NavItem {
  return { label: label(entry), href: href(entry) };
}

// Order a section's entries: curated slugs first (in the given order), then any
// remaining entries sorted by frontmatter order then slug, so newly synced
// pages surface automatically at the end of their section.
function orderEntries(sectionEntries: ManifestEntry[], preferred: string[] = []): ManifestEntry[] {
  const bySlug = new Map(sectionEntries.map((e) => [e.slug, e]));
  const used = new Set<string>();
  const ordered: ManifestEntry[] = [];

  for (const slug of preferred) {
    const e = bySlug.get(slug);
    if (e) {
      ordered.push(e);
      used.add(slug);
    }
  }

  const leftover = sectionEntries
    .filter((e) => !used.has(e.slug))
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || a.slug.localeCompare(b.slug));

  return [...ordered, ...leftover];
}

function buildSidebar(): NavItem[] {
  const bySection = new Map<string, ManifestEntry[]>();
  for (const e of entries) {
    const list = bySection.get(e.section) ?? [];
    list.push(e);
    bySection.set(e.section, list);
  }

  const sidebar: NavItem[] = [];
  const seenSections = new Set<string>();

  for (const meta of SECTION_META) {
    const sectionEntries = bySection.get(meta.id) ?? [];
    seenSections.add(meta.id);
    if (sectionEntries.length === 0) continue;

    if (meta.flat) {
      // Single-page section rendered as a top-level link.
      const entry = orderEntries(sectionEntries, meta.order)[0];
      sidebar.push({ label: meta.label, href: href(entry), description: meta.description });
      continue;
    }

    const items = orderEntries(sectionEntries, meta.order).map(toNavItem);
    sidebar.push({
      label: meta.label,
      href: items[0].href,
      description: meta.description,
      items,
    });
  }

  // Completeness guarantee: any synced section not covered by SECTION_META is
  // appended (rather than silently dropped) so drift is visible, not hidden.
  for (const [section, sectionEntries] of bySection) {
    if (seenSections.has(section)) continue;
    // eslint-disable-next-line no-console
    console.warn(
      `[navigation] Synced docs section "${section}" is not in SECTION_META — appending ${sectionEntries.length} page(s). Add it to src/data/navigation.ts.`,
    );
    const items = orderEntries(sectionEntries).map(toNavItem);
    const humanized = section
      .split(/[-/]/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    sidebar.push({ label: humanized, href: items[0].href, items });
  }

  return sidebar;
}

export const docsSidebar: NavItem[] = buildSidebar();

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
