// 고객용 5단계 튜토리얼 — 앱을 열 때마다(새로고침 포함) 지도에 처음 들어오면 한 번 · 건너뛰기 가능
// 지도(AI 찾기 · 가게 정보) → AI 찾기 창 → 카테고리 → 만들기·가게·계산서·주문 흐름까지 화면을 옮겨 가며 보여 준다.
// App 에서 휴대폰 화면 전체 위에 띄운다 (화면을 옮겨도 사라지지 않게).
import { useEffect, useState } from 'react';
import Coach from './Coach.jsx';
import { nav } from '../lib/router.js';
import { setState } from '../lib/state.js';

let listeners = [];
export function startTour() { listeners.forEach((f) => f(true)); }

// 지도 화면의 'AI 찾기' 창 열고 닫기 (Home.jsx 가 듣는다)
const findSheet = (open) => window.dispatchEvent(new CustomEvent('ake-find', { detail: open }));
const here = () => location.hash.replace(/^#/, '').split('?')[0];
const goto = (p) => { if (here() !== p) { nav(p); return 500; } return 0; };

const STEPS = [
  { sel: '[data-coach="find"]', pad: 4, title: 'AI 찾기', body: '원하는 케이크를 AI로 직접 만들거나, 말·사진으로 케이크 가게를 찾아요.',
    enter: () => { findSheet(false); return goto('/c') + 250; } },
  { sel: '.bsheet .bl .scard', pad: 4, radius: 16, title: '가게 정보는 아래에서', body: '가까운 가게의 1호 가격·거리·별점이 먼저 보여요. 빨간 케이크 도장이 찍힌 가게는 앱으로 바로 주문돼요.',
    enter: () => { findSheet(false); return goto('/c') + 300; } },
  { sel: '.aimake', pad: 4, radius: 18, title: '① AI로 케이크 만들기', body: 'AI 찾기를 열고 ‘AI로 원하는 케이크 이미지 만들기’를 눌러요.',
    enter: () => { const w = goto('/c'); setTimeout(() => findSheet(true), w + 150); return w + 650; } },
  { sel: '.mk-card', pad: 4, radius: 22, title: '② 카테고리 고르기', body: '문구 · 반려동물 · 인물 · 캐릭터 · 꽃 등 10가지 중 하나를 골라요.',
    enter: () => { findSheet(false); setTimeout(() => goto('/c/make'), 450); return 1000; } },
  { sel: '.mk-bar .btn', pad: 6, radius: 18, title: '③ 만들고 → 가게 → 주문',
    body: '사진 · 레터링 · 판 문구 · 꾸미기를 넣고 [바로 만들기]를 누르면 글귀까지 들어간 실사 케이크가 나와요. [이대로 주문하기] → 만들 수 있는 가게(1km 이내·밖) → 가게를 고르면 이 사진이 들어간 주문서와 예상 금액(계산서)이 나오고, 요청서를 보내면 끝!',
    enter: () => goto('/c/make/pet') + 300 },
];

export default function Tour() {
  const [on, setOn] = useState(false);
  useEffect(() => { const f = (v) => setOn(v); listeners.push(f); return () => { listeners = listeners.filter((x) => x !== f); }; }, []);
  if (!on) return null;
  const done = () => {
    setOn(false);
    setState({ seenTour: true, seenGuide: true });
    findSheet(false);
    if (here().startsWith('/c/make')) setTimeout(() => nav('/c', { replace: true }), 200); // 지도로 돌아가 바로 시작
  };
  return <Coach steps={STEPS} strict onDone={done} />;
}
