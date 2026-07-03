/**
 * Aggregate RLMS-HSE microdata (Russia) into a small story dataset:
 * weighted share who used the internet in the last 12 months — over time,
 * and by age group / settlement type for the latest year.
 *   node scripts/parse_rlms.mjs
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { parseCsvObjects } from './lib/csv.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(homedir(), 'Documents', 'tableau_data', 'surveys', 'rlms_internet_demo.csv');

const ageBucket = (a) => { a = parseFloat(a); if (!a) return null; if (a < 25) return '16–24'; if (a < 35) return '25–34'; if (a < 50) return '35–49'; if (a < 65) return '50–64'; return '65+'; };
// \u escapes match Russian settlement labels in the source file (repo policy: ASCII-only sources)
const settle = (s) => { s = (s || '').toLowerCase(); if (s.includes('city') || s.includes('\u0433\u043e\u0440\u043e\u0434')) return 'City'; if (s.includes('pgt') || s.includes('town')) return 'Town (PGT)'; if (s.includes('selo') || s.includes('village') || s.includes('\u0441\u0435\u043b\u043e')) return 'Village'; return null; };
const pct = (o) => o.w ? Math.round((1000 * o.u) / o.w) / 10 : null;

async function main() {
  let text;
  try { text = await readFile(SRC, 'utf8'); } catch { console.warn('– RLMS source missing; skipped.'); return; }

  const yr = {}, age = {}, set = {};
  let latest = '0';
  for (const r of parseCsvObjects(text)) {
    const v = r.used_internet_12m; if (v !== 'Yes' && v !== 'No') continue;
    const w = parseFloat(r.weight) || 1, used = v === 'Yes' ? 1 : 0;
    (yr[r.year] = yr[r.year] || { w: 0, u: 0 }); yr[r.year].w += w; yr[r.year].u += w * used;
    if (r.year > latest) latest = r.year;
  }
  // second pass for breakdowns of the latest year
  for (const r of parseCsvObjects(text)) {
    if (r.year !== latest) continue;
    const v = r.used_internet_12m; if (v !== 'Yes' && v !== 'No') continue;
    const w = parseFloat(r.weight) || 1, used = v === 'Yes' ? 1 : 0;
    const a = ageBucket(r.age); if (a) { (age[a] = age[a] || { w: 0, u: 0 }); age[a].w += w; age[a].u += w * used; }
    const s = settle(r.settlement); if (s) { (set[s] = set[s] || { w: 0, u: 0 }); set[s].w += w; set[s].u += w * used; }
  }

  const out = {
    meta: { title: 'Internet use in Russia', source: 'RLMS-HSE (HSE / UNC)', url: 'https://www.hse.ru/en/rlms/', latest },
    trend: Object.keys(yr).filter((y) => yr[y].w > 0).sort().map((y) => ({ year: y, pct: pct(yr[y]) })),
    byAge: ['16–24', '25–34', '35–49', '50–64', '65+'].filter((b) => age[b]).map((b) => ({ group: b, pct: pct(age[b]) })),
    bySettlement: ['City', 'Town (PGT)', 'Village'].filter((b) => set[b]).map((b) => ({ group: b, pct: pct(set[b]) })),
  };
  const dir = join(__dirname, '..', 'src', 'data');
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'rlms.json'), JSON.stringify(out, null, 2) + '\n');
  console.log(`✓ RLMS → ${out.trend.length} years, ${out.byAge.length} age groups, latest ${latest}`);
}
main().catch((e) => { console.error('✗ parse_rlms failed:', e.message); process.exit(1); });
