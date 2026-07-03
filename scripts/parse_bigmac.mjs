/**
 * The Economist Big Mac Index — burger prices and currency valuation.
 *   node scripts/parse_bigmac.mjs
 * Official data repo on GitHub (MIT-licensed code, data openly published).
 * The index is semiannual (January + July); we keep one observation per
 * country-year (the latest in that year) and chart recent years.
 */
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseCsvObjects } from './lib/csv.mjs';
import { REGION_4, writeDataset, pickPeriodsN, round } from './lib/datasets.mjs';

const GAP = join(homedir(), 'Library', 'Mobile Documents', 'com~apple~CloudDocs', 'BK', 'Opros', 'Inter_survey', 'Gapminder', 'ddf--entities--geo--country.csv');
const CSV = 'https://raw.githubusercontent.com/TheEconomist/big-mac-data/master/output-data/big-mac-full-index.csv';

async function iso3Region() {
  const m = new Map();
  for (const r of parseCsvObjects(await readFile(GAP, 'utf8'))) {
    const a3 = (r.iso3166_1_alpha3 || '').toUpperCase();
    if (a3) m.set(a3, REGION_4[r.world_4region] || 'Other');
  }
  return m;
}

async function main() {
  console.log('The Economist Big Mac Index →');
  const region = await iso3Region();
  const res = await fetch(CSV);
  if (!res.ok) throw new Error(`fetch failed (${res.status})`);
  const rows = parseCsvObjects(await res.text());

  // latest observation per country-year (July supersedes January)
  const byKey = new Map();
  for (const r of rows) {
    const iso = (r.iso_a3 || '').toUpperCase();
    if (!region.has(iso)) continue;
    const year = r.date.slice(0, 4);
    const key = `${iso}|${year}`;
    const prev = byKey.get(key);
    if (!prev || r.date > prev.date) byKey.set(key, r);
  }

  const counts = new Map();
  for (const r of byKey.values()) {
    const y = r.date.slice(0, 4);
    counts.set(y, (counts.get(y) ?? 0) + 1);
  }
  const periods = pickPeriodsN(counts, 8);

  const DATASETS = [
    { slug: 'bigmac-dollar-price', title: 'Big Mac Price', unit: 'USD', dp: 2, changeMode: 'pct',
      valueLabel: 'Big Mac price (USD)', value: (r) => Number(r.dollar_price),
      summary: 'Price of a Big Mac converted to US dollars at market exchange rates — a light-hearted gauge of price levels.' },
    { slug: 'bigmac-usd-valuation', title: 'Currency Valuation vs USD (Big Mac)', unit: '%', dp: 1, changeMode: 'pp',
      valueLabel: 'Over(+)/under(−)valuation vs USD (%)', value: (r) => Number(r.USD_raw) * 100,
      summary: 'How over- or undervalued each currency is against the US dollar, judged by relative Big Mac prices (raw index).' },
  ];
  for (const cfg of DATASETS) {
    const data = [];
    for (const r of byKey.values()) {
      const year = r.date.slice(0, 4);
      if (!periods.includes(year)) continue;
      const v = cfg.value(r);
      if (Number.isNaN(v)) continue;
      const iso = r.iso_a3.toUpperCase();
      data.push({ entity: r.name, group: region.get(iso), period: year, value: round(v, cfg.dp), iso });
    }
    if (data.length < 100) { console.warn(`– ${cfg.slug}: only ${data.length} rows, skipping`); continue; }
    await writeDataset('macro', cfg.slug, {
      title: cfg.title, summary: `${cfg.summary} Semiannual index, ${periods[0]}–${periods.at(-1)} shown.`,
      unit: cfg.unit, valueLabel: cfg.valueLabel, changeMode: cfg.changeMode, topic: 'economy',
      source: 'The Economist — Big Mac Index', license: 'Open data (The Economist, GitHub)',
      url: 'https://github.com/TheEconomist/big-mac-data', parsedAt: new Date().toISOString().slice(0, 10),
    }, data);
  }
}
main().catch((e) => { console.error('✗ parse_bigmac failed:', e.message); process.exit(1); });
