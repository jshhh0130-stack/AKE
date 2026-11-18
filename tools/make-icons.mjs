// 에이크(AKE) 로고로 앱 아이콘·파비콘·공유 이미지 만들기 (Edge 캔버스로 자르고 줄여서 저장)
// 원본: ../AKE_로고_초앞_투명.png (팀이 만든 로고, 투명 배경)
import fs from 'node:fs/promises';
import path from 'node:path';
import { launch } from './shoot.mjs';

const SRC = path.resolve('..', 'AKE_로고_초앞_투명.png');
const CREAM = '#FFFDF9';
const b64 = (await fs.readFile(SRC)).toString('base64');
await fs.mkdir('public/icons', { recursive: true });
await fs.mkdir('public/brand', { recursive: true });

const browser = await launch();
const page = await browser.newPage();
await page.setContent('<html><body></body></html>');
const out = await page.evaluate(async (src, CREAM) => {
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  const W = img.naturalWidth, H = img.naturalHeight;
  const c0 = document.createElement('canvas'); c0.width = W; c0.height = H;
  const x0 = c0.getContext('2d', { willReadFrequently: true }); x0.drawImage(img, 0, 0);
  const a = x0.getImageData(0, 0, W, H).data;
  const col = new Uint8Array(W), row = new Uint8Array(H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (a[(y * W + x) * 4 + 3] > 16) { col[x] = 1; row[y] = 1; }
  let minX = col.indexOf(1), maxX = col.lastIndexOf(1), minY = row.indexOf(1), maxY = row.lastIndexOf(1);
  // 초(맨 왼쪽 덩어리) 범위
  let cEnd = minX; let gap = 0;
  for (let x = minX; x <= maxX; x++) { if (col[x]) { cEnd = x; gap = 0; } else if (++gap > 24) break; }
  let cMinY = H, cMaxY = 0;
  for (let y = 0; y < H; y++) for (let x = minX; x <= cEnd; x++) if (a[(y * W + x) * 4 + 3] > 16) { if (y < cMinY) cMinY = y; if (y > cMaxY) cMaxY = y; break; }
  const crop = (sx, sy, sw, sh, outW, outH, { bg = null, fit = 1, pad = 0, radius = 0, type = 'image/png', q } = {}) => {
    const c = document.createElement('canvas'); c.width = outW; c.height = outH;
    const x = c.getContext('2d'); x.imageSmoothingQuality = 'high';
    if (bg) {
      if (radius) { x.beginPath(); x.roundRect(0, 0, outW, outH, radius); x.fillStyle = bg; x.fill(); }
      else { x.fillStyle = bg; x.fillRect(0, 0, outW, outH); }
    }
    const s = Math.min((outW * fit - pad * 2) / sw, (outH * fit - pad * 2) / sh);
    const dw = sw * s, dh = sh * s;
    x.drawImage(img, sx, sy, sw, sh, (outW - dw) / 2, (outH - dh) / 2, dw, dh);
    return c.toDataURL(type, q);
  };
  const lw = maxX - minX + 1, lh = maxY - minY + 1;
  const P = Math.round(lh * 0.04);
  const logo = { sx: minX - P, sy: minY - P, sw: lw + P * 2, sh: lh + P * 2 };
  const candle = { sx: minX - P, sy: cMinY - P, sw: cEnd - minX + 1 + P * 2, sh: cMaxY - cMinY + 1 + P * 2 };
  const L = (w, h, o) => crop(logo.sx, logo.sy, logo.sw, logo.sh, w, h, o);
  const C = (w, h, o) => crop(candle.sx, candle.sy, candle.sw, candle.sh, w, h, o);
  const lwOut = 960, lhOut = Math.round(960 * logo.sh / logo.sw);
  const cwOut = Math.round(320 * candle.sw / candle.sh);
  return {
    info: { W, H, minX, maxX, minY, maxY, cEnd, cMinY, cMaxY },
    'brand/logo.webp': L(lwOut, lhOut, { type: 'image/webp', q: 0.92 }),
    'brand/logo.png': L(480, Math.round(480 * logo.sh / logo.sw)),
    'brand/candle.webp': C(cwOut, 320, { type: 'image/webp', q: 0.92 }),
    'icons/icon-192.png': L(192, 192, { bg: CREAM, fit: 0.86 }),
    'icons/icon-512.png': L(512, 512, { bg: CREAM, fit: 0.86 }),
    'icons/maskable-512.png': L(512, 512, { bg: CREAM, fit: 0.66 }),
    'icons/apple-touch-icon.png': L(180, 180, { bg: CREAM, fit: 0.84 }),
    'icons/favicon-64.png': C(64, 64, { bg: CREAM, fit: 0.84, radius: 14 }),
    'icons/favicon-32.png': C(32, 32, { bg: CREAM, fit: 0.86, radius: 7 }),
  };
}, 'data:image/png;base64,' + b64, CREAM);
console.log(out.info);
for (const [k, v] of Object.entries(out)) {
  if (k === 'info') continue;
  await fs.writeFile('public/' + k, Buffer.from(v.split(',')[1], 'base64'));
  console.log('saved', k);
}
await fs.rm('public/icons/favicon.svg', { force: true });

// 공유 미리보기 이미지 (1200x630)
const logoData = 'data:image/webp;base64,' + (await fs.readFile('public/brand/logo.webp')).toString('base64');
await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
await page.setContent(`<html><head><link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"></head>
<body style="margin:0;width:1200px;height:630px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:34px;background:${CREAM};font-family:'Pretendard Variable',sans-serif;color:#3D2A2A">
  <img src="${logoData}" style="width:620px">
  <div style="font-size:38px;font-weight:700;letter-spacing:-0.5px">C는 비워 뒀어요. 당신이 채우는 순간, CAKE가 됩니다.</div>
  <div style="font-size:24px;color:#84726F">사진으로 찾고, 가격 먼저 보고, 사장님과 바로 대화하는 커스텀 케이크 앱</div>
</body></html>`, { waitUntil: 'networkidle0' });
await page.screenshot({ path: 'public/og.png' });
console.log('saved og.png');
await browser.close();
