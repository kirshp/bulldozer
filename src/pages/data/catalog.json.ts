import type { APIRoute } from 'astro';
import { datasets } from '@data/datasets';

/**
 * Live dataset catalog for the mobile app — same shape as the app's baked
 * lib/catalog.dart (slug/title/unit/kind/topic/source). Lets the app pick up
 * new datasets without a rebuild. Excludes single-country RLMS microdata,
 * which the app does not surface (mirrors tools/gen_catalog.mjs).
 */
export const GET: APIRoute = () => {
  const catalog = datasets
    .filter((d) => !d.slug.startsWith('rlms-'))
    .map((d) => ({
      slug: d.slug,
      title: d.title,
      unit: d.unit ?? '',
      kind: d.kind,
      topic: d.topic,
      source: d.source ?? '',
    }));
  return new Response(JSON.stringify(catalog), {
    headers: { 'Content-Type': 'application/json' },
  });
};
