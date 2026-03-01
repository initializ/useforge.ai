import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { html } from 'satori-html';
import matter from 'gray-matter';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT_DIR = path.join(ROOT, 'public', 'og');
const FONT_CACHE_DIR = path.join(ROOT, 'node_modules', '.cache', 'og-fonts');

// ── HTTP helpers ───────────────────────────────────────────────────────

function httpsGet(url: string, headers?: Record<string, string>): Promise<{ statusCode: number; headers: Record<string, string | string[] | undefined>; body: Buffer }> {
  return new Promise((resolve, reject) => {
    const opts = new URL(url);
    const reqOpts = {
      hostname: opts.hostname,
      path: opts.pathname + opts.search,
      headers: headers || {},
    };
    https.get(reqOpts, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () =>
        resolve({
          statusCode: res.statusCode || 0,
          headers: res.headers as Record<string, string | string[] | undefined>,
          body: Buffer.concat(chunks),
        })
      );
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function fetchWithRedirects(url: string, headers?: Record<string, string>, maxRedirects = 5): Promise<Buffer> {
  let currentUrl = url;
  for (let i = 0; i < maxRedirects; i++) {
    const res = await httpsGet(currentUrl, headers);
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      currentUrl = res.headers.location as string;
      continue;
    }
    return res.body;
  }
  throw new Error(`Too many redirects for ${url}`);
}

// ── Fonts ──────────────────────────────────────────────────────────────
// Satori requires TTF/OTF. We fetch from Google Fonts CSS API using a
// user-agent that serves TTF, then cache in node_modules/.cache.

async function fetchGoogleFontTTF(family: string, weight: number): Promise<Buffer> {
  fs.mkdirSync(FONT_CACHE_DIR, { recursive: true });
  const cacheFile = path.join(FONT_CACHE_DIR, `${family.replace(/\s/g, '-')}-${weight}.ttf`);

  if (fs.existsSync(cacheFile)) {
    return fs.readFileSync(cacheFile);
  }

  console.log(`  Fetching ${family} (${weight}) from Google Fonts...`);

  // Use a Safari 5 user-agent to get TTF from Google Fonts (not woff2 or eot)
  const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}`;
  const cssRes = await httpsGet(cssUrl, {
    'User-Agent': 'Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; en-us) AppleWebKit/534.50 (KHTML, like Gecko) Version/5.1 Safari/534.50',
  });
  const css = cssRes.body.toString('utf-8');

  // Extract font URL from CSS — prefer .ttf, fall back to any url()
  const urlMatch = css.match(/src:\s*url\(([^)]+)\)\s*format\(['"]truetype['"]\)/);
  const anyUrlMatch = css.match(/url\(([^)]+)\)/);
  const fontUrl = urlMatch?.[1] || anyUrlMatch?.[1];
  if (!fontUrl) {
    throw new Error(`Could not extract font URL from Google Fonts CSS for ${family} ${weight}. CSS: ${css.slice(0, 500)}`);
  }

  const buf = await fetchWithRedirects(fontUrl);
  fs.writeFileSync(cacheFile, buf);
  return buf;
}

// ── Monogram: pre-render SVG → PNG → data URI ─────────────────────────
const monogramSvg = fs.readFileSync(path.join(ROOT, 'public/logos/forge-monogram.svg'), 'utf-8');
const monogramResvg = new Resvg(monogramSvg, {
  fitTo: { mode: 'width', value: 128 },
});
const monogramPng = monogramResvg.render().asPng();
const monogramDataUri = `data:image/png;base64,${Buffer.from(monogramPng).toString('base64')}`;

// ── Page manifest ──────────────────────────────────────────────────────
interface PageEntry {
  slug: string;
  title: string;
  section: string;
}

function readFrontmatter(filePath: string): Record<string, unknown> {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return matter(raw).data;
}

function buildManifest(): PageEntry[] {
  const pages: PageEntry[] = [];

  // Static pages
  pages.push(
    { slug: 'index', title: 'Forge — Secure AI Agent Runtime', section: 'Home' },
    { slug: 'docs', title: 'Documentation', section: 'Documentation' },
    { slug: 'hub', title: 'Skill Hub', section: 'Skill Hub' },
    { slug: 'blog', title: 'Blog', section: 'Blog' },
    { slug: 'changelog', title: 'Changelog', section: 'Changelog' },
    { slug: 'compare', title: 'Compare', section: 'Compare' },
    { slug: 'trust', title: 'Trust & Security', section: 'Trust' },
    { slug: 'about', title: 'About Forge', section: 'About' },
  );

  // Docs (recursive walk)
  const docsDir = path.join(ROOT, 'src/content/docs');
  if (fs.existsSync(docsDir)) {
    const walkDir = (dir: string, prefix: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          walkDir(path.join(dir, entry.name), `${prefix}${entry.name}/`);
        } else if (entry.name.endsWith('.md') || entry.name.endsWith('.mdx')) {
          const fm = readFrontmatter(path.join(dir, entry.name));
          const basename = entry.name.replace(/\.mdx?$/, '');
          pages.push({
            slug: `docs/${prefix}${basename}`,
            title: (fm.title as string) || basename,
            section: 'Documentation',
          });
        }
      }
    };
    walkDir(docsDir, '');
  }

  // Blog
  const blogDir = path.join(ROOT, 'src/content/blog');
  if (fs.existsSync(blogDir)) {
    for (const file of fs.readdirSync(blogDir).filter((f) => /\.mdx?$/.test(f))) {
      const fm = readFrontmatter(path.join(blogDir, file));
      pages.push({
        slug: `blog/${file.replace(/\.mdx?$/, '')}`,
        title: (fm.title as string) || file,
        section: 'Blog',
      });
    }
  }

  // Comparisons
  const compDir = path.join(ROOT, 'src/content/comparisons');
  if (fs.existsSync(compDir)) {
    for (const file of fs.readdirSync(compDir).filter((f) => /\.mdx?$/.test(f))) {
      const fm = readFrontmatter(path.join(compDir, file));
      pages.push({
        slug: `compare/${file.replace(/\.mdx?$/, '')}`,
        title: (fm.title as string) || file,
        section: 'Compare',
      });
    }
  }

  // Skills
  const skillsDir = path.join(ROOT, 'src/content/skills');
  if (fs.existsSync(skillsDir)) {
    for (const file of fs.readdirSync(skillsDir).filter((f) => /\.mdx?$/.test(f))) {
      const fm = readFrontmatter(path.join(skillsDir, file));
      pages.push({
        slug: `hub/skills/${file.replace(/\.mdx?$/, '')}`,
        title: (fm.name as string) || file,
        section: 'Skill Hub',
      });
    }
  }

  return pages;
}

// ── Render OG image ────────────────────────────────────────────────────
async function renderOgImage(
  entry: PageEntry,
  fonts: { bold: Buffer; regular: Buffer },
): Promise<Buffer> {
  const markup = html`
    <div
      style="display: flex; flex-direction: column; width: 1200px; height: 630px; background-color: #0B0F1A; position: relative;"
    >
      <img
        src="${monogramDataUri}"
        style="position: absolute; top: 48px; left: 48px; width: 64px; height: 64px;"
      />

      <div
        style="display: flex; flex-direction: column; justify-content: center; padding: 0 80px; margin-top: 140px; flex: 1;"
      >
        <div
          style="font-size: 20px; color: #9CA3AF; font-family: 'DM Sans'; font-weight: 400; margin-bottom: 16px;"
        >
          ${entry.section}
        </div>
        <div
          style="font-size: 44px; color: #FFFFFF; font-family: 'DM Sans'; font-weight: 700; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; max-height: 110px;"
        >
          ${entry.title}
        </div>
      </div>

      <div
        style="display: flex; width: 1200px; height: 4px; position: absolute; bottom: 16px; left: 0; background: linear-gradient(to right, #F97316, #FF8C42);"
      ></div>

      <div
        style="position: absolute; bottom: 32px; right: 48px; font-size: 16px; color: #6B7280; font-family: 'DM Sans'; font-weight: 400;"
      >
        useforge.ai
      </div>
    </div>
  `;

  const svg = await satori(markup, {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'DM Sans', data: fonts.bold, weight: 700, style: 'normal' },
      { name: 'DM Sans', data: fonts.regular, weight: 400, style: 'normal' },
    ],
  });

  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } });
  return Buffer.from(resvg.render().asPng());
}

// ── Main ───────────────────────────────────────────────────────────────
async function main() {
  // Load fonts
  const [bold, regular] = await Promise.all([
    fetchGoogleFontTTF('DM Sans', 700),
    fetchGoogleFontTTF('DM Sans', 400),
  ]);
  const fonts = { bold, regular };

  const manifest = buildManifest();
  console.log(`Generating ${manifest.length} OG images...`);

  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const entry of manifest) {
    const outPath = path.join(OUT_DIR, `${entry.slug}.png`);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });

    const png = await renderOgImage(entry, fonts);
    fs.writeFileSync(outPath, png);
    console.log(`  ✓ ${entry.slug}.png`);
  }

  console.log(`Done — ${manifest.length} OG images written to public/og/`);
}

main().catch((err) => {
  console.error('OG generation failed:', err);
  process.exit(1);
});
