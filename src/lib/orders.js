// 주문 = '일어난 일(이벤트)'의 기록. 손님·사장님이 하는 모든 동작(승인, 수정 제안, 시안, 채팅…)이 이벤트 하나로 쌓이고,
// 같은 이벤트를 상대 폰에도 보내(lib/live.js) 양쪽 화면이 똑같이 바뀐다. 이벤트 목록이 곧 대화방이다.
import { estimate, ruleCheck, verdictOf } from './price.js';
import { setState, getState } from './state.js';
import { orderNo, today, addDays, ymd, rng, pick, won, fmtDate } from './util.js';
import { canOrderInApp, shopToStore } from './stores.js';
import { QUICK_TEXTS, sizeOf, designOf, creamOf, optName, TEXT_COLORS, FONTS } from '../data/catalog.js';
import { SAMPLE_PORTFOLIO } from '../data/examples.js';

export const STATUS = {
  requested: { name: '사장님 확인 중', tone: 'warn', step: 1 },
  change: { name: '수정 제안 도착', tone: 'warn', step: 1 },
  confirmed: { name: '주문 확정', tone: 'ok', step: 2 },
  proof: { name: '시안 확인 요청', tone: 'warn', step: 2 },
  making: { name: '제작 중', tone: 'ok', step: 3 },
  ready: { name: '픽업 대기', tone: 'ok', step: 4 },
  done: { name: '픽업 완료', tone: 'mute', step: 5 },
  declined: { name: '주문 불가', tone: 'danger', step: 0 },
  canceled: { name: '취소됨', tone: 'mute', step: 0 },
  external: { name: '가게에 직접 전달', tone: 'mute', step: 1 },
};
export const OWNER_NAME = { requested: '새 요청', change: '손님 답 기다림', confirmed: '확정', proof: '시안 확인 중', making: '제작 중', ready: '픽업 대기', done: '완료', declined: '거절', canceled: '취소' };
export const ACTIVE = ['requested', 'change', 'confirmed', 'proof', 'making', 'ready'];
export const SALES = ['confirmed', 'proof', 'making', 'ready', 'done'];
const NEXT = { confirmed: 'making', making: 'ready', ready: 'done' };
export const nextStatus = (s) => NEXT[s];
export const NEXT_LABEL = { confirmed: '제작 시작', making: '픽업 준비 완료', ready: '픽업 완료' };

const evId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const mkEvent = (t, by, payload = {}) => ({ id: evId(), t, by, at: new Date().toISOString(), ...payload });

// 이벤트 하나를 주문에 반영 (같은 이벤트가 두 번 와도 한 번만)
export function applyEvent(o, ev) {
  if (!ev?.id || o.ev?.some((e) => e.id === ev.id)) return o;
  const n = { ...o, ev: [...(o.ev || []), ev].sort((a, b) => a.at.localeCompare(b.at)) };
  switch (ev.t) {
    case 'auto': case 'approve': n.status = 'confirmed'; n.finalPrice = ev.price ?? n.est?.lo ?? null; n.proposedPrice = null; break;
    case 'change': n.status = 'change'; n.proposedPrice = ev.price ?? null; break;
    case 'decline': n.status = 'declined'; break;
    case 'accept': n.status = 'confirmed'; n.finalPrice = n.proposedPrice ?? n.finalPrice ?? n.est?.lo ?? null; n.proposedPrice = null; break;
    case 'revise': n.o = { ...n.o, ...(ev.patch || {}) }; if (ev.est) n.est = ev.est; n.prevPrice = n.finalPrice ?? n.prevPrice ?? null; n.finalPrice = null; n.status = 'requested'; break;
    case 'proof': n.status = 'proof'; n.proofImg = ev.img || null; n.needProof = false; break;
    case 'proofok': n.status = 'making'; break;
    case 'prooffix': n.status = 'confirmed'; n.needProof = true; break;
    case 'advance': if (ev.to) n.status = ev.to; break;
    case 'paid': n.paid = !!ev.paid; break;
    case 'cancel': n.status = 'canceled'; break;
    case 'review': n.review = { stars: ev.stars, text: ev.text, at: ev.at }; break;
    case 'img': n.imgs = { ...(n.imgs || {}), [ev.key]: ev.d }; n.ev = n.ev.filter((e) => e.id !== ev.id).concat([{ id: ev.id, t: 'img', by: ev.by, at: ev.at, key: ev.key }]).sort((a, b) => a.at.localeCompare(b.at)); break;
    default: break; // request, msg
  }
  return n;
}

// 대화방에 보이는 글
export function evText(ev, o) {
  const p = (v) => (v != null ? won(v) : '');
  switch (ev.t) {
    case 'request': return o?.gift ? `${o.gift.to}님께 보내는 선물 주문서를 보냈어요` : '주문 요청서를 보냈어요';
    case 'auto': return `사장님이 정해 둔 규칙 안이라 바로 확정됐어요 · ${p(ev.price)}`;
    case 'approve': return ev.msg || `주문되었습니다 · 최종 ${p(ev.price)}`;
    case 'change': return `${ev.msg || '이렇게 바꾸면 가능해요.'}${ev.price != null ? ` (제안 금액 ${p(ev.price)})` : ''}`;
    case 'decline': return ev.msg || '죄송해요, 이번 주문은 어려워요.';
    case 'accept': return '수정 제안을 수락했어요. 이대로 확정해 주세요!';
    case 'revise': return `주문 내용을 바꾸고 싶어요${ev.summary ? ` — ${ev.summary}` : ''}${ev.msg ? `\n${ev.msg}` : ''}`;
    case 'proof': return ev.msg || '제작 전 시안이에요. 확인 부탁드려요!';
    case 'proofok': return '시안 좋아요! 이대로 만들어 주세요';
    case 'prooffix': return `시안 수정 부탁드려요${ev.tags?.length ? ` — ${ev.tags.join(', ')}` : ''}${ev.msg ? `\n${ev.msg}` : ''}`;
    case 'advance': return { making: '제작을 시작했어요', ready: '케이크가 준비됐어요! 픽업 시간에 맞춰 오세요', done: '픽업 완료 · 맛있게 드세요!' }[ev.to] || '';
    case 'paid': return ev.by === 'c' ? `${ev.method || '간편결제'}로 ${p(ev.amount)} 결제했어요 (체험용 가상 결제)` : ev.paid ? '예약금 입금을 확인했어요. 고맙습니다!' : '입금 확인을 취소했어요';
    case 'cancel': return '주문을 취소했어요';
    case 'review': return `후기를 남겼어요 ${'★'.repeat(ev.stars || 5)}`;
    case 'msg': return ev.text || '';
    case 'img': return '';
    default: return '';
  }
}
export const isSystemish = (ev) => ['auto', 'advance', 'paid', 'request', 'cancel', 'review', 'accept', 'proofok'].includes(ev.t);
const NOTI = { // 이벤트 → [알림 종류, 제목]
  request: ['status', '새 주문 요청'], auto: ['status', '주문 자동 확정'], approve: ['status', '주문되었습니다'], change: ['status', '사장님 수정 제안'], decline: ['status', '주문이 어렵대요'],
  accept: ['status', '손님이 제안을 수락했어요'], revise: ['status', '손님이 주문 수정을 요청했어요'], proof: ['proof', '시안이 도착했어요'], proofok: ['proof', '손님이 시안을 승인했어요'], prooffix: ['proof', '손님이 시안 수정을 요청했어요'],
  advance: ['status', '주문 진행 소식'], paid: ['status', '입금 확인'], cancel: ['status', '손님이 주문을 취소했어요'], review: ['status', '새 후기'], msg: ['chat', '새 메시지'], img: ['chat', '사진이 도착했어요'],
};
export const notiOf = (ev) => NOTI[ev.t] || ['status', '주문 소식'];

// 이 기기에서 그 주문의 손님/사장님 역할을 맡고 있나?
export const sideOf = (o, s = getState()) => ({ c: !!o.mine, o: !!s.shop && s.shop.id === o.storeId });
export const unreadOf = (o, role) => Math.max(0, (o.ev || []).filter((e) => e.by !== role && e.t !== 'img').length - (o.seen?.[role] || 0));
export const unreadTotal = (s, role) => s.orders.filter((o) => (role === 'c' ? o.mine : s.shop && o.storeId === s.shop.id)).reduce((a, o) => a + (unreadOf(o, role) > 0 ? 1 : 0), 0);
export const markSeen = (id, role) => setState((s) => {
  const o = s.orders.find((x) => x.id === id); if (!o) return s;
  const cnt = (o.ev || []).filter((e) => e.by !== role && e.t !== 'img').length;
  if ((o.seen?.[role] || 0) === cnt) return s;
  return { ...s, orders: s.orders.map((x) => (x.id === id ? { ...x, seen: { ...(x.seen || {}), [role]: cnt } } : x)) };
});

// ── 동작 실행: 이 기기에 반영 → (다른 폰이 있으면) 전송 → 알림 ──
let transport = null; // live.js 가 연결해 준다 (순환 참조 피하기)
export const setTransport = (t) => { transport = t; };
export function act(orderId, by, t, payload = {}) {
  const ev = mkEvent(t, by, payload);
  let order = null;
  setState((s) => ({ ...s, orders: s.orders.map((o) => { if (o.id !== orderId) return o; order = applyEvent(o, ev); return order; }) }));
  if (order) transport?.onLocalEvent(order, ev);
  return ev;
}

export function createOrder(store, o, customer, gift = null) {
  const st = getState();
  const est = estimate(store, o);
  const checks = ruleCheck(store, o, { orders: st.orders });
  const v = verdictOf(checks);
  const inApp = canOrderInApp(store);
  const auto = inApp && store.ops?.autoConfirm && v.ok && est.exact;
  const { refPhoto, ...oo } = o;
  let order = {
    id: orderNo(), storeId: store.id, storeName: store.name, createdAt: new Date().toISOString(),
    status: inApp ? 'requested' : 'external', o: oo, customer, gift, est, checks, finalPrice: null, ev: [], imgs: refPhoto ? { ref: refPhoto } : {}, mine: true, seen: {},
  };
  order = applyEvent(order, mkEvent('request', 'c'));
  if (auto) order = applyEvent(order, { ...mkEvent('auto', 's', { price: est.lo }), at: new Date(Date.now() + 5).toISOString() });
  order.seen = { c: order.ev.filter((e) => e.by !== 'c').length };
  setState((s) => ({ ...s, orders: [order, ...s.orders] }));
  transport?.onNewOrder(order, store);
  return order;
}

// 손님이 주문 내용을 고칠 때: 바뀐 점 요약
export function diffSummary(before, patch) {
  const out = [];
  if (patch.text != null && patch.text !== before.text) out.push(`문구 “${patch.text}”`);
  if (patch.cream && patch.cream !== before.cream) out.push(`크림 ${creamOf(patch.cream).name}`);
  if (patch.textColor && patch.textColor !== before.textColor) out.push(`글씨 ${optName(TEXT_COLORS, patch.textColor)}`);
  if (patch.font && patch.font !== before.font) out.push(`글씨체 ${optName(FONTS, patch.font)}`);
  if (patch.size && patch.size !== before.size) out.push(`크기 ${sizeOf(patch.size).name}`);
  if (patch.design && patch.design !== before.design) out.push(`디자인 ${designOf(patch.design).name}`);
  if ((patch.date && patch.date !== before.date) || (patch.time && patch.time !== before.time)) out.push(`픽업 ${fmtDate(patch.date || before.date)} ${patch.time || before.time}`);
  return out.join(', ');
}

// 엑셀(CSV) 내보내기
export function ordersCSV(list) {
  const head = ['주문번호', '상태', '픽업일', '픽업시간', '주문자', '연락처', '크기', '모양', '디자인', '맛', '크림색', '문구', '글씨체', '장식·추가', '판 문구', '요청사항', '알레르기', '예상가(최소)', '예상가(최대)', '확정가', '예약금 입금', '접수일시'];
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = list.map((o) => [o.id, STATUS[o.status]?.name || o.status, o.o.date, o.o.time, o.customer?.name, o.customer?.phone, o.o.size, o.o.shape, o.o.design, o.o.flavor, o.o.cream, o.o.noText ? '' : o.o.text, o.o.font, [...(o.o.toppings || []), ...(o.o.extras || [])].join(' '), o.o.plateText, o.o.request, o.o.allergy, o.est?.lo, o.est?.hi, o.finalPrice, o.paid ? 'O' : '', o.createdAt]);
  return '﻿' + [head, ...rows].map((r) => r.map(q).join(',')).join('\r\n');
}
export function downloadText(name, text, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// 예시 주문 (사장님 화면을 둘러볼 때만 — '예시'라고 표시되고 언제든 지울 수 있다)
const NAMES = ['김서연', '이도윤', '박지민', '최예린', '정하준', '강수아', '조민준', '윤채원', '장서준', '임지아', '한유진', '오시우', '서다은', '신현우', '권나윤', '배지호'];
export function makeSampleOrders(shop) {
  const store = shopToStore(shop, 'partner');
  const sizes = Object.entries(shop.menu.sizes).filter(([, p]) => p != null).map(([k]) => k);
  const picks = (shop.portfolio || []).filter((p) => !p.work && (p.src || p.design)); // 가게 대표 디자인을 고른 주문처럼
  const r = rng(20261116);
  const t0 = today();
  const out = [];
  const mk = (dayOffset, status, opts = {}) => {
    let d = addDays(t0, dayOffset);
    if (shop.ops.closedDays.includes(d.getDay())) d = addDays(d, dayOffset >= 0 ? 1 : -1);
    const o = {
      shape: pick(['round', 'round', 'heart', 'square'], r), size: pick(sizes.length ? sizes : ['h1'], r),
      design: pick(['simple', 'vintage', 'heartdots', 'flower', 'character', 'photo', 'drip', 'simple'], r),
      cream: pick(['white', 'pink', 'lavender', 'butter', 'mint', 'sky', 'peach', 'cocoa'], r),
      flavor: pick(['vanilla', 'choco', 'strawberry', 'earlgrey', 'vanilla'], r), text: pick(QUICK_TEXTS, r), noText: false,
      font: pick(['jua', 'pen', 'gaegu', 'melody'], r), textColor: pick(['berry', 'choco', 'navy'], r),
      toppings: r() > 0.55 ? [pick(['cherry', 'pearl', 'sprinkle', 'ribbon', 'strawberry'], r)] : [], extras: r() > 0.5 ? ['candle'] : [],
      date: ymd(d), time: pick(['12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'], r), request: opts.request || '', allergy: '',
      ...(picks.length ? (() => { const p = pick(picks, r); const { size, ...rest } = p.opt || {}; return { pickId: p.id, pickName: p.caption, ...rest, ...(size && sizes.includes(size) ? { size } : {}) }; })() : {}),
      ...opts.o,
    };
    const est = estimate(store, o);
    const created = addDays(d, -(2 + Math.floor(r() * 4))); created.setHours(9 + Math.floor(r() * 12), Math.floor(r() * 60));
    const at = (min) => new Date(created.getTime() + min * 60000).toISOString();
    let order = {
      id: `DC-${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${1000 + Math.floor(r() * 9000)}`,
      storeId: shop.id, storeName: shop.name, createdAt: created.toISOString(), status: 'requested', o, customer: { name: pick(NAMES, r), phone: `010-0000-${String(1000 + Math.floor(r() * 9000))}` },
      est, checks: [], finalPrice: null, ev: [], imgs: {}, sample: true, seen: {},
    };
    const push = (t, by, min, payload) => { order = applyEvent(order, { id: order.id + t + min, t, by, at: at(min), ...payload }); };
    push('request', 'c', 0);
    const price = est.lo + (r() > 0.8 ? 2000 : 0);
    if (status === 'change') push('change', 'o', 40, { price: est.lo + 3000, msg: '캐릭터는 비슷한 느낌으로 바꿔 그려 드려요. 3,000원이 추가돼요.' });
    else if (status === 'canceled') push('cancel', 'c', 90);
    else if (status !== 'requested') {
      if (r() < 0.45) push('auto', 's', 1, { price }); else push('approve', 'o', 8 + Math.floor(r() * 170), { price, msg: '주문 잘 받았어요! 미리보기 그대로 만들어 드릴게요 :)' });
      if (['making', 'ready', 'done'].includes(status) || r() > 0.5) push('paid', 'o', 300, { paid: true });
      if (status === 'proof') push('proof', 'o', 400, { msg: '이런 느낌으로 그릴게요. 확인 부탁드려요!' });
      if (['making', 'ready', 'done'].includes(status)) push('advance', 'o', 900, { to: 'making' });
      if (['ready', 'done'].includes(status)) push('advance', 'o', 1500, { to: 'ready' });
      if (status === 'done') { push('advance', 'o', 1700, { to: 'done' }); if (r() > 0.45) push('review', 'c', 2400, { stars: r() > 0.25 ? 5 : 4, text: pick(['미리보기랑 똑같이 나와서 놀랐어요!', '글씨가 너무 예뻐요', '가격을 미리 알 수 있어서 좋았어요', '사장님 답장이 빨라요', '친구가 엄청 좋아했어요'], r) }); }
    }
    order.seen = { o: order.ev.filter((e) => e.by !== 'o').length - (['requested'].includes(order.status) ? 1 : 0) };
    out.push(order);
  };
  for (let i = 0; i < 26; i++) mk(-1 - Math.floor(r() * 42), r() > 0.06 ? 'done' : 'canceled');
  mk(0, 'ready'); mk(0, 'making'); mk(1, 'making'); mk(2, 'confirmed'); mk(3, 'proof', { o: { design: 'character' } }); mk(4, 'confirmed');
  mk(3, 'requested', { request: '글씨를 조금 크게 해 주세요' });
  mk(5, 'requested', { o: { design: 'character', text: '우리 강아지 생일' }, request: '강아지 사진 보내드릴게요, 비슷하게 그려 주세요' });
  mk(6, 'change');
  return out;
}
// 예시 주문을 넣을 때 가게 작품 사진이 하나도 없으면 예시 사진(대표 디자인·작품)도 같이 넣는다 — 지울 때 같이 지운다
export const addSampleOrders = () => setState((s) => {
  if (!s.shop) return s;
  const pf = s.shop.portfolio || [];
  const shop = pf.some((p) => !p.sample) ? s.shop : { ...s.shop, portfolio: [...pf.filter((p) => !p.sample), ...SAMPLE_PORTFOLIO] };
  return { ...s, shop, orders: [...s.orders.filter((o) => !o.sample), ...makeSampleOrders(shop)] };
});
export const removeSampleOrders = () => setState((s) => ({ ...s, orders: s.orders.filter((o) => !o.sample), shop: s.shop ? { ...s.shop, portfolio: (s.shop.portfolio || []).filter((p) => !p.sample) } : s.shop }));
