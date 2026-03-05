import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const FORGE_API_URL = process.env.FORGE_API_URL || 'https://go.useforge.ai';
const FORGE_ADMIN_TOKEN = process.env.FORGE_ADMIN_TOKEN;

if (!FORGE_ADMIN_TOKEN) {
  console.warn('FORGE_ADMIN_TOKEN not set — skipping link registration');
  process.exit(0);
}

const API = `${FORGE_API_URL}/api/admin/links`;

interface LinkPayload {
  slug: string;
  destination: string;
  campaign?: string;
}

async function registerLink(payload: LinkPayload) {
  const res = await fetch(API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${FORGE_ADMIN_TOKEN}`,
    },
    body: JSON.stringify(payload),
  });

  if (res.status === 409) {
    console.log(`  ✓ ${payload.slug} — already exists`);
    return;
  }

  if (!res.ok) {
    const text = await res.text();
    console.error(`  ✗ ${payload.slug} — ${res.status}: ${text}`);
    return;
  }

  console.log(`  + ${payload.slug} — registered`);
}

async function main() {
  console.log('Registering tracked links with Forge…\n');

  // Static pages
  const staticLinks: LinkPayload[] = [
    { slug: 'docs', destination: 'https://useforge.ai/docs' },
    { slug: 'hub', destination: 'https://useforge.ai/hub' },
    { slug: 'github', destination: 'https://github.com/initializ/forge' },
  ];

  console.log('Static pages:');
  for (const link of staticLinks) {
    await registerLink(link);
  }

  // Blog posts
  const blogDir = path.join(import.meta.dirname, '..', 'src', 'content', 'blog');
  const files = fs.readdirSync(blogDir).filter((f) => f.endsWith('.md'));

  console.log('\nBlog posts:');
  for (const file of files) {
    const raw = fs.readFileSync(path.join(blogDir, file), 'utf-8');
    const { data } = matter(raw);

    if (data.draft) {
      console.log(`  — ${file} — draft, skipping`);
      continue;
    }

    const id = file.replace(/\.md$/, '');
    await registerLink({
      slug: `blog-${id}`,
      destination: `https://useforge.ai/blog/${id}`,
      campaign: 'blog',
    });
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error('Failed to register links:', err);
  process.exit(1);
});
