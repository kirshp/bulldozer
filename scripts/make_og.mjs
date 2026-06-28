/** Rasterise a branded Open Graph image (1200×630) to public/og.png via sharp. */
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffb000"/><stop offset="1" stop-color="#ff7a00"/></linearGradient>
    <radialGradient id="glow" cx="78%" cy="0%" r="70%"><stop offset="0" stop-color="#ffb000" stop-opacity="0.18"/><stop offset="1" stop-color="#ffb000" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1200" height="630" fill="#0e0f11"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <g transform="translate(90,120)">
    <rect width="84" height="84" rx="20" fill="url(#b)"/>
    <text x="42" y="60" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="58" font-weight="900" fill="#1a1300">B</text>
    <text x="110" y="60" font-family="Inter,Arial,sans-serif" font-size="46" font-weight="800" fill="#e7e9ec">Bull<tspan fill="#ffb000">Dozer</tspan></text>
  </g>
  <text x="90" y="360" font-family="Inter,Arial,sans-serif" font-size="86" font-weight="800" fill="#e7e9ec" letter-spacing="-2">Move data like</text>
  <text x="90" y="460" font-family="Inter,Arial,sans-serif" font-size="86" font-weight="800" fill="#ffb000" letter-spacing="-2">heavy machinery.</text>
  <text x="92" y="545" font-family="JetBrains Mono,monospace" font-size="26" fill="#9aa1a9">Marketing analytics &amp; research · public, parsed data</text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile(join(__dirname, '..', 'public', 'og.png'));
console.log('✓ wrote public/og.png');
