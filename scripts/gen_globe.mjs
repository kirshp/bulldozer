// Generates the app's globe geometry: same 173 countries as world.json but
// RAW lon/lat rings (no projection) — the app renders them orthographically
// as a spinning globe. Run: node scripts/gen_globe.mjs <out.json>
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { feature } from 'topojson-client';

const require = createRequire(import.meta.url);
const topo = JSON.parse(
  readFileSync(require.resolve('world-atlas/countries-110m.json'), 'utf8'),
);
const isoNumeric = JSON.parse(
  readFileSync(new URL('../src/data/iso-numeric.json', import.meta.url), 'utf8'),
);

const fc = feature(topo, topo.objects.countries);
const r = (n) => Math.round(n * 100) / 100;
const ring = (pts) => pts.map(([lon, lat]) => [r(lon), r(lat)]);

const countries = [];
for (const f of fc.features) {
  // world-atlas ids are zero-padded ("032"); iso-numeric keys are unpadded.
  const iso = isoNumeric[String(parseInt(f.id, 10))];
  if (!iso) continue;
  const g = f.geometry;
  const rings = [];
  if (g.type === 'Polygon') for (const rg of g.coordinates) rings.push(ring(rg));
  else if (g.type === 'MultiPolygon')
    for (const poly of g.coordinates) for (const rg of poly) rings.push(ring(rg));
  if (rings.length) countries.push({ iso, name: f.properties?.name ?? '', rings });
}

const out = process.argv[2] ?? 'globe.json';
writeFileSync(out, JSON.stringify({ countries }));
console.log(`wrote ${out}: ${countries.length} countries`);
