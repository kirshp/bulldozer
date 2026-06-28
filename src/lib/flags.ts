/** Flag emoji from an ISO 3166-1 alpha-3 code. Returns '' for aggregates
 *  (World, regions) or anything we can't map — callers should treat the flag
 *  as decorative and never depend on it being present. */
import alpha2 from '@data/iso-alpha2.json';

const A2: Record<string, string> = alpha2 as Record<string, string>;

/** Two regional-indicator symbols for a 2-letter country code. */
function emoji(a2: string): string {
  if (!/^[A-Z]{2}$/.test(a2)) return '';
  return String.fromCodePoint(...[...a2].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

export function flagFor(iso?: string): string {
  if (!iso) return '';
  const a2 = A2[iso.toUpperCase()];
  return a2 ? emoji(a2) : '';
}
