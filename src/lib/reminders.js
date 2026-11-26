// 손님 픽업 알림: 픽업 하루 전 · 3시간 전에 이 폰 알림함(+허용했으면 휴대폰 알림)으로
// 서버·알림톡 없이 이 기기 안에서만 동작한다 — 앱을 열어 두었거나 다음에 열 때 알려 준다.
// (사장님이 '픽업 준비 완료'를 누를 때 오는 알림은 주문 이벤트로 따로 온다)
import { getState, setState } from './state.js';
import { notify } from './notify.js';
import { getStores } from './stores.js';
import { fmtDate } from './util.js';
import { candleText } from './ordertext.js';

const LIVE = ['confirmed', 'proof', 'making', 'ready'];
const pickupAt = (o) => (o.o?.date && o.o?.time ? new Date(`${o.o.date}T${o.o.time}:00`) : null);

function check() {
  const s = getState();
  const now = Date.now();
  const stores = getStores(s);
  const marks = {};
  for (const o of s.orders) {
    if (!o.mine || o.tour || !LIVE.includes(o.status)) continue;
    const at = pickupAt(o);
    if (!at) continue;
    const left = at.getTime() - now;
    if (left <= 0) continue;
    const st = stores.find((x) => x.id === o.storeId);
    const where = st?.k?.road || st?.addr || '';
    const r = o.rem || {};
    const link = `/c/order/${o.id}`;
    if (left <= 3 * 3600e3 && !r.h3) {
      notify('c', 'status', `3시간 뒤 케이크 픽업이에요 · ${o.storeName}`, `${o.o.time} 픽업${where ? ` · ${where}` : ''} · 받으면 바로 냉장 보관해 주세요`, link);
      marks[o.id] = { ...r, h3: true, d1: true };
    } else if (left <= 24 * 3600e3 && !r.d1) {
      notify('c', 'status', `${at.toDateString() === new Date().toDateString() ? '오늘' : '내일'} 케이크 픽업이에요 · ${o.storeName}`, `${fmtDate(o.o.date)} ${o.o.time}${where ? ` · ${where}` : ''} · 초: ${candleText(o.o)}`, link);
      marks[o.id] = { ...r, d1: true };
    }
  }
  if (Object.keys(marks).length) setState((x) => ({ ...x, orders: x.orders.map((o) => (marks[o.id] ? { ...o, rem: marks[o.id] } : o)) }));
}

export function startReminders() {
  setTimeout(check, 2500);
  setInterval(check, 60e3);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
}
