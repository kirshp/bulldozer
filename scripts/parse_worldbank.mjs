/**
 * World Bank open API → macro datasets (reproducible, no key). Financial
 * inclusion (Global Findex) and financial access — concepts the site lacks.
 * The API returns country rows mixed with regional/income aggregates; we keep
 * only real ISO-3 countries (validated against iso-alpha2.json) and take the
 * latest non-null year per country.
 *   node scripts/parse_worldbank.mjs
 */
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseCsvObjects } from './lib/csv.mjs';
import { REGION_4, writeDataset, round } from './lib/datasets.mjs';

const GAP = join(homedir(), 'Library', 'Mobile Documents', 'com~apple~CloudDocs', 'BK', 'Opros', 'Inter_survey', 'Gapminder', 'ddf--entities--geo--country.csv');
const ALPHA2 = join(homedir(), 'Projects', 'bulldozer', 'src', 'data', 'iso-alpha2.json');
const PARSED = new Date().toISOString().slice(0, 10);
const WB = { source: 'World Bank Open Data', license: 'CC BY 4.0', url: 'https://data.worldbank.org/' };

async function geoAndCountries() {
  const a3 = new Set(Object.keys(JSON.parse(await readFile(ALPHA2, 'utf8')))); // real ISO-3 only (excludes WB aggregates)
  const geo = new Map();
  try {
    for (const r of parseCsvObjects(await readFile(GAP, 'utf8'))) {
      const k = (r.iso3166_1_alpha3 || '').toUpperCase();
      if (k) geo.set(k, { name: r.name, region: REGION_4[r.world_4region] || 'Other' });
    }
  } catch {}
  return { real: a3, geo };
}

/** Fetch a WDI series → latest non-null value per real country. */
async function wbLatest(code, real) {
  const res = await fetch(`https://api.worldbank.org/v2/country/all/indicator/${code}?format=json&per_page=5000&date=2015:2024`);
  const j = await res.json();
  if (!Array.isArray(j) || !j[1]) throw new Error(`WB ${code}: empty`);
  const latest = new Map();
  for (const r of j[1]) {
    const iso = (r.countryiso3code || '').toUpperCase();
    if (r.value == null || !real.has(iso)) continue;
    const year = Number(r.date);
    const cur = latest.get(iso);
    if (!cur || year > cur.year) latest.set(iso, { year, value: r.value });
  }
  return latest;
}

async function emit(slug, code, meta, ctx) {
  let latest;
  try { latest = await wbLatest(code, ctx.real); } catch (e) { console.warn(`– ${slug}: ${e.message}; skipped.`); return; }
  const data = [...latest.entries()].map(([iso, { year, value }]) => {
    const info = ctx.geo.get(iso);
    return { entity: info?.name || iso, group: info?.region || 'Other', period: String(year), value: round(value, 2), iso };
  });
  await writeDataset('macro', slug, { ...meta, parsedAt: PARSED }, data);
}

async function main() {
  const ctx = await geoAndCountries();
  await emit('wb-account-ownership', 'FX.OWN.TOTL.ZS', {
    title: 'Bank Account Ownership', valueLabel: 'Adults (15+) with a financial account', unit: '%', changeMode: 'pp', topic: 'economy',
    summary: 'Share of adults (15+) with an account at a financial institution or mobile-money provider. World Bank Global Findex.', ...WB,
  }, ctx);
  await emit('wb-bank-branches', 'FB.CBK.BRCH.P5', {
    title: 'Bank Branches', valueLabel: 'Commercial bank branches per 100,000 adults', unit: 'per 100k', changeMode: 'pct', topic: 'economy',
    summary: 'Commercial bank branches per 100,000 adults — a measure of physical financial access. World Bank.', ...WB,
  }, ctx);
  console.log('✓ World Bank: datasets written');
}
main();
