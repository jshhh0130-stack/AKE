// 4차 점검: 선물 주문 → 선물 카드 화면, 공유 주문서 링크 → 사장님 주문함
import zlib from 'node:zlib';
import fs from 'node:fs/promises';
import { launch } from './shoot.mjs';

const BASE = process.argv[2] || 'http://localhost:4173/';
const OUT = 'tools/shots';
const pack = (obj) => 'z' + zlib.deflateRawSync(Buffer.from(JSON.stringify(obj))).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const o = { shape: 'heart', size: 'h1', design: 'vintage', cream: 'pink', flavor: 'vanilla', text: '생일 축하해 지민아', noText: false, font: 'pen', textColor: 'berry', toppings: ['cherry'], extras: ['candle'], date: '2026-11-21', time: '15:00', request: '', allergy: '' };
const gift = pack({ v: 1, s: 'holiday-cake', sn: '홀리데이케이크', o, g: { to: '지민', msg: '생일 축하해! 맛있게 먹어 🎂', from: '수환' } });
const order = pack({ v: 1, id: 'DC-1121-1234', s: 'demo-dearcake', sn: '디어케이크 체험 공방', at: new Date().toISOString(), o, c: { n: '김테스트', p: '010-0000-1111' }, e: [47000, 47000, 'menu'] });

const browser = await launch();
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('pageerror', (e) => errors.push('page: ' + e.message));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await page.goto(BASE + '#/g/' + gift, { waitUntil: 'networkidle2' }); await sleep(2600);
await page.screenshot({ path: `${OUT}/71-gift.png` }); console.log('shot gift');
await page.evaluate(() => { localStorage.setItem('dearcake:v1', JSON.stringify({ role: 'owner', seenGuide: true })); });
await page.goto(BASE + '#/o/setup', { waitUntil: 'networkidle2' }); await sleep(2400);
await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.includes('체험용 가게로 둘러보기'))?.click()); await sleep(800);
await page.evaluate((c) => { location.hash = '#/s/' + c; }, order); await sleep(1200);
await page.screenshot({ path: `${OUT}/72-shared-order.png` }); console.log('shot shared');
await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.includes('주문함에 넣기'))?.click()); await sleep(1000);
await page.screenshot({ path: `${OUT}/73-imported.png` }); console.log('shot imported');
await fs.writeFile(`${OUT}/errors4.txt`, errors.join('\n') || 'no errors');
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no errors');
await browser.close();
