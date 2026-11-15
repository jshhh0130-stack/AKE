// 5차 점검: 사장님 편집 화면 전부 · 새 가게 등록 · 주소 검색 · 주변 가게 더 찾기 · 이름 검색
import fs from 'node:fs/promises';
import { launch } from './shoot.mjs';

const BASE = process.argv[2] || 'http://localhost:4173/';
const OUT = 'tools/shots';
const browser = await launch();
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' && !/favicon|tile\.openstreetmap|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
page.on('pageerror', (e) => errors.push('page: ' + e.message));
page.on('dialog', (d) => d.accept());
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let n = 80;
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
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('dearcake:v1', JSON.stringify({ role: 'owner', seenGuide: true })); });
await page.goto(BASE + '#/o/setup', { waitUntil: 'networkidle2' }); await sleep(2500);
// 새로 등록하기
await click('새로 등록하기'); await sleep(500);
await page.type('input.inp', '테스트 케이크 공방'); await sleep(200);
await click('다음', { exact: true }); await click('평균 가격으로 채우기'); await snap('new-menu');
await click('다음', { exact: true }); await snap('new-ops');
await click('다음', { exact: true }); await click('예시 넣기'); await sleep(300); await snap('new-look');
await click('등록 완료'); await sleep(1200); await snap('new-home');
for (const sec of ['info', 'ops', 'look', 'notice', 'portfolio', 'form', 'share']) {
  await page.evaluate((s) => { location.hash = '#/o/shop/' + s; }, sec); await sleep(800); await snap('edit-' + sec);
}
// 손님 화면에서 내 가게 보이는지
await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('dearcake:v1')); s.role = 'customer'; localStorage.setItem('dearcake:v1', JSON.stringify(s)); });
await page.goto(BASE + '#/c', { waitUntil: 'networkidle2' }); await sleep(2500);
await page.evaluate(() => [...document.querySelectorAll('.chips .chip')][0]?.click()); await sleep(300);
await page.type('.maptop input.inp', '테스트'); await sleep(600); await snap('search-mine');
await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === '닫기')?.click()); await sleep(300);
// 주소 검색 (OpenStreetMap)
await click('아주대학교 근처'); await sleep(400);
await page.type('.sheet input.inp', '광교중앙역'); await click('검색', { exact: true }); await sleep(3500); await snap('loc-search');
await page.evaluate(() => document.querySelector('.sheet .list-row')?.click()); await sleep(1500);
// 주변 가게 더 찾기 (공개 지도 데이터)
await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.innerText.includes('이 근처 케이크 가게 더 찾기')); b?.scrollIntoView(); b?.click(); }); await sleep(9000); await snap('find-more');
const found = await page.evaluate(() => JSON.parse(localStorage.getItem('dearcake:v1')).found?.length || 0);
console.log('found stores:', found);
await fs.writeFile(`${OUT}/errors5.txt`, errors.join('\n') || 'no errors');
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no errors');
await browser.close();
