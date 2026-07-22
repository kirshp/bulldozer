import type { APIRoute } from 'astro';
import cities from '@data/cities.json';

/** City-level data for the mobile app (mirrors the site's /cities). */
export const GET: APIRoute = () =>
  new Response(JSON.stringify(cities), {
    headers: { 'Content-Type': 'application/json' },
  });
