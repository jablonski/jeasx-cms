/** Minimal writers for the demo's binary files, so the repository needs none. */
import { crc32, deflateSync } from "node:zlib";

export interface GradientOptions {
  colors: string[];
  /** position of the light, 0 to 1 */
  glow: number[];
  waves: number;
}

/** Minimal one-page PDF with a title and lines of plain ASCII text. */
export function pdf(title: string, lines: string[]) {
  const escapeText = (s: string) => s.replace(/[\\()]/g, "\\$&");
  const content = [
    `BT /F1 26 Tf 72 730 Td (${escapeText(title)}) Tj ET`,
    ...lines.map((line, i) => `BT /F1 14 Tf 72 ${680 - i * 28} Td (${escapeText(line)}) Tj ET`),
  ].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets = objects.map((object, i) => {
    const offset = Buffer.byteLength(out);
    out += `${i + 1} 0 obj\n${object}\nendobj\n`;
    return offset;
  });
  const xref = Buffer.byteLength(out);
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  out += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return out;
}

/** Minimal ZIP archive (stored without compression). */
export function zip(files: Record<string, string | Buffer>) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const [name, content] of Object.entries(files)) {
    const data = Buffer.from(content);
    const path = Buffer.from(name);
    const fields = Buffer.alloc(22);
    fields.writeUInt16LE(20, 0); // version needed
    fields.writeUInt16LE(0x0800, 2); // UTF-8 names
    fields.writeUInt16LE(0x5821, 8); // DOS date 2024-01-01
    fields.writeUInt32LE(crc32(data), 10);
    fields.writeUInt32LE(data.length, 14);
    fields.writeUInt32LE(data.length, 18);
    const nameLength = Buffer.alloc(4);
    nameLength.writeUInt16LE(path.length, 0);
    const local = Buffer.concat([
      Buffer.from("PK\x03\x04", "latin1"),
      fields,
      nameLength,
      path,
      data,
    ]);
    const tail = Buffer.alloc(14);
    tail.writeUInt32LE(offset, 10);
    centrals.push(
      Buffer.concat([
        Buffer.from("PK\x01\x02\x14\x00", "latin1"),
        fields,
        nameLength,
        tail.subarray(0, 14),
        path,
      ]),
    );
    locals.push(local);
    offset += local.length;
  }
  const central = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.write("PK\x05\x06", 0, "latin1");
  end.writeUInt16LE(centrals.length, 8);
  end.writeUInt16LE(centrals.length, 10);
  end.writeUInt32LE(central.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, central, end]);
}

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const mix = (a: number[], b: number[], t: number) => a.map((v, i) => v + (b[i] - v) * t);

/**
 * Abstract artwork: diagonal gradient, soft glow and optional wave bands.
 * @param {number} width
 * @param {number} height
 * @param {{ colors: string[], glow: number[], waves: number }} options
 */
export function gradientPng(
  width: number,
  height: number,
  { colors, glow, waves }: GradientOptions,
) {
  const [c1, c2, c3] = colors.map(hex);
  const stride = width * 3;
  const pixels = Buffer.alloc(stride * height);
  // 4×4 ordered dither against banding; unlike random noise it repeats, so it compresses well.
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(
    (b) => (b / 16 - 0.5) * 1.5,
  );

  for (let y = 0; y < height; y++) {
    const v = y / height;
    for (let x = 0; x < width; x++) {
      const u = x / width;
      let c = mix(c1, c2, Math.min(1, u * 0.65 + v * 0.55));
      const dx = (u - glow[0]) * (width / height);
      const dy = v - glow[1];
      c = mix(c, c3, Math.exp(-(dx * dx + dy * dy) / 0.12) * 0.85);
      if (waves) {
        const band = Math.sin((v * waves + Math.sin(u * Math.PI * 2) * 0.18) * Math.PI * 2);
        c = mix(c, [255, 255, 255], Math.max(0, band) * 0.06);
      }
      const d = BAYER[(y & 3) * 4 + (x & 3)];
      const i = y * stride + x * 3;
      pixels[i] = Math.max(0, Math.min(255, Math.round(c[0] + d)));
      pixels[i + 1] = Math.max(0, Math.min(255, Math.round(c[1] + d)));
      pixels[i + 2] = Math.max(0, Math.min(255, Math.round(c[2] + d)));
    }
  }

  // PNG filter "Up" (2) per row: smooth vertical gradients become mostly small, repetitive values.
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const out = y * (stride + 1);
    raw[out] = 2;
    for (let i = 0; i < stride; i++) {
      const above = y > 0 ? pixels[(y - 1) * stride + i] : 0;
      raw[out + 1 + i] = (pixels[y * stride + i] - above) & 0xff;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.set([8, 2, 0, 0, 0], 8); // 8 bit, RGB
  return Buffer.concat([
    Buffer.from("89504e470d0a1a0a", "hex"),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 6 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function chunk(type: string, data: Buffer) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}
