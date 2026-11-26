// 고객용 튜토리얼 두 가지 · 건너뛰기 가능
//  main(4단계): 앱을 열 때마다(새로고침 포함) 지도에 처음 들어오면 한 번 — 지도 화면 → 아래 가게 정보 → 내 위치 → AI 찾기 (다른 화면으로 넘어가지 않음)
//  ai(5단계): 그다음 'AI 찾기'를 처음 누르면 — AI로 만들기·카테고리 → 사진 올리기→완성 → 가게 찾기 → 주문서·계산서 → 주문 완료·사장님과 대화
//  ai 2~5단계는 예시 이미지(우리가 뽑은 캐릭터 케이크)로 실제 화면을 슥슥 넘겨 보여 주고, 끝나면 바로 지도로 돌아간 뒤 예시를 지운다.
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
export function startTour(kind = 'main') { listeners.forEach((f) => f(kind)); }

// 지도 화면의 'AI 찾기' 창 열고 닫기 (Home.jsx 가 듣는다)
const findSheet = (open) => window.dispatchEvent(new CustomEvent('ake-find', { detail: open }));
const here = () => location.hash.replace(/^#/, '').split('?')[0];
// 튜토리얼 화면은 뒤로가기 기록에 쌓지 않는다 (끝나고 뒤로가기를 눌러도 예시 화면이 안 나오게)
const goto = (p, full = p) => { if (here() !== p) { nav(full, { replace: true }); return 80; } return 0; }; // 화면이 그려질 만큼만 기다린다
// 단계 안에서 잠시 뒤에 할 일 — 중간에 건너뛰면 모두 취소한다 (끝난 뒤에 다른 화면으로 튀지 않게)
let timers = [];
const later = (f, ms) => { timers.push(setTimeout(f, ms)); };
const clearLater = () => { timers.forEach(clearTimeout); timers = []; };

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

// 지도 영역 (위 검색줄 아래 ~ 아래 가게 목록 위)
const mapRect = () => {
  const top = document.querySelector('.maphome .mtop')?.getBoundingClientRect();
  const sh = document.querySelector('.maphome .bsheet')?.getBoundingClientRect();
  const ph = document.querySelector('.phone')?.getBoundingClientRect();
  if (!top || !sh || !ph || sh.top - top.bottom < 80) return null;
  return { left: ph.left + 8, top: top.bottom + 6, width: ph.width - 16, height: sh.top - top.bottom - 16 };
};
const STAMP_SVG = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16M5.5 20v-6a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v6M12 12V8.6" /></svg>;
const LEGEND = (
  <span className="lgx">
    <span><span className="pinx"><i />3.8만~</span>케이크 가게</span>
    <span><span className="pinx"><span className="stampx">{STAMP_SVG}</span><i />4.2만~</span>iAKE 입점</span>
  </span>
);
// 1차: 지도 화면만 (안으로 들어가지 않는다)
const MAIN = [
  { n: 1, rect: mapRect, radius: 20, title: '내 주변 케이크 지도', body: <>핀에는 1호 가격이 보여요. <b>동그라미</b>는 케이크 가게, <b>도장</b>이 찍힌 곳은 iAKE에 입점해 앱으로 바로 주문돼요.{LEGEND}</>,
    enter: () => { findSheet(false); return goto('/c'); } },
  { n: 2, sel: '.bsheet', pad: 0, radius: 24, title: '가게 정보는 아래에서', body: '사진 · 가격 · 거리를 한눈에 보고, 누르면 가게 화면으로 가요. 위로 올리면 더 많이 보여요.',
    enter: () => goto('/c') },
  { n: 3, sel: '.mchip.loc', pad: 4, radius: 18, title: '내 위치로 주변 가게 찾기', body: '여기를 누르면 내 위치(위치 허용)나 동네를 골라, 주변 케이크 가게를 다시 찾아요.',
    enter: () => goto('/c') },
  { n: 4, sel: '[data-coach="find"]', pad: 4, title: 'AI 찾기', body: '원하는 케이크 사진을 넣거나 말로 찾고, 카테고리를 골라 AI로 케이크 이미지도 만들어요. 눌러 보면 자세히 알려 드려요!', doneLabel: '시작하기',
    enter: () => goto('/c') },
];

// 2차: 'AI 찾기'를 누르면
const AI = [
  { n: 1, sel: '.aimake', pad: 4, radius: 18, auto: 3000, title: 'AI로 원하는 케이크 만들기', body: '말 · 사진으로 가게를 찾거나, 여기서 AI로 케이크 이미지를 직접 만들어요.',
    enter: () => { const w = goto('/c'); if (w) later(() => findSheet(true), w); else findSheet(true); return w + 30; } },
  { n: 1, sel: '.mk-card', pad: 4, radius: 22, title: '카테고리 고르기', body: '문구 · 반려동물 · 캐릭터 · 꽃 등 10가지 중 하나를 골라요.',
    enter: () => { findSheet(false); return goto('/c/make'); } },
  { n: 2, sel: '.mk-up', pad: 4, radius: 20, auto: 3200, title: '사진 넣고 바로 만들기', body: '원하는 사진 · 레터링 · 판 문구를 넣고 [바로 만들기]를 눌러요…',
    enter: () => goto('/c/make/character') },
  { n: 2, sel: '.mk-result', pad: 4, radius: 26, title: '글귀까지 들어간 케이크 완성!', body: '적은 문구가 그대로 들어가요. [그림 꾸미기]로 고치거나 [이대로 주문하기]를 눌러요.',
    enter: () => { putDemoDraft(); return goto('/c/make/result'); } },
  { n: 3, sel: ['.mk .scard', '.mk-shophead'], pad: 4, radius: 16, title: '이 케이크를 만들 수 있는 가게', body: '비슷한 케이크를 만드는 가게를 1km 이내 · 밖, 가까운 순으로 보여 줘요.',
    enter: () => { putDemoDraft(); return goto('/c/make/shops'); } },
  { n: 4, sel: '.ordbar', pad: 4, radius: 18, title: '주문서 + 계산서', body: '만든 이미지가 들어간 주문서에서 사이즈 · 맛 · 픽업을 고르면 예상 금액이 바로 나와요.',
    enter: () => { putDemoDraft(); const s = demoStore(); return s ? goto(`/order/${s.id}`, `/order/${s.id}?ai=1`) : 0; } },
  { n: 5, sel: '.donebtns', pad: 6, radius: 20, title: '주문 완료 → 사장님과 대화', body: '사장님이 금액을 확정하면 결제하고, ‘사장님과 대화’에서 시안 · 픽업까지 이야기하면 끝!', doneLabel: '시작하기',
    enter: () => { const o = putDemoOrder(); return o ? goto(`/done/${o.id}`) : 0; } },
];

export default function Tour() {
  const [kind, setKind] = useState(null); // null | 'main' | 'ai'
  useEffect(() => { const f = (v) => { clearLater(); setKind(v); }; listeners.push(f); return () => { listeners = listeners.filter((x) => x !== f); }; }, []);
  // 튜토리얼 도중 앱을 닫았으면 남은 예시를 지운다
  useEffect(() => { const st = getState(); if (st.aiDraft?.tour || st.orders.some((x) => x.tour)) setState((s) => ({ ...s, orders: s.orders.filter((x) => !x.tour), aiDraft: s.aiDraft?.tour ? null : s.aiDraft })); }, []);
  useEffect(() => { document.body.classList.toggle('touring', !!kind); }, [kind]);
  // 1차(지도) 안내 중에 다른 화면으로 가면 안내를 닫는다
  useEffect(() => { if (kind !== 'main') return undefined; const f = () => { if (here() !== '/c') { clearLater(); setKind(null); setState({ seenTour: true, seenGuide: true }); } }; window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f); }, [kind]);
  if (!kind) return null;
  // 끝(건너뛰기 포함): 먼저 지도 첫 화면으로 바로 옮기고, 화면이 바뀐 다음에 안내를 닫고 예시를 지운다 (주문 화면이 잠깐 보이지 않게)
  const done = () => {
    clearLater();
    setState({ seenTour: true, seenGuide: true });
    findSheet(false);
    const away = here() !== '/c';
    if (away) nav('/c', { replace: true });
    setTimeout(() => { setKind(null); cleanup(); }, away ? 150 : 0);
  };
  return <Coach key={kind} steps={kind === 'ai' ? AI : MAIN} strict block={kind === 'main'} onDone={done} />;
}
