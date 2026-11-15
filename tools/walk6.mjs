// 6차 점검: 입점 전(공개 정보) 가게 주문 → 주문서 완성 → 복사·링크 → 주문내역
import fs from 'node:fs/promises';
import { launch } from './shoot.mjs';

const BASE = process.argv[2] || 'http://localhost:4173/';
const OUT = 'tools/shots';
const browser = await launch();
const ctx = browser.defaultBrowserContext();
await ctx.overridePermissions(new URL(BASE).origin, ['clipboard-read', 'clipboard-write']).catch(() => {});
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
page.on('pageerror', (e) => errors.push('page: ' + e.message));
page.on('dialog', (d) => d.accept());
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let n = 100;
const snap = async (name) => { n++; await page.screenshot({ path: `${OUT}/${n}-${name}.png` }); console.log('shot', n, name); };
async function click(text, { exact = false } = {}) {
  const ok = await page.evaluate((text, exact) => {
    const els = [...document.querySelectorAll('button, a, [role=button], label')].filter((e) => { const t = e.innerText.replace(/\s+/g, ' ').trim(); return exact ? t === text : t.includes(text); }).filter((e) => e.offsetParent !== null);
    if (!els[0]) return false; els[0].scrollIntoView({ block: 'center' }); els[0].click(); return true;
  }, text, exact);
  if (!ok) errors.push('click not found: ' + text);
  await sleep(450);
}
await page.goto(BASE, { waitUntil: 'networkidle2' });
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('dearcake:v1', JSON.stringify({ role: 'customer', seenGuide: true })); });
await page.goto(BASE + '#/order/midori-cake', { waitUntil: 'networkidle2' }); await sleep(2600);
await page.evaluate(() => { const ta = document.querySelector('.ai-box textarea'); const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set; set.call(ta, "다음주 토요일 오후 2시 도시락 민트, 문구는 '고생했어' 스프링클"); ta.dispatchEvent(new Event('input', { bubbles: true })); });
await click('채우기', { exact: true }); await sleep(800); await snap('pub-filled');
await click('문구 확인하고 주문 요청'); await sleep(700);
await page.evaluate(() => document.querySelector('.sheet .sh-b').scrollTo(0, 99999));
await page.evaluate(() => document.querySelectorAll('.sheet input[type=checkbox]').forEach((c) => { if (!c.checked) c.click(); }));
await page.evaluate(() => { const ins = document.querySelectorAll('.sheet input.inp'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(ins[0], '박손님'); ins[0].dispatchEvent(new Event('input', { bubbles: true })); });
await sleep(300); await snap('pub-confirm');
await click('주문서 완성하기'); await sleep(1200); await snap('pub-done');
await click('주문서 글 복사하기'); await sleep(800);
const clip = await page.evaluate(() => navigator.clipboard.readText().catch(() => '(읽기 불가)'));
console.log('CLIPBOARD:\n' + clip);
await page.evaluate(() => { location.hash = '#/c/orders'; }); await sleep(800); await snap('pub-orders');
await fs.writeFile(`${OUT}/errors6.txt`, errors.join('\n') || 'no errors');
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no errors');
await browser.close();
