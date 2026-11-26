// 새 가게 등록할 때 쓰는 기본값 (가격은 수원 공개 가격 평균 근처 — 사장님이 바로 고칠 수 있다)
import { NOTICE_PRESETS } from './catalog.js';

export const DEFAULT_MENU = {
  sizes: { mini: 26000, h1: 42000, h2: 55000, h3: 68000 },
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
  pickupStart: '11:00', pickupEnd: '19:00', slotMin: 60, deposit: 50, account: '', paused: false,
  // 가격 확정은 사장님 몫(사장님 설문 7곳) → 가격표 안 주문 자동 확정은 사장님이 켤 때만
  autoConfirm: false,
  // 성수기 날짜: 그날은 예약금 100% · 주문 변경 불가 · 하루 최대 주문 수를 따로
  peakDates: [], peakMax: 10,
};
export const DEFAULT_FORM = { fontChoice: true, refPhoto: true, allergy: true, extras: true, plateText: true };

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
