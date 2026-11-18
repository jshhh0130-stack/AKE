// 앱 전체 상태 — 이 기기 안(localStorage)에 저장. 다른 폰과는 lib/sync.js(암호화 중계)로 주고받는다.
import { useSyncExternalStore } from 'react';
import { DEFAULT_LOC } from '../data/catalog.js';

const KEY = 'dearcake:v2';
const NOTI_DEFAULT = { status: true, proof: true, chat: true, browser: false, sound: true };
export const initial = {
  v: 2,
  role: null, // 'customer' | 'owner'
  seenGuide: false,
  seenTour: false, // 지도 첫 화면 안내(코치마크)를 봤는지
  loc: DEFAULT_LOC,
  radius: 5,
  locOk: false, // 위치 사용 안내를 보고 허용했는지
  favs: [], // 찜한 가게
  likes: [], // 관심 케이크 사진 (data/gallery.json id)
  recentQ: [], // 최근 검색어
  aiPics: [], // 내가 만든 AI 실사·그림판 사진 { id:'my-…', src, at, mode, opts, engine, edited, job }
  aiJobs: [], // 무료 대기열(AI Horde)에서 만드는 중인 사진 { id, hid, at, mode, opts, queue, wait }
  find: null, // 찾기 조건 { text, styles[], budget:[lo,hi], gu, sameDay, appOnly, photo:{thumb,...}, at }
  orders: [],
  shop: null, // 사장님이 등록한 내 가게
  shopKeys: null, // { pub:{x,y}, priv: JWK, inbox } — 다른 폰에서 오는 주문을 받는 열쇠
  partners: {}, // 주문 링크·QR로 알게 된 입점 가게 프로필
  found: [], // '더 찾기'로 더한 가게
  goal: 3000000,
  me: null,
  notis: [], // 알림함
  notiSet: { c: { ...NOTI_DEFAULT }, o: { ...NOTI_DEFAULT } },
  worklog: [], // 근무 기록 { id, date, name, start, end, memo }
  staff: [{ name: '사장님', wage: 0 }],
  outbox: [],
  settings: { claudeKey: '', kakaoKey: '', googleKey: '', geminiKey: '', hfToken: '' },
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...initial };
    const s = JSON.parse(raw);
    return { ...initial, ...s, settings: { ...initial.settings, ...(s.settings || {}) }, notiSet: { c: { ...NOTI_DEFAULT, ...(s.notiSet?.c || {}) }, o: { ...NOTI_DEFAULT, ...(s.notiSet?.o || {}) } } };
  } catch { return { ...initial }; }
}
let state = load();
const subs = new Set();
let saveT = null;
function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {
    // 저장 공간 부족 → 사진부터 줄인다
    try {
      const slim = { ...state, orders: state.orders.map((o) => ({ ...o, refThumb: null, imgs: {} })), find: state.find ? { ...state.find, photo: null } : null, aiPics: (state.aiPics || []).slice(0, 2) };
      localStorage.setItem(KEY, JSON.stringify(slim));
    } catch { console.warn('save failed', e); }
  }
}
// 앱을 닫거나 다른 앱으로 넘어갈 때 저장 대기 중인 내용을 바로 저장
const flush = () => { if (saveT) { clearTimeout(saveT); saveT = null; persist(); } };
window.addEventListener('pagehide', flush);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
function save() {
  clearTimeout(saveT);
  saveT = setTimeout(() => { saveT = null; persist(); }, 120);
}
export const getState = () => state;
export function setState(patch) {
  const next = typeof patch === 'function' ? patch(state) : { ...state, ...patch };
  if (next === state) return;
  state = next;
  save();
  subs.forEach((f) => f());
}
const subscribe = (f) => { subs.add(f); return () => subs.delete(f); };
export const useApp = () => useSyncExternalStore(subscribe, getState);
export const onState = subscribe;

export const patchShop = (patch) => setState((s) => ({ ...s, shop: { ...s.shop, ...(typeof patch === 'function' ? patch(s.shop) : patch), updatedAt: new Date().toISOString() } }));
export function resetAll() { try { localStorage.removeItem(KEY); } catch { /* 무시 */ } state = { ...initial }; subs.forEach((f) => f()); }

// 다른 탭에서 바뀌면 반영
window.addEventListener('storage', (e) => { if (e.key === KEY) { state = load(); subs.forEach((f) => f()); } });
