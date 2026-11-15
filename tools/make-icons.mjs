// 앱 아이콘 PNG 만들기 (Edge로 SVG를 그려서 저장)
import fs from 'node:fs/promises';
import { launch } from './shoot.mjs';

const mark = (fill = '#fff') => `
  <path d="M9 52.5h46" stroke="${fill}" stroke-width="3.4" stroke-linecap="round"/>
  <rect x="13.5" y="31" width="37" height="19" rx="5.5" fill="${fill}"/>
  <path d="M13.5 36.6c0-3.4 2.7-6.1 6.1-6.1h24.8c3.4 0 6.1 2.7 6.1 6.1v1.6c0 1.6-1.3 2.6-2.7 2.6-1.7 0-2.4-1.7-3.7-1.7s-2 3.2-4 3.2-2.4-3.2-4-3.2-2.3 2.2-4 2.2-2.3-2.2-4-2.2-2.1 3.2-4 3.2-2.6-3.2-4-3.2-2.1 1.7-3.7 1.7c-1.5 0-2.9-1-2.9-2.6z" fill="#FFD3E0"/>
  <circle cx="21" cy="45.5" r="1.6" fill="#F75C8D" opacity=".55"/><circle cx="32" cy="46.5" r="1.6" fill="#F75C8D" opacity=".55"/><circle cx="43" cy="45.5" r="1.6" fill="#F75C8D" opacity=".55"/>
  <path d="M32 27.6c-4.6-2.9-7.6-5.6-7.6-8.9 0-2.2 1.7-3.9 3.9-3.9 1.6 0 3 .9 3.7 2.2.7-1.3 2.1-2.2 3.7-2.2 2.2 0 3.9 1.7 3.9 3.9 0 3.3-3 6-7.6 8.9z" fill="${fill}"/>`;
const icon = (size, scale, rounded) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${size}" height="${size}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFA3C0"/><stop offset="1" stop-color="#F2558A"/></linearGradient></defs>
  <rect width="64" height="64" rx="${rounded ? 14 : 0}" fill="url(#g)"/>
  <g transform="translate(32 33) scale(${scale}) translate(-32 -33)">${mark()}</g></svg>`;

await fs.mkdir('public/icons', { recursive: true });
await fs.writeFile('public/icons/favicon.svg', icon(64, 0.95, true));
const browser = await launch();
const page = await browser.newPage();
for (const [name, size, scale] of [['icon-192.png', 192, 0.92], ['icon-512.png', 512, 0.92], ['maskable-512.png', 512, 0.7], ['apple-touch-icon.png', 180, 0.86]]) {
  await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
  await page.setContent(`<html><body style="margin:0">${icon(size, scale, false)}</body></html>`);
  await page.screenshot({ path: 'public/icons/' + name, omitBackground: false, clip: { x: 0, y: 0, width: size, height: size } });
  console.log('icon', name);
}
// 공유 미리보기 이미지 (1200x630)
await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
await page.setContent(`<html><head><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fredoka:wght@700&display=swap"></head><body style="margin:0;width:1200px;height:630px;display:flex;align-items:center;justify-content:center;gap:40px;background:radial-gradient(120% 90% at 50% 18%,#ffb4cb 0%,#ff7fa6 50%,#f25788 100%);font-family:Fredoka,sans-serif;color:#fff">
  <svg viewBox="0 0 64 64" width="220" height="220">${mark()}</svg>
  <div><div style="font-size:110px;font-weight:700;line-height:1">Dear Cake</div><div style="font-size:34px;margin-top:14px;font-family:sans-serif;font-weight:700;opacity:.95">보고 고르고, 본 그대로 받는 커스텀 케이크</div></div></body></html>`, { waitUntil: 'networkidle0' });
await page.screenshot({ path: 'public/og.png' });
await browser.close();
console.log('done');
