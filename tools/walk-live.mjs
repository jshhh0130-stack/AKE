// 폰 두 대 점검: 사장님 폰(A)과 손님 폰(B)을 서로 다른 브라우저 창으로 띄워 실제 중계 서버로 주문·대화를 주고받는다.
// 사용: node tools/walk-live.mjs [주소]
import fs from 'node:fs/promises';
import { launch } from './shoot.mjs';

const BASE = process.argv[2] || 'http://localhost:4173/';
const OUT = 'tools/shots';
await fs.mkdir(OUT, { recursive: true });
const browser = await launch();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];
async function phone(name) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|tile\.openstreetmap/.test(m.text())) errors.push(`${name} console: ` + m.text()); });
  page.on('pageerror', (e) => errors.push(`${name} page: ` + e.message));
  page.on('dialog', (d) => d.accept());
  const click = async (text, { exact = false, last = false } = {}) => {
    const ok = await page.evaluate((text, exact, last) => {
      const els = [...document.querySelectorAll('button, a, [role=button], label')].filter((e) => { const t = e.innerText.replace(/\s+/g, ' ').trim(); return exact ? t === text : t.includes(text); }).filter((e) => e.offsetParent !== null);
      const el = last ? els[els.length - 1] : els[0]; if (!el) return false; el.scrollIntoView({ block: 'center' }); el.click(); return true;
    }, text, exact, last);
    if (!ok) errors.push(`${name} click not found: ${text}`);
    await sleep(450); return ok;
  };
  const setVal = (sel, v, idx = 0) => page.evaluate((sel, v, idx) => { const el = document.querySelectorAll(sel)[idx]; if (!el) return false; const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); return true; }, sel, v, idx);
  const snap = async (n) => { await page.screenshot({ path: `${OUT}/live-${n}.png` }); console.log('shot', n); };
  const state = () => page.evaluate(() => JSON.parse(localStorage.getItem('dearcake:v2') || '{}'));
  const waitFor = async (fn, label, ms = 25000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await page.evaluate(fn)) return true; await sleep(500); } errors.push(`${name} timeout: ${label}`); return false; };
  return { page, click, setVal, snap, state, waitFor };
}

// ── A: 사장님이 실제 가게(미도리케이크)를 '우리 가게 찾기'로 등록 ──
const A = await phone('A');
await A.page.goto(BASE, { waitUntil: 'networkidle2' }); await sleep(2500);
await A.click('사장님용'); await sleep(600);
await A.setVal('input.inp', '미도리'); await sleep(400); await A.click('미도리케이크'); await sleep(500);
for (let i = 0; i < 3; i++) await A.click('다음', { exact: true });
await A.click('등록 완료'); await sleep(1200);
await A.page.evaluate(() => { location.hash = '#/o/shop/share'; }); await sleep(4000); await A.snap('A1-share');
const st = await A.state();
console.log('shopKeys', !!st.shopKeys, 'inbox', st.shopKeys?.inbox?.slice(0, 6));
// QR(짧은 링크)와 긴 링크 둘 다 만들어 본다
const links = await A.page.evaluate(async () => { const m = await import(document.querySelector('script[type=module]').src); return null; }).catch(() => null);
const qrLink = await A.page.evaluate(() => { const svg = document.querySelector('.qrbox'); return svg ? true : false; });
const full = await A.page.evaluate(async () => { const btn = [...document.querySelectorAll('button')].find((b) => b.innerText.includes('링크 복사')); return !!btn; });
// 링크는 화면에서 꺼내기 어렵기 때문에 같은 방법(상태 값)으로 직접 만든다: 짧은 링크 형식 = pack({v,i,n,x,y,b,k})
const code = await A.page.evaluate(async () => {
  const s = JSON.parse(localStorage.getItem('dearcake:v2')); const k = s.shopKeys;
  const obj = { v: 1, i: s.shop.id, n: s.shop.name, x: k.pub.x, y: k.pub.y, b: k.inbox, k: k.pk };
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  const z = new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer());
  let bin = ''; z.forEach((b) => { bin += String.fromCharCode(b); });
  return 'z' + btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
});
console.log('QR link length', (BASE + '#/j/' + code).length, 'qr shown', qrLink, 'copy btn', full);
await A.page.evaluate(() => { location.hash = '#/o'; }); await sleep(800);

// ── B: 손님이 QR(짧은 링크)을 열고 주문 ──
const B = await phone('B');
await B.page.goto(BASE + '#/j/' + code, { waitUntil: 'networkidle2' });
await B.waitFor(() => location.hash.startsWith('#/store/'), 'B store page after QR', 30000); await sleep(1200); await B.snap('B1-store');
const bst = await B.state();
console.log('B partner has menu', !!bst.partners?.['midori-cake']?.menu, 'syncedAt', !!bst.partners?.['midori-cake']?.syncedAt);
await B.click('주문서 작성하기'); await sleep(1200);
await B.setVal('.ai-box textarea', "다음주 토요일 오후 2시 1호 하늘색 하트, 문구는 '합격 축하해' 체리");
await B.click('채우기', { exact: true }); await sleep(900);
await B.click('문구 확인하고 주문 요청'); await sleep(800);
await B.page.evaluate(() => document.querySelector('.sheet .sh-b').scrollTo(0, 99999));
await B.page.evaluate(() => document.querySelectorAll('.sheet input[type=checkbox]').forEach((c) => { if (!c.checked) c.click(); }));
await B.setVal('.sheet input.inp', '박손님', 0); await B.setVal('.sheet input.inp', '010-2222-3333', 1); await sleep(300);
await B.click('사장님께 보내기'); await sleep(1500); await B.snap('B2-done');

// ── A: 주문 도착 확인 → 대화방 → 메시지·시안 ──
const got = await A.waitFor(() => (JSON.parse(localStorage.getItem('dearcake:v2')).orders || []).length > 0, 'A receives order', 30000);
console.log('A received order:', got);
await sleep(800); await A.snap('A2-home-with-order');
await A.page.evaluate(() => { const o = JSON.parse(localStorage.getItem('dearcake:v2')).orders[0]; location.hash = '#/o/order/' + o.id; }); await sleep(1200); await A.snap('A3-room');
const aOrder = (await A.state()).orders[0];
console.log('A order status', aOrder?.status, 'price', aOrder?.finalPrice, 'events', aOrder?.ev?.map((e) => e.t).join(','));
if (aOrder?.status === 'requested') { await A.click('승인', { last: true }); await sleep(600); }
await A.setVal('.composer input.inp', '주문 감사합니다! 초는 몇 개 넣어 드릴까요?'); await A.page.evaluate(() => document.querySelector('.cbtn.send')?.click()); await sleep(500);
await A.click('앱 시안으로 확인받기'); await sleep(800); await A.snap('A4-sent');

// ── B: 사장님 메시지·시안 도착 → 답장·시안 승인 ──
await B.page.evaluate(() => { const o = JSON.parse(localStorage.getItem('dearcake:v2')).orders[0]; location.hash = '#/c/order/' + o.id; });
const bGot = await B.waitFor(() => { const o = JSON.parse(localStorage.getItem('dearcake:v2')).orders[0]; return o.ev.some((e) => e.t === 'proof'); }, 'B receives proof', 30000);
await sleep(900); await B.snap('B3-room');
console.log('B got proof:', bGot, 'status', (await B.state()).orders[0].status);
await B.setVal('.composer input.inp', '3개 부탁드려요!'); await B.page.evaluate(() => document.querySelector('.cbtn.send')?.click()); await sleep(500);
await B.click('이대로 만들어 주세요'); await sleep(900);
const aGot = await A.waitFor(() => { const o = JSON.parse(localStorage.getItem('dearcake:v2')).orders[0]; return o.status === 'making' && o.ev.some((e) => e.t === 'msg' && e.by === 'c'); }, 'A receives reply + proofok', 30000);
await sleep(800); await A.snap('A5-room-after'); await B.snap('B4-room-after');
const fa = (await A.state()).orders[0], fb = (await B.state()).orders[0];
console.log('A final', fa.status, fa.ev.map((e) => e.t).join(','));
console.log('B final', fb.status, fb.ev.map((e) => e.t).join(','));
console.log('A notis', (await A.state()).notis.map((n) => n.title).slice(0, 5).join(' / '));
console.log('B notis', (await B.state()).notis.map((n) => n.title).slice(0, 5).join(' / '));
console.log('SAME EVENTS:', fa.ev.map((e) => e.id).sort().join() === fb.ev.map((e) => e.id).sort().join(), 'A got reply:', aGot);
await fs.writeFile(`${OUT}/errors-live.txt`, errors.join('\n') || 'no errors');
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no errors');
await browser.close();
