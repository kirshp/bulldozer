/**
 * Parse the Reuters Institute Digital News Report — country-level shares from the
 * public data behind the DNR interactive (one CSV per question, all markets & years).
 * ~48 markets, 2013–2026. Live fetch, reproducible.
 *   node scripts/parse_dnr.mjs
 */
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseCsvObjects } from './lib/csv.mjs';
import { gapminderRows, REGION_4, pickPeriodsN, writeDataset, round } from './lib/datasets.mjs';

const BASE = 'https://reutersinstitute.politics.ox.ac.uk/modules/custom/olamalu_reuters_dnr_infographics';
const GAP = join(homedir(), 'Library', 'Mobile Documents', 'com~apple~CloudDocs',
  'BK', 'Opros', 'Inter_survey', 'Gapminder', 'ddf--entities--geo--country.csv');
const REF_YEAR = new Date().getFullYear();

const QUESTIONS = [
  {
    q: 'q6_2016_1', option: 'q6_2016_1__net_agree', slug: 'dnr-trust-news',
    title: 'Trust in News', valueLabel: 'Trust most news most of the time',
    summary: 'Share who agree they can trust most news most of the time.',
  },
  {
    q: 'q7a', option: 'q7a__yes', slug: 'dnr-paying-news',
    title: 'Paying for Online News', valueLabel: 'Paid for online news last year',
    summary: 'Share who paid for online news content or a paid online news service in the last year.',
  },
  {
    q: 'q1di_2017', option: 'q1di_2017__often_sometimes', slug: 'dnr-news-avoidance',
    title: 'News Avoidance', valueLabel: 'Often/sometimes avoid news',
    summary: 'Share who say they often or sometimes actively try to avoid news.',
  },
  {
    q: 'q3', option: 'q3__social_media', slug: 'dnr-social-media-news',
    title: 'Social Media as News Source', valueLabel: 'Used social media for news last week',
    summary: 'Share who used social media as a source of news in the last week.',
  },
];

async function alpha2Geo() {
  // alpha2 -> { iso3, name, region } via the Gapminder geo entities file
  const m = new Map();
  for (const r of await gapminderRows()) {
    const a2 = (r.iso3166_1_alpha2 || '').toUpperCase();
    if (!a2) continue;
    m.set(a2, {
      iso3: (r.iso3166_1_alpha3 || '').toUpperCase(),
      name: r.name,
      region: REGION_4[r.world_4region] || 'Other',
    });
  }
  // DNR market codes that are not plain ISO alpha-2
  m.set('HK', { iso3: 'HKG', name: 'Hong Kong', region: 'Asia' });
  m.set('TW', { iso3: 'TWN', name: 'Taiwan', region: 'Asia' });
  return m;
}

async function fetchCsv(q) {
  const res = await fetch(`${BASE}/data/${q}/markets.csv`);
  if (!res.ok) throw new Error(`${res.status} ${q}/markets.csv`);
  return res.text();
}

async function main() {
  console.log('Reuters DNR → country media indicators');
  const geo = await alpha2Geo();
  for (const cfg of QUESTIONS) {
    let text;
    try { text = await fetchCsv(cfg.q); } catch (e) { console.warn(`– ${cfg.slug}: fetch failed (${e.message})`); continue; }
    const byIso = new Map(); const yearCounts = new Map();
    for (const r of parseCsvObjects(text)) {
      if (r.split_var !== 'total' || r.option_id !== cfg.option) continue;
      const code = (r.country_code || '').toUpperCase();
      if (code === 'ALL' || code.includes('-')) continue; // whole markets only, no language splits
      const g = geo.get(code);
      if (!g?.iso3) continue;
      const v = Number(r.pct); const y = r.year;
      if (Number.isNaN(v) || !y) continue;
      let rec = byIso.get(g.iso3); if (!rec) byIso.set(g.iso3, rec = { name: g.name, region: g.region, byYear: {} });
      rec.byYear[y] = round(v * 100, 0);
      yearCounts.set(y, (yearCounts.get(y) ?? 0) + 1);
    }
    const periods = pickPeriodsN(yearCounts, 8, REF_YEAR);
    if (!periods.length) { console.log(`  – ${cfg.slug}: no usable years`); continue; }
    const data = [];
    for (const [iso, rec] of byIso) for (const p of periods) {
      if (rec.byYear[p] == null) continue;
      data.push({ entity: rec.name, group: rec.region, period: p, value: rec.byYear[p], iso });
    }
    await writeDataset('survey', cfg.slug, {
      title: `${cfg.title} (Digital News Report)`, summary: `${cfg.summary} Reuters Institute Digital News Report, ${periods[0]}–${periods.at(-1)}.`,
      unit: '%', valueLabel: cfg.valueLabel, changeMode: 'pp', topic: 'media',
      method: 'Online YouGov panels (~2,000 per market per year); in India, Kenya, Morocco, Nigeria and South Africa samples are urban/English-speaking and not nationally representative.',
      source: 'Reuters Institute Digital News Report', license: 'Reuters Institute — public aggregates',
      url: 'https://reutersinstitute.politics.ox.ac.uk/digital-news-report', parsedAt: new Date().toISOString().slice(0, 10),
    }, data);
  }
}
main().catch((e) => { console.error('✗ parse_dnr failed:', e.message); process.exit(1); });
