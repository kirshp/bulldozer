/** Shared world geometry: country SVG paths with numeric ISO ids.
 *  Computed once at build from world-atlas + d3-geo. */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { feature } from 'topojson-client';
import { geoNaturalEarth1, geoPath } from 'd3-geo';

const require = createRequire(import.meta.url);
const topo = JSON.parse(readFileSync(require.resolve('world-atlas/countries-110m.json'), 'utf8'));
const fc: any = feature(topo, (topo as any).objects.countries);

export const MAP_W = 960;
export const MAP_H = 480;

const projection = geoNaturalEarth1().fitSize([MAP_W, MAP_H], fc);
const pathGen = geoPath(projection);

export interface CountryPath { num: string; name: string; d: string }

export const countryPaths: CountryPath[] = fc.features.map((f: any) => ({
  num: String(f.id),
  name: f.properties.name,
  d: pathGen(f) as string,
}));
