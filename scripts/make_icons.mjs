/** Generate PWA icons (192, 512, maskable) from the BullDozer B mark via sharp. */
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pub = join(__dirname, '..', 'public');

const icon = (size, radius, fontPad) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffb000"/><stop offset="1" stop-color="#ff7a00"/></linearGradient></defs>
  <rect width="${size}" height="${size}" rx="${radius}" fill="url(#g)"/>
  <text x="50%" y="50%" dy="0.35em" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="${size - fontPad}" font-weight="900" fill="#1a1300">B</text>
</svg>`;

await sharp(Buffer.from(icon(192, 40, 80))).png().toFile(join(pub, 'icon-192.png'));
await sharp(Buffer.from(icon(512, 108, 220))).png().toFile(join(pub, 'icon-512.png'));
// maskable: extra padding so the glyph stays inside the safe zone
await sharp(Buffer.from(icon(512, 0, 300))).png().toFile(join(pub, 'icon-512-maskable.png'));
console.log('✓ wrote PWA icons');
