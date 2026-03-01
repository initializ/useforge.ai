# useforge.ai

The official website, documentation, and content hub for [Forge](https://github.com/initializ/forge) — the open-source CLI that turns a `SKILL.md` into a portable, secure, runnable AI agent.

**Live site:** [https://useforge.ai](https://useforge.ai)

## Tech Stack

- **[Astro 5](https://astro.build)** — static site generator with content collections
- **[Tailwind CSS v4](https://tailwindcss.com)** — utility-first styling via `@tailwindcss/vite`
- **[React 19](https://react.dev)** — interactive islands (skill browser, search)
- **[Pagefind](https://pagefind.app)** — client-side full-text search across all docs
- **[Satori](https://github.com/vercel/satori) + [sharp](https://sharp.pixelplumbing.com)** — build-time OG image generation
- **TypeScript** — strict mode throughout

## Project Structure

```
useforge.ai/
├── public/
│   ├── fonts/                  # Self-hosted DM Sans + JetBrains Mono (woff2)
│   ├── logos/                  # Forge SVG brand assets (icon, monogram, full)
│   ├── og/                     # Generated OG images (build-time)
│   ├── favicon.svg
│   ├── robots.txt
│   └── llms.txt
├── scripts/
│   ├── fetch-skills.ts         # Pulls skills from GitHub → content + JSON
│   ├── fetch-contributors.ts   # Pulls contributors + star count from GitHub
│   ├── fetch-releases.ts       # Pulls releases from GitHub
│   ├── fetch-trust-data.ts     # Pulls trust/security data from GitHub
│   └── generate-og.ts          # Generates OG images for all pages
├── src/
│   ├── components/
│   │   ├── docs/               # DocsSidebar, SearchModal, TOC, Breadcrumbs, PrevNext, CopyCode
│   │   ├── Hero.astro          # Homepage hero with terminal demo
│   │   ├── Nav.astro           # Sticky nav with theme toggle + mobile menu
│   │   ├── Footer.astro        # Site footer
│   │   ├── SEO.astro           # OG/Twitter/JSON-LD meta
│   │   ├── StackVisual.astro   # Architecture diagram
│   │   ├── FeatureGrid.astro   # Atomic/Secure/Portable feature cards
│   │   ├── SkillExample.astro  # SKILL.md split-view demo
│   │   ├── SkillBrowser.tsx    # React island — search + filter skill cards
│   │   ├── SecurityStack.astro # Trust & security visual
│   │   ├── TrustCallout.astro  # Enterprise trust card
│   │   └── ContributorGrid.astro
│   ├── content/
│   │   ├── docs/               # 27 documentation pages (7 sections)
│   │   ├── blog/               # 3 blog posts
│   │   ├── comparisons/        # 4 comparison pages (vs CrewAI, LangChain, etc.)
│   │   ├── changelog/          # Release changelogs (fetched from GitHub)
│   │   └── skills/             # Skill content (fetched from GitHub)
│   ├── data/
│   │   ├── navigation.ts       # Docs sidebar nav tree (27 pages, 7 sections)
│   │   ├── skills.json         # Fetched skill metadata
│   │   ├── contributors.json   # Fetched contributor data
│   │   ├── releases.json       # Fetched release data
│   │   └── trust-data.json     # Fetched trust/security data
│   ├── layouts/
│   │   ├── Base.astro          # Root layout (fonts, theme init, global CSS)
│   │   └── Docs.astro          # Three-column docs layout (sidebar/content/TOC)
│   ├── pages/
│   │   ├── index.astro         # Homepage
│   │   ├── docs/               # Documentation (dynamic routes from content)
│   │   ├── hub/                # Skill Hub (landing + individual skill pages)
│   │   ├── blog/               # Blog (index + individual posts)
│   │   ├── compare/            # Comparison pages
│   │   ├── changelog/          # Changelog + RSS feed
│   │   ├── trust/              # Trust & Security reference
│   │   ├── about.astro         # About page
│   │   └── 404.astro           # 404 page
│   ├── styles/
│   │   ├── global.css          # Tailwind v4 theme tokens, @font-face, scrollbar
│   │   └── prose.css           # Markdown prose styling
│   └── content.config.ts       # Astro content collection schemas
├── astro.config.mjs
├── tsconfig.json
└── package.json
```

## Pages

| Route | Description |
|---|---|
| `/` | Homepage — hero, stack visual, features, skill example, trust callout, contributors |
| `/docs/*` | Documentation — 27 pages across 7 sections with sidebar, search, TOC |
| `/hub` | Skill Hub — interactive browser with search and trust-level filters |
| `/hub/skills/*` | Individual skill detail pages with trust badges and install commands |
| `/blog` | Blog — articles on Forge usage, trust model, deployment |
| `/compare/*` | Comparison pages — Forge vs CrewAI, LangChain, Manual, OpenClaw |
| `/changelog` | Release changelog with RSS feed |
| `/trust` | Trust & Security — 14-section security reference with SecurityStack visual |
| `/about` | About page |

## Documentation Sections (27 pages)

| Section | Pages |
|---|---|
| **Getting Started** | Installation, Quick Start, Your First Skill, Configuration |
| **Core Concepts** | How Forge Works, SKILL.md Format, Tools & Builtins, Channels, Memory System |
| **Security** | Egress Control, Trust Model, Secret Management, Build Signing, Audit Logging |
| **Skills** | Embedded Skills, Writing Custom Skills, Skills CLI, Contributing a Skill |
| **Deployment** | Docker, Kubernetes, Production Checklist, Monitoring & Observability |
| **Reference** | CLI Reference, forge.yaml Schema, Environment Variables, Agent Skills Compatibility |
| **FAQ** | 12 Q&A covering providers, security, deployment, contributing |

## Development

### Prerequisites

- Node.js 20+
- npm

### Setup

```bash
git clone https://github.com/initializ/useforge.ai.git
cd useforge.ai
npm install
```

### Commands

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Fetch data + generate OG images + build site + index with Pagefind |
| `npm run preview` | Preview the built site locally |
| `npm run fetch` | Fetch all external data (skills, contributors, releases, trust) |
| `npm run generate:og` | Generate OG images for all pages |
| `npm run check` | Run Astro type checking |

### Build Pipeline

The full `npm run build` runs these steps in order:

1. **Fetch** — pull skills, contributors, releases, and trust data from the GitHub API (graceful fallbacks if API unavailable)
2. **Generate OG** — create PNG open graph images for all pages using Satori + sharp
3. **Astro Build** — compile all pages to static HTML in `dist/`
4. **Pagefind** — index the built site for client-side full-text search

### Content Collections

All content is managed via [Astro Content Collections](https://docs.astro.build/en/guides/content-collections/):

- **`docs`** — Markdown files in `src/content/docs/`. Frontmatter: `title`, `description`, `order`, `editUrl`, `draft`.
- **`blog`** — Markdown files in `src/content/blog/`. Frontmatter: `title`, `description`, `pubDate`, `author`, `tags`.
- **`comparisons`** — Markdown files in `src/content/comparisons/`. Frontmatter: `title`, `description`, `competitor`.
- **`changelog`** — Fetched release data in `src/content/changelog/`.
- **`skills`** — Fetched skill data in `src/content/skills/`.

### Adding a Doc Page

1. Create a `.md` file in the appropriate `src/content/docs/<section>/` directory
2. Add frontmatter with `title`, `description`, and `order`
3. Add the page to `src/data/navigation.ts` if not already listed
4. Run `npm run build` to verify

## Deployment

The site deploys to **Cloudflare Pages** via GitHub Actions (`.github/workflows/deploy.yml`).

**Triggers:**
- Push to `main`
- `forge-release` repository dispatch (auto-rebuilds when Forge releases)
- Daily cron at 06:00 UTC (keeps fetched data fresh)

**Required secrets:**
- `GITHUB_TOKEN` — for fetching data from GitHub API
- `CLOUDFLARE_API_TOKEN` — for Cloudflare Pages deployment
- `CLOUDFLARE_ACCOUNT_ID` — Cloudflare account identifier

## License

MIT
