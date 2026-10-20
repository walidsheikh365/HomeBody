// Generates the PWA / iOS icons as PNGs with zero dependencies.
// Design: a rising ochre sun over a terracotta horizon on warm linen.
// Run with: npm run icons
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const BG = [0xf6, 0xf1, 0xe7];
const SUN = [0xc0, 0x8a, 0x42];
const HORIZON = [0xb5, 0x65, 0x4a];

const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePNG(size, rgb) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    rgb.copy(raw, y * (size * 3 + 1) + 1, y * size * 3, (y + 1) * size * 3);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** scale < 1 shrinks the artwork toward the centre (for maskable safe zones). */
function draw(size, scale = 1) {
  const SS = 4; // supersampling for smooth edges
  const out = Buffer.alloc(size * size * 3);
  const sunR = 0.22 * scale;
  const sunCy = 0.5 - 0.05 * scale;
  const barW = 0.6 * scale;
  const barH = 0.075 * scale;
  const barY = 0.5 + 0.24 * scale;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = (x + (sx + 0.5) / SS) / size;
          const v = (y + (sy + 0.5) / SS) / size;
          let c = BG;
          const dx = u - 0.5, dy = v - sunCy;
          if (dx * dx + dy * dy <= sunR * sunR) c = SUN;
          // rounded horizon bar
          const hx = Math.max(Math.abs(u - 0.5) - (barW / 2 - barH / 2), 0);
          const hy = v - barY;
          if (hx * hx + hy * hy <= (barH / 2) ** 2) c = HORIZON;
          r += c[0]; g += c[1]; b += c[2];
        }
      }
      const i = (y * size + x) * 3;
      const n = SS * SS;
      out[i] = Math.round(r / n);
      out[i + 1] = Math.round(g / n);
      out[i + 2] = Math.round(b / n);
    }
  }
  return encodePNG(size, out);
}

mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/icon-192.png', draw(192));
writeFileSync('public/icons/icon-512.png', draw(512));
writeFileSync('public/icons/apple-touch-icon.png', draw(180));
writeFileSync('public/icons/maskable-512.png', draw(512, 0.78));
console.log('Icons written to public/icons');
