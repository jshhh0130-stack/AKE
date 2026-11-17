// 조사 결과(tools/research/*.json, 2026-11-17) + 이전 목록(tools/stores.v1.json)을 합쳐 tools/stores.source.json 을 만든다.
// 규칙: 커스텀 케이크 전문점만 / 폐업 의심·일반 빵집·카페 제외 / 주소(동)까지 확인된 곳만 / 전화번호 없음
// 사용: node tools/build-stores.mjs → node tools/geocode.mjs
import fs from 'node:fs';
const here = (p) => new URL(p, import.meta.url);
const readJ = (p) => JSON.parse(fs.readFileSync(here(p), 'utf8').replace(/^﻿/, ''));
if (!fs.existsSync(here('./stores.v1.json'))) fs.copyFileSync(here('./stores.source.json'), here('./stores.v1.json'));
const old = readJ('./stores.v1.json').stores;
const norm = (n) => n.replace(/\(.*?\)/g, '').replace(/\s|KKEKKO|CAKE|cake/g, '').replace(/케익/g, '케이크').trim();
const oldBy = new Map(old.map((s) => [norm(s.name), s]));
const hash = (str) => { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };

// 사람이 판단한 예외
const DROP = new Set(['홀린케이크', '스위트키친', '루니제과', '아뜰리에율', '카페원모어2호점', '달쏭쿠키제작소', '레피다', '케이크얍', '라띠케이크']); // 주소 미확인·중복 의심
const NO_PRICE = new Set(['제이델링수원점']); // 조사된 가격이 레터링 기본가가 아님(딸기 케이크 기준)
const RENAME = { 'yourowncake (유어오운케이크)': 'yourowncake', '카페원모어 (행궁동 본점)': '카페원모어', '께꼬 KKEKKO CAKE': '께꼬 KKEKKO CAKE' };

const tidy = (v) => (typeof v === 'string' ? v.replace(/\s*\((기존|다이닝코드|출처|soonwidot|당근|블로그|인스타 표기|아이디어스|다른 목록)[^)]*\)/g, '').replace(/\s*\/\s*도로명.*$/, '').replace(/\(soonwidot:[^)]*\)/g, '').trim() || null : v);
const out = [];
const seen = new Set();
for (const f of ['yeongtong', 'gwonseon', 'paldal', 'jangan']) {
  const j = readJ(`./research/${f}.json`);
  for (const r of j.shops) {
    const name = RENAME[r.name] || r.name;
    const key = norm(name);
    if (seen.has(key) || DROP.has(key)) continue;
    if (r.isCustomCake === false || /폐업/.test(r.status || '')) continue;
    const styles = (r.styles || []).filter((x) => ['lettering', 'photo', 'character', 'flower', 'rice', '3d', 'tiered'].includes(x));
    const cakey = r.isCustomCake === true || (/케이크|케이커리|cake/i.test(name) && styles.length > 0);
    if (!cakey || !r.dong) continue;
    const addr = (r.addr || '').replace(/^경기도?\s*/, '').trim();
    if (!addr || !/\d/.test(addr)) { if (!/운영중/.test(r.status || '')) continue; }
    seen.add(key);
    const o = oldBy.get(key) || {};
    // 가격: 조사값 우선, 없으면 이전 값(도시락 가격은 '미니'로 합침)
    let price = null;
    if (!NO_PRICE.has(key)) {
      const p = {};
      for (const k of ['mini', 'h1', 'h2', 'h3']) { const v = r.price?.[k]; if (Array.isArray(v) && v[0]) p[k] = [v[0], v[1] ?? null]; }
      const op = o.price || {};
      if (!p.mini && (op.dosirak || op.mini)) { const lo = (op.dosirak || op.mini)[0], hi = op.mini?.[0] && op.dosirak ? op.mini[0] : (op.dosirak || op.mini)[1]; p.mini = [lo, hi && hi !== lo ? hi : null]; }
      for (const k of ['h1', 'h2', 'h3']) if (!p[k] && op[k]) p[k] = op[k];
      if (Object.keys(p).length) price = p;
    }
    const road = (addr.match(/수원시\s+\S+구\s+[^\s(,]+(?:로|길)\s*\d+(?:-\d+)?/) || [])[0] || o.road || null;
    const verified = /운영중/.test(r.status || '');
    out.push({
      id: o.id || 'r' + hash(key),
      name, gu: r.gu || j.gu, dong: String(r.dong).replace(/\(.*?\)/g, '').trim(),
      addr: addr ? tidy(addr.startsWith('수원시') ? addr : addr.replace(/^경기\s*/, '')) : `수원시 ${r.gu || j.gu} ${r.dong} (상세 주소 확인 필요)`,
      ...(road ? { road } : {}),
      styles: styles.length ? styles : ['lettering'],
      price, priceNote: r.priceNote || o.priceNote || null, priceDate: r.priceDate || null,
      addon: o.addon || undefined, addons: r.addons || null,
      sameDay: r.sameDay ?? o.sameDay ?? null, lead: tidy(r.lead || o.lead || null), hours: /신뢰 낮음|상충/.test(r.hours || '') ? (o.hours || null) : tidy((r.hours || o.hours || '').replace(/^다이닝코드\s*(기준)?\s*/, '') || null), closed: tidy(r.closed || o.closed || null),
      insta: (r.insta || o.insta || '').replace(/\(.*?\)|@/g, '').trim() || null, kakao: r.kakao || o.kakao || null, naver: !!(r.naver ?? o.naver),
      note: r.note || o.note || null,
      level: price || verified ? 'detail' : 'listing',
      verified, status: r.status || '확인 필요', statusEvidence: r.statusEvidence || null,
      src: [...new Set([...(r.src || []), ...(o.src || [])])].slice(0, 5),
    });
  }
}
fs.writeFileSync(here('./stores.source.json'), JSON.stringify({
  _about: '수원시 커스텀 케이크 전문점 공개 정보 (2026-11-17 재조사). verified=true 는 2025~2026 영업 흔적 확인, level=detail 은 가격 또는 영업 확인, listing 은 지역 목록 기준(확인 필요). 가격 [최소, 최대]. 전화번호는 넣지 않음.',
  stores: out,
}, null, 1));
const by = (k) => out.reduce((a, s) => ((a[s[k]] = (a[s[k]] || 0) + 1), a), {});
console.log('가게', out.length, by('gu'), '영업 확인', out.filter((s) => s.verified).length, '가격 있음', out.filter((s) => s.price).length, '인스타', out.filter((s) => s.insta).length);
console.log('새로 추가:', out.filter((s) => s.id.startsWith('r')).map((s) => s.name).join(', '));
console.log('빠진 이전 가게:', old.filter((s) => !seen.has(norm(s.name))).map((s) => s.name).join(', '));
