// 주문 만들기 · 상태 바꾸기 · 체험용 주문 데이터
import { estimate, ruleCheck, verdictOf } from './price.js';
import { setState, getState, pushHistory, updateOrder } from './state.js';
import { orderNo, today, addDays, ymd, rng, pick, won } from './util.js';
import { canOrderInApp, shopToStore } from './stores.js';
import { DEMO_SHOP } from '../data/demo.js';
import { QUICK_TEXTS } from '../data/catalog.js';

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
export const OWNER_NAME = { requested: '새 요청', change: '고객 답 기다림', confirmed: '확정', proof: '시안 확인 중', making: '제작 중', ready: '픽업 대기', done: '완료', declined: '거절', canceled: '취소', external: '-' };
export const ACTIVE = ['requested', 'change', 'confirmed', 'proof', 'making', 'ready'];
export const SALES = ['confirmed', 'proof', 'making', 'ready', 'done'];

export function createOrder(store, o, customer) {
  const st = getState();
  const est = estimate(store, o);
  const checks = ruleCheck(store, o, { orders: st.orders });
  const v = verdictOf(checks);
  const inApp = canOrderInApp(store);
  const now = new Date().toISOString();
  const auto = inApp && store.ops?.autoConfirm && v.ok && est.exact;
  const order = {
    id: orderNo(),
    storeId: store.id,
    storeName: store.name,
    storeKind: store.kind,
    createdAt: now,
    status: inApp ? (auto ? 'confirmed' : 'requested') : 'external',
    o: { ...o, refPhoto: undefined },
    refThumb: o.refPhoto || null,
    customer,
    est,
    checks,
    finalPrice: auto ? est.lo : null,
    history: [{ at: now, by: 'customer', type: 'request', msg: '주문 요청서를 보냈어요' }],
    mine: true,
  };
  if (auto) order.history.push({ at: now, by: 'system', type: 'auto', msg: `사장님이 정한 규칙 안이라 바로 확정됐어요 · ${won(est.lo)}` });
  setState((s) => ({ ...s, orders: [order, ...s.orders] }));
  return order;
}

// 사장님 동작
export const ownerApprove = (id, price, msg) => updateOrder(id, (o) => ({ status: 'confirmed', finalPrice: price, history: pushHistory(o, 'owner', 'approve', msg || `주문을 확정했어요 · 최종 ${won(price)}`) }));
export const ownerChange = (id, price, msg) => updateOrder(id, (o) => ({ status: 'change', proposedPrice: price, history: pushHistory(o, 'owner', 'change', msg || `수정 제안 · ${won(price)}`) }));
export const ownerDecline = (id, msg) => updateOrder(id, (o) => ({ status: 'declined', history: pushHistory(o, 'owner', 'decline', msg || '이번 주문은 어렵다고 답했어요') }));
export const ownerProof = (id, photo, msg) => updateOrder(id, (o) => ({ status: 'proof', proofPhoto: photo || null, history: pushHistory(o, 'owner', 'proof', msg || '제작 전 시안을 보냈어요. 확인 부탁드려요!') }));
const NEXT = { confirmed: 'making', proof: 'making', making: 'ready', ready: 'done' };
const NEXT_MSG = { making: '제작을 시작했어요', ready: '케이크가 준비됐어요! 픽업 시간에 맞춰 오세요', done: '픽업 완료 · 맛있게 드세요!' };
export const nextStatus = (s) => NEXT[s];
export const ownerAdvance = (id) => updateOrder(id, (o) => { const n = NEXT[o.status]; return n ? { status: n, history: pushHistory(o, 'owner', n, NEXT_MSG[n]) } : {}; });
// 손님 동작
export const custAcceptChange = (id) => updateOrder(id, (o) => ({ status: 'confirmed', finalPrice: o.proposedPrice ?? o.finalPrice ?? o.est?.lo, history: pushHistory(o, 'customer', 'accept', '수정 제안을 수락했어요') }));
export const custApproveProof = (id) => updateOrder(id, (o) => ({ status: 'making', history: pushHistory(o, 'customer', 'proof-ok', '시안을 확인하고 승인했어요') }));
export const custCancel = (id) => updateOrder(id, (o) => ({ status: 'canceled', history: pushHistory(o, 'customer', 'cancel', '주문을 취소했어요') }));
export const custReview = (id, stars, text) => updateOrder(id, () => ({ review: { stars, text, at: new Date().toISOString() } }));

// 체험용 주문 (사장님 화면 시연)
const NAMES = ['김서연', '이도윤', '박지민', '최예린', '정하준', '강수아', '조민준', '윤채원', '장서준', '임지아', '한유진', '오시우', '서다은', '신현우', '권나윤', '배지호'];
export function makeDemoOrders(shop = DEMO_SHOP) {
  const store = shopToStore(shop, 'demo');
  const r = rng(20261116);
  const t0 = today();
  const out = [];
  const mk = (dayOffset, status, opts = {}) => {
    let d = addDays(t0, dayOffset);
    if (shop.ops.closedDays.includes(d.getDay())) d = addDays(d, dayOffset >= 0 ? 1 : -1); // 휴무일 피하기
    const o = {
      shape: pick(['round', 'round', 'heart', 'square'], r), size: pick(['dosirak', 'mini', 'h1', 'h1', 'h2', 'h3'], r),
      design: pick(['simple', 'vintage', 'heartdots', 'flower', 'character', 'photo', 'drip', 'simple'], r),
      cream: pick(['white', 'pink', 'lavender', 'butter', 'mint', 'sky', 'peach', 'cocoa'], r),
      flavor: pick(['vanilla', 'choco', 'strawberry', 'earlgrey', 'vanilla'], r), text: pick(QUICK_TEXTS, r), noText: false,
      font: pick(['jua', 'pen', 'gaegu', 'melody'], r), textColor: pick(['berry', 'choco', 'navy'], r),
      toppings: r() > 0.55 ? [pick(['cherry', 'pearl', 'sprinkle', 'ribbon', 'strawberry'], r)] : [], extras: r() > 0.5 ? ['candle'] : [],
      date: ymd(d), time: pick(['12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'], r),
      request: opts.request || '', allergy: '', ...opts.o,
    };
    const est = estimate(store, o);
    const created = addDays(d, -(2 + Math.floor(r() * 4)));
    created.setHours(9 + Math.floor(r() * 12), Math.floor(r() * 60));
    const name = pick(NAMES, r);
    const order = {
      id: `DC-${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${1000 + Math.floor(r() * 9000)}`,
      storeId: shop.id, storeName: shop.name, storeKind: 'demo', createdAt: created.toISOString(), status,
      o, refThumb: null, customer: { name, phone: `010-0000-${String(1000 + Math.floor(r() * 9000))}` },
      est, checks: ruleCheck(store, { ...o, date: null }, {}), finalPrice: ['requested', 'change', 'declined', 'canceled'].includes(status) ? null : est.lo + (r() > 0.8 ? 2000 : 0),
      history: [{ at: created.toISOString(), by: 'customer', type: 'request', msg: '주문 요청서를 보냈어요' }], demo: true,
    };
    if (status === 'change') order.proposedPrice = est.lo + 3000;
    if (status === 'done' && r() > 0.45) order.review = { stars: r() > 0.25 ? 5 : 4, text: pick(['미리보기랑 똑같이 나와서 놀랐어요!', '글씨가 너무 예뻐요', '가격을 미리 알 수 있어서 좋았어요', '사장님 답장이 빨라요', '친구가 엄청 좋아했어요'], r), at: d.toISOString() };
    out.push(order);
  };
  for (let i = 0; i < 26; i++) mk(-1 - Math.floor(r() * 42), r() > 0.06 ? 'done' : 'canceled');
  mk(0, 'ready'); mk(0, 'making'); mk(1, 'making');
  mk(2, 'confirmed'); mk(3, 'proof', { o: { design: 'character' } }); mk(4, 'confirmed');
  mk(3, 'requested', { request: '글씨를 조금 크게 해 주세요' });
  mk(5, 'requested', { o: { design: 'character', text: '우리 강아지 생일' }, request: '강아지 사진 보내드릴게요, 비슷하게 그려 주세요' });
  mk(6, 'change');
  return out;
}
export function loadDemoShop() {
  setState((s) => ({ ...s, role: 'owner', shop: JSON.parse(JSON.stringify(DEMO_SHOP)), orders: [...s.orders.filter((o) => !o.demo), ...makeDemoOrders()] }));
}
