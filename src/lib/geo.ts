/**
 * Country-code helpers. Some sources code the same place differently — the IMF
 * uses UVK for Kosovo and WBG for the Palestinian territories, while the World
 * Bank, OWID and others use XKX / PSE. Left unmerged, a country shows up twice
 * in the profile list. Canonicalise every ISO code to one spelling.
 */
export const ISO_ALIAS: Record<string, string> = {
  UVK: 'XKX', // Kosovo (IMF → ISO user-assigned)
  WBG: 'PSE', // West Bank and Gaza (IMF → State of Palestine)
};

export function canonIso(iso?: string): string | undefined {
  if (!iso) return iso;
  const up = iso.toUpperCase();
  return ISO_ALIAS[up] ?? up;
}

/** Marks names corrupted by a bad encoding step (replacement char or the
 *  tell-tale Ã/Ă/Â byte-pair leftovers) so we can prefer a clean variant. */
const MOJIBAKE = /[�]|Ã|Ă|Â/;

/** Pick the best display name for a country from the variants different
 *  sources use: never a mojibake one, otherwise the most widely used. */
export function bestCountryName(votes: Map<string, number>): string {
  let best = '';
  let bestScore = -Infinity;
  for (const [name, n] of votes) {
    const score = n + (MOJIBAKE.test(name) ? -1e6 : 0);
    if (score > bestScore) { bestScore = score; best = name; }
  }
  return best;
}
