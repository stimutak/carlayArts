import { getCollection } from 'astro:content';

export const prerender = true;

export async function GET() {
  const entries = await getCollection('artworks');
  const inventory = entries.map(({ data }) => ({
    id: data.id,
    slug: data.slug,
    title: data.title,
    series: data.series,
    availability: data.availability,
    availabilityReviewStatus: data.availabilityReviewStatus,
    price: data.price,
    medium: data.medium,
    year: data.year,
    dimensions: data.dimensions,
    signaturePlacement: data.signaturePlacement,
    condition: data.condition,
    framingStatus: data.framingStatus,
    certificateStatus: data.certificateStatus,
    images: { full: data.images.full, details: data.images.details },
    image: data.images.card,
  }));

  return new Response(JSON.stringify(inventory), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
