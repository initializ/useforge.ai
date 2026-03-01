import fs from 'node:fs';
import path from 'node:path';

const REPO_OWNER = 'initializ';
const REPO_NAME = 'forge';
const CHANGELOG_DIR = path.resolve('src/content/changelog');
const RELEASES_FILE = path.resolve('src/data/releases.json');

const headers: Record<string, string> = {};
if (process.env.GITHUB_TOKEN) {
  headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
}

interface GitHubRelease {
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  html_url: string;
  draft: boolean;
  prerelease: boolean;
}

interface ReleaseMeta {
  version: string;
  date: string;
  breaking: boolean;
  githubUrl: string;
  title: string;
}

async function fetchJSON(url: string): Promise<unknown> {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

function sanitizeVersion(tag: string): string {
  // Remove leading 'v' and sanitize for filesystem
  return tag.replace(/^v/, '').replace(/[^a-zA-Z0-9.\-]/g, '_');
}

async function main(): Promise<void> {
  console.log('🔧 Fetching releases from GitHub...');

  fs.mkdirSync(CHANGELOG_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(RELEASES_FILE), { recursive: true });

  let releases: GitHubRelease[];
  try {
    releases = (await fetchJSON(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases?per_page=20`
    )) as GitHubRelease[];
  } catch (err) {
    console.warn(`⚠ Could not fetch releases: ${err}`);
    fs.writeFileSync(RELEASES_FILE, '[]', 'utf-8');
    return;
  }

  // Filter out drafts
  releases = releases.filter((r) => !r.draft);

  const releasesMeta: ReleaseMeta[] = [];

  for (const release of releases) {
    const version = sanitizeVersion(release.tag_name);
    const date = release.published_at?.split('T')[0] || new Date().toISOString().split('T')[0];
    const body = release.body || '';
    const breaking = /BREAKING/i.test(body);
    const title = release.name || release.tag_name;

    // Write content collection entry
    const filePath = path.join(CHANGELOG_DIR, `${version}.md`);
    const content = [
      '---',
      `version: "${version}"`,
      `date: ${date}`,
      `breaking: ${breaking}`,
      `githubUrl: "${release.html_url}"`,
      '---',
      '',
      body,
      '',
    ].join('\n');

    fs.writeFileSync(filePath, content, 'utf-8');

    releasesMeta.push({
      version,
      date,
      breaking,
      githubUrl: release.html_url,
      title,
    });

    console.log(`  ✓ ${version}`);
  }

  fs.writeFileSync(RELEASES_FILE, JSON.stringify(releasesMeta, null, 2), 'utf-8');
  console.log(`\n✓ Wrote ${releasesMeta.length} releases to ${RELEASES_FILE}`);
}

main().catch((err) => {
  console.error('✗ fetch-releases failed:', err);
  fs.mkdirSync(path.dirname(RELEASES_FILE), { recursive: true });
  fs.writeFileSync(RELEASES_FILE, '[]', 'utf-8');
});
