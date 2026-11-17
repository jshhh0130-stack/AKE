// 실시간 연결: 주문·채팅 이벤트를 다른 폰과 주고받고, 알림을 띄운다.
import * as sync from './sync.js';
import { getState, setState, onState } from './state.js';
import { setTransport, applyEvent, notiOf, evText, sideOf, ACTIVE } from './orders.js';
import { notify } from './notify.js';
import { ruleCheck, estimate } from './price.js';
import { shopToStore } from './stores.js';
import { ymd, today, addDays, maskName } from './util.js';

let status = 'off';
const stSubs = new Set();
export const liveStatus = () => status;
export const onLiveStatus = (f) => { stSubs.add(f); return () => stSubs.delete(f); };
const setStatus = (v) => { if (v !== status) { status = v; stSubs.forEach((f) => f()); } };

const custLink = (o) => `/c/order/${o.id}`, ownLink = (o) => `/o/order/${o.id}`;
const evBody = (order, ev) => { const t = evText(ev, order).split('\n')[0]; return t.length > 46 ? t.slice(0, 45) + '…' : t; };

function notifyFor(order, ev, role) {
  const [kind, title] = notiOf(ev);
  if (ev.t === 'img' && ev.key !== 'ref' && !String(ev.key).startsWith('chat')) return; // 시안 사진은 뒤따르는 '시안' 이벤트가 알림
  if (role === 'o') notify('o', kind, `${title} · ${maskName(order.customer?.name)}`, evBody(order, ev) || order.id, ownLink(order));
  else notify('c', kind, `${title} · ${order.storeName}`, evBody(order, ev) || order.id, custLink(order));
}

// 보내기 (실패하면 보관했다가 다시 시도)
async function push(topic, str) {
  try { await sync.send(topic, str); return true; } catch {
    setState((s) => ({ ...s, outbox: [...(s.outbox || []), { topic, str, at: Date.now() }].slice(-40) }));
    setStatus('retry');
    return false;
  }
}
async function flushOutbox() {
  const box = getState().outbox || [];
  if (!box.length) return;
  setState((s) => ({ ...s, outbox: [] }));
  for (const m of box) if (Date.now() - m.at < 12 * 3600e3) await push(m.topic, m.str);
}
const sendEv = async (order, ev) => push(order.chan.t, await sync.sealSym(order.chan.k, ev));

setTransport({
  onLocalEvent(order, ev) {
    const side = sideOf(order);
    const other = ev.by === 'c' ? 'o' : ev.by === 'o' ? 'c' : null;
    if (other && side[other]) notifyFor(order, ev, other); // 같은 기기에서 손님·사장님을 번갈아 볼 때
    if (order.chan && !(side.c && side.o)) sendEv(order, ev);
  },
  async onNewOrder(order, store) {
    const s = getState();
    const first = order.ev[order.ev.length - 1];
    if (s.shop && s.shop.id === store.id) { notifyFor(order, order.ev.find((e) => e.t === 'auto') || first, 'o'); return; }
    if (!store.pub || !store.inbox) return; // 입점 전 가게(직접 전달)
    const chan = { t: sync.randTopic(), k: sync.randKey() };
    setState((x) => ({ ...x, orders: x.orders.map((o) => (o.id === order.id ? { ...o, chan } : o)) }));
    const { imgs, mine, seen, checks, ...slim } = order;
    const ok = await push(store.inbox, await sync.sealForShop(store.pub, { t: 'order', order: { ...slim, chan } }));
    if (imgs?.ref) await sendEv({ chan }, { id: order.id + '-ref', t: 'img', by: 'c', at: order.createdAt, key: 'ref', d: imgs.ref });
    if (ok) refresh();
  },
});

async function onInbox(str) {
  const s = getState();
  if (!s.shopKeys || !s.shop) return;
  let msg; try { msg = await sync.openForShop(s.shopKeys.priv, str); } catch { return; }
  if (msg?.t !== 'order' || !msg.order?.id || !msg.order.chan) return;
  if (getState().orders.some((o) => o.id === msg.order.id)) return;
  const store = shopToStore(s.shop, 'partner');
  const o = msg.order;
  const order = { ...o, storeId: s.shop.id, storeName: s.shop.name, est: estimate(store, o.o), checks: ruleCheck(store, { ...o.o, date: null }, {}), imgs: {}, remote: true, mine: false, seen: { o: 0 } };
  setState((x) => (x.orders.some((y) => y.id === order.id) ? x : { ...x, orders: [order, ...x.orders] }));
  notifyFor(order, order.ev.find((e) => e.t === 'auto') || order.ev[0] || { t: 'request' }, 'o');
  refresh();
}
async function onChan(order, str) {
  let ev; try { ev = await sync.openSym(order.chan.k, str); } catch { return; }
  if (!ev?.id || !ev.t) return;
  let applied = null;
  setState((s) => ({ ...s, orders: s.orders.map((o) => { if (o.id !== order.id || o.ev?.some((e) => e.id === ev.id)) return o; applied = applyEvent(o, ev); return applied; }) }));
  if (!applied) return;
  const side = sideOf(applied);
  if (ev.by === 'o' && side.c) notifyFor(applied, ev, 'c');
  if (ev.by === 'c' && side.o) notifyFor(applied, ev, 'o');
  if (ev.by === 's') { if (side.c) notifyFor(applied, ev, 'c'); if (side.o) notifyFor(applied, ev, 'o'); }
}

function topicsNow() {
  const s = getState();
  const map = new Map();
  if (s.shop && s.shopKeys?.inbox) map.set(s.shopKeys.inbox, { inbox: true });
  const cut = ymd(addDays(today(), -2));
  for (const o of s.orders) {
    if (!o.chan?.t) continue;
    if (ACTIVE.includes(o.status) || (o.o?.date || '') >= cut) map.set(o.chan.t, { id: o.id });
  }
  return map;
}
let lastKey = '';
export function refresh() {
  const map = topicsNow();
  const key = [...map.keys()].sort().join(',');
  if (key === lastKey && status !== 'off') return;
  lastKey = key;
  sync.listen([...map.keys()].slice(0, 40), ({ topic, str }) => {
    const hit = topicsNow().get(topic);
    if (!hit) return;
    if (hit.inbox) onInbox(str);
    else { const order = getState().orders.find((o) => o.id === hit.id); if (order) onChan(order, str); }
  }, (v) => { setStatus(v); if (v === 'on') flushOutbox(); });
}

// ── 가게 프로필 공개 (손님 폰이 최신 가격표를 받게) ──
const profileOf = (shop) => { const { portfolio, ...p } = shop; return { ...p, portfolio: (portfolio || []).filter((x) => x.design && !x.src).slice(0, 6) }; };
let pubT = null, lastPub = '';
async function publishProfile() {
  const s = getState();
  if (!s.shop || !s.shopKeys) return;
  const body = JSON.stringify(profileOf(s.shop));
  if (body === lastPub) return;
  lastPub = body;
  try { await sync.send(s.shopKeys.inbox + 'p', await sync.sealSym(s.shopKeys.pk, { shop: profileOf(s.shop), at: Date.now() })); } catch { lastPub = ''; }
}
export async function ensureShopKeys() {
  const s = getState();
  if (!s.shop || s.shopKeys) return s.shopKeys;
  const k = await sync.genShopKeys();
  k.pk = sync.randKey(); // 프로필 잠금 열쇠(주문 링크에만 들어 있음)
  setState({ shopKeys: k });
  return k;
}
// 주문 링크·QR: short=true 면 QR용(프로필 없이 열쇠만), 아니면 프로필까지 담는다
export async function shopLinkCode(short = false) {
  const s = getState();
  const k = await ensureShopKeys();
  const base = { v: 1, i: s.shop.id, n: s.shop.name, x: k.pub.x, y: k.pub.y, b: k.inbox, k: k.pk };
  return sync.pack(short ? base : { ...base, p: profileOf(s.shop) });
}
// 손님 폰: 링크를 열면 입점 가게로 저장하고, 중계에 최신 프로필이 있으면 받아 온다
export async function joinPartner(code) {
  const j = await sync.unpack(code);
  if (!j?.i || !j.x || !j.b) throw new Error('bad link');
  const prev = getState().partners?.[j.i] || {};
  const partner = { ...prev, ...(j.p || {}), id: j.i, name: j.p?.name || j.n || prev.name, pub: { x: j.x, y: j.y }, inbox: j.b, pk: j.k, joinedAt: prev.joinedAt || Date.now() };
  setState((s) => ({ ...s, partners: { ...(s.partners || {}), [j.i]: partner } }));
  refreshPartner(j.i);
  return partner;
}
export async function refreshPartner(id) {
  const p = getState().partners?.[id];
  if (!p?.inbox || !p.pk) return null;
  try {
    const msgs = await sync.poll(p.inbox + 'p');
    let best = null;
    for (const m of msgs) { try { const d = await sync.openSym(p.pk, m.str); if (d?.shop && (!best || d.at > best.at)) best = d; } catch { /* 다른 열쇠 */ } }
    if (best && best.shop.id === id) { setState((s) => ({ ...s, partners: { ...s.partners, [id]: { ...s.partners[id], ...best.shop, id, syncedAt: best.at } } })); return best.shop; }
  } catch { /* 중계 서버 응답 없음 */ }
  return null;
}

export function startLive() {
  refresh();
  let prevKey = '', prevShop = getState().shop, prevKeys = getState().shopKeys, making = false;
  onState(() => {
    const s = getState();
    if (s.shop && !s.shopKeys && !making) { making = true; ensureShopKeys().finally(() => { making = false; }); }
    const key = `${s.orders.length}|${s.orders.filter((o) => o.chan).length}|${s.shop ? s.shopKeys?.inbox || '' : ''}`;
    if (key !== prevKey) { prevKey = key; refresh(); }
    if (s.shop !== prevShop || s.shopKeys !== prevKeys) {
      const first = !prevKeys && s.shopKeys;
      prevShop = s.shop; prevKeys = s.shopKeys;
      if (s.shop && s.shopKeys) { clearTimeout(pubT); pubT = setTimeout(publishProfile, first ? 200 : 3000); }
    }
  });
  if (getState().shop) ensureShopKeys().then(() => { refresh(); publishProfile(); });
  window.addEventListener('online', () => { lastKey = ''; refresh(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { lastKey = ''; refresh(); if (getState().shop) { lastPub = ''; publishProfile(); } } });
}
