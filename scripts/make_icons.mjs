/** Generate PWA icons (192, 512, maskable) — two-tone B mark — via sharp. */
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pub = join(__dirname, '..', 'public');

const icon = (size, radius, fontPad) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs><clipPath id="r"><rect width="${size}" height="${size}" rx="${radius}"/></clipPath></defs>
  <g clip-path="url(#r)">
    <rect width="${size}" height="${size}" fill="#ffb000"/>
    <path d="M${size} 0 L${size} ${size} L0 ${size} Z" fill="#ff7a00"/>
  </g>
  <text x="50%" y="50%" dy="0.35em" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="${size - fontPad}" font-weight="900" fill="#1a1300">B</text>
</svg>`;

await sharp(Buffer.from(icon(192, 40, 80))).png().toFile(join(pub, 'icon-192.png'));
await sharp(Buffer.from(icon(512, 108, 220))).png().toFile(join(pub, 'icon-512.png'));
await sharp(Buffer.from(icon(512, 0, 300))).png().toFile(join(pub, 'icon-512-maskable.png'));
console.log('✓ wrote PWA icons (two-tone)');
