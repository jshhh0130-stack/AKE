// 케이크 예시 사진 만들기: 공개 AI 모델 FLUX.1 [schnell] (Apache-2.0) 허깅페이스 스페이스 사용
// 사용: node tools/gallery/fetch.mjs [id ...]   (이미 받은 사진은 건너뜀, --force 로 다시 받기)
import fs from 'node:fs/promises';
import { ITEMS } from './items.mjs';

const BASE = 'https://black-forest-labs-flux-1-schnell.hf.space';
const RAW = 'tools/gallery/raw';
const args = process.argv.slice(2);
const force = args.includes('--force');
const only = args.filter((a) => !a.startsWith('--'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await fs.mkdir(RAW, { recursive: true });

async function gen(it) {
  const r = await fetch(`${BASE}/gradio_api/call/infer`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: [it.p, it.seed, false, it.w, it.h, 4] }) });
  const j = await r.json().catch(() => null);
  if (!j?.event_id) throw new Error('post ' + r.status + ' ' + JSON.stringify(j).slice(0, 160));
  const txt = await (await fetch(`${BASE}/gradio_api/call/infer/${j.event_id}`)).text();
  const m = txt.match(/"url":\s*"([^"]+)"/);
  if (!m) throw new Error('no image: ' + txt.replace(/\s+/g, ' ').slice(0, 220));
  const res = await fetch(m[1]);
  return Buffer.from(await res.arrayBuffer());
}

let ok = 0, fail = 0;
for (const it of ITEMS) {
  if (only.length && !only.includes(it.id)) continue;
  const out = `${RAW}/${it.id}.webp`;
  if (!force) { try { await fs.access(out); continue; } catch { /* 새로 받기 */ } }
  let done = false;
  for (let a = 0; a < 4 && !done; a++) {
    const t = Date.now();
    try {
      const b = await gen(it);
      await fs.writeFile(out, b);
      console.log('ok', it.id, b.length, ((Date.now() - t) / 1000).toFixed(1) + 's');
      ok++; done = true;
    } catch (e) {
      console.log('retry', it.id, a + 1, e.message);
      await sleep(/quota|exceeded/i.test(e.message) ? 120000 : 8000 * (a + 1));
    }
  }
  if (!done) fail++;
  await sleep(1500);
}
console.log(`done ok=${ok} fail=${fail}`);
