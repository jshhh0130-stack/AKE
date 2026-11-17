// 주문서 공통 틀 (팀 기획 8원칙: 사이즈·시트·크림·디자인·문구·픽업·기타 요청 — 순서는 같고 값은 가게 마음대로)
// 가격 범위 [최소, 최대] 는 수원 가게 공개 가격(2024~2026 후기·프로필, 팀 리서치)을 바탕으로 한 "추정" 값이다.

export const STYLES = [
  { id: 'lettering', name: '레터링', emoji: '✍️', desc: '케이크 위에 문구를 쓰는 기본 커스텀' },
  { id: 'photo', name: '포토', emoji: '📷', desc: '사진을 먹는 종이에 인쇄해 올려요' },
  { id: 'character', name: '그림·캐릭터', emoji: '🐻', desc: '크림으로 그림을 그려요' },
  { id: 'flower', name: '플라워', emoji: '🌸', desc: '크림·앙금·생화 꽃 장식' },
  { id: 'rice', name: '떡케이크', emoji: '🍡', desc: '설기 위에 앙금 장식' },
  { id: '3d', name: '입체', emoji: '🧸', desc: '피규어·입체 장식' },
  { id: 'tiered', name: '2단', emoji: '🎂', desc: '행사용 2단 케이크' },
  { id: 'custom', name: '주문제작', emoji: '🎨', desc: '상담 후 자유 디자인' },
];
export const styleName = (id) => STYLES.find((s) => s.id === id)?.name || id;

// limit: 사이즈별 권장 문구 글자 수(공백 제외). 배민 도시락 8자, 미니 10자 제한 가게 사례, 1호 15자(팀 화면 예시)
export const SIZES = [
  { id: 'mini', name: '미니', cm: 12, serves: '1~2인', limit: 10, R: 74, H: 46 },
  { id: 'h1', name: '1호', cm: 15, serves: '2~4인', limit: 15, R: 92, H: 54 },
  { id: 'h2', name: '2호', cm: 18, serves: '4~6인', limit: 18, R: 102, H: 58 },
  { id: 'h3', name: '3호', cm: 21, serves: '6~8인', limit: 22, R: 110, H: 62 },
];
export const sizeOf = (id) => SIZES.find((s) => s.id === id) || (id === 'dosirak' ? SIZES[0] : SIZES[1]);
// 크기에 따라 커지는 추가금 배율 (사월 레터링 케이크 가격표: 도시락·1호·2호 추가금이 대략 1 : 2 : 3)
export const SIZE_MULT = { mini: 0.7, h1: 1, h2: 1.3, h3: 1.6 };

// 수원 공개 가격 기반 기본가 범위 (흰 바탕 기본 레터링 기준)
export const BENCH = {
  mini: [20000, 33000],
  h1: [38000, 50000],
  h2: [50000, 65000],
  h3: [62000, 85000],
};
export const BENCH_NOTE = '수원 가게 9곳의 공개 가격(블로그 후기·가게 프로필, 2024~2026)을 모아 만든 범위예요.';

export const SHAPES = [
  { id: 'round', name: '원형', add: [0, 0] },
  { id: 'heart', name: '하트', add: [1000, 3000] }, // 오도르 +1,000 · 힙드 +3,000
  { id: 'square', name: '사각', add: [1500, 3000] }, // 오도르 +1,500
];

export const DESIGNS = [
  { id: 'simple', name: '심플 레터링', desc: '테두리 짜기 + 문구', add: [0, 0] },
  { id: 'vintage', name: '빈티지 프릴', desc: '주름 프릴·가랜드 짜기', add: [2000, 6000] }, // 사월 테두리·꾸밈비 2,000+~
  { id: 'heartdots', name: '하트 도트', desc: '옆면에 작은 하트', add: [1000, 3000] },
  { id: 'flower', name: '크림 플라워', desc: '크림으로 짠 꽃', add: [5000, 12000], style: 'flower' },
  { id: 'drip', name: '초코 드립', desc: '초코가 흘러내리는 장식', add: [3000, 6000] },
  { id: 'character', name: '그림·캐릭터', desc: '크림으로 그림 그리기', add: [5000, 15000], style: 'character', check: '그림 내용·저작권은 사장님이 확인해요' }, // 사월 그림 5,000+~
  { id: 'photo', name: '포토 프린팅', desc: '사진을 먹는 종이에 인쇄', add: [5000, 8000], style: 'photo', needPhoto: true }, // 모잉 포토프린트 5,000
];
export const designOf = (id) => DESIGNS.find((d) => d.id === id) || DESIGNS[0];

export const FLAVORS = [
  { id: 'vanilla', name: '바닐라', add: [0, 0] },
  { id: 'choco', name: '초코', add: [3000, 4000] }, // 힙드 초코시트 +3,000 · 사월 1호 +4,000
  { id: 'strawberry', name: '딸기', add: [1000, 3000] },
  { id: 'oreo', name: '오레오', add: [2000, 3000] },
  { id: 'earlgrey', name: '얼그레이', add: [2000, 3000] },
  { id: 'blueberry', name: '블루베리', add: [2000, 3000] },
  { id: 'creamcheese', name: '크림치즈', add: [8000, 10000] }, // 사월 1호 크림치즈 겉크림 10,000
];
export const RICE_FLAVORS = [
  { id: 'baek', name: '백설기', add: [0, 0] },
  { id: 'heuk', name: '흑임자', add: [2000, 5000] },
  { id: 'pumpkin', name: '단호박', add: [2000, 5000] },
  { id: 'mugwort', name: '쑥', add: [2000, 5000] },
];

// tone: 기본(0) / 파스텔(연한 톤) / 진한 톤 — 힙드: 겉크림 색 변경 2,000~5,000원(연한톤·진한톤)
export const CREAMS = [
  { id: 'white', name: '화이트', hex: '#FFFBF4', tone: 'base' },
  { id: 'pink', name: '베이비핑크', hex: '#FBC8D8', tone: 'pastel' },
  { id: 'peach', name: '피치', hex: '#FFD5BC', tone: 'pastel' },
  { id: 'butter', name: '버터옐로', hex: '#FBE7A6', tone: 'pastel' },
  { id: 'mint', name: '민트', hex: '#C6EBD9', tone: 'pastel' },
  { id: 'sky', name: '스카이', hex: '#CBDFF6', tone: 'pastel' },
  { id: 'lavender', name: '라벤더', hex: '#DECFF4', tone: 'pastel' },
  { id: 'cocoa', name: '코코아', hex: '#C9A58C', tone: 'deep' },
  { id: 'hotpink', name: '진핑크', hex: '#F58DB0', tone: 'deep' },
  { id: 'navy', name: '네이비', hex: '#4B5C82', tone: 'deep' },
];
export const CREAM_ADD = { base: [0, 0], pastel: [0, 2000], deep: [2000, 5000] };
export const creamOf = (id) => CREAMS.find((c) => c.id === id) || CREAMS[0];

export const TEXT_COLORS = [
  { id: 'berry', name: '진분홍', hex: '#C2185B' },
  { id: 'choco', name: '초코', hex: '#5B3726' },
  { id: 'navy', name: '네이비', hex: '#2F4B7C' },
  { id: 'black', name: '블랙', hex: '#2B2B2B' },
  { id: 'white', name: '화이트', hex: '#FFFFFF' },
  { id: 'gold', name: '골드', hex: '#B8892B' },
];
export const textColorOf = (id) => TEXT_COLORS.find((c) => c.id === id) || TEXT_COLORS[0];

export const FONTS = [
  { id: 'jua', name: '동글', css: "'Jua', 'Pretendard Variable', sans-serif" },
  { id: 'pen', name: '손글씨', css: "'Nanum Pen Script', cursive" },
  { id: 'gaegu', name: '삐뚤빼뚤', css: "'Gaegu', cursive" },
  { id: 'gowun', name: '단정', css: "'Gowun Dodum', sans-serif" },
  { id: 'melody', name: '멜로디', css: "'Hi Melody', cursive" },
  { id: 'script', name: '영문 필기체', css: "'Dancing Script', 'Jua', cursive" },
];
export const fontOf = (id) => FONTS.find((f) => f.id === id) || FONTS[0];

export const TOPPINGS = [
  { id: 'cherry', name: '체리', desc: '빨간 체리를 올려요', add: [2000, 5000], scale: true },
  { id: 'strawberry', name: '생딸기', desc: '생딸기 토핑', add: [3000, 6000], scale: true },
  { id: 'sprinkle', name: '스프링클', desc: '케이크 위에 뿌리는 작은 설탕 장식', add: [1000, 1000] }, // 힙드·모잉 +1,000
  { id: 'pearl', name: '진주 펄', desc: '먹는 진주 모양 설탕 구슬', add: [1000, 2000] },
  { id: 'ribbon', name: '리본', desc: '옆면에 리본 장식', add: [1000, 3000] },
  { id: 'freshflower', name: '생화', desc: '식용 가능한 생화 장식', add: [8000, 15000], check: '생화 종류·수급은 사장님이 확인해요' },
  { id: 'macaron', name: '마카롱', desc: '마카롱을 꽂아요', add: [2000, 3000] },
];
export const EXTRAS = [
  { id: 'candle', name: '파티 초', desc: '얇은 생일 초', add: [0, 1000] },
  { id: 'numcandle', name: '숫자 초', desc: '문구 속 숫자로 초를 만들어요', add: [1000, 2000] },
  { id: 'topper', name: '토퍼', desc: '케이크에 꽂는 문구 장식', add: [3000, 5000] },
  { id: 'plate', name: '판 문구', desc: '케이크 아래 판에 쓰는 문구', add: [1000, 1000] }, // 사월 판문구 1,000
  { id: 'card', name: '메시지 카드', desc: '손글씨 카드', add: [500, 1500] },
  { id: 'icebag', name: '보냉백', desc: '멀리 갈 때 필요해요', add: [2000, 5000] }, // 슈케익하우스 2호 보냉가방 5,000
];
export const LONG_TEXT_ADD = [1000, 3000];

export const optName = (list, id) => list.find((x) => x.id === id)?.name || id;

// 수원 주요 위치 (위치 빠르게 고르기)
export const PLACES = [
  { label: '아주대학교', lat: 37.2830, lng: 127.0435 },
  { label: '수원역', lat: 37.2660, lng: 127.0001 },
  { label: '인계동 (수원시청역)', lat: 37.2623, lng: 127.0316 },
  { label: '행궁동 (행리단길)', lat: 37.2817, lng: 127.0130 },
  { label: '광교중앙역', lat: 37.2886, lng: 127.0514 },
  { label: '영통역', lat: 37.2516, lng: 127.0712 },
  { label: '망포역', lat: 37.2456, lng: 127.0573 },
  { label: '매탄동', lat: 37.2662, lng: 127.0472 },
  { label: '성균관대역', lat: 37.3005, lng: 126.9710 },
  { label: '권선동', lat: 37.2571, lng: 127.0293 },
  { label: '호매실동', lat: 37.2701, lng: 126.9550 },
  { label: '정자동 (장안구)', lat: 37.2959, lng: 126.9930 },
];
export const DEFAULT_LOC = { lat: 37.2830, lng: 127.0435, label: '아주대학교 근처', src: 'preset' };

export const QUICK_TEXTS = ['생일 축하해', 'HAPPY BIRTHDAY', '합격 축하해', '사랑해', '고생했어', '첫 돌 축하해', '엄마 아빠 사랑해요', '1주년 축하해'];

export const NOTICE_PRESETS = [
  '예약금(50%)이 확인되면 제작을 시작해요.',
  '디자인·문구 변경은 픽업 3일 전까지 1회 가능해요.',
  '캐릭터·로고 그림은 저작권 때문에 사장님이 가능 여부를 확인해요.',
  '생크림 케이크라 픽업 후 2시간 안에 냉장 보관해 주세요.',
  '픽업 시간보다 늦으면 미리 연락 주세요.',
  '당일 취소는 어려워요.',
];

// 가게 테마 색 (사장님 꾸미기)
export const THEMES = ['#F75C8D', '#FF8A65', '#E7A33E', '#4CAF8E', '#4F86C6', '#8E6BBE', '#5D4037', '#2B2126'];
