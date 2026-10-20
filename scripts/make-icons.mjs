// Generates the PWA icons with no dependencies (manual PNG encoder).
// Usage: node scripts/make-icons.mjs
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function hex(h) {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}

// Distance from point to segment, for hand drawing.
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

// scale: fraction of the canvas the drawing may occupy (0.8 for the maskable safe zone).
function draw(size, scale) {
  const buf = Buffer.alloc(size * size * 4);
  const c = size / 2;
  const r = (size / 2) * scale * 0.9;
  const ring = Math.max(2, r * 0.09);
  const white = hex("#F2F2F7");
  const blue = hex("#8FB8DE");
  const hourEnd = [c + r * 0.02, c - r * 0.5];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x + 0.5 - c, y + 0.5 - c);
      let col = [0, 0, 0];
      if (Math.abs(d - r) <= ring / 2) col = white;
      if (segDist(x + 0.5, y + 0.5, c, c, hourEnd[0], hourEnd[1]) <= ring * 0.45) col = white;
      if (segDist(x + 0.5, y + 0.5, c, c, c + r * 0.62, c - r * 0.02) <= ring * 0.4) col = blue;
      const i = (y * size + x) * 4;
      buf[i] = col[0];
      buf[i + 1] = col[1];
      buf[i + 2] = col[2];
      buf[i + 3] = 255;
    }
  }
  return buf;
}

mkdirSync("public/icons", { recursive: true });
const out = [
  ["public/apple-touch-icon.png", 180, 1],
  ["public/icons/icon-192.png", 192, 1],
  ["public/icons/icon-512.png", 512, 1],
  ["public/icons/icon-maskable-512.png", 512, 0.8],
];
for (const [path, size, scale] of out) {
  writeFileSync(path, encodePng(size, draw(size, scale)));
  console.log("wrote", path);
}
