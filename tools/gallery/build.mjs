// 받은 예시 사진(tools/gallery/raw)을 앱용으로 만들기: 크기 줄이기(큰 720px · 작은 360px) + 한글 문구 얹기 + 목록 파일
// 사용: node tools/gallery/build.mjs   →  public/gallery/*.webp, public/gallery/s/*.webp, src/data/gallery.json
import fs from 'node:fs/promises';
import { launch } from '../shoot.mjs';
import { ITEMS } from './items.mjs';

const RAW = 'tools/gallery/raw';
await fs.mkdir('public/gallery/s', { recursive: true });
const have = [];
for (const it of ITEMS) { try { await fs.access(`${RAW}/${it.id}.webp`); have.push(it); } catch { /* 아직 없음 */ } }
console.log('items with photos', have.length, '/', ITEMS.length);

const browser = await launch();
const page = await browser.newPage();
await page.setContent(`<html><head><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Jua&family=Nanum+Pen+Script&family=Gaegu:wght@700&family=Hi+Melody&family=Gowun+Dodum&display=swap"></head><body></body></html>`, { waitUntil: 'networkidle0' });
await page.evaluate(async () => { for (const f of ["32px 'Jua'", "32px 'Nanum Pen Script'", "700 32px 'Gaegu'", "32px 'Hi Melody'", "32px 'Gowun Dodum'"]) await document.fonts.load(f, '생일 축하해'); });

const out = [];
for (const it of have) {
  const b64 = (await fs.readFile(`${RAW}/${it.id}.webp`)).toString('base64');
  const r = await page.evaluate(async (src, ov) => {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
    const W0 = img.naturalWidth, H0 = img.naturalHeight;
    const c = document.createElement('canvas'); c.width = W0; c.height = H0;
    const ctx = c.getContext('2d'); ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0);
    if (ov) {
      // 케이크 위에 크림으로 짠 것 같은 한글 문구
      const size = ov.size * W0, lh = size * 1.12;
      const weight = /Gaegu/.test(ov.font) ? '700 ' : '';
      const y0 = ov.cy * H0 - ((ov.lines.length - 1) * lh) / 2;
      const t = document.createElement('canvas'); t.width = W0; t.height = H0;
      const x = t.getContext('2d');
      x.font = `${weight}${size}px '${ov.font}'`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round'; x.lineCap = 'round';
      x.fillStyle = ov.color; x.strokeStyle = ov.color; x.lineWidth = size * 0.075;
      ov.lines.forEach((l, i) => { x.strokeText(l, W0 / 2, y0 + i * lh); x.fillText(l, W0 / 2, y0 + i * lh); });
      x.globalCompositeOperation = 'source-atop';
      ov.lines.forEach((_, i) => {
        const yy = y0 + i * lh;
        const g = x.createLinearGradient(0, yy - size * 0.55, 0, yy + size * 0.55);
        g.addColorStop(0, 'rgba(255,255,255,0.42)'); g.addColorStop(0.42, 'rgba(255,255,255,0)'); g.addColorStop(0.75, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.18)');
        x.fillStyle = g; x.fillRect(0, yy - size * 0.75, W0, size * 1.5);
      });
      ctx.save(); ctx.shadowColor = 'rgba(70,40,30,0.38)'; ctx.shadowBlur = size * 0.07; ctx.shadowOffsetY = size * 0.045; ctx.drawImage(t, 0, 0); ctx.restore();
    }
    const scaled = (w, q) => { const h = Math.round(H0 * w / W0); const s = document.createElement('canvas'); s.width = w; s.height = h; const sx = s.getContext('2d'); sx.imageSmoothingQuality = 'high'; sx.drawImage(c, 0, 0, w, h); return s.toDataURL('image/webp', q); };
    // 자리 표시 색 (평균색)
    const m = document.createElement('canvas'); m.width = 8; m.height = 8; const mx = m.getContext('2d'); mx.drawImage(c, 0, 0, 8, 8);
    const d = mx.getImageData(0, 0, 8, 8).data; let R = 0, G = 0, B = 0; for (let i = 0; i < d.length; i += 4) { R += d[i]; G += d[i + 1]; B += d[i + 2]; }
    const n = d.length / 4, hex = '#' + [R, G, B].map((v) => Math.round(v / n).toString(16).padStart(2, '0')).join('');
    return { L: scaled(720, 0.8), S: scaled(360, 0.74), W0, H0, hex };
  }, 'data:image/webp;base64,' + b64, it.ov || null);
  await fs.writeFile(`public/gallery/${it.id}.webp`, Buffer.from(r.L.split(',')[1], 'base64'));
  await fs.writeFile(`public/gallery/s/${it.id}.webp`, Buffer.from(r.S.split(',')[1], 'base64'));
  out.push({ id: it.id, t: it.t, tags: it.tags, st: it.st, d: it.d, sh: it.sh, cr: it.cr, tp: it.tp, sz: it.sz, w: r.W0, h: r.H0, c: r.hex });
  console.log('built', it.id);
}
await browser.close();
// 보기 좋게 섞기 (같은 종류가 몰리지 않게, 항상 같은 순서)
const h = (s) => { let x = 2166136261; for (const ch of s) { x ^= ch.charCodeAt(0); x = Math.imul(x, 16777619); } return x >>> 0; };
const groups = {};
for (const o of out) (groups[o.id.split('-')[0]] ||= []).push(o);
Object.values(groups).forEach((g) => g.sort((a, b) => h(a.id) - h(b.id)));
const order = [];
const keys = Object.keys(groups).sort((a, b) => h(a) - h(b));
for (let i = 0; order.length < out.length; i++) for (const k of keys) if (groups[k][i]) order.push(groups[k][i]);
await fs.writeFile('src/data/gallery.json', JSON.stringify({
  note: '관심 탭 예시 사진. 공개 AI 모델 FLUX.1 [schnell](Apache-2.0)로 만든 예시이며 실제 가게 작품이 아님. 만드는 법: tools/gallery/README.md',
  items: order,
}, null, 0).replace(/},{/g, '},\n{'));
console.log('gallery.json', order.length);
