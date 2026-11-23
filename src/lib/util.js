export const won = (n) => (n == null ? '-' : Math.round(n).toLocaleString('ko-KR') + '원');
export const man = (n) => {
  const v = n / 10000;
  return (Number.isInteger(v) ? v : v.toFixed(1).replace(/\.0$/, '')) + '만';
};
export const range = (lo, hi, short = false) => {
  if (lo == null) return '가격 정보 없음';
  if (hi == null || hi === lo) return short ? man(lo) + '원' : won(lo);
  return short ? `${man(lo)}~${man(hi)}원` : `${Math.round(lo).toLocaleString('ko-KR')}~${won(hi)}`;
};
export const round500 = (n) => Math.round(n / 500) * 500;

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const DOW = ['일', '월', '화', '수', '목', '금', '토'];
export const pad = (n) => String(n).padStart(2, '0');
export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const parseYmd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const fmtDate = (s, withDow = true) => {
  if (!s) return '';
  const d = parseYmd(s);
  return `${d.getMonth() + 1}월 ${d.getDate()}일${withDow ? ` (${DOW[d.getDay()]})` : ''}`;
};
// 짧은 날짜: 11/25(수) — 카드·목록용 (iAKE v2)
export const mdDate = (s) => {
  if (!s) return '';
  const d = parseYmd(s);
  return `${d.getMonth() + 1}/${String(d.getDate()).padStart(2, '0')}(${DOW[d.getDay()]})`;
};
export const relDay = (s) => {
  const diff = Math.round((parseYmd(s) - today()) / 864e5);
  if (diff === 0) return '오늘';
  if (diff === 1) return '내일';
  if (diff === 2) return '모레';
  if (diff < 0) return `${-diff}일 전`;
  return `${diff}일 후`;
};
export const fmtTime = (iso) => {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export const ago = (iso) => {
  const s = (Date.now() - new Date(iso)) / 1000;
  if (s < 60) return '방금';
  if (s < 3600) return `${Math.floor(s / 60)}분 전`;
  if (s < 86400) return `${Math.floor(s / 3600)}시간 전`;
  return `${Math.floor(s / 86400)}일 전`;
};

export function hash(str) {
  let h = 2166136261;
  for (const c of String(str)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export const pick = (arr, r) => arr[Math.floor(r() * arr.length) % arr.length];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const uid = (p = '') => p + Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 6);
export const orderNo = () => {
  const d = new Date();
  return `DC-${pad(d.getMonth() + 1)}${pad(d.getDate())}-${Math.floor(1000 + Math.random() * 9000)}`;
};
export const maskName = (n) => {
  const s = String(n || '').trim();
  if (s.length <= 1) return s || '고객';
  if (s.length === 2) return s[0] + '*';
  return s[0] + '*'.repeat(s.length - 2) + s[s.length - 1];
};
export const maskPhone = (p) => String(p || '').replace(/(\d{3})-?(\d{3,4})-?(\d{4})/, '$1-****-$3');
export const textLen = (t) => String(t || '').replace(/\s/g, '').length;

export function shade(hex, p) {
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const t = p < 0 ? 0 : 255, a = Math.abs(p);
  r = Math.round((t - r) * a + r); g = Math.round((t - g) * a + g); b = Math.round((t - b) * a + b);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
export function hexToRgb(hex) { const n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
export function rgbToHex(r, g, b) { return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1); }
export function luminance(hex) { const [r, g, b] = hexToRgb(hex); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; }

// "월요일", "일·월요일", "매주 일요일" → [1], [0,1], [0]
export function parseClosed(text) {
  if (!text) return [];
  const map = { 일: 0, 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6 };
  const out = new Set();
  const re = /([일월화수목금토])(?=요일|·|,|\s*,)/g;
  let m;
  while ((m = re.exec(text))) {
    if (text.slice(Math.max(0, m.index - 4), m.index).includes('격주')) continue;
    out.add(map[m[1]]);
  }
  return [...out];
}
// "12:00~19:00", "11~18시" → {start:'12:00', end:'19:00'}
export function parseHours(text) {
  if (!text) return null;
  const m = String(text).match(/(\d{1,2})(?::(\d{2}))?\s*[~\-–]\s*(\d{1,2})(?::(\d{2}))?/);
  if (!m) return null;
  const s = +m[1], e = +m[3];
  if (e <= s || e > 24) return null;
  return { start: `${pad(s)}:${m[2] || '00'}`, end: `${pad(e)}:${m[4] || '00'}` };
}
export function slots(start = '11:00', end = '19:00', step = 60) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const out = [];
  for (let t = sh * 60 + sm; t <= eh * 60 + em - 30; t += step) out.push(`${pad(Math.floor(t / 60))}:${pad(t % 60)}`);
  return out;
}

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch {
    const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch { /* 무시 */ }
    ta.remove(); return ok;
  }
}
export async function shareText({ title, text, url }) {
  if (navigator.share) {
    try { await navigator.share({ title, text, url }); return 'shared'; } catch (e) { if (e?.name === 'AbortError') return 'cancel'; }
  }
  const ok = await copyText([text, url].filter(Boolean).join('\n'));
  return ok ? 'copied' : 'fail';
}
