import type { APIRoute } from 'astro';
import { buildCountryIndex } from '@lib/countryIndex';

/** Per-country profile: every indicator's latest value + rank (see lib/countryIndex). */
export const GET: APIRoute = () => {
  return new Response(JSON.stringify(buildCountryIndex()), { headers: { 'Content-Type': 'application/json' } });
};
