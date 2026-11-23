// 예시 케이크 사진 (디자인 핸드오프 assets/cakes) — 둘러보기·발표용 '예시 주문'에만 쓴다.
// 실제 가게 정보(카카오맵 77곳 등)에는 붙이지 않는다. 가게가 진짜 작품 사진을 올리면
// public/examples 폴더와 이 파일을 지우고, orders.js 의 addSampleOrders 에서 SAMPLE_PORTFOLIO 만 빼면 된다.
const B = `${import.meta.env.BASE_URL}examples/`;

// 대표 디자인 5개 (주문서 1단계 · 가게 화면 '이런 케이크를 만들어요')
// opt: 이 디자인으로 주문할 때 기본으로 고를 크기·디자인 (가격 계산용)
export const SAMPLE_DESIGNS = [
  { id: 'ex-d1', caption: '고양이 리본 미니', src: B + 'd1.jpeg', opt: { size: 'mini', design: 'character' } },
  { id: 'ex-d2', caption: '헬로·포차 도시락 세트', src: B + 'd2.jpeg', opt: { size: 'h1', design: 'character', toppings: ['cherry'] } },
  { id: 'ex-d3', caption: '말차 곰돌이 세트', src: B + 'd3.jpeg', opt: { size: 'h1', design: 'character', flavor: 'earlgrey' } },
  { id: 'ex-d4', caption: '곰·토끼 1000일', src: B + 'd4.jpeg', opt: { size: 'h1', design: 'character', cream: 'pink' } },
  { id: 'ex-d5', caption: '100일 드로잉 케이크', src: B + 'd5.jpeg', opt: { size: 'mini', design: 'simple' } },
];
// 작품 사진 (가게 화면 위쪽 사진 · 관심 '입점 가게 작품')
export const SAMPLE_WORKS = [
  { id: 'ex-mm', caption: '해피버스데이 곰돌이 레터링', src: B + 'mm.jpeg' },
  { id: 'ex-p1', caption: '1000일 고양이 도시락', src: B + 'p1.jpeg' },
  { id: 'ex-p2', caption: '생일 축하 구름 레터링', src: B + 'p2.jpeg' },
  { id: 'ex-p3', caption: '아기고양이 드로잉', src: B + 'p3.jpeg' },
  { id: 'ex-p4', caption: '하트 편지 케이크', src: B + 'p4.jpeg' },
  { id: 'ex-p5', caption: '네잎클로버 케이크', src: B + 'p5.jpeg' },
  { id: 'ex-p6', caption: '부모님 초상화 케이크', src: B + 'p6.jpeg' },
  { id: 'ex-c1', caption: '곰돌이 롤케이크', src: B + 'c1.jpeg' },
  { id: 'ex-c2', caption: '곰돌이 레터링 도시락', src: B + 'c2.jpeg' },
  { id: 'ex-c3', caption: '토끼·고양이 하늘 케이크', src: B + 'c3.jpeg' },
  { id: 'ex-c4', caption: '1주년 레터링', src: B + 'c4.jpeg' },
  { id: 'ex-c5', caption: '강아지 드로잉 케이크', src: B + 'c5.jpeg' },
  { id: 'ex-c6', caption: '돼지 레터링 도시락', src: B + 'c6.jpeg' },
];
// 가게 portfolio 에 넣는 모양: sample 표시가 있어 '예시 지우기'로 같이 지워진다. work: 대표 디자인이 아닌 작품 사진
export const SAMPLE_PORTFOLIO = [
  ...SAMPLE_DESIGNS.map((d) => ({ ...d, sample: true })),
  ...SAMPLE_WORKS.map((w) => ({ ...w, sample: true, work: true })),
];
