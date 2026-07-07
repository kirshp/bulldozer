/**
 * One-off generator: src/data/country-names.json — per ISO-3 country:
 *   { common, official }   (international short name + official Latin name)
 * Sourced from the open mledoze/countries dataset (MIT). This decouples the
 * name shown in the UI from whatever spelling each data source happens to use.
 * Run occasionally to refresh:  node scripts/fetch_country_names.mjs
 */
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'country-names.json');

const res = await fetch('https://raw.githubusercontent.com/mledoze/countries/master/dist/countries.json');
if (!res.ok) { console.error('mledoze fetch error', res.status); process.exit(1); }
const rows = await res.json();

const out = {};
for (const c of rows) {
  const iso = (c.cca3 || '').toUpperCase();
  if (iso.length !== 3) continue;
  out[iso] = { common: c.name.common, official: c.name.official };
}

// mledoze codes Kosovo as UNK; our datasets (World Bank, OWID) use XKX.
out.XKX = { common: 'Kosovo', official: 'Republic of Kosovo' };

await writeFile(OUT, JSON.stringify(out));
console.log('✓ country-names.json:', Object.keys(out).length, 'countries');
console.log('  sample KOR:', JSON.stringify(out.KOR), '| CZE:', JSON.stringify(out.CZE));
