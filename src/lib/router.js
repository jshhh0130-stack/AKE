// 아주 작은 화면 이동기 (#/경로). 안드로이드 뒤로가기 버튼과 함께 동작하도록 history.state 에 깊이를 기록한다.
import { useSyncExternalStore } from 'react';

const listeners = new Set();
const emit = () => listeners.forEach((f) => f());
window.addEventListener('popstate', emit);
window.addEventListener('hashchange', emit);
const getPath = () => location.hash.replace(/^#/, '') || '/';
export const usePath = () => useSyncExternalStore((f) => { listeners.add(f); return () => listeners.delete(f); }, getPath);

export function nav(path, { replace = false } = {}) {
  const cur = history.state?.dc || 0;
  if (replace) history.replaceState({ dc: cur }, '', '#' + path);
  else history.pushState({ dc: cur + 1 }, '', '#' + path);
  emit();
}
export function back(fallback = '/') {
  if ((history.state?.dc || 0) > 0) history.back();
  else nav(fallback, { replace: true });
}
export function match(path, pattern) {
  const a = path.split('?')[0].split('/').filter(Boolean);
  const b = pattern.split('/').filter(Boolean);
  if (a.length !== b.length) return null;
  const params = {};
  for (let i = 0; i < b.length; i++) {
    if (b[i].startsWith(':')) params[b[i].slice(1)] = decodeURIComponent(a[i]);
    else if (a[i] !== b[i]) return null;
  }
  return params;
}
export const queryOf = (path) => new URLSearchParams(path.split('?')[1] || '');

// 시트를 닫은 '뒤로가기'가 끝난 다음에 이동 (느린 폰에서 이동이 되돌려지는 문제 방지)
export function navAfterSheet(path, opts = { replace: true }) {
  let done = false;
  const go = () => { if (done) return; done = true; window.removeEventListener('popstate', go); nav(path, opts); };
  window.addEventListener('popstate', () => setTimeout(go, 0), { once: true });
  setTimeout(go, 450);
}

// 시트(아래에서 올라오는 창)를 뒤로가기로 닫기
let sheetSeq = 0;
export function openSheetHistory() {
  const id = ++sheetSeq;
  history.pushState({ dc: (history.state?.dc || 0) + 1, sheet: id }, '', location.hash || '#/');
  return id;
}
export function closeSheetHistory(id) {
  if (history.state?.sheet === id) history.back();
}
