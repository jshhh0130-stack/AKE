// 가게 목록 합치기(공개 정보 + 입점 가게) · 거리 · 찾기 조건 · 추천 순위 · 주문 가능 날짜
import seed from '../data/stores.json';
import { BENCH, PLACES } from '../data/catalog.js';
import { PICKS } from '../data/picks.js';
import { parseClosed, parseHours, slots, parseYmd, today } from './util.js';

export function shopToStore(shop, kind = 'partner') {
  return {
    ...shop,
    kind,
    geo: shop.geo || 'exact',
    level: 'partner',
    hours: `${shop.ops.pickupStart}~${shop.ops.pickupEnd} 픽업`,
    sameDay: !!shop.ops.sameDay,
    lead: shop.ops.sameDay ? `당일 ${shop.ops.cutoff}까지 주문 가능` : `픽업 ${shop.ops.leadDays}일 전까지 주문`,
  };
}
export const SEED_STORES = seed.stores.map((s) => ({ ...s, kind: 'public' }));

// ── 팀이 고른 77곳(data/picks.js)과 직접 조사한 가게 짝 맞추기 ──
// 같은 구 안에서만 짝을 맞춘다 (구가 다르면 다른 지점이라 조사 정보가 맞지 않음. 예: 제이델링 장안 ≠ 영통 수원점)
const sq = (x) => String(x || '').toLowerCase().replace(/\(.*?\)|[\s·.,'’\-_&]/g, '');
const core = (x) => sq(x).replace(/케이크|케익|cake|수원점|본점|인계점|\d*호점/g, '');
export const sameName = (a, b) => {
  const A = sq(a), B = sq(b);
  if (A === B || (Math.min(A.length, B.length) >= 2 && (A.includes(B) || B.includes(A)))) return true;
  const ca = core(a), cb = core(b);
  return Math.min(ca.length, cb.length) >= 2 && (ca.includes(cb) || cb.includes(ca));
};
export const PICK_SEED = (() => {
  const claimed = new Set();
  return PICKS.map((p) => {
    const cand = SEED_STORES.filter((s) => !claimed.has(s.id) && sameName(s.name, p.name));
    const hit = cand.find((s) => s.gu === p.gu) || null;
    if (hit) claimed.add(hit.id);
    return hit?.id || null;
  });
})();
const PICKED = new Set(PICK_SEED.filter(Boolean));
// 77곳에 없는 조사 가게는 지도·목록에서 숨긴다 (주문 링크·찜으로 열면 그대로 보임)
const SEED = SEED_STORES.map((s) => (PICKED.has(s.id) ? s : { ...s, hidden: true }));
export const SEED_UPDATED = seed.updated;

// 구글 장소 정보(사진·별점·정확한 위치)를 받아 오면 여기에 겹쳐 쓴다 (lib/gplaces.js)
let gOverlay = {};
export const setGoogleOverlay = (o) => { gOverlay = o; };
const withG = (s) => { const g = gOverlay[s.id]; return g ? { ...s, g, lat: g.lat ?? s.lat, lng: g.lng ?? s.lng, geo: g.lat ? 'exact' : s.geo } : s; };

// 카카오맵 정보(정확한 위치·주소·전화·분류·카카오맵 링크)를 받아 오면 여기에 겹쳐 쓴다 (lib/kakao.js)
// by: 직접 조사한 가게 id → 카카오 정보 · extra: 카카오에서 새로 찾은 수원 가게
let kOverlay = { by: {}, extra: [] };
export const setKakaoOverlay = (o) => { kOverlay = o; };
const withK = (s) => {
  const k = kOverlay.by[s.id];
  if (!k) return s;
  const vague = !s.addr || /확인 필요/.test(s.addr);
  return { ...s, k, lat: k.lat, lng: k.lng, geo: 'exact', ...(vague ? { addr: k.road || k.addr } : {}), gu: s.gu || k.gu, dong: s.dong || k.dong };
};

export function getStores(state) {
  const map = new Map(SEED.map((s) => [s.id, withK(s)]));
  for (const x of kOverlay.extra) if (!map.has(x.id)) map.set(x.id, x);
  // 주문 링크·QR로 알게 된 입점 가게 (같은 가게의 공개 정보 위에 덮어씀)
  for (const p of Object.values(state.partners || {})) {
    if (!p?.id) continue;
    const base = map.get(p.id) || {};
    if (p.ops && p.menu) map.set(p.id, { ...base, ...shopToStore(p, 'partner'), pub: p.pub, inbox: p.inbox, remote: true, hidden: false });
    else if (base.id) map.set(p.id, { ...base, pending: true });
  }
  // 이 기기에서 사장님이 등록한 내 가게
  if (state.shop) map.set(state.shop.id, { ...(map.get(state.shop.id) || {}), ...shopToStore(state.shop, 'partner'), local: true, hidden: false });
  for (const x of state.found || []) if (!map.has(x.id)) map.set(x.id, x);
  return [...map.values()].map(withG);
}
export const canOrderInApp = (s) => !!s && s.kind === 'partner';

export const closedDaysOf = (s) => s.ops?.closedDays ?? parseClosed(s.closed);
export const leadDaysOf = (s) => (s.ops ? (s.ops.sameDay ? 0 : s.ops.leadDays ?? 2) : s.sameDay ? 0 : 2);
export function slotsOf(s) {
  if (s.ops) return slots(s.ops.pickupStart, s.ops.pickupEnd, s.ops.slotMin || 60);
  const h = parseHours(s.hours);
  return h ? slots(h.start, h.end, 60) : slots('11:00', '19:00', 60);
}
export function dayStatus(s, dateStr, orders = []) {
  const d = parseYmd(dateStr);
  const diff = Math.round((d - today()) / 864e5);
  if (diff < 0) return { ok: false, reason: '지난 날짜예요', code: 'past' };
  if (s.ops?.paused) return { ok: false, reason: '사장님이 잠시 주문을 쉬고 있어요', code: 'paused' };
  if (closedDaysOf(s).includes(d.getDay()) || s.ops?.holidays?.includes(dateStr)) return { ok: false, reason: '가게 휴무일이에요', code: 'closed' };
  const lead = leadDaysOf(s);
  if (diff < lead) return { ok: false, reason: `픽업 ${lead}일 전까지 주문해야 해요`, code: 'lead' };
  if (diff === 0 && s.ops?.sameDay && s.ops.cutoff) {
    const now = new Date(); const [h, m] = s.ops.cutoff.split(':').map(Number);
    if (now.getHours() * 60 + now.getMinutes() > h * 60 + m) return { ok: false, reason: `오늘 주문은 ${s.ops.cutoff}까지예요`, code: 'cutoff' };
  }
  if (s.ops?.dailyMax) {
    const n = orders.filter((o) => o.storeId === s.id && o.o?.date === dateStr && !['declined', 'canceled'].includes(o.status)).length;
    if (n >= s.ops.dailyMax) return { ok: false, reason: '이 날은 주문이 꽉 찼어요', code: 'full' };
    return { ok: true, left: s.ops.dailyMax - n, code: 'ok' };
  }
  return { ok: true, code: 'ok' };
}
export function nextOpenDay(s, orders = []) {
  for (let i = 0; i < 21; i++) {
    const d = new Date(today()); d.setDate(d.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (dayStatus(s, key, orders).ok) return { key, diff: i };
  }
  return null;
}

export function distKm(a, b) {
  const R = 6371, t = Math.PI / 180;
  const dLat = (b.lat - a.lat) * t, dLng = (b.lng - a.lng) * t;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * t) * Math.cos(b.lat * t) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
export const fmtKm = (d) => (d < 1 ? `${Math.round(d * 1000 / 10) * 10}m` : `${d.toFixed(1)}km`);

// 대표 가격 (1호 기준, 없으면 가장 작은 사이즈)
const SIZE_LABEL = { mini: '미니', h1: '1호', h2: '2호', h3: '3호' };
export function headlinePrice(s) {
  if (s.menu) {
    const v = s.menu.sizes?.h1 ?? Object.values(s.menu.sizes || {}).filter((x) => x != null).sort((a, b) => a - b)[0];
    return v != null ? { lo: v, hi: v, label: s.menu.sizes?.h1 != null ? '1호' : '최저', exact: true } : null;
  }
  if (s.price) {
    const k = s.price.h1 ? 'h1' : ['mini', 'h2', 'h3'].find((x) => s.price[x]);
    if (!k) return null;
    const [a, b] = s.price[k];
    return { lo: a, hi: b ?? null, label: SIZE_LABEL[k], exact: false, public: true };
  }
  if (s.kind !== 'public') return null;
  return { lo: BENCH.h1[0], hi: BENCH.h1[1], label: '1호', exact: false, bench: true };
}
export const minPrice = (s) => headlinePrice(s)?.lo ?? null;
// 1호 기준 예상 가격 범위 (예산 조건 비교용)
export function h1Range(s) {
  if (s.menu?.sizes?.h1 != null) return [s.menu.sizes.h1, s.menu.sizes.h1];
  if (s.price?.h1) return [s.price.h1[0], s.price.h1[1] ?? Math.round(s.price.h1[0] * 1.12)];
  return BENCH.h1;
}
export const pinPrice = (s) => { const h = headlinePrice(s); if (!h) return ''; const v = h.lo / 10000; return `${Number.isInteger(v) ? v : v.toFixed(1)}만${h.exact ? '' : '~'}`; };

export const FILTERS = [
  { id: 'all', name: '전체' },
  { id: 'app', name: '앱 주문', f: (s) => canOrderInApp(s) },
  { id: 'sameDay', name: '당일 픽업', f: (s) => s.sameDay === true },
  { id: 'lettering', name: '레터링', f: (s) => s.styles?.includes('lettering') },
  { id: 'character', name: '그림·캐릭터', f: (s) => s.styles?.includes('character') },
  { id: 'flower', name: '플라워', f: (s) => s.styles?.includes('flower') },
  { id: 'photo', name: '포토', f: (s) => s.styles?.includes('photo') },
  { id: 'rice', name: '떡케이크', f: (s) => s.styles?.includes('rice') },
  { id: 'price', name: '가격 공개', f: (s) => !!(s.menu || s.price) },
  { id: 'verified', name: '영업 확인', f: (s) => s.kind === 'partner' || s.verified || !!s.g || !!s.k },
];

// 가게 이름 찾기: 띄어쓰기 무시 · 부분 일치 · 초성(ㅈㅇㄷㄹ) · 줄임말('제델' → '제이델링')
const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
export const chosung = (t) => [...String(t || '')].map((c) => { const k = c.charCodeAt(0) - 0xac00; return k >= 0 && k <= 11171 ? CHO[Math.floor(k / 588)] : c; }).join('');
const norm = (t) => String(t || '').toLowerCase().replace(/[\s·.()\-_]+/g, '');
export function nameScore(s, q) {
  const n = norm(s.name), qq = norm(q);
  if (!qq) return 0;
  if (n === qq) return 4;
  if (n.includes(qq)) return n.startsWith(qq) ? 3 : 2.5;
  if (/^[ㄱ-ㅎ]+$/.test(qq) && chosung(n).includes(qq)) return 2;
  if (qq.length >= 2) { let k = 0; for (const c of n) if (c === qq[k]) k++; if (k === qq.length) return 1.5; }
  if (norm(`${s.dong || ''}${s.gu || ''}${s.addr || ''}`).includes(qq)) return 0.5;
  return 0;
}
export function searchStores(list, q, loc) {
  const out = [];
  for (const s of list) {
    if (s.lat == null || s.hidden) continue;
    const sc = nameScore(s, q);
    if (sc >= 1.5) out.push({ s, d: distKm(loc, s), score: sc });
  }
  return out.sort((a, b) => b.score - a.score || a.d - b.d);
}
// 가게 강점 칩 (최대 2개): 사장님이 고른 강점이 먼저, 없으면 스타일
const STRONG = { lettering: '레터링', character: '그림', flower: '플라워', photo: '포토', rice: '떡케이크', '3d': '입체', tiered: '2단', custom: '주문제작' };
export const strengths = (s) => (s.strong?.length ? s.strong : s.styles || []).filter((x) => STRONG[x]).slice(0, 2).map((x) => STRONG[x]);

export const GUS = ['영통구', '권선구', '팔달구', '장안구'];
export const BUDGETS = [
  { id: 'b3', name: '3만원대 이하', r: [0, 39999] },
  { id: 'b4', name: '4만원대', r: [40000, 49999] },
  { id: 'b5', name: '5만원대', r: [50000, 59999] },
  { id: 'b6', name: '6만원 이상', r: [60000, 999999] },
];
// 찾기 조건이 몇 개 걸려 있나
export const findCount = (f) => (f ? (f.styles?.length ? 1 : 0) + (f.budget ? 1 : 0) + (f.gu ? 1 : 0) + (f.sameDay ? 1 : 0) + (f.appOnly ? 1 : 0) + (f.photo ? 1 : 0) + (f.q ? 1 : 0) : 0);

export function rankStores(list, { loc, radius = 5, find = null, filter = 'all', sort = 'rec', q = '' }) {
  const fobj = FILTERS.find((f) => f.id === filter);
  const ql = (q || find?.q || '').trim().toLowerCase();
  const want = find?.styles || [];
  const rows = [];
  for (const s of list) {
    if (s.lat == null || s.hidden) continue;
    const d = distKm(loc, s);
    const wide = !!ql || !!find?.gu;
    if (!wide && d > radius) continue;
    if (fobj?.f && !fobj.f(s)) continue;
    if (find?.gu && s.gu !== find.gu) continue;
    if (find?.sameDay && s.sameDay !== true) continue;
    if (find?.appOnly && !canOrderInApp(s)) continue;
    if (ql && !(`${s.name} ${s.dong} ${s.gu} ${s.note || ''}`.toLowerCase().includes(ql))) continue;
    let budgetFit = null, partial = false;
    if (find?.budget) { const [a, b] = h1Range(s), [lo, hi] = find.budget; budgetFit = a <= hi && b >= lo ? 1 : 0; if (!budgetFit) partial = true; }
    const hit = want.length ? want.filter((w) => s.styles?.includes(w)).length / want.length : null;
    if (want.length && hit < 1) partial = true;
    if (want.length && hit === 0 && budgetFit !== 1) continue; // 하나도 안 맞으면 뺀다
    const near = Math.exp(-d / Math.max(1.2, (wide ? 6 : radius) / 2.2));
    const info = s.kind === 'partner' ? 1 : s.kind === 'public' ? (s.verified ? 0.75 : s.level === 'detail' ? 0.6 : s.k ? 0.5 : 0.35) : s.kind === 'kakao' && s.k ? 0.4 : 0.2;
    const conds = (hit != null ? 1 : 0) + (budgetFit != null ? 1 : 0);
    const fit = conds ? ((hit ?? 0) + (budgetFit ?? 0) * ((s.menu || s.price?.h1) ? 1 : 0.6)) / conds : null;
    const score = fit == null ? 0.62 * near + 0.38 * info : 0.55 * fit + 0.28 * near + 0.17 * info;
    const match = fit == null ? null : Math.round(100 * (0.74 * fit + 0.26 * near));
    rows.push({ s, d, score: partial ? score - 1 : score, match, hit, budgetFit, partial });
  }
  const by = {
    rec: (a, b) => b.score - a.score,
    near: (a, b) => (a.partial - b.partial) || a.d - b.d,
    price: (a, b) => (a.partial - b.partial) || (minPrice(a.s) ?? 9e9) - (minPrice(b.s) ?? 9e9),
  };
  return rows.sort(by[sort] || by.rec);
}

export const kindLabel = (s) => (s.kind === 'partner' ? '에이크 입점 · 앱 주문' : s.kind === 'public' ? (s.verified ? '영업 확인됨 · 공개 정보' : s.level === 'detail' ? '공개 정보 · 가격 확인' : '공개 목록 정보 · 영업 확인 필요') : s.kind === 'google' ? '구글 지도 검색 결과' : s.kind === 'kakao' ? (s.pick ? '팀이 고른 가게 · 카카오맵 정보' : '카카오맵 등록 가게 · 커스텀 여부 확인 필요') : '지도 공개 데이터 · 커스텀 여부 확인 필요');

export const mapLinks = (s) => ({
  google: s.g?.url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.name} 수원 ${s.dong || ''}`.trim())}`,
  kakao: s.k?.url || `https://map.kakao.com/?q=${encodeURIComponent(`${s.name} ${s.dong || ''}`.trim())}`,
  naver: `https://map.naver.com/p/search/${encodeURIComponent(`${s.name} ${s.dong || ''}`.trim())}`,
  route: `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`,
  insta: s.insta ? `https://www.instagram.com/${s.insta.replace(/^@/, '')}/` : null,
});

// 말로 찾기(규칙 기반): "영통 근처 4만원대 캐릭터 케이크 당일" → 조건
const STYLE_WORDS = [['character', /캐릭터|그림|산리오|쿠로미|짱구|포켓몬|도안|일러스트|드로잉/], ['photo', /사진|포토|얼굴/], ['flower', /꽃|플라워|앙금|생화/], ['rice', /떡\s*케이크|떡케|설기|백설기/], ['tiered', /2단|이단|3단/], ['3d', /입체|피규어|티아라/], ['lettering', /레터링|문구|글씨|글자/]];
export function parseFindText(text) {
  const t = (text || '').trim();
  const out = { styles: [], budget: null, gu: null, place: null, sameDay: false, q: '' , said: [] };
  if (!t) return out;
  for (const [id, re] of STYLE_WORDS) if (re.test(t)) out.styles.push(id);
  let m;
  if ((m = t.match(/(\d)\s*[~\-–]\s*(\d)\s*만\s*원?/))) out.budget = [+m[1] * 10000, +m[2] * 10000 + 9999];
  else if ((m = t.match(/(\d)\s*만\s*원?\s*대/))) out.budget = [+m[1] * 10000, +m[1] * 10000 + 9999];
  else if ((m = t.match(/(\d)\s*만\s*(\d)\s*천?\s*원?\s*(이하|이내|까지|안|밑|아래)/))) out.budget = [0, +m[1] * 10000 + +m[2] * 1000];
  else if ((m = t.match(/(\d)\s*만\s*원?\s*(이하|이내|까지|안쪽|밑|아래|미만)/))) out.budget = [0, +m[1] * 10000];
  else if ((m = t.match(/(\d)\s*만\s*원?\s*(이상|넘|부터)/))) out.budget = [+m[1] * 10000, 999999];
  else if (/저렴|싼|가성비/.test(t)) out.budget = [0, 42000];
  for (const g of GUS) if (t.includes(g) || t.includes(g.replace('구', '') + ' ')) out.gu = g;
  const places = [...PLACES, { label: '광교', lat: 37.2886, lng: 127.0514 }, { label: '영통', lat: 37.2516, lng: 127.0712 }, { label: '망포', lat: 37.2456, lng: 127.0573 }, { label: '인계동', lat: 37.2623, lng: 127.0316 }, { label: '행궁동', lat: 37.2817, lng: 127.013 }, { label: '아주대', lat: 37.283, lng: 127.0435 }, { label: '성대', lat: 37.3005, lng: 126.971 }, { label: '성균관대', lat: 37.3005, lng: 126.971 }, { label: '수원시청', lat: 37.2623, lng: 127.0316 }, { label: '호매실', lat: 37.2701, lng: 126.955 }, { label: '매탄', lat: 37.2662, lng: 127.0472 }, { label: '정자동', lat: 37.2959, lng: 126.993 }, { label: '권선동', lat: 37.2571, lng: 127.0293 }, { label: '세류', lat: 37.2575, lng: 127.012 }, { label: '금곡', lat: 37.2725, lng: 126.951 }, { label: '율전', lat: 37.2985, lng: 126.971 }, { label: '조원동', lat: 37.3034, lng: 127.0123 }, { label: '우만동', lat: 37.2805, lng: 127.037 }];
  if (!out.gu) { const hit = places.filter((p) => t.includes(p.label.replace(/\s*\(.*\)/, ''))).sort((a, b) => b.label.length - a.label.length)[0]; if (hit) out.place = { lat: hit.lat, lng: hit.lng, label: hit.label.replace(/\s*\(.*\)/, '') }; }
  if (/당일|오늘|급하|바로/.test(t)) out.sameDay = true;
  return out;
}
