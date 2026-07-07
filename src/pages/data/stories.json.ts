import type { APIRoute } from 'astro';
import { stories } from '@data/stories';

/** Data-story list for the mobile app's News/Home feed. */
export const GET: APIRoute = () => {
  return new Response(JSON.stringify(stories), {
    headers: { 'Content-Type': 'application/json' },
  });
};
