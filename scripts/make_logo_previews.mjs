import sharp from 'sharp';
const OUT = '/private/tmp/claude-501/-Users-kirillshpara/025d8691-cfe3-48e0-a982-db40cbef8a62/scratchpad';
const bg = '#0e0f11';
const frame = (inner, label) => `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><rect width="256" height="256" rx="28" fill="${bg}"/><g transform="translate(46,40)">${inner}</g><text x="128" y="238" text-anchor="middle" font-family="Inter,Arial" font-size="18" fill="#9aa1a9">${label}</text></svg>`;
const sq = `<rect width="164" height="164" rx="38" fill="#ffb000"/>`;
const B = (y = 112, fs = 104) => `<text x="82" y="${y}" text-anchor="middle" font-family="Inter,Arial" font-size="${fs}" font-weight="900" fill="#1a1300">B</text>`;
const tread = [0, 1, 2, 3, 4].map((i) => `<rect x="${24 + i * 28}" y="124" width="20" height="15" rx="4" fill="#1a1300"/>`).join('');
const concepts = {
  '1_plain': [sq + B(), 'Plain (now)'],
  '2_tread': [sq + B(96, 88) + tread, 'Tread'],
  '3_blade': [sq + `<text x="96" y="104" text-anchor="middle" font-family="Inter,Arial" font-size="88" font-weight="900" fill="#1a1300">B</text><path d="M30 132 L120 132 L120 118 L42 118 Z" fill="#1a1300"/><rect x="22" y="110" width="14" height="30" rx="3" fill="#1a1300"/>`, 'Blade'],
  '4_twotone': [`<defs><clipPath id="c"><rect width="164" height="164" rx="38"/></clipPath></defs><g clip-path="url(#c)"><rect width="164" height="164" fill="#ffb000"/><path d="M164 0 L164 164 L0 164 Z" fill="#ff7a00"/></g>` + B(), 'Two-tone'],
};
for (const [k, [inner, label]] of Object.entries(concepts)) {
  await sharp(Buffer.from(frame(inner, label))).png().toFile(`${OUT}/logo_${k}.png`);
}
console.log('done');
