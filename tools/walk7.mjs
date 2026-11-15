// 7차 점검: 예시 사진으로 체험하기 → 추천 결과
import { launch } from './shoot.mjs';

const BASE = process.argv[2] || 'http://localhost:4173/';
const browser = await launch();
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
page.on('pageerror', (e) => errors.push('page: ' + e.message));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const click = (t) => page.evaluate((t) => { const b = [...document.querySelectorAll('button')].find((x) => x.innerText.includes(t) && x.offsetParent); b?.click(); return !!b; }, t);
await page.goto(BASE, { waitUntil: 'networkidle2' });
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('dearcake:v1', JSON.stringify({ role: 'customer', seenGuide: true })); });
await page.goto(BASE + '#/c', { waitUntil: 'networkidle2' }); await sleep(2500);
await click('사진으로 찾기'); await sleep(600);
await page.screenshot({ path: 'tools/shots/111-photo-samples.png' });
if (!(await click('곰돌이 그림'))) errors.push('no sample button');
await sleep(1500);
await page.screenshot({ path: 'tools/shots/112-sample-analyzed.png' });
await click('비슷한 케이크 가게 보기'); await sleep(2000);
await page.screenshot({ path: 'tools/shots/113-sample-results.png' });
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no errors');
await browser.close();
