// 사진 읽기·줄이기 + 기기 안에서 하는 색 분석 (인터넷·AI 없이 동작)
import { CREAMS } from '../data/catalog.js';
import { hexToRgb, rgbToHex } from './util.js';

export function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { resolve(img); setTimeout(() => URL.revokeObjectURL(url), 2000); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('사진을 열 수 없어요')); };
    img.src = url;
  });
}
export function loadDataURL(src) {
  return new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = src; });
}
export function toDataURL(img, max = 480, q = 0.82, square = false) {
  const w0 = img.naturalWidth || img.width, h0 = img.naturalHeight || img.height;
  let sx = 0, sy = 0, sw = w0, sh = h0;
  if (square) { const m = Math.min(w0, h0); sx = (w0 - m) / 2; sy = (h0 - m) / 2; sw = sh = m; }
  const s = Math.min(1, max / Math.max(sw, sh));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(sw * s)); c.height = Math.max(1, Math.round(sh * s));
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', q);
}

const toLab = ([r, g, b]) => {
  const f = (c) => { c /= 255; return c > 0.04045 ? ((c + 0.055) / 1.055) ** 2.4 : c / 12.92; };
  const R = f(r), G = f(g), B = f(b);
  let x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047, y = R * 0.2126 + G * 0.7152 + B * 0.0722, z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const g3 = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  x = g3(x); y = g3(y); z = g3(z);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
};
const CREAM_LAB = CREAMS.map((c) => ({ ...c, lab: toLab(hexToRgb(c.hex)) }));
export function nearestCream(rgb) {
  const L = toLab(rgb);
  let best = CREAM_LAB[0], bd = 1e9;
  for (const c of CREAM_LAB) { const d = (c.lab[0] - L[0]) ** 2 * 0.6 + (c.lab[1] - L[1]) ** 2 + (c.lab[2] - L[2]) ** 2; if (d < bd) { bd = d; best = c; } }
  return { id: best.id, name: best.name, dist: Math.sqrt(bd) };
}
const hueOf = ([r, g, b]) => {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (!d) return { h: 0, s: 0, l: mx / 255 };
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60; if (h < 0) h += 360;
  return { h, s: d / mx, l: (mx + mn) / 510 };
};

export function analyzeImage(img) {
  const N = 72;
  const c = document.createElement('canvas'); c.width = N; c.height = N;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  const w0 = img.naturalWidth || img.width, h0 = img.naturalHeight || img.height, m = Math.min(w0, h0);
  ctx.drawImage(img, (w0 - m) / 2, (h0 - m) / 2, m, m, 0, 0, N, N);
  const data = ctx.getImageData(0, 0, N, N).data;
  const px = [];
  let srg = 0, syb = 0, srg2 = 0, syb2 = 0, wsum = 0;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = (y * N + x) * 4;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const dx = (x - N / 2) / (N / 2), dy = (y - N / 2) / (N / 2);
    const w = Math.max(0.15, 1 - 0.75 * Math.hypot(dx, dy)); // 가운데(케이크)에 무게
    px.push([r, g, b, w]);
    const rg = Math.abs(r - g), yb = Math.abs(0.5 * (r + g) - b);
    srg += rg * w; syb += yb * w; srg2 += rg * rg * w; syb2 += yb * yb * w; wsum += w;
  }
  const mrg = srg / wsum, myb = syb / wsum;
  const colorfulRaw = Math.sqrt(Math.max(0, srg2 / wsum - mrg * mrg) + Math.max(0, syb2 / wsum - myb * myb)) + 0.3 * Math.sqrt(mrg * mrg + myb * myb);
  const colorful = Math.min(1, colorfulRaw / 80);
  // k-means (k=5)
  const K = 5;
  const sorted = px.slice().sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]));
  let cent = Array.from({ length: K }, (_, k) => sorted[Math.floor(((k + 0.5) / K) * sorted.length)].slice(0, 3));
  let assign = new Array(px.length).fill(0);
  for (let it = 0; it < 10; it++) {
    for (let i = 0; i < px.length; i++) {
      let bi = 0, bd = 1e9;
      for (let k = 0; k < K; k++) { const d = (px[i][0] - cent[k][0]) ** 2 + (px[i][1] - cent[k][1]) ** 2 + (px[i][2] - cent[k][2]) ** 2; if (d < bd) { bd = d; bi = k; } }
      assign[i] = bi;
    }
    const acc = Array.from({ length: K }, () => [0, 0, 0, 0]);
    for (let i = 0; i < px.length; i++) { const a = acc[assign[i]], w = px[i][3]; a[0] += px[i][0] * w; a[1] += px[i][1] * w; a[2] += px[i][2] * w; a[3] += w; }
    cent = acc.map((a, k) => (a[3] ? [a[0] / a[3], a[1] / a[3], a[2] / a[3]] : cent[k]));
  }
  const weight = new Array(K).fill(0);
  for (let i = 0; i < px.length; i++) weight[assign[i]] += px[i][3];
  const total = weight.reduce((a, b) => a + b, 0);
  const raw = cent.map((rgb, k) => ({ rgb: rgb.map(Math.round), pct: weight[k] / total }))
    .filter((p) => p.pct > 0.03)
    .sort((a, b) => b.pct - a.pct)
    .map((p) => ({ hex: rgbToHex(...p.rgb), pct: Math.round(p.pct * 100), cream: nearestCream(p.rgb), hsl: hueOf(p.rgb) }));
  // 같은 크림 색으로 묶이는 색은 하나로 합친다
  const palette = [];
  for (const p of raw) { const same = palette.find((x) => x.cream.id === p.cream.id); if (same) same.pct += p.pct; else palette.push({ ...p }); }

  // 스타일 추측 (색 기반이라 정확하지 않음 → 화면에서 고칠 수 있게)
  const styles = new Set();
  let design = 'simple';
  const green = palette.some((p) => p.hsl.h > 75 && p.hsl.h < 165 && p.hsl.s > 0.25 && p.pct >= 5);
  const brown = palette.find((p) => p.hsl.h >= 10 && p.hsl.h <= 40 && p.hsl.l < 0.38 && p.hsl.s > 0.25 && p.pct >= 18);
  const pastel = palette.filter((p) => p.hsl.l > 0.72 && p.hsl.s > 0.12).length;
  if (colorful > 0.55) { styles.add('character'); design = 'character'; }
  if (green && palette.some((p) => (p.hsl.h > 300 || p.hsl.h < 20) && p.hsl.s > 0.3)) { styles.add('flower'); if (design === 'simple') design = 'flower'; }
  if (brown) design = design === 'simple' ? 'drip' : design;
  styles.add('lettering');
  if (pastel >= 2 && design === 'simple') design = 'vintage';
  // 크림 색 = 가운데 큰 색 중 배경(아주 밝은 회색·흰색)을 너무 우선하지 않게
  const creamPick = palette.find((p) => p.cream.id !== 'white' && p.pct >= 18) || palette[0];
  return {
    palette: palette.slice(0, 4).map(({ hex, pct, cream }) => ({ hex, pct, cream: cream.id, name: cream.name })),
    colorful: Math.round(colorful * 100) / 100,
    styles: [...styles],
    design,
    cream: creamPick?.cream.id || 'white',
    shape: null,
  };
}
