import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';

const docs = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/docs' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    order: z.number().optional(),
    editUrl: z.string().optional(),
    draft: z.boolean().optional().default(false),
  }),
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    author: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    image: z.string().optional(),
    imageDark: z.string().optional(),
  }),
});

const skills = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/skills' }),
  schema: z.object({
    name: z.string(),
    description: z.string(),
    trustLevel: z.enum(['trusted', 'under_review', 'untrusted', 'failed']),
    bins: z.array(z.string()).default([]),
    envRequired: z.array(z.string()).default([]),
    envOneOf: z.array(z.string()).default([]),
    egressDomains: z.array(z.string()).default([]),
    publisher: z.string().default('forge'),
  }),
});

const comparisons = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/comparisons' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    competitor: z.string(),
    order: z.number().optional(),
    category: z.enum(['managed-runtime', 'framework', 'personal-vs-enterprise']).optional(),
    seeAlso: z.string().optional(),
  }),
});

const changelog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/changelog' }),
  schema: z.object({
    version: z.string(),
    date: z.coerce.date(),
    breaking: z.boolean().default(false),
    githubUrl: z.string().optional(),
  }),
});

const workshops = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/workshops' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    prerequisites: z.object({
      attendee: z.array(z.string()),
      organizer: z.array(z.string()),
    }),
    whatOrganizerProvides: z.array(z.string()),
    agenda: z.array(
      z.object({
        time: z.string().optional(),
        durationMin: z.number(),
        title: z.string(),
        type: z.enum(['talk', 'hands-on', 'break']),
        goal: z.string(),
        anchor: z.string(),
      })
    ),
    segments: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        durationMin: z.number(),
        type: z.enum(['talk', 'hands-on', 'break']),
        intro: z.string(),
        steps: z
          .array(
            z.object({
              instruction: z.string(),
              command: z.string().optional(),
              expected: z.string().optional(),
            })
          )
          .default([]),
        securityPrimitive: z.string().optional(),
        expectedOutcome: z.string().optional(),
        troubleshooting: z.array(z.string()).default([]),
      })
    ),
    facilitatorKit: z.string(),
    runYourOwn: z.string(),
  }),
});

const events = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/events' }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    playbook: reference('workshops'),
    status: z.enum(['upcoming', 'past', 'template']),
    startDateTime: z.string().datetime({ offset: true }).optional(),
    endDateTime: z.string().datetime({ offset: true }).optional(),
    timezone: z.string().optional(),
    venueName: z.string().optional(),
    addressLocality: z.string().optional(),
    addressRegion: z.string().optional(),
    mode: z.enum(['in-person', 'virtual', 'hybrid']).default('in-person'),
    registrationUrl: z.string().url().optional(),
    ogImage: z.string().default('/og/forge-workshop-og.png'),
    seo: z.object({ description: z.string() }),
  }),
});

export const collections = { docs, blog, changelog, skills, comparisons, workshops, events };
