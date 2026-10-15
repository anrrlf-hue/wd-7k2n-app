import fs from 'node:fs';
import { createRequire } from 'node:module';
const sharp = createRequire(import.meta.url)('sharp');

const [label, file, debugFile] = process.argv.slice(2);
if (!label || !file || !debugFile) throw new Error('usage: node scripts/test-palm-landmark-principal-lines.mjs <label> <local-image> <local-debug-json>');
const cases = [[label, file, debugFile]];

function cropPoint(p, d) {
  const t = d.raw.transform, c = Math.cos(t.angle), s = Math.sin(t.angle);
  const dx = p.x - t.center.x, dy = p.y - t.center.y;
  let x = dx * c - dy * s - t.min.x, y = dx * s + dy * c - t.min.y;
  if (t.mirrored) x = t.width - x;
  return { x, y };
}

function imagePoint(x, y, d) {
  const t = d.raw.transform, c = Math.cos(t.angle), s = Math.sin(t.angle);
  if (t.mirrored) x = t.width - x;
  const rx = x + t.min.x, ry = y + t.min.y;
  return { x: t.center.x + rx * c + ry * s, y: t.center.y - rx * s + ry * c };
}

function luminance(data, w, x, y) {
  x = Math.max(0, Math.min(w - 1, Math.round(x))); y = Math.max(0, Math.min(data.length / 3 / w - 1, Math.round(y)));
  const i = (y * w + x) * 3; return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
}

function ridgeScore(data, w, x, y, dx, dy) {
  const center = luminance(data, w, x, y);
  const side = (luminance(data, w, x - dy * 4, y + dx * 4) + luminance(data, w, x + dy * 4, y - dx * 4)) / 2;
  const along = (luminance(data, w, x - dx * 3, y - dy * 3) + luminance(data, w, x + dx * 3, y + dy * 3)) / 2;
  return Math.max(-40, side - center) + Math.max(-20, along - center) * 0.35;
}

for (const [label, file, debugFile] of cases) {
  const d = JSON.parse(fs.readFileSync(debugFile, 'utf8'));
  const t = d.raw.transform, cropW = t.width, cropH = t.height;
  const source = await sharp(file).resize({ width: d.source.width, height: d.source.height }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const crop = Buffer.alloc(cropW * cropH * 3);
  for (let y = 0; y < cropH; y++) for (let x = 0; x < cropW; x++) {
    const p = imagePoint(x + 0.5, y + 0.5, d); const sx = Math.max(0, Math.min(source.info.width - 1, Math.round(p.x))); const sy = Math.max(0, Math.min(source.info.height - 1, Math.round(p.y)));
    const si = (sy * source.info.width + sx) * 3, di = (y * cropW + x) * 3;
    crop[di] = source.data[si]; crop[di + 1] = source.data[si + 1]; crop[di + 2] = source.data[si + 2];
  }
  const landmarks = d.source.landmarks.map((p) => cropPoint(p, d));
  const thumb = landmarks[2], index = landmarks[5], wrist = landmarks[0];
  const start = { x: (thumb.x + index.x) / 2, y: (thumb.y + index.y) / 2 };
  const direction = { x: wrist.x - start.x, y: wrist.y - start.y }; const dl = Math.hypot(direction.x, direction.y); direction.x /= dl; direction.y /= dl;
  const candidates = [];
  for (let along = -80; along <= 100; along += 4) for (let across = -100; across <= 100; across += 4) {
    const x = start.x + direction.x * along - direction.y * across, y = start.y + direction.y * along + direction.x * across;
    if (x < 8 || y < 8 || x >= cropW - 8 || y >= cropH - 8) continue;
    candidates.push({ x, y, score: ridgeScore(crop, cropW, x, y, direction.x, direction.y) });
  }
  candidates.sort((a, b) => b.score - a.score);
  const seed = candidates[0];
  const path = [seed]; let current = seed;
  for (let step = 0; step < 180; step++) {
    const next = []; const base = { x: current.x + direction.x * 4, y: current.y + direction.y * 4 };
    const tangent = { x: direction.x, y: direction.y };
    for (let across = -36; across <= 36; across += 3) for (let turn = -0.25; turn <= 0.25; turn += 0.125) {
      const c = Math.cos(turn), s = Math.sin(turn); const tx = tangent.x * c - tangent.y * s, ty = tangent.x * s + tangent.y * c;
      const x = base.x - ty * across, y = base.y + tx * across;
      if (x < 8 || y < 8 || x >= cropW - 8 || y >= cropH - 8) continue;
      const score = ridgeScore(crop, cropW, x, y, tx, ty) - Math.abs(across) * 0.16;
      next.push({ x, y, score, tx, ty });
    }
    next.sort((a, b) => b.score - a.score); if (!next[0] || next[0].score < 2) break;
    current = next[0]; direction.x = current.tx; direction.y = current.ty; path.push(current);
    if (current.y > cropH - 80) break;
  }
  const line = path.map(({ x, y }) => imagePoint(x, y, d));
  fs.writeFileSync(`/tmp/${label}-principal-result.json`, JSON.stringify({ label, source: d.source, start, seed, points: path.length, end: path.at(-1), meanScore: path.reduce((s, p) => s + (p.score ?? 0), 0) / path.length, line }));
  const overlay = await sharp(file).resize({ width: d.source.width, height: d.source.height }).composite([{ input: Buffer.from(`<svg width="${d.source.width}" height="${d.source.height}"><polyline points="${line.map(p => `${p.x},${p.y}`).join(' ')}" fill="none" stroke="#ff1744" stroke-width="8"/></svg>`) }]).png().toBuffer();
  await sharp(overlay).toFile(`/tmp/${label}-principal-overlay.png`);
  console.log(label, { seed, points: path.length, end: path.at(-1), meanScore: path.reduce((s, p) => s + (p.score ?? 0), 0) / path.length });
}

