import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const REPO_OWNER = 'initializ';
const REPO_NAME = 'forge';
const SKILLS_PATH = 'forge-skills/local/embedded';
const FALLBACK_SKILLS = ['summarize', 'github', 'weather', 'tavily-search', 'tavily-research'];

const SKILLS_CONTENT_DIR = path.resolve('src/content/skills');
const SKILLS_DATA_FILE = path.resolve('src/data/skills.json');

const headers: Record<string, string> = {};
if (process.env.GITHUB_TOKEN) {
  headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
}

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

interface SkillFrontmatter {
  name: string;
  description: string;
  trustLevel: string;
  bins: string[];
  envRequired: string[];
  envOneOf: string[];
  egressDomains: string[];
  publisher: string;
}

interface SkillMeta {
  slug: string;
  name: string;
  description: string;
  trustLevel: string;
  bins: string[];
  envRequired: string[];
  envOneOf: string[];
  egressDomains: string[];
  publisher: string;
}

async function getSkillDirs(): Promise<string[]> {
  try {
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${SKILLS_PATH}`;
    const data = (await fetchJSON(url)) as Array<{ name: string; type: string }>;
    return data.filter((item) => item.type === 'dir').map((item) => item.name);
  } catch (err) {
    console.warn(`⚠ Could not list skills from GitHub API, using fallback list: ${err}`);
    return FALLBACK_SKILLS;
  }
}

async function fetchSkillMd(skillName: string): Promise<string | null> {
  const url = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/${SKILLS_PATH}/${skillName}/SKILL.md`;
  try {
    return await fetchText(url);
  } catch {
    console.warn(`⚠ Could not fetch SKILL.md for "${skillName}", skipping`);
    return null;
  }
}

function toArray(val: unknown): string[] {
  return Array.isArray(val) ? val.map(String) : [];
}

function parseSkill(raw: string, skillName: string): { frontmatter: SkillFrontmatter; body: string } {
  const { data, content } = matter(raw);

  // The upstream SKILL.md nests requirements under metadata.forge
  const forge = data.metadata?.forge ?? {};
  const requires = forge.requires ?? {};
  const env = requires.env ?? {};

  const frontmatter: SkillFrontmatter = {
    name: String(data.name || skillName),
    description: String(data.description || `The ${skillName} skill for Forge.`),
    trustLevel: 'trusted',
    bins: toArray(requires.bins ?? data.bins),
    envRequired: toArray(env.required ?? data.env_required),
    envOneOf: toArray(env.one_of ?? data.env_one_of),
    egressDomains: toArray(forge.egress_domains ?? data.egress_domains),
    publisher: String(data.publisher || 'forge'),
  };

  return { frontmatter, body: content.trim() };
}

function writeSkillMarkdown(skillName: string, frontmatter: SkillFrontmatter, body: string): void {
  const filePath = path.join(SKILLS_CONTENT_DIR, `${skillName}.md`);
  const fm = [
    '---',
    `name: "${frontmatter.name}"`,
    `description: "${frontmatter.description.replace(/"/g, '\\"')}"`,
    `trustLevel: "${frontmatter.trustLevel}"`,
    `bins: ${JSON.stringify(frontmatter.bins)}`,
    `envRequired: ${JSON.stringify(frontmatter.envRequired)}`,
    `envOneOf: ${JSON.stringify(frontmatter.envOneOf)}`,
    `egressDomains: ${JSON.stringify(frontmatter.egressDomains)}`,
    `publisher: "${frontmatter.publisher}"`,
    '---',
    '',
  ].join('\n');

  fs.writeFileSync(filePath, fm + body + '\n', 'utf-8');
}

async function main(): Promise<void> {
  console.log('🔧 Fetching skills from GitHub...');

  // Ensure output directories exist
  fs.mkdirSync(SKILLS_CONTENT_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(SKILLS_DATA_FILE), { recursive: true });

  const skillDirs = await getSkillDirs();
  console.log(`  Found ${skillDirs.length} skills: ${skillDirs.join(', ')}`);

  const skillsMeta: SkillMeta[] = [];

  for (const skillName of skillDirs) {
    const raw = await fetchSkillMd(skillName);
    if (!raw) continue;

    const { frontmatter, body } = parseSkill(raw, skillName);
    writeSkillMarkdown(skillName, frontmatter, body);

    skillsMeta.push({
      slug: skillName,
      name: frontmatter.name,
      description: frontmatter.description,
      trustLevel: frontmatter.trustLevel,
      bins: frontmatter.bins,
      envRequired: frontmatter.envRequired,
      envOneOf: frontmatter.envOneOf,
      egressDomains: frontmatter.egressDomains,
      publisher: frontmatter.publisher,
    });

    console.log(`  ✓ ${skillName}`);
  }

  // Write summary JSON for SkillBrowser
  fs.writeFileSync(SKILLS_DATA_FILE, JSON.stringify(skillsMeta, null, 2), 'utf-8');
  console.log(`\n✓ Wrote ${skillsMeta.length} skills to content and ${SKILLS_DATA_FILE}`);
}

main().catch((err) => {
  console.error('✗ fetch-skills failed:', err);
  // Write empty data so build doesn't break
  fs.mkdirSync(path.dirname(SKILLS_DATA_FILE), { recursive: true });
  fs.writeFileSync(SKILLS_DATA_FILE, '[]', 'utf-8');
});
