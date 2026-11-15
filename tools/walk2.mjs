// 2차 점검: 사진으로 찾기 · 위치 고르기 · 시안 3가지 · 사장님 가게 찾기 등록
import fs from 'node:fs/promises';
import path from 'node:path';
import { launch } from './shoot.mjs';

const BASE = process.argv[2] || 'http://localhost:4173/';
const OUT = 'tools/shots';
const browser = await launch();
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('pageerror', (e) => errors.push('page: ' + e.message));
page.on('dialog', (d) => d.accept());
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let n = 40;
const snap = async (name) => { n++; const p = `${OUT}/${n}-${name}.png`; await page.screenshot({ path: p }); console.log('shot', p); };
async function click(text, { exact = false } = {}) {
  const ok = await page.evaluate((text, exact) => {
    const els = [...document.querySelectorAll('button, a, [role=button], label')].filter((e) => { const t = e.innerText.replace(/\s+/g, ' ').trim(); return exact ? t === text : t.includes(text); }).filter((e) => e.offsetParent !== null);
    if (!els[0]) return false; els[0].scrollIntoView({ block: 'center' }); els[0].click(); return true;
  }, text, exact);
  if (!ok) errors.push('click not found: ' + text);
  await sleep(400);
}
await page.goto(BASE, { waitUntil: 'networkidle2' });
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('dearcake:v1', JSON.stringify({ role: 'customer', seenGuide: true })); });
await page.goto(BASE + '#/c', { waitUntil: 'networkidle2' });
await sleep(2600);
// 위치 시트
await click('아주대학교 근처'); await sleep(500); await snap('loc-sheet');
await click('인계동'); await sleep(1500); await snap('map-ingye');
// 사진으로 찾기
await click('사진으로 찾기'); await sleep(500); await snap('photo-sheet');
const img = path.resolve('tools/shots/gallery.png');
const [fc] = await Promise.all([page.waitForFileChooser({ timeout: 5000 }), click('앨범에서 사진 고르기')]);
await fc.accept([img]); await sleep(1500); await snap('photo-analyzed');
await page.evaluate(() => document.querySelector('.sheet .sh-b').scrollTo(0, 9999)); await sleep(300); await snap('photo-analyzed-2');
await click('비슷한 케이크 가게 보기'); await sleep(2200); await snap('map-photo-results');
// 첫 가게 주문서(사진 반영 확인)
await page.evaluate(() => { const c = document.querySelector('.scard'); c.click(); c.click(); }); await sleep(1500);
await click('주문서 작성하기'); await sleep(1500); await snap('order-from-photo');
await click('시안 3가지'); await sleep(900); await snap('variants');
await page.evaluate(() => document.querySelector('.backdrop')?.click()); await sleep(500);
// 사장님 등록: 우리 가게 찾기
await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('dearcake:v1')); s.role = 'owner'; s.shop = null; localStorage.setItem('dearcake:v1', JSON.stringify(s)); });
await page.goto(BASE + '#/o/setup', { waitUntil: 'networkidle2' }); await sleep(1500);
await page.type('input.inp', '미도리'); await sleep(400); await snap('setup-search');
await click('미도리케이크'); await sleep(600); await snap('setup-1');
await click('다음', { exact: true }); await sleep(500); await snap('setup-2');
await click('다음', { exact: true }); await sleep(500); await snap('setup-3');
await click('다음', { exact: true }); await sleep(500); await snap('setup-4');
await click('등록 완료'); await sleep(1500); await snap('owner-home-new');
await page.evaluate(() => { location.hash = '#/store/midori-cake'; }); await sleep(1500); await snap('store-claimed');
await fs.writeFile(`${OUT}/errors2.txt`, errors.join('\n') || 'no errors');
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no errors');
await browser.close();
