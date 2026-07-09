/**
 * EU "Quality of life in European cities" — city-level satisfaction, 2023 wave.
 *   node scripts/parse_eu_cities.mjs
 * Open Eurostat perception survey (urb_percep), no key. City-level, so it does
 * NOT go through the country dataset registry — it writes a standalone
 * src/data/cities.json consumed by the /cities page.
 * Metrics are top-2-box (strongly + somewhat / very + fairly).
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const DATA = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data');
const API = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/urb_percep';
const YEAR = '2023';

// Eurostat city codes prefix an ISO2-ish country code (EL=Greece, UK=GBR).
const CC_NAME = {
  BE: 'Belgium', BG: 'Bulgaria', CZ: 'Czechia', DK: 'Denmark', DE: 'Germany', EE: 'Estonia',
  IE: 'Ireland', EL: 'Greece', ES: 'Spain', FR: 'France', HR: 'Croatia', IT: 'Italy',
  CY: 'Cyprus', LV: 'Latvia', LT: 'Lithuania', LU: 'Luxembourg', HU: 'Hungary', MT: 'Malta',
  NL: 'Netherlands', AT: 'Austria', PL: 'Poland', PT: 'Portugal', RO: 'Romania', SI: 'Slovenia',
  SK: 'Slovakia', FI: 'Finland', SE: 'Sweden', IS: 'Iceland', NO: 'Norway', CH: 'Switzerland',
  UK: 'United Kingdom', ME: 'Montenegro', MK: 'North Macedonia', AL: 'Albania', RS: 'Serbia',
  TR: 'Türkiye', BA: 'Bosnia and Herzegovina', MD: 'Moldova', XK: 'Kosovo',
};

const METRICS = [
  { key: 'city-satisfaction', label: 'Satisfied to live in the city',
    summary: 'Share who agree they are satisfied to live in their city (strongly + somewhat agree).',
    codes: ['PS3360V', 'PS3361V'] },
  { key: 'life-satisfaction', label: 'Satisfaction with the life you lead',
    summary: 'Share satisfied with the life they lead (very + fairly satisfied).',
    codes: ['PS3350V', 'PS3351V'] },
];

async function fetchCube(codes) {
  const q = codes.map((c) => `indic_ur=${c}`).join('&');
  const res = await fetch(`${API}?format=JSON&lang=EN&${q}&time=${YEAR}`);
  if (!res.ok) throw new Error(`Eurostat ${res.status}`);
  return res.json();
}

/** Flatten a filtered JSON-stat cube into { cityCode: { indic: value } }. */
function byCity(d) {
  const ids = d.id, size = d.size;
  const stride = ids.map((_, i) => size.slice(i + 1).reduce((a, b) => a * b, 1));
  const iInd = ids.indexOf('indic_ur'), iCity = ids.indexOf('cities');
  const indInv = Object.fromEntries(Object.entries(d.dimension.indic_ur.category.index).map(([k, v]) => [v, k]));
  const cityInv = Object.fromEntries(Object.entries(d.dimension.cities.category.index).map(([k, v]) => [v, k]));
  const labels = d.dimension.cities.category.label;
  const out = {};
  for (const [flat, val] of Object.entries(d.value)) {
    const f = Number(flat);
    const code = cityInv[Math.floor(f / stride[iCity]) % size[iCity]];
    const ind = indInv[Math.floor(f / stride[iInd]) % size[iInd]];
    (out[code] ??= { name: labels[code] })[ind] = val;
  }
  return out;
}

const cleanName = (s) => s.replace(/\s*\((greater|core) city\)/i, '').trim();

async function main() {
  console.log('EU Quality of life in European cities →');
  const metrics = [];
  for (const m of METRICS) {
    const cube = byCity(await fetchCube(m.codes));
    const data = [];
    for (const [code, rec] of Object.entries(cube)) {
      const [a, b] = m.codes.map((c) => rec[c]);
      if (a == null || b == null) continue;
      const cc = code.slice(0, 2);
      data.push({ city: cleanName(rec.name), country: CC_NAME[cc] ?? cc, cc, value: Math.round((a + b) * 10) / 10 });
    }
    data.sort((x, y) => y.value - x.value);
    metrics.push({ key: m.key, label: m.label, summary: m.summary, unit: '%', data });
    console.log(`  ${m.key}: ${data.length} cities (top: ${data[0]?.city} ${data[0]?.value}%)`);
  }
  const out = {
    title: 'Quality of life in European cities',
    source: 'Eurostat — Perception survey on quality of life in European cities',
    license: 'CC BY 4.0 (Eurostat reuse policy)',
    url: 'https://ec.europa.eu/eurostat/web/cities/data/database',
    year: YEAR, parsedAt: new Date().toISOString().slice(0, 10), metrics,
  };
  await writeFile(join(DATA, 'cities.json'), JSON.stringify(out));
  console.log('✓ src/data/cities.json');
}
main().catch((e) => { console.error('✗ parse_eu_cities failed:', e.message); process.exit(1); });
