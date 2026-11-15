// 가게 목록 합치기(공개 정보 + 체험 가게 + 사장님이 등록한 가게) · 거리 · 추천 순위 · 주문 가능 날짜
import seed from '../data/stores.json';
import { DEMO_SHOP, DEMO_ID } from '../data/demo.js';
import { BENCH } from '../data/catalog.js';
import { parseClosed, parseHours, slots, parseYmd, today } from './util.js';

export function shopToStore(shop, kind = 'partner') {
  return {
    ...shop,
    kind,
    geo: shop.geo || 'exact',
    level: kind,
    hours: `${shop.ops.pickupStart}~${shop.ops.pickupEnd} 픽업`,
    sameDay: !!shop.ops.sameDay,
    lead: shop.ops.sameDay ? `당일 ${shop.ops.cutoff}까지 주문 가능` : `픽업 ${shop.ops.leadDays}일 전까지 주문`,
  };
}
const SEED = seed.stores.map((s) => ({ ...s, kind: 'public' }));
export const SEED_STORES = SEED;
export const SEED_UPDATED = seed.updated;

export function getStores(state) {
  const list = SEED.slice();
  list.push(shopToStore(DEMO_SHOP, 'demo'));
  const shop = state.shop;
  if (shop) {
    const st = shopToStore(shop, shop.id === DEMO_ID ? 'demo' : 'partner');
    const i = list.findIndex((s) => s.id === shop.id);
    if (i >= 0) list[i] = st; else list.push(st);
  }
  for (const x of state.found || []) if (!list.some((s) => s.id === x.id)) list.push(x);
  return list;
}
export const canOrderInApp = (s) => s && (s.kind === 'partner' || s.kind === 'demo');

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
// 가장 빠른 주문 가능 날짜 (마감 임박 표시용)
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
export function headlinePrice(s) {
  if (s.menu) {
    const v = s.menu.sizes?.h1 ?? Object.values(s.menu.sizes || {}).filter((x) => x != null).sort((a, b) => a - b)[0];
    return v != null ? { lo: v, hi: v, label: s.menu.sizes?.h1 != null ? '1호' : '최저', exact: true } : null;
  }
  if (s.price) {
    const k = s.price.h1 ? 'h1' : Object.keys(s.price)[0];
    if (!k) return null;
    const [a, b] = s.price[k];
    return { lo: a, hi: b ?? null, label: { dosirak: '도시락', mini: '미니', h1: '1호', h2: '2호', h3: '3호', tier: '2단' }[k], exact: false, public: true };
  }
  if (s.kind === 'osm' || s.kind === 'kakao') return null;
  return { lo: BENCH.h1[0], hi: BENCH.h1[1], label: '1호', exact: false, bench: true };
}
export const minPrice = (s) => headlinePrice(s)?.lo ?? null;

export const FILTERS = [
  { id: 'all', name: '전체' },
  { id: 'app', name: '⚡ 앱으로 바로 주문', f: (s) => canOrderInApp(s) },
  { id: 'lettering', name: '레터링', f: (s) => s.styles?.includes('lettering') },
  { id: 'dosirak', name: '도시락', f: (s) => s.styles?.includes('dosirak') },
  { id: 'photo', name: '포토', f: (s) => s.styles?.includes('photo') },
  { id: 'character', name: '그림·캐릭터', f: (s) => s.styles?.includes('character') },
  { id: 'flower', name: '플라워', f: (s) => s.styles?.includes('flower') },
  { id: 'rice', name: '떡케이크', f: (s) => s.styles?.includes('rice') },
  { id: 'sameDay', name: '당일 가능', f: (s) => s.sameDay === true },
  { id: 'soon', name: '⏰ 내일까지 픽업', f: (s) => { const n = nextOpenDay(s, []); return !!n && n.diff <= 1 && (s.kind !== 'public' || s.sameDay === true); } },
  { id: 'price', name: '가격 공개', f: (s) => !!(s.menu || s.price) },
];

export function rankStores(list, { loc, radius = 5, want = [], filter = 'all', sort = 'rec', q = '' }) {
  const fobj = FILTERS.find((f) => f.id === filter);
  const ql = q.trim().toLowerCase();
  const rows = [];
  for (const s of list) {
    if (s.lat == null) continue;
    const d = distKm(loc, s);
    if (d > radius && !(s.kind === 'demo' && d < 30)) continue;
    if (fobj?.f && !fobj.f(s)) continue;
    if (ql && !(`${s.name} ${s.dong} ${s.gu} ${s.note || ''}`.toLowerCase().includes(ql))) continue;
    const hit = want.length ? want.filter((w) => s.styles?.includes(w)).length / want.length : null;
    const near = Math.exp(-d / Math.max(1.2, radius / 2.2));
    const info = s.kind === 'public' ? (s.level === 'detail' ? 0.65 : 0.35) : s.kind === 'osm' || s.kind === 'kakao' ? 0.2 : 1;
    const score = hit == null ? 0.62 * near + 0.38 * info : 0.55 * hit + 0.28 * near + 0.17 * info;
    const match = hit == null ? null : Math.round(100 * (0.72 * hit + 0.28 * near));
    rows.push({ s, d, score, match, hit });
  }
  const by = {
    rec: (a, b) => b.score - a.score,
    near: (a, b) => a.d - b.d,
    price: (a, b) => (minPrice(a.s) ?? 9e9) - (minPrice(b.s) ?? 9e9),
  };
  return rows.sort(by[sort] || by.rec);
}

export const kindLabel = (s) => ({
  partner: '디어 케이크 입점 · 앱 주문',
  demo: '체험용 가게 · 앱 주문 체험',
  public: s.level === 'detail' ? '공개 정보 · 가격 확인됨' : '공개 목록 정보 · 영업 확인 필요',
  osm: '지도 공개 데이터 · 커스텀 여부 확인 필요',
  kakao: '카카오 장소 검색 결과',
}[s.kind] || '');

export const mapLinks = (s) => ({
  kakao: `https://map.kakao.com/?q=${encodeURIComponent(`${s.name} ${s.dong || ''}`.trim())}`,
  naver: `https://map.naver.com/p/search/${encodeURIComponent(`${s.name} ${s.dong || ''}`.trim())}`,
  route: `https://map.kakao.com/link/to/${encodeURIComponent(s.name)},${s.lat},${s.lng}`,
  insta: s.insta ? `https://www.instagram.com/${s.insta.replace(/^@/, '')}/` : null,
});
