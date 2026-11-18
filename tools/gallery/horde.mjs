// 케이크 예시 사진 만들기 (2): AI Horde(무료 공개 생성망)의 FLUX.1 [schnell] 모델로 여러 장을 한꺼번에 줄 세워 받기
// 허깅페이스 무료 사용량이 끝났을 때 쓴다. 이름 없이(익명) 요청해서 줄이 길 수 있다(한 장에 10~20분).
// 사용: node tools/gallery/horde.mjs [id ...]   (이미 받은 사진은 건너뜀)
import fs from 'node:fs/promises';
import { ITEMS } from './items.mjs';

const H = { 'Content-Type': 'application/json', apikey: '0000000000', 'Client-Agent': 'aike-cake-app:0.3:anon' };
const API = 'https://aihorde.net/api/v2';
const RAW = 'tools/gallery/raw';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const only = process.argv.slice(2).filter((a) => !a.startsWith('--'));
let MAX = +(process.env.MAXPAR || 16);
await fs.mkdir(RAW, { recursive: true });
const exists = async (p) => { try { await fs.access(p); return true; } catch { return false; } };

const todo = [];
// --variants=N : 고른 사진을 seed를 바꿔 N장씩 만들어 raw/<id>~<seed>.webp 로 저장 (글자가 들어간 사진 고르기용)
const VAR = +(process.argv.find((a) => a.startsWith('--variants='))?.split('=')[1] || 0);
if (VAR) { for (const it of ITEMS) if (only.includes(it.id)) for (let v = 0; v < VAR; v++) todo.push({ ...it, seed: it.seed + v * 1000, id: `${it.id}~${it.seed + v * 1000}` }); }
else for (const it of ITEMS) if ((!only.length || only.includes(it.id)) && !(await exists(`${RAW}/${it.id}.webp`))) todo.push(it);
console.log('todo', todo.length);

async function submit(it) {
  const body = { prompt: it.p, params: { width: it.w, height: it.h, steps: 4, cfg_scale: 1, sampler_name: 'k_euler', n: 1, seed: String(it.seed) }, models: ['Flux.1-Schnell fp8 (Compact)'], r2: true, nsfw: false, censor_nsfw: true, shared: false };
  const r = await fetch(`${API}/generate/async`, { method: 'POST', headers: H, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!j.id) throw new Error(`${r.status} ${j.rc || ''} ${j.message || JSON.stringify(j).slice(0, 160)}`);
  return j.id;
}
const active = new Map();
let k = 0, ok = 0, fail = 0;
const tries = {};
while (k < todo.length || active.size) {
  while (active.size < MAX && k < todo.length) {
    const it = todo[k];
    try { const id = await submit(it); active.set(it.id, { it, id, t0: Date.now() }); k++; console.log('queued', it.id); await sleep(700); }
    catch (e) {
      console.log('submit fail', it.id, e.message);
      if (/429|TooMany|Parallel|limit/i.test(e.message)) { MAX = Math.max(1, active.size); break; }
      k++; fail++;
    }
  }
  await sleep(12000);
  for (const [key, a] of [...active]) {
    try {
      const c = await (await fetch(`${API}/generate/check/${a.id}`, { headers: H })).json();
      if (c.faulted || c.is_possible === false) {
        active.delete(key); tries[key] = (tries[key] || 0) + 1;
        console.log('faulted', key, JSON.stringify(c).slice(0, 120));
        if (tries[key] < 3) todo.push(a.it); else fail++;
        continue;
      }
      if (!c.done) continue;
      const s = await (await fetch(`${API}/generate/status/${a.id}`, { headers: H })).json();
      const g = s.generations?.[0];
      active.delete(key);
      if (!g?.img || g.censored) { console.log('no image', key, g?.censored ? '(censored)' : ''); tries[key] = (tries[key] || 0) + 1; if (tries[key] < 3) todo.push(a.it); else fail++; continue; }
      const b = Buffer.from(await (await fetch(g.img)).arrayBuffer());
      await fs.writeFile(`${RAW}/${key}.webp`, b);
      ok++;
      console.log('ok', key, b.length, Math.round((Date.now() - a.t0) / 1000) + 's', `(${ok} done, ${active.size} waiting, ${todo.length - k} left)`);
    } catch (e) { console.log('check err', key, e.message); }
  }
}
console.log(`done ok=${ok} fail=${fail}`);
