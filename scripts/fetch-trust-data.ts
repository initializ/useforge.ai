import fs from 'node:fs';
import path from 'node:path';

const REPO_OWNER = 'initializ';
const REPO_NAME = 'forge';
const OUTPUT_FILE = path.resolve('src/data/trust-data.json');
const RELEASES_FILE = path.resolve('src/data/releases.json');

const headers: Record<string, string> = {
  Accept: 'application/vnd.github+json',
};
if (process.env.GITHUB_TOKEN) {
  headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
}

interface TrustData {
  ciStatus: string;
  ciUrl: string;
  latestVersion: string;
  latestDate: string;
  securityAdvisories: number;
  license: string;
  fetchedAt: string;
}

async function fetchJSON(url: string): Promise<unknown> {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

async function getCIStatus(): Promise<{ status: string; url: string }> {
  try {
    const data = (await fetchJSON(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/runs?per_page=1&status=completed`
    )) as { workflow_runs: Array<{ conclusion: string; html_url: string }> };

    if (data.workflow_runs?.length > 0) {
      return {
        status: data.workflow_runs[0].conclusion || 'unknown',
        url: data.workflow_runs[0].html_url,
      };
    }
  } catch {
    console.warn('  Could not fetch CI status');
  }
  return {
    status: 'unknown',
    url: `https://github.com/${REPO_OWNER}/${REPO_NAME}/actions`,
  };
}

async function getSecurityAdvisories(): Promise<number> {
  try {
    const data = (await fetchJSON(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/security-advisories?state=published`
    )) as unknown[];
    return Array.isArray(data) ? data.length : 0;
  } catch {
    console.warn('  Could not fetch security advisories (defaulting to 0)');
    return 0;
  }
}

function getLatestRelease(): { version: string; date: string } {
  try {
    const raw = fs.readFileSync(RELEASES_FILE, 'utf-8');
    const releases = JSON.parse(raw) as Array<{ version: string; date: string }>;
    if (releases.length > 0) {
      return { version: releases[0].version, date: releases[0].date };
    }
  } catch {
    console.warn('  Could not read releases.json');
  }
  return { version: 'v0.0.0', date: '' };
}

async function getLicense(): Promise<string> {
  try {
    const data = (await fetchJSON(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/license`
    )) as { license?: { spdx_id?: string } };
    return data.license?.spdx_id || 'Apache-2.0';
  } catch {
    return 'Apache-2.0';
  }
}

async function main(): Promise<void> {
  console.log('Fetching trust data from GitHub...');

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });

  const [ci, advisories, license] = await Promise.all([
    getCIStatus(),
    getSecurityAdvisories(),
    getLicense(),
  ]);

  const release = getLatestRelease();

  const data: TrustData = {
    ciStatus: ci.status,
    ciUrl: ci.url,
    latestVersion: release.version,
    latestDate: release.date,
    securityAdvisories: advisories,
    license,
    fetchedAt: new Date().toISOString(),
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`  Wrote trust data to ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error('fetch-trust-data failed:', err);
  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify(
      {
        ciStatus: 'unknown',
        ciUrl: `https://github.com/${REPO_OWNER}/${REPO_NAME}/actions`,
        latestVersion: 'v0.0.0',
        latestDate: '',
        securityAdvisories: 0,
        license: 'Apache-2.0',
        fetchedAt: new Date().toISOString(),
      },
      null,
      2
    ),
    'utf-8'
  );
});
