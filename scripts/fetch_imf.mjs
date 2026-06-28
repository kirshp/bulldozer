/**
 * Fetch real macro data from the IMF DataMapper public API and write it into
 * the BullDozer dataset format.
 *
 *   node scripts/fetch_imf.mjs [INDICATOR] [YEARS]
 *   e.g. node scripts/fetch_imf.mjs NGDP_RPCH 2023,2024
 *
 * No API key required. Docs: https://www.imf.org/external/datamapper/api/help
 */
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const INDICATOR = process.argv[2] || 'NGDP_RPCH';
const YEARS = (process.argv[3] || '2023,2024').split(',');

// ISO3 -> { label, group } for the countries we surface.
const COUNTRIES = {
  PRT: { label: 'Portugal', group: 'Advanced economies' },
  DEU: { label: 'Germany', group: 'Advanced economies' },
  USA: { label: 'United States', group: 'Advanced economies' },
  JPN: { label: 'Japan', group: 'Advanced economies' },
  CHN: { label: 'China', group: 'Emerging markets' },
  IND: { label: 'India', group: 'Emerging markets' },
  BRA: { label: 'Brazil', group: 'Emerging markets' },
  NGA: { label: 'Nigeria', group: 'Emerging markets' },
};

const META = {
  NGDP_RPCH: {
    title: 'Real GDP Growth',
    summary:
      'Annual percentage change of real gross domestic product. Pulled from the IMF DataMapper public API (indicator NGDP_RPCH).',
    unit: '% YoY',
    valueLabel: 'Real GDP growth',
  },
  PCPIPCH: {
    title: 'Inflation (CPI)',
    summary: 'Annual percentage change of average consumer prices. IMF DataMapper indicator PCPIPCH.',
    unit: '% YoY',
    valueLabel: 'CPI inflation',
  },
};

async function main() {
  const iso3 = Object.keys(COUNTRIES).join(',');
  const url = `https://www.imf.org/external/datamapper/api/v1/${INDICATOR}/${iso3}`;
  console.log(`→ GET ${url}`);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`IMF API ${res.status} ${res.statusText}`);
  const json = await res.json();
  const series = json?.values?.[INDICATOR];
  if (!series) throw new Error(`No values for indicator ${INDICATOR}`);

  const data = [];
  for (const [code, info] of Object.entries(COUNTRIES)) {
    const byYear = series[code] || {};
    for (const year of YEARS) {
      const value = byYear[year];
      if (value == null) continue;
      data.push({ entity: info.label, group: info.group, period: year, value: Math.round(value * 10) / 10 });
    }
  }

  const m = META[INDICATOR] || { title: INDICATOR, summary: `IMF indicator ${INDICATOR}.`, unit: '', valueLabel: INDICATOR };
  const out = {
    meta: {
      ...m,
      kind: 'macro',
      source: 'IMF World Economic Outlook (DataMapper API)',
      license: 'IMF terms — public data',
      url: `https://www.imf.org/external/datamapper/${INDICATOR}`,
      parsedAt: new Date().toISOString().slice(0, 10),
    },
    data,
  };

  const dest = join(__dirname, '..', 'src', 'data', 'macro', 'imf-gdp-growth.json');
  await writeFile(dest, JSON.stringify(out, null, 2) + '\n');
  console.log(`✓ Wrote ${data.length} observations → ${dest}`);
}

main().catch((err) => {
  console.error('✗ Fetch failed:', err.message);
  console.error('  Keeping existing seed data.');
  process.exit(1);
});
