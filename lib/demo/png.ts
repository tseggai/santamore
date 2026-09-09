import { deflateSync } from "node:zlib";

// A dependency-free PNG encoder for demo placeholder photos: a two-colour
// vertical gradient with a lighter disc in the middle, so demo avatars read
// as "a picture" on the leaderboard without shipping anyone's real face.

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Buffer {
  const typeBytes = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBytes, Buffer.from(data)])));
  return Buffer.concat([length, typeBytes, Buffer.from(data), crc]);
}

export type Rgb = [number, number, number];

/** Encode a `size`×`size` RGB PNG: gradient from `top` to `bottom` with a soft disc of `accent`. */
export function gradientPng(size: number, top: Rgb, bottom: Rgb, accent: Rgb): Buffer {
  const stride = size * 3 + 1; // filter byte + RGB
  const raw = Buffer.alloc(stride * size);
  const centre = size / 2;
  const radius = size * 0.34;
  for (let y = 0; y < size; y += 1) {
    const mix = y / (size - 1);
    raw[y * stride] = 0; // filter: none
    for (let x = 0; x < size; x += 1) {
      const dx = x - centre;
      const dy = y - centre;
      const inside = Math.sqrt(dx * dx + dy * dy) < radius;
      const offset = y * stride + 1 + x * 3;
      for (let channel = 0; channel < 3; channel += 1) {
        const base = Math.round(top[channel] + (bottom[channel] - top[channel]) * mix);
        raw[offset + channel] = inside
          ? Math.round(base * 0.35 + accent[channel] * 0.65)
          : base;
      }
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", new Uint8Array(0)),
  ]);
}
