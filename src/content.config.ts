import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { applyOwnerApproval } from './lib/approvals.js';

const reviewStatus = z.enum(['legacy-source', 'needs-owner-review', 'draft', 'owner-approved']);
const nullableFact = z.object({
  value: z.string().nullable(),
  reviewStatus,
});
const image = z.object({
  src: z.string().startsWith('/').nullable(),
  alt: z.string().min(1).nullable(),
  // Pixel dimensions gate whether a zoom region can stand in for a detail
  // photograph; null until the image has been measured.
  width: z.number().int().positive().nullable().default(null),
  height: z.number().int().positive().nullable().default(null),
  reviewStatus,
});

// A zoom region on the primary image. 'full-image' lets the viewer magnify the
// whole canvas; 'region' pins the magnifier to a chosen rectangle.
const zoomRegion = z.object({
  mode: z.enum(['full-image', 'region']),
  rect: z
    .object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() })
    .nullable()
    .default(null),
  reviewStatus,
});

const artworks = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/artworks' }),
  schema: z.object({
    id: z.string().min(1),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    title: z.string().min(1),
    series: z.string().min(1),
    seriesSlug: z.string().min(1),
    sortOrder: z.number().int().positive(),
    price: z.object({ amount: z.number().positive(), currency: z.literal('EUR'), reviewStatus }),
    availability: z.enum(['available', 'sold', 'not-for-sale']),
    availabilityReviewStatus: reviewStatus,
    medium: z.object({ value: z.string().min(1), reviewStatus }),
    year: z.object({ value: z.number().int().min(1900).max(2100).nullable(), reviewStatus }),
    dimensions: z.object({
      width: z.number().positive().nullable(),
      height: z.number().positive().nullable(),
      depth: z.number().positive().nullable(),
      unit: z.literal('cm'),
      reviewStatus,
    }),
    orientation: z.enum(['portrait', 'landscape', 'square', 'unknown']),
    aspectRatio: z.number().positive().nullable(),
    signaturePlacement: nullableFact,
    condition: nullableFact,
    framingStatus: nullableFact,
    certificateStatus: nullableFact,
    cardDescription: z.object({ value: z.string().min(1), reviewStatus }),
    workNote: z.object({ value: z.string().min(1), reviewStatus }),
    seriesStatementRef: z.object({ value: z.string().min(1), reviewStatus }),
    images: z.object({
      full: image,
      card: image.refine((value) => value.src !== null && value.alt !== null, 'Card image and alt text are required.'),
      details: z.array(image),
      back: image.nullable(),
      signature: image.nullable(),
      roomScale: image.nullable(),
      zoom: zoomRegion.nullable().default(null),
    }),
    featured: z.boolean(),
    relatedSlugs: z.array(z.string()),
    source: z.object({ kind: z.literal('legacy-catalog'), file: z.string().min(1) }),

    // The single decision the artist makes in the studio. It is expanded into
    // the individual review stamps below, and only onto facts that carry a
    // real value — see src/lib/approvals.js.
    ownerApproval: z
      .object({
        readyToSell: z.boolean().default(false),
        approvedAt: z.string().nullable().default(null),
        note: z.string().nullable().default(null),
      })
      .default({ readyToSell: false, approvedAt: null, note: null }),
  }).transform(applyOwnerApproval),
});

export const collections = { artworks };
