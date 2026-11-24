// 고객용 8단계 튜토리얼 — 앱을 열 때마다(새로고침 포함) 지도에 처음 들어오면 한 번 · 건너뛰기 가능
// 가게 정보 → AI 찾기 → AI로 만들기 → 카테고리 → (사진 올리기 → 이미지 완성) → 가게 찾기 → 주문서·계산서 → 주문 완료·사장님과 대화
// 5~8단계는 예시 이미지(우리가 뽑은 캐릭터 케이크)로 실제 화면을 슥슥 넘겨 보여 주고, 끝나면 예시를 지우고 지도로 돌아간다.
// App 에서 휴대폰 화면 전체 위에 띄운다 (화면을 옮겨도 사라지지 않게).
import { useEffect, useState } from 'react';
import Coach from './Coach.jsx';
import { nav } from '../lib/router.js';
import { setState, getState } from '../lib/state.js';
import { getStores, rankStores } from '../lib/stores.js';
import { estimate } from '../lib/price.js';
import { MAKE_DEFAULT } from '../lib/imagegen.js';
import { today, addDays, ymd } from '../lib/util.js';

let listeners = [];
export function startTour() { listeners.forEach((f) => f(true)); }

// 지도 화면의 'AI 찾기' 창 열고 닫기 (Home.jsx 가 듣는다)
const findSheet = (open) => window.dispatchEvent(new CustomEvent('ake-find', { detail: open }));
const here = () => location.hash.replace(/^#/, '').split('?')[0];
// 튜토리얼 화면은 뒤로가기 기록에 쌓지 않는다 (끝나고 뒤로가기를 눌러도 예시 화면이 안 나오게)
const goto = (p, full = p) => { if (here() !== p) { nav(full, { replace: true }); return 550; } return 0; };

// ── 튜토리얼 예시 (끝나면 지운다) ──
const DEMO_ID = 'TOUR-DEMO';
const BASE = import.meta.env.BASE_URL;
let saved = null; // 원래 aiDraft
const demoDraft = () => ({ id: 'tour-demo', cat: 'character', src: `${BASE}make-examples/character.jpg`, text: '콩이야 생일 축하해', request: '', opts: { ...MAKE_DEFAULT }, engine: 'demo', tour: true, at: Date.now() });
function putDemoDraft() {
  const st = getState();
  if (!st.aiDraft?.tour) saved = st.aiDraft || null;
  setState({ aiDraft: demoDraft() });
}
function demoStore() {
  const st = getState();
  const r = rankStores(getStores(st), { loc: st.loc, radius: 20, sort: 'near', find: { styles: ['character'] } });
  return (r.find((x) => !x.partial) || r[0])?.s || getStores(st).find((s) => !s.hidden && s.lat != null);
}
function putDemoOrder() {
  const store = demoStore();
  if (!store) return null;
  const d = demoDraft();
  const o = { shape: 'round', size: 'h1', design: 'character', cream: 'white', flavor: 'vanilla', text: d.text, noText: false, font: 'jua', textColor: 'choco', toppings: [], extras: [], date: ymd(addDays(today(), 3)), time: '14:00', request: '', allergy: '', pickName: 'AI로 만든 케이크', plateText: '' };
  const order = { id: DEMO_ID, storeId: store.id, storeName: store.name, createdAt: new Date().toISOString(), status: 'requested', o, customer: { name: '예시' }, est: estimate(store, o), checks: [], finalPrice: null, ev: [], imgs: { ref: d.src }, mine: true, seen: {}, tour: true };
  setState((s) => ({ ...s, orders: [order, ...s.orders.filter((x) => x.id !== DEMO_ID)] }));
  return order;
}
function cleanup() {
  setState((s) => ({ ...s, orders: s.orders.filter((x) => x.id !== DEMO_ID && !x.tour), aiDraft: s.aiDraft?.tour ? saved : s.aiDraft }));
  saved = null;
}

const STEPS = [
  { n: 1, sel: '.bsheet .bl .scard', pad: 4, radius: 16, title: '가게 정보는 아래에서', body: '가까운 케이크 가게의 1호 가격·거리·별점이 먼저 보여요. 빨간 케이크 도장이 찍힌 가게는 앱으로 바로 주문돼요.',
    enter: () => { findSheet(false); return goto('/c') + 300; } },
  { n: 2, sel: '[data-coach="find"]', pad: 4, title: 'AI 찾기', body: '원하는 케이크를 말·사진으로 찾거나, AI로 직접 만들 수 있어요. 눌러서 들어가 볼게요.',
    enter: () => { findSheet(false); return goto('/c') + 250; } },
  { n: 3, sel: '.aimake', pad: 4, radius: 18, title: 'AI로 원하는 케이크 만들기', body: 'AI 찾기 안에서 ‘AI로 원하는 케이크 이미지 만들기’를 눌러요.',
    enter: () => { const w = goto('/c'); setTimeout(() => findSheet(true), w + 150); return w + 650; } },
  { n: 4, sel: '.mk-card', pad: 4, radius: 22, title: '카테고리 고르기', body: '문구 · 반려동물 · 인물 · 캐릭터 · 꽃 등 10가지 중 하나를 골라요.',
    enter: () => { findSheet(false); setTimeout(() => goto('/c/make'), 450); return 1000; } },
  { n: 5, sel: '.mk-up', pad: 4, radius: 20, auto: 3200, title: '사진 올리고 바로 만들기', body: '사진을 올리고 레터링 · 판 문구 · 꾸미기를 고른 뒤 [바로 만들기]를 눌러요…',
    enter: () => goto('/c/make/character') + 300 },
  { n: 5, sel: '.mk-result', pad: 4, radius: 26, title: '글귀까지 들어간 케이크 완성!', body: '적은 문구가 그대로 들어간 실사 케이크가 나와요. [그림 꾸미기]로 더 고치거나 [이대로 주문하기]를 눌러요.',
    enter: () => { putDemoDraft(); return goto('/c/make/result') + 400; } },
  { n: 6, sel: ['.mk .scard', '.mk-shophead'], pad: 4, radius: 16, title: '이 케이크를 만들 수 있는 가게', body: '만든 이미지와 비슷한 케이크를 만드는 가게를 1km 이내 · 1km 밖, 가까운 순으로 찾아 줘요.',
    enter: () => { putDemoDraft(); return goto('/c/make/shops') + 400; } },
  { n: 7, sel: '.ordbar', pad: 4, radius: 18, title: '주문서 + 계산서', body: '가게를 고르면 만든 이미지가 가운데 들어간 주문서가 열려요. 사이즈 · 맛 · 픽업을 고르면 아래에 예상 금액(계산서)이 바로 나와요.',
    enter: () => { putDemoDraft(); const s = demoStore(); return s ? goto(`/order/${s.id}`, `/order/${s.id}?ai=1`) + 500 : 0; } },
  { n: 8, sel: '.donebtns', pad: 6, radius: 20, title: '주문 완료 → 사장님과 대화', body: '요청서를 보내면 사장님께 바로 가요. 사장님이 금액을 확정하면 결제하고, ‘사장님과 대화’에서 시안·픽업까지 이야기하면 끝!', doneLabel: '지도로 시작하기',
    enter: () => { const o = putDemoOrder(); return o ? goto(`/done/${o.id}`) + 500 : 0; } },
];

export default function Tour() {
  const [on, setOn] = useState(false);
  useEffect(() => { const f = (v) => setOn(v); listeners.push(f); return () => { listeners = listeners.filter((x) => x !== f); }; }, []);
  // 튜토리얼 도중 앱을 닫았으면 남은 예시를 지운다
  useEffect(() => { const st = getState(); if (st.aiDraft?.tour || st.orders.some((x) => x.tour)) setState((s) => ({ ...s, orders: s.orders.filter((x) => !x.tour), aiDraft: s.aiDraft?.tour ? null : s.aiDraft })); }, []);
  if (!on) return null;
  const done = () => {
    setOn(false);
    setState({ seenTour: true, seenGuide: true });
    findSheet(false);
    cleanup();
    if (here() !== '/c') setTimeout(() => nav('/c', { replace: true }), 150); // 끝나면(건너뛰어도) 지도 첫 화면으로
  };
  return <Coach steps={STEPS} strict onDone={done} />;
}
