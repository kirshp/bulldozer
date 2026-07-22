import type { APIRoute } from 'astro';
import brands from '@data/brands.json';

/** Brand logos + rankings for the app's Biz section (mirrors /logos). */
export const GET: APIRoute = () =>
  new Response(JSON.stringify(brands), {
    headers: { 'Content-Type': 'application/json' },
  });
