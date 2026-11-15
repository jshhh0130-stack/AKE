// 앱을 실제로 눌러 보며 화면을 찍고 오류를 모으는 점검 도구
// 사용: (먼저 npx vite preview --port 4173) → node tools/walk.mjs [baseUrl]
import fs from 'node:fs/promises';
import { launch } from './shoot.mjs';

const BASE = process.argv[2] || 'http://localhost:4173/';
const OUT = 'tools/shots';
await fs.mkdir(OUT, { recursive: true });
const browser = await launch();
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('pageerror', (e) => errors.push('page: ' + e.message));
page.on('dialog', (d) => d.accept());
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let n = 0;
const snap = async (name) => { n++; const p = `${OUT}/${String(n).padStart(2, '0')}-${name}.png`; await page.screenshot({ path: p }); console.log('shot', p); };
async function click(text, { exact = false, nth = 0, within = null } = {}) {
  const ok = await page.evaluate((text, exact, nth, within) => {
    const root = within ? document.querySelector(within) : document;
    const els = [...root.querySelectorAll('button, a, [role=button], label')].filter((e) => { const t = e.innerText.replace(/\s+/g, ' ').trim(); return exact ? t === text : t.includes(text); }).filter((e) => e.offsetParent !== null);
    const el = els[nth];
    if (!el) return false;
    el.scrollIntoView({ block: 'center' });
    el.click();
    return true;
  }, text, exact, nth, within);
  if (!ok) errors.push(`click not found: ${text}`);
  await sleep(350);
  return ok;
}
const typeIn = async (sel, text) => { await page.click(sel, { clickCount: 3 }).catch(() => errors.push('no input ' + sel)); await page.keyboard.type(text); await sleep(200); };

await page.goto(BASE, { waitUntil: 'networkidle2' });
await page.evaluate(() => localStorage.clear());
await page.goto(BASE, { waitUntil: 'networkidle2' });
await sleep(400); await snap('splash');
await sleep(2200); await snap('role');
await click('고객용'); await sleep(500); await snap('guide1');
for (let i = 0; i < 4; i++) await click('다음', { exact: true });
await snap('guide5');
await click('내 주변 케이크 찾기'); await sleep(2500); await snap('map-home');
// 가게 카드 두 번 눌러 상세로
await page.evaluate(() => document.querySelector('.scard')?.click()); await sleep(600); await snap('map-selected');
await page.evaluate(() => document.querySelector('.scard')?.click()); await sleep(1500); await snap('store-detail');
await page.evaluate(() => document.querySelector('.scroll').scrollTo(0, 700)); await sleep(500); await snap('store-detail-2');
// 체험 공방으로 주문 (앱 주문)
await page.evaluate(() => { location.hash = '#/order/demo-dearcake'; }); await sleep(1200); await snap('order-top');
await click('채우기', { exact: true }); await sleep(200);
await page.evaluate(() => { const ta = document.querySelector('.ai-box textarea'); const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set; set.call(ta, "토요일 오후 3시 1호 핑크 하트, 문구는 '생일 축하해 지민아' 체리 올리고 초도 넣어주세요"); ta.dispatchEvent(new Event('input', { bubbles: true })); });
await sleep(200); await click('채우기', { exact: true }); await sleep(800); await snap('order-ai-filled');
// 픽업 섹션
await click('픽업 날짜'); await sleep(300);
await page.evaluate(() => { const b = [...document.querySelectorAll('#sec-pickup .chips .opt')].find((x) => !x.disabled); b?.click(); }); await sleep(300);
await page.evaluate(() => { const b = [...document.querySelectorAll('#sec-pickup .opts .opt')].find((x) => !x.disabled); b?.click(); }); await sleep(400);
await snap('order-pickup');
await click('디자인 · 모양'); await sleep(300); await snap('order-design');
await click('시안 3가지'); await sleep(800); await snap('variants');
await page.keyboard.press('Escape'); await page.evaluate(() => document.querySelector('.backdrop')?.click()); await sleep(500);
await click('문구 확인하고 주문 요청'); await sleep(800); await snap('confirm-top');
await page.evaluate(() => document.querySelector('.sheet .sh-b').scrollTo(0, 99999)); await sleep(300);
await page.evaluate(() => document.querySelectorAll('.sheet input[type=checkbox]').forEach((c) => { if (!c.checked) c.click(); }));
await page.evaluate(() => { const ins = document.querySelectorAll('.sheet input.inp'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(ins[0], '정테스트'); ins[0].dispatchEvent(new Event('input', { bubbles: true })); set.call(ins[1], '010-1234-5678'); ins[1].dispatchEvent(new Event('input', { bubbles: true })); });
await sleep(300); await snap('confirm-bottom');
await click('사장님께 보내기'); await sleep(1200); await snap('order-done');
await click('사장님 화면에서 받아 보기'); await sleep(1200); await snap('owner-order');
await page.evaluate(() => { location.hash = '#/o'; }); await sleep(1000); await snap('owner-home');
await page.evaluate(() => { location.hash = '#/o/orders'; }); await sleep(800); await snap('owner-orders');
await click('달력', { exact: true }); await sleep(500); await snap('owner-calendar');
await page.evaluate(() => { location.hash = '#/o/sales'; }); await sleep(800); await snap('owner-sales');
await page.evaluate(() => { location.hash = '#/o/shop'; }); await sleep(800); await snap('owner-shop');
await page.evaluate(() => { location.hash = '#/o/shop/menu'; }); await sleep(800); await snap('owner-menu');
await page.evaluate(() => { location.hash = '#/o/setup'; }); await sleep(800); await snap('owner-setup');
await page.evaluate(() => { location.hash = '#/c/orders'; }); await sleep(800); await snap('my-orders');
// 공개 가게 주문(외부 전달)
await page.evaluate(() => { location.hash = '#/order/holiday-cake'; }); await sleep(1000); await snap('order-public');
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await page.evaluate(() => { location.hash = '#/c'; }); await sleep(2500); await snap('desktop');
await fs.writeFile(`${OUT}/errors.txt`, errors.join('\n') || 'no errors');
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no errors');
await browser.close();
