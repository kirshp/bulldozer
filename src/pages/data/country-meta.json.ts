import type { APIRoute } from 'astro';
import countryMeta from '@data/country-meta.json';
import countryCurrency from '@data/country-currency.json';
import isoAlpha2 from '@data/iso-alpha2.json';
import { feature } from 'topojson-client';
import { geoNaturalEarth1 } from 'd3-geo';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

/**
 * Per-country metadata for the mobile app's country header: ISO-2 code,
 * capital (name + coords pre-projected into the app map's 1000×500 Natural
 * Earth space, so the client can drop a marker without a d3 dependency),
 * coat-of-arms URL and currency.
 */
const require = createRequire(import.meta.url);
const topo = JSON.parse(readFileSync(require.resolve('world-atlas/countries-110m.json'), 'utf8'));
const fc: any = feature(topo, (topo as any).objects.countries);
const proj = geoNaturalEarth1().fitSize([1000, 500], fc);

const META: Record<string, { capital?: string; lon?: number; lat?: number; coa?: string }> = countryMeta;
const CUR: Record<string, { code: string; name: string; symbol: string }> = countryCurrency;
const A2: Record<string, string> = isoAlpha2;

const r = (n: number) => Math.round(n * 10) / 10;
const out: Record<string, Record<string, unknown>> = {};
for (const iso of new Set([...Object.keys(META), ...Object.keys(CUR)])) {
  const m = META[iso] || {};
  const e: Record<string, unknown> = {};
  if (A2[iso]) e.a2 = A2[iso];
  if (m.capital) e.capital = m.capital;
  if (m.lon !== undefined && m.lat !== undefined) {
    const p = proj([m.lon, m.lat]);
    if (p && Number.isFinite(p[0]) && Number.isFinite(p[1])) {
      e.capX = r(p[0]);
      e.capY = r(p[1]);
    }
  }
  if (m.coa) e.coa = m.coa;
  const c = CUR[iso];
  if (c) { e.curCode = c.code; e.curName = c.name; e.curSymbol = c.symbol; }
  if (Object.keys(e).length) out[iso] = e;
}

export const GET: APIRoute = () => {
  return new Response(JSON.stringify(out), { headers: { 'Content-Type': 'application/json' } });
};
