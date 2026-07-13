/**
 * UNHCR Refugee Data Finder — refugees and IDPs by country of origin.
 *   node scripts/parse_unhcr.mjs
 * Open API; with coo_all=true and no asylum-country filter each row is one
 * origin-country × year aggregate (coa comes back as '-'). Fits one page at
 * limit=10000, but we still walk maxPages defensively.
 */
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseCsvObjects } from './lib/csv.mjs';
import { gapminderRows, REGION_4, writeDataset, pickPeriodsN } from './lib/datasets.mjs';

const GAP = join(homedir(), 'Library', 'Mobile Documents', 'com~apple~CloudDocs', 'BK', 'Opros', 'Inter_survey', 'Gapminder', 'ddf--entities--geo--country.csv');
const API = 'https://api.unhcr.org/population/v1/population/';

/** Region and display name per ISO3 — UNHCR names ('Syrian Arab Rep.') are
 *  bureaucratic; Gapminder's ('Syria') match the rest of the site. */
async function geo() {
  const region = new Map(); const name = new Map();
  for (const r of await gapminderRows()) {
    const a3 = (r.iso3166_1_alpha3 || '').toUpperCase();
    if (!a3) continue;
    region.set(a3, REGION_4[r.world_4region] || 'Other');
    if (r.name) name.set(a3, r.name);
  }
  return { region, name };
}

async function main() {
  console.log('UNHCR Refugee Data Finder →');
  const { region, name } = await geo();
  const items = [];
  for (let page = 1, maxPages = 1; page <= maxPages; page++) {
    const res = await fetch(`${API}?limit=10000&page=${page}&yearFrom=2000&yearTo=2026&coo_all=true`);
    if (!res.ok) throw new Error(`fetch failed (${res.status})`);
    const js = await res.json();
    maxPages = js.maxPages ?? 1;
    items.push(...(js.items ?? []));
  }

  const METRICS = [
    { field: 'refugees', slug: 'unhcr-refugees', title: 'Refugees by Country of Origin',
      valueLabel: 'Refugees (people)', summary: 'People recognised as refugees (incl. refugee-like situations), counted by their country of origin.' },
    { field: 'idps', slug: 'unhcr-idps', title: 'Internally Displaced People',
      valueLabel: 'IDPs (people)', summary: 'People displaced within their own country by conflict or violence (UNHCR-protected IDPs).' },
  ];
  for (const cfg of METRICS) {
    const rows = [];
    const counts = new Map();
    for (const r of items) {
      const iso = (r.coo_iso || '').toUpperCase();
      if (!region.has(iso)) continue;
      const v = Number(r[cfg.field]);
      if (!Number.isFinite(v) || v <= 0) continue;
      const period = String(r.year);
      rows.push({ entity: name.get(iso) ?? r.coo_name, group: region.get(iso), period, value: v, iso });
      counts.set(period, (counts.get(period) ?? 0) + 1);
    }
    const periods = pickPeriodsN(counts, 8);
    const data = rows.filter((r) => periods.includes(r.period));
    if (data.length < 200) { console.warn(`– ${cfg.slug}: only ${data.length} rows, skipping`); continue; }
    await writeDataset('macro', cfg.slug, {
      title: cfg.title, unit: 'people', valueLabel: cfg.valueLabel, changeMode: 'pct', topic: 'demographics',
      summary: `${cfg.summary} Countries with zero counts omitted.`,
      source: 'UNHCR Refugee Data Finder', license: 'CC BY 4.0',
      url: 'https://www.unhcr.org/refugee-statistics/', parsedAt: new Date().toISOString().slice(0, 10),
    }, data);
  }
}
main().catch((e) => { console.error('✗ parse_unhcr failed:', e.message); process.exit(1); });
