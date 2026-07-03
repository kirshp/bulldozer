import type { APIRoute } from 'astro';
import { buildQuizPool } from '@lib/quizPool';

/** Country-quiz pool: pre-formatted fact strings per country (see lib/quizPool). */
export const GET: APIRoute = () => {
  return new Response(JSON.stringify(buildQuizPool()), { headers: { 'Content-Type': 'application/json' } });
};
