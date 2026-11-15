// 화면 확인용 스크린샷 도구 (설치된 Edge 브라우저를 그대로 사용)
// 사용: node tools/shoot.mjs <url|file> <out.png> [width] [height] [waitMs]
import puppeteer from 'puppeteer-core';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
export async function launch() {
  return puppeteer.launch({ executablePath: EDGE, headless: true, args: ['--no-first-run', '--disable-gpu', '--lang=ko-KR'] });
}
export async function shot(page, out) {
  await page.screenshot({ path: out });
  console.log('saved', out);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [, , target, out = 'tools/shots/out.png', w = '390', h = '844', wait = '1500'] = process.argv;
  const url = /^https?:/.test(target) ? target : pathToFileURL(path.resolve(target)).href;
  const browser = await launch();
  const page = await browser.newPage();
  await page.setViewport({ width: +w, height: +h, deviceScaleFactor: 1 });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 }).catch((e) => errors.push('goto: ' + e.message));
  await new Promise((r) => setTimeout(r, +wait));
  await shot(page, out);
  if (errors.length) console.log('ERRORS:\n' + errors.join('\n'));
  await browser.close();
}
