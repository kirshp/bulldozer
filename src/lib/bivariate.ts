/** Bivariate choropleth helpers: 3×3 classification + 2-hue blended palette. */

const BASE = [40, 42, 48];
const AMBER = [255, 176, 0]; // X axis
const BLUE = [80, 140, 230]; // Y axis

/** Colour for class (xi, yi) where each is 0,1,2. Additive 2-hue blend on a
 *  dark base so high-X high-Y reads brightest. */
export function bivColor(xi: number, yi: number): string {
  const c = BASE.map((v, i) =>
    Math.max(0, Math.min(255, Math.round(v + (AMBER[i] - BASE[i]) * (xi / 2) + (BLUE[i] - BASE[i]) * (yi / 2)))),
  );
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

/** Tercile thresholds [t1, t2] for a list of values. */
export function terciles(values: number[]): [number, number] {
  const s = [...values].sort((a, b) => a - b);
  const q = (p: number) => s[Math.min(s.length - 1, Math.floor(p * s.length))];
  return [q(1 / 3), q(2 / 3)];
}

export function classify(v: number, [t1, t2]: [number, number]): number {
  return v <= t1 ? 0 : v <= t2 ? 1 : 2;
}
