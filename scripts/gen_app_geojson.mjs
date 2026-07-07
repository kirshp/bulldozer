/**
 * Generates a compact, pre-projected world map for the BullDozer Flutter app.
 * Runs in the site repo (has world-atlas / topojson-client / d3-geo), projects
 * every country with the same Natural Earth projection the site uses, and
 * writes screen-space polygons + ISO3 to the app's assets. Dart just paints.
 *
 *   node scripts/gen_app_geojson.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { feature } from 'topojson-client';
import { geoNaturalEarth1 } from 'd3-geo';

const require = createRequire(import.meta.url);
const topo = JSON.parse(
  readFileSync(require.resolve('world-atlas/countries-110m.json'), 'utf8'),
);
const isoNumeric = JSON.parse(
  readFileSync(new URL('../src/data/iso-numeric.json', import.meta.url), 'utf8'),
);

const W = 1000;
const H = 500;
const fc = feature(topo, topo.objects.countries);
const projection = geoNaturalEarth1().fitSize([W, H], fc);

const r = (n) => Math.round(n * 10) / 10;
const projectRing = (ring) => {
  const out = [];
  for (const [lon, lat] of ring) {
    const p = projection([lon, lat]);
    if (p && Number.isFinite(p[0]) && Number.isFinite(p[1])) {
      out.push([r(p[0]), r(p[1])]);
    }
  }
  return out;
};

const countries = [];
for (const f of fc.features) {
  // world-atlas ids are zero-padded ("032"); iso-numeric keys are unpadded ("32").
  const iso = isoNumeric[String(parseInt(f.id, 10))];
  if (!iso) continue;
  const g = f.geometry;
  const polys = [];
  if (g.type === 'Polygon') {
    polys.push(g.coordinates.map(projectRing));
  } else if (g.type === 'MultiPolygon') {
    for (const poly of g.coordinates) polys.push(poly.map(projectRing));
  }
  const cleaned = polys
    .map((rings) => rings.filter((rr) => rr.length >= 3))
    .filter((rings) => rings.length > 0);
  if (cleaned.length) {
    countries.push({ iso, name: f.properties.name, polys: cleaned });
  }
}

const out = { w: W, h: H, countries };
const path = new URL(
  '../../bulldozer_app/assets/world.json',
  import.meta.url,
);
writeFileSync(path, JSON.stringify(out));
const kb = Math.round(JSON.stringify(out).length / 1024);
console.log(`✓ ${countries.length} countries → assets/world.json (${kb} KB)`);
