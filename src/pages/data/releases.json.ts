import type { APIRoute } from 'astro';
import { releases } from '../../data/releases';

/** The data-release calendar, for the mobile app's reminders. */
export const GET: APIRoute = () => {
  return new Response(JSON.stringify(releases), { headers: { 'Content-Type': 'application/json' } });
};
