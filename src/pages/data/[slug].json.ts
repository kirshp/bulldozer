import type { APIRoute } from 'astro';
import { datasets, getDataset } from '@data/datasets';

export function getStaticPaths() {
  return datasets.map((d) => ({ params: { slug: d.slug } }));
}

export const GET: APIRoute = ({ params }) => {
  const ds = getDataset(params.slug!);
  if (!ds) return new Response('Not found', { status: 404 });
  return new Response(JSON.stringify(ds), {
    headers: { 'Content-Type': 'application/json' },
  });
};
