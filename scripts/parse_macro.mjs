/**
 * Parse the IMF World Economic Outlook tidy export into BullDozer datasets.
 *
 *   node scripts/parse_macro.mjs
 *   IMF_WEO_CSV=/path/to.csv REF_YEAR=2026 node scripts/parse_macro.mjs
 *
 * Source is local/curated (tableau_data); output JSON is committed.
 */
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseCsvObjects } from './lib/csv.mjs';
import { enRegion, latestTwo, writeDataset, round } from './lib/datasets.mjs';

const SRC =
  process.env.IMF_WEO_CSV ||
  join(homedir(), 'Documents', 'tableau_data', 'macro', 'imf_weo_apr2026_tidy.csv');
const REF_YEAR = Number(process.env.REF_YEAR) || new Date().getFullYear();

const SOURCE = {
  source: 'IMF World Economic Outlook (Apr 2026)',
  license: 'IMF terms — public data',
  url: 'https://www.imf.org/en/Publications/WEO',
  parsedAt: new Date().toISOString().slice(0, 10),
};

// indicator_code → dataset config
const INDICATORS = {
  NGDP_RPCH: { slug: 'imf-gdp-growth', title: 'Real GDP Growth', unit: '% YoY', valueLabel: 'Real GDP growth', changeMode: 'pp', dp: 1,
    summary: 'Annual percentage change of real gross domestic product.' },
  PCPIPCH: { slug: 'imf-inflation', title: 'Inflation (CPI)', unit: '% YoY', valueLabel: 'CPI inflation', changeMode: 'pp', dp: 1,
    summary: 'Annual percentage change of average consumer prices.' },
  LUR: { slug: 'imf-unemployment', title: 'Unemployment Rate', unit: '%', valueLabel: 'Unemployment rate', changeMode: 'pp', dp: 1,
    summary: 'Unemployed as a share of the total labour force.' },
  GGXWDG_NGDP: { slug: 'imf-govt-debt', title: 'Government Debt', unit: '% of GDP', valueLabel: 'Gross govt debt', changeMode: 'pp', dp: 1,
    summary: 'General government gross debt as a share of GDP.' },
  NGDPDPC: { slug: 'imf-gdp-per-capita', title: 'GDP per Capita', unit: 'USD', valueLabel: 'GDP per capita', changeMode: 'pct', dp: 0,
    summary: 'Gross domestic product per capita, current US dollars.' },
  BCA_NGDPD: { slug: 'imf-current-account', title: 'Current Account Balance', unit: '% of GDP', valueLabel: 'Current account', changeMode: 'pp', dp: 1,
    summary: 'Current account balance as a share of GDP.' },
};

async function main() {
  let text;
  try {
    text = await readFile(SRC, 'utf8');
  } catch {
    console.warn(`– IMF WEO source not found (${SRC}); skipping macro. Set IMF_WEO_CSV to override.`);
    return; // soft-skip so CI without the local curated file still succeeds
  }

  // Collect: code → country → { region, byYear: {year: value} }
  const collected = {};
  for (const code of Object.keys(INDICATORS)) collected[code] = new Map();

  for (const row of parseCsvObjects(text)) {
    const code = row.indicator_code;
    if (!collected[code]) continue;
    const value = Number(row.value);
    if (!row.country || row.value === '' || Number.isNaN(value)) continue;
    const map = collected[code];
    let rec = map.get(row.country);
    if (!rec) {
      rec = { region: enRegion(row.region), byYear: {} };
      map.set(row.country, rec);
    }
    rec.byYear[row.year] = value;
  }

  console.log(`IMF WEO → ${SRC.split('/').pop()} (ref year ${REF_YEAR})`);
  for (const [code, cfg] of Object.entries(INDICATORS)) {
    const map = collected[code];
    const allYears = new Set();
    for (const rec of map.values()) for (const y of Object.keys(rec.byYear)) allYears.add(y);
    const [prev, curr] = latestTwo([...allYears], REF_YEAR);
    if (!prev || !curr) {
      console.log(`  – ${cfg.slug}: not enough years, skipped`);
      continue;
    }

    const data = [];
    for (const [country, rec] of map) {
      for (const period of [prev, curr]) {
        const v = rec.byYear[period];
        if (v == null) continue;
        data.push({ entity: country, group: rec.region, period, value: round(v, cfg.dp) });
      }
    }

    await writeDataset('macro', cfg.slug, {
      title: cfg.title,
      summary: `${cfg.summary} IMF WEO, ${prev}–${curr}.`,
      unit: cfg.unit,
      valueLabel: cfg.valueLabel,
      changeMode: cfg.changeMode,
      ...SOURCE,
    }, data);
  }
}

main().catch((err) => {
  console.error('✗ parse_macro failed:', err.message);
  process.exit(1);
});
