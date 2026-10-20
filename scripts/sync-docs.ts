import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

// ─── Config ────────────────────────────────────────────────────────────────────

const REPO_OWNER = 'initializ';
const REPO_NAME = 'forge';
const DOCS_PATH = 'docs';
const DOCS_REF = process.env.FORGE_DOCS_REF || 'main';

const DOCS_CONTENT_DIR = path.resolve('src/content/docs');
const MANIFEST_FILE = path.resolve('src/data/docs-manifest.json');

const SYNC_MARKER = '<!-- Synced from github.com/initializ/forge -->';

const headers: Record<string, string> = {
  'Accept': 'application/vnd.github.v3+json',
};
if (process.env.GITHUB_TOKEN) {
  headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface GitTreeEntry {
  path: string;
  mode: string;
  type: string;
  sha: string;
  size?: number;
  url: string;
}

interface GitTreeResponse {
  sha: string;
  url: string;
  tree: GitTreeEntry[];
  truncated: boolean;
}

interface DocEntry {
  sourcePath: string;      // e.g. "docs/getting-started/installation.md"
  outputPath: string;      // e.g. "getting-started/installation.md"
  section: string;         // e.g. "getting-started"
  slug: string;            // e.g. "installation"
  title: string;
  description: string;
  order?: number;
  editUrl: string;
}

interface DocsManifest {
  syncedAt: string;
  ref: string;
  totalDocs: number;
  sections: Record<string, number>;
  entries: DocEntry[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

async function fetchJSON(url: string): Promise<unknown> {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.text();
}

/**
 * Rewrite relative markdown links to Astro doc routes.
 *
 * Examples:
 *   [text](../security/egress-control.md)       → [text](/docs/security/egress-control)
 *   [text](./installation.md)                    → [text](/docs/getting-started/installation)
 *   [text](../faq.md#heading)                    → [text](/docs/faq#heading)
 *   [text](https://example.com)                  → unchanged
 *   [text](#anchor)                              → unchanged
 */
function rewriteLinks(content: string, sourcePath: string): string {
  // Match markdown links: [text](url)
  return content.replace(
    /\[([^\]]*)\]\(([^)]+)\)/g,
    (match, text: string, url: string) => {
      // Skip external links and anchor-only links
      if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('#')) {
        return match;
      }

      // Skip non-markdown links (images handled separately)
      if (!url.endsWith('.md') && !url.includes('.md#')) {
        // Could be an image or other asset — skip
        return match;
      }

      // Split URL and anchor
      const [filePart, anchor] = url.split('#');

      // Resolve relative path from source file location
      const sourceDir = path.dirname(sourcePath);
      const resolvedPath = path.normalize(path.join(sourceDir, filePart));

      // Strip docs/ prefix and .md extension
      let docPath = resolvedPath;
      if (docPath.startsWith('docs/')) {
        docPath = docPath.slice(5);
      }
      docPath = docPath.replace(/\.md$/, '');

      // Build the final URL
      const finalUrl = `/docs/${docPath}${anchor ? '#' + anchor : ''}`;
      return `[${text}](${finalUrl})`;
    }
  );
}

/**
 * Rewrite relative image paths to raw.githubusercontent.com URLs.
 */
function rewriteImages(content: string, sourcePath: string): string {
  return content.replace(
    /!\[([^\]]*)\]\((?!https?:\/\/)([^)]+)\)/g,
    (_match, alt: string, imgPath: string) => {
      const sourceDir = path.dirname(sourcePath);
      const resolvedPath = path.normalize(path.join(sourceDir, imgPath));
      const rawUrl = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${DOCS_REF}/${resolvedPath}`;
      return `![${alt}](${rawUrl})`;
    }
  );
}

/**
 * Rewrite source code links (e.g., ../../forge-core/file.go) to GitHub blob URLs.
 */
function rewriteSourceLinks(content: string, sourcePath: string): string {
  return content.replace(
    /\[([^\]]*)\]\((?!https?:\/\/|#|\/docs\/)([^)]*\.(?:go|py|ts|js|json|yaml|yml))\)/g,
    (_match, text: string, filePath: string) => {
      const sourceDir = path.dirname(sourcePath);
      const resolvedPath = path.normalize(path.join(sourceDir, filePath));
      // Only rewrite if it goes outside docs/
      if (!resolvedPath.startsWith('docs/')) {
        const blobUrl = `https://github.com/${REPO_OWNER}/${REPO_NAME}/blob/${DOCS_REF}/${resolvedPath}`;
        return `[${text}](${blobUrl})`;
      }
      return _match;
    }
  );
}

// ─── Expected pages for completeness validation ────────────────────────────────
//
// Hand-maintained regression floor: pages we expect the sync to always produce.
// `validateCompleteness()` warns if any is missing, catching upstream deletions
// or a broken fetch. It is NOT what drives navigation — the docs sidebar is
// generated from the sync manifest (see `src/data/navigation.ts`), so a newly
// added upstream page appears automatically without editing this list.
//
// Regenerate after a legitimate docs restructure:
//   node -e "const m=require('../src/data/docs-manifest.json');console.log(m.entries.map(e=>\"  '\"+e.outputPath.replace(/\\.md$/,'')+\"',\").sort().join('\\n'))"
const EXPECTED_PAGES = [
  'core-concepts/binary-dependencies',
  'core-concepts/channels',
  'core-concepts/context-compression',
  'core-concepts/hooks',
  'core-concepts/how-forge-works',
  'core-concepts/memory-system',
  'core-concepts/observability-tracing',
  'core-concepts/runtime-engine',
  'core-concepts/scheduling',
  'core-concepts/skill-md-format',
  'core-concepts/tools-and-builtins',
  'deployment/docker',
  'deployment/kubernetes',
  'deployment/monitoring',
  'deployment/production-checklist',
  'deployment/scheduler-kubernetes',
  'faq',
  'getting-started/configuration',
  'getting-started/contributing',
  'getting-started/installation',
  'getting-started/quick-start',
  'getting-started/ship-to-production',
  'getting-started/your-first-skill',
  'mcp/audit-events',
  'mcp/cli-reference',
  'mcp/configuration',
  'mcp/delegated-consent',
  'mcp/index',
  'mcp/troubleshooting',
  'reference/agent-skills-compatibility',
  'reference/browser-tools',
  'reference/cli-reference',
  'reference/command-integration',
  'reference/environment-variables',
  'reference/forge-yaml-schema',
  'reference/framework-plugins',
  'reference/library-modules',
  'reference/web-dashboard',
  'security/admission',
  'security/audit-logging',
  'security/audit-tamper-evidence',
  'security/authentication',
  'security/build-signing',
  'security/egress-control',
  'security/guardrails',
  'security/overview',
  'security/platform-policy',
  'security/secret-management',
  'security/tenancy',
  'security/trust-model',
  'security/workflow-correlation',
  'skills/contributing-a-skill',
  'skills/embedded-skills',
  'skills/skills-cli',
  'skills/writing-custom-skills',
];

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(`🔧 Syncing docs from ${REPO_OWNER}/${REPO_NAME} (ref: ${DOCS_REF})...`);

  // Ensure output directories exist
  fs.mkdirSync(DOCS_CONTENT_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(MANIFEST_FILE), { recursive: true });

  // 1. Fetch the git tree to list all doc files
  let tree: GitTreeEntry[];
  try {
    const refData = await fetchJSON(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/ref/heads/${DOCS_REF}`
    ) as { object: { sha: string } };
    const commitSha = refData.object.sha;

    const treeData = await fetchJSON(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/trees/${commitSha}?recursive=1`
    ) as GitTreeResponse;

    tree = treeData.tree.filter(
      (entry) => entry.type === 'blob' && entry.path.startsWith(`${DOCS_PATH}/`) && entry.path.endsWith('.md')
    );

    if (treeData.truncated) {
      console.warn('⚠ Git tree response was truncated — some files may be missing');
    }
  } catch (err) {
    console.error(`✗ Could not fetch git tree: ${err}`);
    writeEmptyManifest();
    return;
  }

  console.log(`  Found ${tree.length} markdown files in ${DOCS_PATH}/`);

  // 2. Clean up previously synced files that no longer exist upstream
  cleanupStaleSyncedFiles(tree);

  // 3. Download and process each file
  const entries: DocEntry[] = [];
  const sectionCounts: Record<string, number> = {};

  for (const entry of tree) {
    const sourcePath = entry.path; // e.g. "docs/getting-started/installation.md"
    const relativePath = sourcePath.slice(`${DOCS_PATH}/`.length); // e.g. "getting-started/installation.md"

    // Skip README.md and other non-doc files
    if (relativePath === 'README.md' || relativePath.startsWith('.')) {
      continue;
    }

    console.log(`  ⬇ ${relativePath}`);

    let raw: string;
    try {
      raw = await fetchText(
        `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${DOCS_REF}/${sourcePath}`
      );
    } catch (err) {
      console.warn(`  ⚠ Could not fetch ${sourcePath}: ${err}`);
      continue;
    }

    // 4. Parse frontmatter
    const { data: frontmatter, content: body } = matter(raw);

    if (!frontmatter.title) {
      console.warn(`  ⚠ Missing 'title' in frontmatter: ${relativePath}`);
      continue;
    }
    if (!frontmatter.description) {
      console.warn(`  ⚠ Missing 'description' in frontmatter: ${relativePath}`);
    }

    // 5. Determine section and slug
    const parts = relativePath.replace(/\.md$/, '').split('/');
    const slug = parts[parts.length - 1];
    const section = parts.length > 1 ? parts.slice(0, -1).join('/') : '';

    // 6. Rewrite links
    let processedBody = body.trim();
    processedBody = rewriteLinks(processedBody, sourcePath);
    processedBody = rewriteImages(processedBody, sourcePath);
    processedBody = rewriteSourceLinks(processedBody, sourcePath);

    // 7. Generate editUrl
    const editUrl = `https://github.com/${REPO_OWNER}/${REPO_NAME}/edit/${DOCS_REF}/${sourcePath}`;

    // 8. Build Astro frontmatter
    const astroFm: Record<string, unknown> = {
      title: frontmatter.title,
      description: frontmatter.description || '',
    };
    if (frontmatter.order !== undefined) {
      astroFm.order = frontmatter.order;
    }
    astroFm.editUrl = editUrl;

    // 9. Write output file
    const outputRelPath = relativePath;
    const outputAbsPath = path.join(DOCS_CONTENT_DIR, outputRelPath);
    fs.mkdirSync(path.dirname(outputAbsPath), { recursive: true });

    const outputContent = [
      '---',
      `title: "${String(astroFm.title).replace(/"/g, '\\"')}"`,
      `description: "${String(astroFm.description).replace(/"/g, '\\"')}"`,
      ...(astroFm.order !== undefined ? [`order: ${astroFm.order}`] : []),
      `editUrl: "${astroFm.editUrl}"`,
      '---',
      '',
      SYNC_MARKER,
      '',
      processedBody,
      '',
    ].join('\n');

    fs.writeFileSync(outputAbsPath, outputContent, 'utf-8');

    // Track entry
    const docEntry: DocEntry = {
      sourcePath,
      outputPath: outputRelPath,
      section: section || 'root',
      slug,
      title: String(frontmatter.title),
      description: String(frontmatter.description || ''),
      order: frontmatter.order as number | undefined,
      editUrl,
    };
    entries.push(docEntry);
    sectionCounts[docEntry.section] = (sectionCounts[docEntry.section] || 0) + 1;

    console.log(`  ✓ ${outputRelPath}`);
  }

  // 10. Write manifest
  const manifest: DocsManifest = {
    syncedAt: new Date().toISOString(),
    ref: DOCS_REF,
    totalDocs: entries.length,
    sections: sectionCounts,
    entries,
  };

  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`\n✓ Wrote ${entries.length} docs and manifest to ${MANIFEST_FILE}`);

  // 11. Validate completeness
  validateCompleteness(entries);
}

/**
 * Remove previously synced files that no longer exist in the upstream tree.
 */
function cleanupStaleSyncedFiles(tree: GitTreeEntry[]): void {
  const upstreamPaths = new Set(
    tree.map((e) => e.path.slice(`${DOCS_PATH}/`.length))
  );

  const docsDir = DOCS_CONTENT_DIR;
  if (!fs.existsSync(docsDir)) return;

  const walkDir = (dir: string): string[] => {
    const files: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...walkDir(fullPath));
      } else if (entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
    return files;
  };

  for (const filePath of walkDir(docsDir)) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      if (content.includes(SYNC_MARKER)) {
        const relativePath = path.relative(docsDir, filePath);
        if (!upstreamPaths.has(relativePath)) {
          fs.unlinkSync(filePath);
          console.log(`  🗑 Removed stale synced file: ${relativePath}`);
        }
      }
    } catch {
      // Skip files we can't read
    }
  }
}

/**
 * Warn about expected pages that are missing from the sync.
 */
function validateCompleteness(entries: DocEntry[]): void {
  const synced = new Set(entries.map((e) => e.outputPath.replace(/\.md$/, '')));
  const missing = EXPECTED_PAGES.filter((page) => !synced.has(page));

  if (missing.length > 0) {
    console.warn('\n⚠ Missing expected pages:');
    for (const page of missing) {
      console.warn(`  - ${page}`);
    }
  }
}

function writeEmptyManifest(): void {
  const manifest: DocsManifest = {
    syncedAt: new Date().toISOString(),
    ref: DOCS_REF,
    totalDocs: 0,
    sections: {},
    entries: [],
  };
  fs.mkdirSync(path.dirname(MANIFEST_FILE), { recursive: true });
  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2), 'utf-8');
}

main().catch((err) => {
  console.error('✗ sync-docs failed:', err);
  writeEmptyManifest();
});
