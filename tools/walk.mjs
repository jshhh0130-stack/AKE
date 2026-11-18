// 화면 자동 점검 (한 기기): 시작 → 찾기 → 가게 → 주문서 → 대화방 → 사장님(체험) → 매출·장부
// 사용: node node_modules/vite/bin/vite.js preview --port 4173  →  node tools/walk.mjs [주소]
import fs from 'node:fs/promises';
import { launch } from './shoot.mjs';

const BASE = process.argv[2] || 'http://localhost:4173/';
const OUT = 'tools/shots';
await fs.mkdir(OUT, { recursive: true });
const browser = await launch();
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|tile\.openstreetmap/.test(m.text())) errors.push('console: ' + m.text()); });
page.on('pageerror', (e) => errors.push('page: ' + e.message));
page.on('dialog', (d) => d.accept());
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let n = 0;
const snap = async (name) => { n++; await page.screenshot({ path: `${OUT}/${String(n).padStart(2, '0')}-${name}.png` }); console.log('shot', n, name); };
async function click(text, { exact = false, last = false } = {}) {
  const ok = await page.evaluate((text, exact, last) => {
    let els = [...document.querySelectorAll('button, a, [role=button], label')].filter((e) => { const t = e.innerText.replace(/\s+/g, ' ').trim(); return exact ? t === text : t.includes(text); }).filter((e) => e.offsetParent !== null);
    const el = last ? els[els.length - 1] : els[0];
    if (!el) return false; el.scrollIntoView({ block: 'center' }); el.click(); return true;
  }, text, exact, last);
  if (!ok) errors.push('click not found: ' + text);
  await sleep(450);
  return ok;
}
const setVal = (sel, v, idx = 0) => page.evaluate((sel, v, idx) => { const el = document.querySelectorAll(sel)[idx]; if (!el) return false; const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); return true; }, sel, v, idx);
const hash = (h) => page.evaluate((h) => { location.hash = h; }, h);

await page.goto(BASE, { waitUntil: 'networkidle2' });
await page.evaluate(() => localStorage.clear());
await page.goto(BASE, { waitUntil: 'networkidle2' });
await sleep(2600); await snap('role');
await click('고객용'); await sleep(2200); await snap('home-tour');
await click('건너뛰기'); await sleep(800); await snap('home');
// 핀 하나 선택 → 옆으로 넘기는 가게 카드
await page.evaluate(() => document.querySelector('.pin2')?.click()); await sleep(900); await snap('home-pin-card');
await page.evaluate(() => document.querySelector('.mlistbtn')?.click()); await sleep(500);
// 검색: 가게 이름(줄임말) · 말로 조건
await page.evaluate(() => document.querySelector('.msearch')?.click()); await sleep(600);
await setVal('.srch input', '제델'); await sleep(500); await snap('search-store');
await setVal('.srch input', '인계동 4만원대 캐릭터 케이크'); await sleep(500); await snap('search-cond');
await click('조건으로 찾기'); await sleep(1800); await snap('find-results');
// 위치 공유 창
await page.evaluate(() => document.querySelectorAll('.mfab')[1]?.click()); await sleep(600); await snap('share-sheet');
await page.evaluate(() => document.querySelector('.backdrop')?.click()); await sleep(500);
// 사진으로 찾기 (예시 사진)
await page.evaluate(() => document.querySelector('.findbar .fc')?.click()); await sleep(700);
await click('초기화'); await click('하트 빈티지'); await sleep(1500); await snap('find-photo');
await click('보기'); await sleep(1800); await snap('find-photo-results');
// 관심: 케이크 둘러보기 → 하트 → 자세히 → 이 케이크 만드는 가게 찾기
await hash('#/c/saved'); await sleep(1500); await snap('interest');
await page.evaluate(() => document.querySelector('.mi .heart')?.click()); await sleep(400);
await setVal('.feedtop input', '곰돌이'); await sleep(600); await snap('interest-search');
await setVal('.feedtop input', ''); await sleep(300);
await page.evaluate(() => document.querySelector('.mi')?.click()); await sleep(1400); await snap('cake-detail');
await click('이 케이크 만드는 가게 찾기'); await sleep(2000); await snap('cake-find-stores');
await page.evaluate(() => { location.hash = '#/c/saved?tab=store'; }); await sleep(900); await snap('interest-stores');
// 가게 상세 → 주문서 (가격 공개 가게: 홀리데이케이크)
await hash('#/store/holiday-cake'); await sleep(1500); await snap('store');
await page.evaluate(() => document.querySelector('.scroll').scrollTo(0, 900)); await sleep(400); await snap('store-2');
await click('주문서 쓰기'); await sleep(1200);
await setVal('.ai-box textarea', "다음주 토요일 오후 3시 1호 핑크 하트, 문구는 '생일 축하해 지민아' 체리 올리고 초도 넣어주세요");
await click('채우기', { exact: true }); await sleep(900); await snap('order-filled');
await click('시안 3가지'); await sleep(800); await snap('variants');
await page.evaluate(() => document.querySelector('.backdrop')?.click()); await sleep(500);
await click('문구 확인하고 주문 요청'); await sleep(800);
await page.evaluate(() => document.querySelector('.sheet .sh-b').scrollTo(0, 99999));
await page.evaluate(() => document.querySelectorAll('.sheet input[type=checkbox]').forEach((c) => { if (!c.checked) c.click(); }));
await setVal('.sheet input.inp', '정테스트', 0); await setVal('.sheet input.inp', '010-1234-5678', 1); await sleep(300); await snap('confirm');
await click('주문서 완성하기'); await sleep(1300); await snap('done-external');
// 체험: 이 가게 사장님 화면
await click('사장님 화면에서 받아 보기'); await sleep(1300); await snap('owner-room-new');
await click('승인', { last: true }); await sleep(700); await snap('owner-room-confirmed');
await click('앱 시안으로 확인받기'); await sleep(700);
await setVal('.composer input.inp', '혹시 초는 몇 개 넣어 드릴까요?'); await page.evaluate(() => document.querySelector('.cbtn.send')?.click()); await sleep(600); await snap('owner-room-proof');
// 손님으로 돌아가 대화방 확인
await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('dearcake:v2')); s.role = 'customer'; localStorage.setItem('dearcake:v2', JSON.stringify(s)); });
await page.goto(BASE, { waitUntil: 'networkidle2' }); await page.reload({ waitUntil: 'networkidle2' }); await sleep(2500); await hash('#/c/orders'); await sleep(900); await snap('cust-orders');
await page.evaluate(() => document.querySelector('.ocard')?.click()); await sleep(900); await snap('cust-room-proof');
await click('수정 요청', { exact: true }); await sleep(500); await click('문구 수정'); await setVal('.sheet textarea', '지민아를 조금 더 크게 해 주세요'); await sleep(200); await snap('cust-prooffix');
await click('수정 요청 보내기'); await sleep(700);
await click('주문 내용 고치기'); await sleep(600); await setVal('.sheet input.inp', '생일 축하해 지민'); await sleep(300); await snap('cust-revise');
await click('수정 요청 보내기'); await sleep(800); await snap('cust-room-after');
// 알림함
await hash('#/c'); await sleep(2200); await page.evaluate(() => document.querySelector('.bell')?.click()); await sleep(600); await snap('noti-sheet');
await page.evaluate(() => document.querySelector('.backdrop')?.click()); await sleep(400);
// 사장님: 예시 주문 넣고 매출·장부·근무기록
await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('dearcake:v2')); s.role = 'owner'; localStorage.setItem('dearcake:v2', JSON.stringify(s)); });
await page.goto(BASE, { waitUntil: 'networkidle2' }); await page.reload({ waitUntil: 'networkidle2' }); await sleep(2400); await hash('#/o/shop'); await sleep(900);
await click('예시 주문 넣어 보기'); await sleep(600);
await hash('#/o'); await sleep(900); await snap('owner-home');
await hash('#/o/orders'); await sleep(800); await snap('owner-orders');
await hash('#/o/sales'); await sleep(900); await snap('sales-month');
await page.evaluate(() => { const b = [...document.querySelectorAll('.bars .bar')].filter((x) => !x.classList.contains('zero'))[2]; b?.click(); }); await sleep(400); await snap('sales-bar-selected');
await click('이번 주', { exact: true }); await sleep(400); await snap('sales-week');
await click('월별 장부', { exact: true }); await sleep(500); await snap('book');
await page.evaluate(() => document.querySelector('.scroll').scrollTo(0, 620)); await sleep(300); await snap('book-table');
await click('근무기록', { exact: true }); await sleep(500);
await click('근무 기록 추가'); await sleep(500); await snap('work-add'); await click('저장', { exact: true }); await sleep(500);
await click('직원·시급'); await sleep(400); await setVal('.sheet input.inp', '김알바', 1); await click('추가', { exact: true }); await sleep(300); await snap('work-staff');
await page.evaluate(() => document.querySelector('.backdrop')?.click()); await sleep(400); await snap('work');
await hash('#/o/shop/share'); await sleep(3500); await snap('share-qr');
await hash('#/o/shop'); await sleep(700); await snap('owner-shop');
await hash('#/settings'); await sleep(700); await snap('settings');
await hash('#/insight'); await sleep(900); await snap('insight');
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('dearcake:v2')); s.role = 'customer'; localStorage.setItem('dearcake:v2', JSON.stringify(s)); });
await page.goto(BASE, { waitUntil: 'networkidle2' }); await page.reload({ waitUntil: 'networkidle2' }); await sleep(2600); await snap('desktop-role'); await click('고객용'); await sleep(1500); await snap('desktop');
await fs.writeFile(`${OUT}/errors.txt`, errors.join('\n') || 'no errors');
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no errors');
await browser.close();
