// 카카오 지도·장소 연결
// - 키: 설정에 넣은 카카오 JavaScript 키, 없으면 빌드할 때 kakaomap_key.txt 에서 읽은 기본 키 (vite.config.js)
// - 팀이 고른 수원 가게(data/picks.js — 11/26 100곳 + 예전 목록)를 카카오 장소 검색으로 하나씩 찾아 카카오맵 정보(정확한 위치·주소·전화·분류·카카오맵 링크)를 받는다.
//   브라우저에서 찾고 이 기기에 3일 저장한다. 직접 조사한 정보(data/stores.json)가 있는 가게는 그 위에 겹쳐 쓴다.
// 사진·후기는 카카오 공식 API에 없어서 가져오지 않는다(무단 수집 금지·작성자 저작권). 대신 카카오맵의 사진·후기 화면으로 바로 이어 준다.
import { setKakaoOverlay, SEED_STORES, PICK_SEED, sameName } from './stores.js';
import { PICKS, GU_CENTER } from '../data/picks.js';

export const KAKAO_BUILTIN = import.meta.env.VITE_KAKAO_KEY || '';
export const kakaoKeyOf = (settings) => settings?.kakaoKey || KAKAO_BUILTIN;

let kakaoP = null;
export function loadKakao(key) {
  if (window.kakao?.maps?.Map) return Promise.resolve(window.kakao);
  if (kakaoP) return kakaoP;
  kakaoP = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&libraries=services&autoload=false`;
    s.onload = () => { try { window.kakao.maps.load(() => res(window.kakao)); } catch (e) { rej(e); } };
    s.onerror = () => rej(new Error(`카카오가 이 키를 막았어요. 카카오 개발자 콘솔에서 JavaScript SDK 도메인에 ${location.origin} 을(를) 등록하고 카카오맵 사용을 켜 주세요`));
    document.head.appendChild(s);
    setTimeout(() => rej(new Error('카카오 지도 응답이 없어요')), 9000);
  }).catch((e) => { kakaoP = null; throw e; });
  return kakaoP;
}

const CACHE_KEY = 'dearcake:kakao-picks-v4'; // 11/26 가게 100곳 + 번길 주소 읽기 고침 → 새로 찾는다
const TTL = 3 * 864e5;
let found = []; // PICKS 순서대로 카카오 장소(가공 전) 또는 null
let status = { state: 'idle', at: 0, n: 0, msg: '', missing: [] }; // idle | loading | done | error
const subs = new Set();
export const onKakao = (f) => { subs.add(f); return () => subs.delete(f); };
export const kakaoStatus = () => status;
const FOOD_CAT = /음식점|제과|베이커리|케이크|디저트|떡|카페|간식/;

// 카카오 장소 → 우리 정보 모양
function toInfo(p) {
  const parts = (p.address_name || '').split(' ');
  return {
    kid: p.id, name: p.place_name, lat: +p.y, lng: +p.x,
    addr: p.address_name || '', road: p.road_address_name || '',
    gu: parts.find((w) => /구$/.test(w)) || '', dong: parts.find((w) => /(동|가|읍|면)$/.test(w) && !/구$/.test(w)) || '',
    phone: (p.phone || '').replace(/[^\d]/g, '').length >= 8 ? p.phone : '', cat: (p.category_name || '').split(' > ').slice(1).join(' · '),
    url: p.place_url || `https://place.map.kakao.com/${p.id}`,
  };
}
const stylesOf = (name, cat) => {
  const st = [];
  if (/떡/.test(name + cat)) st.push('rice');
  if (/플라워|꽃/.test(name)) st.push('flower');
  if (/포토|사진/.test(name)) st.push('photo');
  return st.length ? [...st, ...(st.includes('rice') ? [] : ['lettering'])] : ['lettering'];
};

// 찾은 결과 → 조사한 가게에 겹쳐 쓸 정보(by) + 새 가게(extra)
function buildOverlay() {
  const by = {}, extra = [], seen = new Set();
  PICKS.forEach((pick, i) => {
    const p = found[i];
    const sid = PICK_SEED[i];
    if (!p) return;
    const k = toInfo(p);
    if (sid) { by[sid] = k; return; }
    if (seen.has(p.id)) return;
    seen.add(p.id);
    extra.push({
      id: 'kakao-' + p.id, kind: 'kakao', level: 'kakao', name: k.name, lat: k.lat, lng: k.lng, geo: p.area ? 'area' : 'exact',
      gu: k.gu || pick.gu, dong: k.dong, addr: k.road || k.addr || pick.addr, styles: pick.styles?.length ? pick.styles : stylesOf(k.name, k.cat),
      ...(pick.sameDay ? { sameDay: true } : {}), no: pick.no,
      note: pick.tags ? `잘하는 케이크: ${pick.tags}` : k.cat ? `카카오맵 분류: ${k.cat}` : null, src: [k.url], k, pick: true,
    });
  });
  return { by, extra };
}
function emit() {
  setKakaoOverlay(buildOverlay());
  subs.forEach((f) => f());
}
const missingOf = () => PICKS.filter((_, i) => !found[i] && !PICK_SEED[i]).map((p) => `${p.name}(${p.gu.replace('구', '')})`);

function readCache() {
  try {
    localStorage.removeItem('dearcake:kakao-suwon'); // 예전(수원 전체 훑기) 저장분 정리
    const c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (c?.list?.length === PICKS.length) { found = c.list; status = { state: 'done', at: c.at, n: found.filter(Boolean).length, msg: '', missing: missingOf() }; emit(); }
  } catch { /* 무시 */ }
}
readCache();

// 검색 결과 중 이 가게로 볼 곳 고르기: 수원시 · 이름이 같음 · 음식점 분류 · 같은 구 우선 · 조사한 위치와 가까운 곳 우선
const roadKey = (a) => (String(a || '').match(/([가-힣0-9]+(?:로|길))\s*(\d+(?:-\d+)?)/) || []).slice(1, 3).join(' ');
function choose(list, pick, seedStore) {
  const rk = roadKey(pick.addr);
  const ok = list.filter((p) => /수원시/.test(p.address_name || '') && (sameName(p.place_name, pick.name) || (rk && roadKey(p.road_address_name) === rk)) && FOOD_CAT.test(p.category_name || ''));
  const score = (p) => {
    let s = 0;
    if (rk && roadKey(p.road_address_name) === rk) s += 5; // 주소(도로명·번호)가 같으면 거의 확실
    if ((p.address_name || '').includes(pick.gu)) s += 3;
    if (/케이크|제과|디저트/.test(p.category_name || '')) s += 1;
    if (seedStore?.lat) { const d = Math.hypot((+p.y - seedStore.lat) * 111, (+p.x - seedStore.lng) * 88); s += Math.max(0, 3 - d); }
    return s;
  };
  return ok.sort((a, b) => score(b) - score(a))[0] || null;
}

/** 고른 가게들을 카카오에서 찾는다. force=false면 3일 안에 찾은 게 있으면 그대로 쓴다. */
export async function sweepSuwon(key, { force = false } = {}) {
  if (!key || status.state === 'loading') return found;
  if (!force && status.state === 'done' && Date.now() - status.at < TTL) return found;
  status = { ...status, state: 'loading', msg: '' };
  subs.forEach((f) => f());
  try {
    const k = await loadKakao(key);
    const ps = new k.maps.services.Places();
    const OK = k.maps.services.Status.OK, ERR = k.maps.services.Status.ERROR;
    let errs = 0, calls = 0;
    const geo = new k.maps.services.Geocoder();
    const geoAsk = (q) => new Promise((res) => geo.addressSearch(q, (d, s2) => res(s2 === OK && d[0] ? d[0] : null)));
    const addrOf = async (addr) => {
      const t = String(addr).replace(/\(.*?\)/g, ' ').replace(/\s+/g, ' ').trim();
      const road = t.match(/^(.*?[가-힣A-Za-z0-9]+(?:로|길)\s+\d+(?:-\d+)?)/); // 도로명 + 건물번호 (번길 포함)
      const lot = t.match(/^(.*?[가-힣0-9]+(?:동|가)\s*\d+(?:-\d+)?)/); // 지번
      const dong = t.match(/^(.*?[가-힣]+동)(?:\s|$)/); // 번지 없이 동까지 (대략 위치)
      for (const [m, area] of [[road, false], [lot, false], [dong, true]]) { if (m) { const r = await geoAsk(m[1].trim()); if (r) return { ...r, area }; } }
      return null;
    };
    const ask = (q, c) => new Promise((res) => ps.keywordSearch(q, (data, st) => { calls++; if (st === ERR) errs++; res(st === OK ? data : []); }, { location: new k.maps.LatLng(c.lat, c.lng), radius: 20000, size: 15 }));
    const out = new Array(PICKS.length).fill(null);
    let next = 0;
    const run = async () => {
      while (next < PICKS.length) {
        const i = next++;
        const pick = PICKS[i];
        const seedStore = PICK_SEED[i] ? SEED_STORES.find((s) => s.id === PICK_SEED[i]) : null;
        const c = seedStore?.lat ? seedStore : GU_CENTER[pick.gu];
        let p = choose(await ask(pick.name, c), pick, seedStore);
        if (!p) p = choose(await ask(`수원 ${pick.name}`, c), pick, seedStore);
        if (!p && seedStore && seedStore.name !== pick.name) p = choose(await ask(seedStore.name, c), pick, seedStore);
        // 이름으로 못 찾으면 팀이 적은 주소로 위치만이라도
        if (!p && pick.addr) { const a = await addrOf(pick.addr); if (a) p = { id: 'addr' + (pick.no || i), area: !!a.area, place_name: pick.name, x: a.x, y: a.y, address_name: a.address_name, road_address_name: a.road_address?.address_name || '', phone: '', category_name: '', place_url: `https://map.kakao.com/?q=${encodeURIComponent(`수원 ${pick.name}`)}` }; }
        if (p) out[i] = { id: p.id, ...(p.area ? { area: true } : {}), place_name: p.place_name, x: p.x, y: p.y, address_name: p.address_name, road_address_name: p.road_address_name, phone: p.phone, category_name: p.category_name, place_url: p.place_url };
      }
    };
    await Promise.all([run(), run(), run(), run()]);
    if (errs && errs === calls) throw new Error('카카오 장소 검색이 막혀 있어요. 카카오 개발자 콘솔에서 이 주소(도메인)를 등록했는지 확인해 주세요');
    found = out;
    status = { state: 'done', at: Date.now(), n: found.filter(Boolean).length, msg: '', missing: missingOf() };
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ at: status.at, list: found })); } catch { /* 저장 공간 부족은 무시 */ }
    emit();
  } catch (e) {
    console.warn('kakao sweep', e);
    status = { ...status, state: 'error', msg: e.message || '카카오 가게 정보를 불러오지 못했어요' };
    subs.forEach((f) => f());
  }
  return found;
}

// 다른 지역: 지금 보는 곳 주변에서 찾기
export async function kakaoFind(key, loc, radiusKm) {
  const k = await loadKakao(key);
  const ps = new k.maps.services.Places();
  const out = [];
  for (const q of ['레터링케이크', '주문제작케이크', '커스텀케이크']) {
    const res = await new Promise((resolve) => ps.keywordSearch(q, (data, st) => resolve(st === k.maps.services.Status.OK ? data : []), { location: new k.maps.LatLng(loc.lat, loc.lng), radius: Math.min(20000, radiusKm * 1000), sort: k.maps.services.SortBy.DISTANCE }));
    for (const p of res) {
      if (out.some((x) => x.id === 'kakao-' + p.id) || /파리바게|뚜레쥬르|투썸|배스킨|던킨|스타벅스/.test(p.place_name)) continue;
      const info = toInfo(p);
      out.push({ id: 'kakao-' + p.id, kind: 'kakao', level: 'kakao', name: info.name, lat: info.lat, lng: info.lng, geo: 'exact', addr: info.road || info.addr, dong: info.dong, gu: info.gu, styles: ['lettering'], note: `카카오 장소 검색 “${q}” 결과예요.`, src: [info.url], k: info });
    }
  }
  return out;
}

// 카카오맵 가게 화면 바로 가기 (사진 탭 · 후기 탭)
export const kakaoLinks = (k) => k && { place: k.url, photos: `${k.url}#photoList`, reviews: `${k.url}#comment`, route: `https://map.kakao.com/link/to/${encodeURIComponent(k.name)},${k.lat},${k.lng}` };
