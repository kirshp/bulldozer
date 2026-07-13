/**
 * Parse the EBRD Life in Transition Survey (LiTS IV) visualiser aggregates —
 * country-level mean scores for a set of attitude questions. Single wave (~2023).
 *   node scripts/parse_lits.mjs
 */
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseCsvObjects } from './lib/csv.mjs';
import { gapminderRows, REGION_4, writeDataset, round } from './lib/datasets.mjs';

const ICLOUD = join(homedir(), 'Library', 'Mobile Documents', 'com~apple~CloudDocs');
const LITS = join(ICLOUD, 'BK', 'Opros', 'Inter_survey', 'EBRD_LiTS_Life_in_Transition_Survey');
const GAP = join(ICLOUD, 'BK', 'Opros', 'Inter_survey', 'Gapminder', 'ddf--entities--geo--country.csv');
const PERIOD = '2023';

const QUESTIONS = {
  q402: { slug: 'lits-trust', title: 'Generalised Trust', unit: 'mean 1–5', valueLabel: 'Most people can be trusted',
    summary: 'Mean agreement that most people can be trusted (generalised social trust).' },
  q418: { slug: 'lits-risk-tolerance', title: 'Risk Tolerance', unit: 'mean 1–10', valueLabel: 'Willingness to take risks',
    summary: 'Self-rated willingness to take risks in general (1 = none, 10 = very much).' },
  q410ba: { slug: 'lits-state-ownership', title: 'Preference for State Ownership', unit: 'mean 1–10', valueLabel: 'Private (1) ↔ state (10)',
    summary: 'Views on ownership of business and industry (1 = private should increase, 10 = government should increase).' },
  q801: { slug: 'lits-self-health', title: 'Self-assessed Health', unit: 'mean 1–5', valueLabel: 'How would you assess your health',
    summary: 'Mean self-assessment of own health.' },
  q814b: { slug: 'lits-religion', title: 'Importance of Religion', unit: 'mean 1–5', valueLabel: 'Importance of religion in life',
    summary: 'Mean rated importance of religion in one’s life.' },
};

async function loadAlpha2Map() {
  const m = new Map(); // alpha2 -> {iso3, region, name}
  for (const r of await gapminderRows()) {
    const a2 = (r.iso3166_1_alpha2 || '').toUpperCase();
    if (!a2) continue;
    m.set(a2, { iso3: (r.iso3166_1_alpha3 || '').toUpperCase(), region: REGION_4[r.world_4region] || 'Europe & Central Asia', name: r.name });
  }
  return m;
}

async function main() {
  let rows, a2map;
  try {
    rows = JSON.parse(await readFile(join(LITS, 'LiTS_IV_visualizer_country_value_scores.json'), 'utf8'));
    a2map = await loadAlpha2Map();
  } catch {
    console.warn('– LiTS source not found; skipped.');
    return;
  }
  console.log('LiTS IV → country attitude aggregates');

  for (const [code, cfg] of Object.entries(QUESTIONS)) {
    const data = [];
    for (const rec of rows) {
      const v = rec[code];
      if (v == null || Number.isNaN(Number(v))) continue;
      const geo = a2map.get((rec.iso2c || '').toUpperCase());
      data.push({
        entity: rec.country,
        group: geo?.region || 'Europe & Central Asia',
        period: PERIOD,
        value: round(Number(v), 2),
        iso: geo?.iso3 || '',
      });
    }
    if (!data.length) continue;
    await writeDataset('survey', cfg.slug, {
      title: cfg.title,
      summary: `${cfg.summary} EBRD Life in Transition Survey IV, ${PERIOD}.`,
      unit: cfg.unit,
      valueLabel: cfg.valueLabel,
      changeMode: 'pp',
      source: 'EBRD — Life in Transition Survey IV',
      license: 'EBRD terms — public aggregates',
      url: 'https://www.ebrd.com/what-we-do/economic-research-and-data/data/lits.html',
      parsedAt: new Date().toISOString().slice(0, 10),
    }, data);
  }
}

main().catch((err) => { console.error('✗ parse_lits failed:', err.message); process.exit(1); });
