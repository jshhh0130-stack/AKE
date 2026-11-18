// AI 실사 사진 · 그림판 점검: 지도 'AI로 케이크 가게 찾기' → 예시 사진 → AI 실사 → (무료 대기열이면) 예시 사진 고르기 → 그림판(그리기·글자) → 저장 → 가게 찾기
// + 주문서 그림판 · 관심 '내가 만든 사진' · 앱 열 때마다 역할 고르기
// 사용: node tools/walk-ai.mjs [주소] [--wait]   (--wait: 무료 대기열 사진이 완성될 때까지 최대 25분 기다려 확인)
import fs from 'node:fs/promises';
import { launch } from './shoot.mjs';

const BASE = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'http://localhost:4173/';
const WAIT = process.argv.includes('--wait');
const OUT = 'tools/shots';
await fs.mkdir(OUT, { recursive: true });
const browser = await launch();
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|tile|hf\.space|aihorde|googleapis|CORS|ERR_/.test(m.text())) errors.push('console: ' + m.text()); });
page.on('pageerror', (e) => errors.push('page: ' + e.message));
page.on('dialog', (d) => d.accept());
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let n = 0;
const snap = async (name) => { n++; await page.screenshot({ path: `${OUT}/ai-${String(n).padStart(2, '0')}-${name}.png` }); console.log('shot', n, name); };
const click = async (text, sel = 'button, a, [role=button]') => { const ok = await page.evaluate((text, sel) => { const els = [...document.querySelectorAll(sel)].filter((e) => e.innerText.replace(/\s+/g, ' ').trim().includes(text) && e.offsetParent !== null); const el = els[els.length - 1]; if (el) { el.scrollIntoView({ block: 'center' }); el.click(); return true; } return false; }, text, sel); if (!ok) errors.push('click not found: ' + text); await sleep(400); return ok; };
const q = (sel) => page.evaluate((sel) => { const el = document.querySelector(sel); if (el) { el.click(); return true; } return false; }, sel);
const st = () => page.evaluate(() => JSON.parse(localStorage.getItem('dearcake:v2') || '{}'));
// 그림판 캔버스 위에 선 긋기 (손가락 대신 포인터 이벤트)
async function drawLine(fx1, fy1, fx2, fy2) {
  const b = await page.evaluate(() => { const r = document.querySelector('.sk-area canvas').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  await page.mouse.move(b.x + b.w * fx1, b.y + b.h * fy1); await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(b.x + b.w * (fx1 + (fx2 - fx1) * i / 12), b.y + b.h * (fy1 + (fy2 - fy1) * i / 12 + Math.sin(i / 2) * 0.02));
  await page.mouse.up(); await sleep(200);
}
async function tapCanvas(fx, fy) { const b = await page.evaluate(() => { const r = document.querySelector('.sk-area canvas').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }); await page.mouse.click(b.x + b.w * fx, b.y + b.h * fy); await sleep(500); }

await page.goto(BASE, { waitUntil: 'networkidle2' });
await page.evaluate(() => localStorage.clear());
await page.goto(BASE, { waitUntil: 'networkidle2' });
await sleep(2600);
await click('고객용'); await sleep(2200); await click('건너뛰기'); await sleep(600); await snap('map-findbar');
// 앱을 다시 열면(새로고침) 역할 고르기부터
await page.reload({ waitUntil: 'networkidle2' }); await sleep(2600);
const hashAfterReload = await page.evaluate(() => location.hash);
console.log('after reload hash', hashAfterReload, hashAfterReload === '#/role' ? 'OK' : 'NOT ROLE');
if (hashAfterReload !== '#/role') errors.push('role screen not shown on reopen: ' + hashAfterReload);
await snap('reopen-role');
await click('고객용'); await sleep(1500);
// AI로 케이크 가게 찾기 → 예시 사진
await q('.findbar'); await sleep(700); await snap('find-sheet');
await click('하트 빈티지'); await sleep(1500); await snap('find-photo');
await click('AI 실사 사진 만들기'); await sleep(900); await snap('studio');
await page.evaluate(() => { const i = [...document.querySelectorAll('.sheet input.inp')].pop(); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, '체리 많이, 리본'); i.dispatchEvent(new Event('input', { bubbles: true })); });
await click('AI 실사 사진 만들기', '.sheet button.btn.pri');
// 결과 · 대기열 · 오류 중 하나가 나올 때까지
let outcome = '';
for (let i = 0; i < 90 && !outcome; i++) {
  await sleep(2000);
  outcome = await page.evaluate(() => (document.querySelector('.ai-out') ? 'result' : document.querySelector('.ai-wait b')?.innerText.includes('만드는 중이에요') ? 'queued' : ''));
}
const s1 = await st();
console.log('studio outcome:', outcome || 'none', '| jobs', (s1.aiJobs || []).length, '| pics', (s1.aiPics || []).length);
await snap('studio-' + (outcome || 'none'));
if (outcome !== 'result') { await page.evaluate(() => document.querySelector('.ai-sim button')?.click()); await sleep(800); }
await snap('studio-result');
// 그림판으로 고치기
await click('그림판으로 고치기'); await sleep(1500); await snap('sketch-open');
await click('크림', '.sk-tools button'); await drawLine(0.25, 0.35, 0.75, 0.35);
await click('펜', '.sk-tools button'); await drawLine(0.3, 0.7, 0.7, 0.72);
await click('글자', '.sk-tools button'); await tapCanvas(0.5, 0.5);
await page.evaluate(() => { const t = document.querySelector('.sheet textarea'); const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set; set.call(t, '생일 축하해'); t.dispatchEvent(new Event('input', { bubbles: true })); });
await click('손글씨', '.sheet .chip'); await sleep(300); await snap('sketch-text');
await click('넣기', '.sh-f button'); await sleep(700);
await click('되돌리기', '.sk-tools button'); await sleep(300); await click('다시', '.sk-tools button'); await sleep(400);
await snap('sketch-drawn');
await click('저장', '.sk-top button'); await sleep(1200); await snap('studio-edited');
await click('이 사진으로 가게 찾기'); await sleep(1500); await snap('find-with-edited');
await click('보기', '.sh-f button'); await sleep(1800); await snap('map-found');
const s2 = await st();
console.log('find photo made:', !!s2.find?.photo?.made, '| pics now', (s2.aiPics || []).length, (s2.aiPics || []).map((p) => p.engine + (p.edited ? '*' : '')).join(','));
// 관심 › 내가 만든 사진
await page.evaluate(() => { location.hash = '#/c/saved?cat=mine'; }); await sleep(1400); await snap('mine');
await page.evaluate(() => [...document.querySelectorAll('.mi[role=button]')][0]?.click()); await sleep(1200); await snap('mine-detail');
// 주문서: 그림판 (시안 위에)
await page.evaluate(() => { location.hash = '#/order/holiday-cake'; }); await sleep(1500);
await click('그림판', '.oprev .tools button'); await sleep(1500); await snap('order-sketch');
await click('크림', '.sk-tools button'); await drawLine(0.3, 0.3, 0.7, 0.32);
await click('저장', '.sk-top button'); await sleep(1500); await snap('order-after-sketch');
const s3 = await page.evaluate(() => !!document.querySelector('.ai-box') && !!JSON.parse(localStorage.getItem('dearcake:v2') || '{}'));
await click('AI 실사', '.oprev .tools button'); await sleep(1500); await snap('order-studio');
const inputs = await page.evaluate(() => [...document.querySelectorAll('.sheet .ai-in .chip')].map((c) => c.innerText));
console.log('order studio inputs:', inputs.join(' / '), s3 ? '' : '');
await page.evaluate(() => document.querySelector('.backdrop')?.click()); await sleep(500);
// 설정 화면
await page.evaluate(() => { location.hash = '#/settings'; }); await sleep(900);
await page.evaluate(() => [...document.querySelectorAll('.card')].find((c) => c.innerText.includes('AI 실사 사진'))?.scrollIntoView()); await sleep(300); await snap('settings-ai');

if (WAIT && (await st()).aiJobs?.length) {
  console.log('waiting for queued AI photo…');
  for (let i = 0; i < 150; i++) { await sleep(10000); const s = await st(); if (!(s.aiJobs || []).length) { console.log('queued photo done after', (i + 1) * 10, 's; pics', (s.aiPics || []).map((p) => p.engine).join(',')); break; } if (i % 6 === 0) console.log('  still waiting', JSON.stringify((s.aiJobs || []).map((j) => [j.queue, j.wait]))); }
  await page.evaluate(() => { location.hash = '#/c/saved?cat=mine'; }); await sleep(1500); await snap('mine-after-wait');
}
await fs.writeFile(`${OUT}/ai-errors.txt`, errors.join('\n') || 'no errors');
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no errors');
await browser.close();
