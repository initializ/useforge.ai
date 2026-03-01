import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';

export async function GET(context: APIContext) {
  const entries = await getCollection('changelog');
  const sorted = entries.sort(
    (a, b) => b.data.date.getTime() - a.data.date.getTime()
  );

  return rss({
    title: 'Forge Changelog',
    description: 'Release history and changelog for Forge — the secure, portable AI Agent runtime.',
    site: context.site!.toString(),
    items: sorted.map((entry) => ({
      title: `Forge v${entry.data.version}`,
      link: entry.data.githubUrl || `/changelog`,
      pubDate: entry.data.date,
      description: entry.body
        ? entry.body.replace(/[#*`\-|>]/g, '').trim().slice(0, 300) + '...'
        : `Forge v${entry.data.version} release`,
    })),
  });
}
