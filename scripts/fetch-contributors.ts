import fs from 'node:fs';
import path from 'node:path';

const REPO_OWNER = 'initializ';
const REPO_NAME = 'forge';
const OUTPUT_FILE = path.resolve('src/data/contributors.json');

const headers: Record<string, string> = {};
if (process.env.GITHUB_TOKEN) {
  headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
}

interface GitHubContributor {
  login: string;
  avatar_url: string;
  html_url: string;
  contributions: number;
}

interface ContributorData {
  starCount: number;
  contributors: GitHubContributor[];
  fetchedAt: string;
}

async function fetchJSON(url: string): Promise<unknown> {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

async function getStarCount(): Promise<number> {
  try {
    const repo = (await fetchJSON(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`
    )) as { stargazers_count: number };
    return repo.stargazers_count;
  } catch {
    console.warn('⚠ Could not fetch star count');
    return 0;
  }
}

async function getContributors(): Promise<GitHubContributor[]> {
  try {
    const data = (await fetchJSON(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contributors?per_page=100`
    )) as GitHubContributor[];
    return data.map((c) => ({
      login: c.login,
      avatar_url: c.avatar_url,
      html_url: c.html_url,
      contributions: c.contributions,
    }));
  } catch {
    console.warn('⚠ Could not fetch contributors');
    return [];
  }
}

async function main(): Promise<void> {
  console.log('🔧 Fetching contributors from GitHub...');

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });

  const [starCount, contributors] = await Promise.all([
    getStarCount(),
    getContributors(),
  ]);

  const data: ContributorData = {
    starCount,
    contributors,
    fetchedAt: new Date().toISOString(),
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`✓ Wrote ${contributors.length} contributors (${starCount} stars) to ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error('✗ fetch-contributors failed:', err);
  // Write fallback so build doesn't break
  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify({ starCount: 0, contributors: [], fetchedAt: new Date().toISOString() }, null, 2),
    'utf-8'
  );
});
