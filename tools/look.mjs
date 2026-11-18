// 디자인 확인용 빠른 스크린샷: 첫 화면 → 지도(안내) → 검색 → 핀 카드 → 관심 → 케이크 → 가게 → 마이
// 사용: node tools/look.mjs [주소]   → tools/shots/look-*.png
import fs from 'node:fs/promises';
import { launch } from './shoot.mjs';

const BASE = process.argv[2] || 'http://localhost:4173/';
const OUT = 'tools/shots';
await fs.mkdir(OUT, { recursive: true });
const browser = await launch();
const page = await browser.newPage();
const [VW, VH] = (process.env.SIZE || '390x844').split('x').map(Number); // 작은 폰 확인: SIZE=360x740
await page.setViewport({ width: VW, height: VH, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|tile/.test(m.text())) errors.push('console: ' + m.text()); });
page.on('pageerror', (e) => errors.push('page: ' + e.message));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let n = 0;
const snap = async (name) => { n++; await page.screenshot({ path: `${OUT}/look-${String(n).padStart(2, '0')}-${name}.png` }); console.log('shot', n, name); };
const click = (text, sel = 'button, a, [role=button]') => page.evaluate((text, sel) => { const el = [...document.querySelectorAll(sel)].find((e) => e.innerText.replace(/\s+/g, ' ').trim().includes(text) && e.offsetParent !== null); if (el) { el.click(); return true; } return false; }, text, sel);
const q = (sel) => page.evaluate((sel) => { const el = document.querySelector(sel); if (el) { el.click(); return true; } return false; }, sel);

await page.goto(BASE, { waitUntil: 'networkidle2' });
await page.evaluate(() => localStorage.clear());
await page.goto(BASE, { waitUntil: 'networkidle2' });
await sleep(700); await snap('splash');
await sleep(2200); await snap('role');
await click('고객용'); await sleep(2600); await snap('tour-1');
for (let i = 2; i <= 5; i++) { await click('다음'); await sleep(900); await snap('tour-' + i); }
await click('시작하기'); await sleep(800); await snap('map');
await q('.pin2.pub'); await sleep(900); await snap('map-card');
await q('.mlistbtn'); await sleep(500);
await q('.msearch'); await sleep(500); await snap('search-empty');
await page.type('.srch input', '제델'); await sleep(500); await snap('search-store');
await page.evaluate(() => { const i = document.querySelector('.srch input'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, '영통 4만원대 캐릭터'); i.dispatchEvent(new Event('input', { bubbles: true })); }); await sleep(400); await snap('search-cond');
await click('조건으로 찾기'); await sleep(1500); await snap('map-found');
await q('.mfab:nth-child(2)'); await sleep(600); await snap('share-sheet');
await page.evaluate(() => document.querySelector('.backdrop')?.click()); await sleep(500);
await page.evaluate(() => { location.hash = '#/c/saved'; }); await sleep(1500); await snap('interest');
await page.evaluate(() => document.querySelector('.scroll').scrollTo(0, 700)); await sleep(800); await snap('interest-2');
await q('.mi'); await sleep(1500); await snap('cake');
await page.evaluate(() => document.querySelector('.scroll').scrollTo(0, 800)); await sleep(800); await snap('cake-2');
await page.evaluate(() => { location.hash = '#/store/holiday-cake'; }); await sleep(1500); await snap('store');
await page.evaluate(() => document.querySelector('.scroll').scrollTo(0, 650)); await sleep(500); await snap('store-2');
await page.evaluate(() => { location.hash = '#/c/my'; }); await sleep(1000); await snap('my');
await page.evaluate(() => { location.hash = '#/c/orders'; }); await sleep(800); await snap('orders');
await page.evaluate(() => { location.hash = '#/order/holiday-cake'; }); await sleep(1500); await snap('order');
await fs.writeFile(`${OUT}/look-errors.txt`, errors.join('\n') || 'no errors');
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no errors');
await browser.close();
