// 3차 점검: 가게 비교 · 시장 데이터 · 가게에 물어보기 · 사장님 입금 확인
import fs from 'node:fs/promises';
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
let n = 60;
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
await page.goto(BASE + '#/c', { waitUntil: 'networkidle2' }); await sleep(2500);
await click('비교', { exact: true });
await page.evaluate(() => { const c = document.querySelectorAll('.scard'); c[0].click(); c[1].click(); c[3].click(); }); await sleep(400); await snap('compare-pick');
await click('나란히 비교하기'); await sleep(700); await snap('compare-sheet');
await page.evaluate(() => document.querySelector('.backdrop')?.click()); await sleep(400);
await page.evaluate(() => { location.hash = '#/insight'; }); await sleep(900); await snap('insight-1');
await page.evaluate(() => document.querySelector('.scroll').scrollTo(0, 820)); await sleep(300); await snap('insight-2');
await page.evaluate(() => document.querySelector('.scroll').scrollTo(0, 1700)); await sleep(300); await snap('insight-3');
await page.evaluate(() => { location.hash = '#/store/holiday-cake'; }); await sleep(1200);
await click('당일 주문 돼요?'); await click('휴무일은?'); await sleep(300);
await page.evaluate(() => { const h = [...document.querySelectorAll('.sec-t h3')].find((x) => x.innerText.includes('물어보기')); h?.scrollIntoView(); }); await sleep(300); await snap('ask-box');
// 사장님 체험 → 확정 주문 입금 확인
await page.evaluate(() => { location.hash = '#/o/setup'; }); await sleep(800);
await click('체험용 가게로 둘러보기'); await sleep(1000);
await page.evaluate(() => { location.hash = '#/o/orders'; }); await sleep(700);
await click('진행 중'); await sleep(500); await snap('owner-doing');
await page.evaluate(() => { const c = [...document.querySelectorAll('.ocard')].find((x) => x.innerText.includes('확정')); c?.click(); }); await sleep(900);
await page.evaluate(() => document.querySelector('.scroll').scrollTo(0, 99999)); await sleep(300); await snap('owner-paid-before');
await click('입금 확인', { exact: true }); await sleep(500); await snap('owner-paid-after');
await fs.writeFile(`${OUT}/errors3.txt`, errors.join('\n') || 'no errors');
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no errors');
await browser.close();
