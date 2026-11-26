// 가게 문의 = 주문 전에 사장님과 나누는 대화 (가게마다 한 줄기)
// · iAKE AI가 가게 정보로 답하지 못한 질문은 여기로 자동 전달된다 (fwd: true)
// · '판매자 문의'로 직접 보낸 질문도 여기로
// 손님 폰 ↔ 사장님 폰은 주문과 같은 방식(가게 받은편지함 + 대화방 열쇠, lib/live.js)으로 주고받는다. 같은 기기면 바로 보인다.
import { getState, setState } from './state.js';

const mid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
let tp = null; // live.js 가 연결해 준다
export const setAskTransport = (t) => { tp = t; };

export const askOf = (storeId, s = getState()) => (s.asks || []).find((a) => a.storeId === storeId && a.mine);
export const askById = (id, s = getState()) => (s.asks || []).find((a) => a.id === id);
// 이 기기에서 그 문의의 손님/사장님 역할을 맡고 있나?
export const askSide = (a, s = getState()) => ({ c: !!a.mine, o: !!s.shop && s.shop.id === a.storeId });
// 사장님께 바로 전달할 수 있는 가게: iAKE 입점 가게(이 기기 가게 또는 주문 링크로 받은 가게)
export const canAskOwner = (store, s = getState()) => !!store && store.kind === 'partner' && ((s.shop && s.shop.id === store.id) || (!!store.pub && !!store.inbox));
export const askUnread = (a, role) => Math.max(0, (a.msgs || []).filter((m) => m.by !== role).length - (a.seen?.[role] || 0));
export const askLast = (a) => a.msgs?.[a.msgs.length - 1] || null;
export const askLink = (a, role) => (role === 'o' ? `/o/ask/${a.id}` : `/c/ask/${a.storeId}`);

export function markAskSeen(id, role) {
  setState((s) => {
    const a = (s.asks || []).find((x) => x.id === id); if (!a) return s;
    const n = (a.msgs || []).filter((m) => m.by !== role).length;
    if ((a.seen?.[role] || 0) === n) return s;
    return { ...s, asks: s.asks.map((x) => (x.id === id ? { ...x, seen: { ...(x.seen || {}), [role]: n } } : x)) };
  });
}

// 메시지 하나를 대화에 더한다 (같은 메시지가 두 번 와도 한 번만) — 더했으면 새 문의를 돌려준다
export function addAskMsg(id, msg) {
  let out = null;
  setState((s) => ({ ...s, asks: (s.asks || []).map((a) => {
    if (a.id !== id || a.msgs.some((m) => m.id === msg.id)) return a;
    out = { ...a, msgs: [...a.msgs, msg].sort((x, y) => x.at.localeCompare(y.at)), at: msg.at };
    return out;
  }) }));
  return out;
}

// 손님: 사장님께 보내기 (fwd: iAKE AI가 대신 전달한 질문)
export function sendAsk(store, text, fwd = false) {
  const s = getState();
  const msg = { id: mid(), by: 'c', text, at: new Date().toISOString(), fwd };
  const prev = askOf(store.id, s);
  let a;
  if (prev) {
    a = addAskMsg(prev.id, msg) || prev;
  } else {
    a = { id: 'Q-' + mid(), storeId: store.id, storeName: store.name, createdAt: msg.at, at: msg.at, customer: { name: s.me?.name || '' }, msgs: [msg], seen: { c: 0, o: 0 }, mine: true };
    setState((x) => ({ ...x, asks: [a, ...(x.asks || [])] }));
  }
  tp?.onLocal(a, msg, store, !prev);
  return a;
}

// 사장님 답장 (또는 손님이 대화방에서 이어서 쓰기)
export function replyAsk(id, by, text) {
  const msg = { id: mid(), by, text, at: new Date().toISOString() };
  const a = addAskMsg(id, msg);
  if (a) tp?.onLocal(a, msg, null, false);
  return a;
}
