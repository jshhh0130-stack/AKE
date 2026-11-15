// 앱 전체 상태 — 이 기기 안(localStorage)에 저장. (서버 없이 동작하는 프로토타입)
import { useSyncExternalStore } from 'react';
import { DEFAULT_LOC } from '../data/catalog.js';

const KEY = 'dearcake:v1';
export const initial = {
  v: 1,
  role: null, // 'customer' | 'owner'
  seenGuide: false,
  loc: DEFAULT_LOC,
  radius: 5,
  favs: [],
  photo: null, // { thumb, an, styles, cream, design, shape, at }
  orders: [],
  shop: null,
  found: [], // 전국 찾기로 더한 가게(이번 기기)
  goal: 3000000,
  settings: { claudeKey: '', kakaoKey: '' },
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...initial };
    const s = JSON.parse(raw);
    return { ...initial, ...s, settings: { ...initial.settings, ...(s.settings || {}) } };
  } catch { return { ...initial }; }
}
let state = load();
const subs = new Set();
let saveT = null;
function save() {
  clearTimeout(saveT);
  saveT = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {
      // 저장 공간 부족 → 사진 썸네일부터 줄인다
      try {
        const slim = { ...state, orders: state.orders.map((o) => ({ ...o, refThumb: null })), photo: state.photo ? { ...state.photo, thumb: null } : null };
        localStorage.setItem(KEY, JSON.stringify(slim));
      } catch { console.warn('save failed', e); }
    }
  }, 120);
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

// 편의 함수
export const updateOrder = (id, fn) => setState((s) => ({ ...s, orders: s.orders.map((o) => (o.id === id ? { ...o, ...fn(o) } : o)) }));
export const pushHistory = (o, by, type, msg) => [...(o.history || []), { at: new Date().toISOString(), by, type, msg }];
export const patchShop = (patch) => setState((s) => ({ ...s, shop: { ...s.shop, ...(typeof patch === 'function' ? patch(s.shop) : patch) } }));
export function resetAll() { try { localStorage.removeItem(KEY); } catch { /* 무시 */ } state = { ...initial }; subs.forEach((f) => f()); }

// 다른 탭에서 바뀌면 반영
window.addEventListener('storage', (e) => { if (e.key === KEY) { state = load(); subs.forEach((f) => f()); } });
