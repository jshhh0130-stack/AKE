// 체험용(가상) 가게 — 손님 주문 → 사장님 확인 → 확정 흐름을 한 기기에서 시연하기 위한 데이터
import { NOTICE_PRESETS } from './catalog.js';

export const DEMO_ID = 'demo-dearcake';

export const DEFAULT_MENU = {
  sizes: { dosirak: 20000, mini: 30000, h1: 42000, h2: 55000, h3: 68000 },
  shapes: { heart: 2000, square: 2000 },
  designs: { simple: 0, vintage: 5000, heartdots: 2000, flower: 8000, drip: 4000, character: 10000, photo: 6000 },
  flavors: { vanilla: 0, choco: 3000, strawberry: 3000, oreo: 3000, earlgrey: 3000, blueberry: 3000, creamcheese: 10000 },
  creams: { pastel: 0, deep: 3000 },
  toppings: { cherry: 3000, strawberry: 5000, sprinkle: 1000, pearl: 1500, ribbon: 2000, freshflower: 10000, macaron: 2500 },
  extras: { candle: 0, numcandle: 1500, topper: 4000, plate: 1000, card: 1000, icebag: 3000 },
  longText: 2000,
};
export const DEFAULT_OPS = {
  closedDays: [1], holidays: [], leadDays: 2, sameDay: false, cutoff: '15:00', dailyMax: 6,
  pickupStart: '11:00', pickupEnd: '19:00', slotMin: 60, deposit: 50, autoConfirm: true, paused: false,
};
// 체험 가게는 언제 열어 봐도 오늘·이번 주 시연이 되도록, 휴무 요일을 '오늘로부터 4일 뒤' 요일로 둔다
const DEMO_CLOSED = (new Date().getDay() + 4) % 7;
const DEMO_OPS = { ...DEFAULT_OPS, closedDays: [DEMO_CLOSED] };
export const DEFAULT_FORM = { fontChoice: true, refPhoto: true, allergy: true, extras: true, plateText: true, recipient: false };

export const DEMO_SHOP = {
  id: DEMO_ID,
  demo: true,
  name: '디어케이크 체험 공방',
  gu: '영통구',
  dong: '원천동',
  addr: '아주대학교 앞 (체험용 가상 가게 · 실제 주문 안 됨)',
  lat: 37.2788,
  lng: 127.0428,
  insta: '',
  kakao: '',
  intro: '아주대 앞 작은 레터링 케이크 공방이에요. 미리보기 그대로, 정성껏 만들어 드려요.',
  styles: ['lettering', 'dosirak', 'character', 'photo', 'flower'],
  menu: DEFAULT_MENU,
  ops: DEMO_OPS,
  form: DEFAULT_FORM,
  theme: { color: '#F75C8D', banner: 'dots' },
  hero: { shape: 'heart', size: 'h1', design: 'vintage', cream: 'pink', text: 'Dear Cake', font: 'script', textColor: 'berry', toppings: ['pearl'], extras: [] },
  notices: NOTICE_PRESETS.slice(0, 4),
  faq: [
    { q: '당일 주문도 되나요?', a: '당일 주문은 어려워요. 픽업 2일 전까지 주문해 주세요.' },
    { q: '캐릭터 그림도 되나요?', a: '가능해요! 저작권이 있는 캐릭터는 비슷한 느낌으로 바꿔 그려 드려요.' },
    { q: '보냉백이 필요한가요?', a: '30분 넘게 이동하면 보냉백(3,000원)을 추천해요.' },
  ],
  portfolio: [
    { id: 'p1', caption: '하트 빈티지 · 1호', design: { shape: 'heart', size: 'h1', design: 'vintage', cream: 'pink', text: '사랑해', font: 'pen', textColor: 'berry', toppings: ['pearl'] } },
    { id: 'p2', caption: '곰돌이 도시락', design: { shape: 'round', size: 'dosirak', design: 'character', cream: 'butter', text: '생일 축하해', font: 'gaegu', textColor: 'choco', extras: ['plate'] } },
    { id: 'p3', caption: '체리 레터링 · 미니', design: { shape: 'round', size: 'mini', design: 'simple', cream: 'white', text: 'HAPPY DAY', font: 'script', textColor: 'berry', toppings: ['cherry'] } },
    { id: 'p4', caption: '라벤더 플라워 · 2호', design: { shape: 'round', size: 'h2', design: 'flower', cream: 'lavender', text: '감사합니다', font: 'gowun', textColor: 'navy' } },
    { id: 'p5', caption: '사진 케이크 · 1호', design: { shape: 'square', size: 'h1', design: 'photo', cream: 'white', text: '첫 돌 축하해', font: 'jua', textColor: 'berry', toppings: ['ribbon'] } },
    { id: 'p6', caption: '초코 드립 · 1호', design: { shape: 'round', size: 'h1', design: 'drip', cream: 'cocoa', text: '20살 축하해', font: 'jua', textColor: 'white', extras: ['numcandle'], toppings: ['strawberry'] } },
  ],
  createdAt: '2026-11-01',
};

export const NEW_SHOP = (base = {}) => ({
  id: 'shop-' + Date.now().toString(36),
  name: '',
  gu: '',
  dong: '',
  addr: '',
  lat: 37.2830,
  lng: 127.0435,
  insta: '',
  kakao: '',
  intro: '',
  styles: ['lettering'],
  menu: JSON.parse(JSON.stringify(DEFAULT_MENU)),
  ops: { ...DEFAULT_OPS },
  form: { ...DEFAULT_FORM },
  theme: { color: '#F75C8D', banner: 'dots' },
  hero: { shape: 'round', size: 'h1', design: 'simple', cream: 'pink', text: '축하해', font: 'jua', textColor: 'berry', toppings: [], extras: [] },
  notices: NOTICE_PRESETS.slice(0, 3),
  faq: [],
  portfolio: [],
  createdAt: new Date().toISOString().slice(0, 10),
  ...base,
});
