// 가게 주소 → 지도 좌표 (OpenStreetMap Nominatim, 1초에 1번 규칙 지킴)
// 사용: node tools/geocode.mjs   → src/data/stores.json 생성
import fs from 'node:fs/promises';

const here = (p) => new URL(p, import.meta.url);
const src = JSON.parse(await fs.readFile(here('./stores.source.json'), 'utf8'));
const UA = 'DearCake-prototype/0.1';
const BOX = { minLat: 37.2, maxLat: 37.36, minLng: 126.92, maxLng: 127.1 }; // 수원 근처만 인정
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let cache = {};
try { cache = JSON.parse(await fs.readFile(here('./geocache.json'), 'utf8')); } catch { /* 처음 */ }

async function search(query) {
  if (query in cache) return cache[query];
  const url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=kr&accept-language=ko&q=' + encodeURIComponent(query);
  let hit = null;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.ok) {
      const j = await res.json();
      if (j.length) {
        const r = j[0];
        const lat = +r.lat, lng = +r.lon;
        if (lat > BOX.minLat && lat < BOX.maxLat && lng > BOX.minLng && lng < BOX.maxLng) hit = { lat, lng, type: r.addresstype };
      }
    }
  } catch (e) { console.warn('fetch fail', query, e.message); }
  cache[query] = hit;
  await sleep(1100);
  return hit;
}

function jibun(addr) {
  return addr.replace(/\(.*?\)/g, '').replace(/\s+(B?\d+층|[A-Z]동|\S+상가|\S+오피스텔|\S+프라자|\S+스퀘어|\S+수자인|\S+웍스).*$/, '').trim();
}
function hash(str) { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

const EXACT = new Set(['building', 'house', 'amenity', 'shop', 'office', 'commercial', 'retail', 'place', 'craft']);
const out = [];
for (const s of src.stores) {
  const tries = [];
  if (s.road) tries.push([s.road, 'addr']);
  else tries.push([jibun(s.addr), 'addr']);
  tries.push([`${s.dong}, ${s.gu}, 수원시`, 'area']);
  tries.push([`${s.dong.replace(/\d가$/, '')}, 수원시`, 'area']);
  tries.push([`${s.gu}, 수원시`, 'gu']);
  let hit = null, kind = null;
  for (const [q, k] of tries) { hit = await search(q); if (hit) { kind = k; break; } }
  let geo = 'none', lat = null, lng = null;
  if (hit) {
    lat = hit.lat; lng = hit.lng;
    geo = kind === 'addr' ? (EXACT.has(hit.type) ? 'exact' : 'street') : 'area';
    if (geo !== 'exact') { // 같은 동 가게가 한 점에 겹치지 않게 살짝 흩뿌림 (최대 약 300m)
      const h = hash(s.id), ang = (h % 360) * Math.PI / 180, r = (geo === 'area' ? 0.0012 : 0.0005) + ((h >> 9) % 100) / 100 * (geo === 'area' ? 0.0016 : 0.0006);
      lat += r * Math.sin(ang); lng += r * Math.cos(ang) * 1.25;
    }
    lat = +lat.toFixed(6); lng = +lng.toFixed(6);
  }
  console.log(`${geo.padEnd(6)} ${s.name}  ${lat},${lng}`);
  out.push({ ...s, lat, lng, geo });
}
await fs.writeFile(here('./geocache.json'), JSON.stringify(cache, null, 1));
await fs.mkdir(here('../src/data/'), { recursive: true });
await fs.writeFile(here('../src/data/stores.json'), JSON.stringify({ updated: '2026-11-16', about: src._about, stores: out }, null, 1));
console.log('done', out.length);
