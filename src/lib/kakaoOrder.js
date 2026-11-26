// 카톡 주문 붙여넣기: 손님이 카톡으로 보낸 주문 글 → 주문서 칸
// 1) '성함: …' '문구: …' 같은 칸 이름이 있으면 줄마다 읽고
// 2) 나머지는 기존 한 줄 채우기 규칙(ruleParseOrder)으로 날짜·시간·사이즈·맛·크림·문구를 찾는다
// 3) (AI 키가 있으면 화면에서 AI 결과를 먼저 쓰고, 빈 칸만 규칙으로 채운다)
// 못 찾은 칸은 비워 두고 화면에서 '확인 필요'로 보여 준다.
import { ruleParseOrder } from './ai.js';
import { today, ymd } from './util.js';

export const KAKAO_FIELDS = [
  ['name', '이름'], ['phone', '연락처'], ['date', '픽업 날짜'], ['time', '픽업 시간'], ['size', '사이즈'], ['flavor', '맛'],
  ['cream', '크림 색'], ['text', '문구'], ['plateText', '판 문구'], ['candles', '초'], ['allergy', '알레르기'], ['request', '요청사항'],
];
// 꼭 확인해야 하는 칸 (비어 있으면 '확인 필요')
export const KAKAO_NEED = ['name', 'date', 'time', 'size', 'flavor', 'cream', 'text'];

export const KAKAO_EXAMPLES = [
  '[케이크 주문서]\n성함: 김지수\n연락처: 010-1234-5678\n픽업 날짜: 11월 28일 오후 2시\n사이즈: 1호\n맛: 초코\n크림 색: 연핑크\n문구: 지수야 생일 축하해\n판 문구: Happy Birthday\n초: 큰 초 2개, 작은 초 5개\n알레르기: 견과류',
  '안녕하세요! 이도윤입니다. 내일 오후 3시 픽업으로 2호 바닐라 케이크 주문할게요. 하늘색 크림에 "도윤아 합격 축하해"라고 써 주세요. 숫자초 2개 부탁드려요. 010 9876 5432',
  "12/24 11시 반 미니 딸기맛 흰색, 레터링 \"Merry Xmas\", 판에 '사랑해 엄마' 적어주세요 / 박지민 01055556666 / 알러지 없어요",
];

const QUOTE = /["'“”‘’「『]([^"'“”‘’」』]{1,40})["'“”‘’」』]/;
const clean = (v) => String(v || '').replace(/^[\s:：\-·]+|[\s,./]+$/g, '').trim();
const none = (v) => /^(없(음|어요|습니다)?|x|X|없슴|-|해당\s*없음)$/.test(clean(v));
const p2 = (n) => String(n).padStart(2, '0');

function dateOf(v) {
  let m;
  const t0 = today();
  if ((m = v.match(/(?<![\d-])(\d{1,2})\s*[/.월]\s*(\d{1,2})(?!\d)\s*일?/)) && +m[1] >= 1 && +m[1] <= 12 && +m[2] >= 1 && +m[2] <= 31) {
    const d = new Date(t0.getFullYear(), +m[1] - 1, +m[2]);
    if (d < t0) d.setFullYear(d.getFullYear() + 1);
    return ymd(d);
  }
  return ruleParseOrder(v).got.date || null;
}
function timeOf(v) {
  let m;
  if ((m = v.match(/(\d{1,2})\s*:\s*(\d{2})/))) return `${p2(+m[1])}:${m[2]}`;
  return ruleParseOrder(v).got.time || null;
}

export function parseKakaoOrder(text) {
  const src = String(text || '').trim();
  const f = {};
  const lines = src.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  // ── 1) 칸 이름이 있는 줄 ──
  for (const line of lines) {
    const m = line.match(/^\s*[-·•*]?\s*([가-힣A-Za-z\s/()]{1,12}?)\s*[:：]\s*(.+)$/);
    if (!m) continue;
    const k = m[1].replace(/\s/g, ''), v = clean(m[2]);
    if (!v) continue;
    if (/^(성함|이름|주문자|예약자|받는분)/.test(k)) f.name = v.replace(/님$/, '');
    else if (/^(연락처|전화|번호|핸드폰|휴대폰)/.test(k)) f.phone = v;
    else if (/^판(문구|레터링)?|^하판|^보드/.test(k)) f.plateText = v.replace(QUOTE, '$1');
    else if (/^(문구|레터링|케이크문구|윗문구|글씨)/.test(k)) f.text = none(v) ? '' : v.replace(QUOTE, '$1');
    else if (/^(픽업|수령|날짜|일시|방문|예약)/.test(k)) { const d = dateOf(v), tm = timeOf(v); if (d) f.date = d; if (tm) f.time = tm; }
    else if (/^시간/.test(k)) { const tm = timeOf(v); if (tm) f.time = tm; }
    else if (/^(사이즈|크기|호수)/.test(k)) { const g = ruleParseOrder(v).got; if (g.size) f.size = g.size; }
    else if (/^(맛|시트|케이크맛)/.test(k)) { const g = ruleParseOrder(v + ' 맛').got; if (g.flavor) f.flavor = g.flavor; else if (/딸기/.test(v)) f.flavor = 'strawberry'; }
    else if (/^(크림|색|색상|컬러|크림색)/.test(k)) { const g = ruleParseOrder(v).got; if (g.cream) f.cream = g.cream; }
    else if (/^(초|캔들|생일초)/.test(k)) f.candles = none(v) ? '없음' : v;
    else if (/^(알레르기|알러지)/.test(k)) f.allergy = none(v) ? '없음' : v;
    else if (/^(요청|요청사항|기타|추가|디자인|메모)/.test(k)) f.request = v;
  }
  // ── 2) 칸 이름 없이 쓴 말 ──
  const rest = src;
  if (!f.phone) { const m = rest.match(/(01[016789])[-.\s]?(\d{3,4})[-.\s]?(\d{4})/); if (m) f.phone = `${m[1]}-${m[2]}-${m[3]}`; }
  if (f.phone) { const d = f.phone.replace(/[^\d]/g, ''); if (/^01\d{8,9}$/.test(d)) f.phone = d.length === 11 ? `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}` : `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`; }
  if (!f.name) {
    const m = rest.match(/(?:저는\s*|^|[\s!.,/])([가-힣]{2,4})\s*(?:입니다|이에요|예요|이고요)/) || rest.match(/[/|]\s*([가-힣]{2,4})\s+01\d/);
    if (m && !/안녕|주문|케이크|감사/.test(m[1])) f.name = m[1];
  }
  if (!f.plateText) { const m = rest.match(/판(?:\s*문구|\s*레터링|에|에는)?\s*[:：]?\s*["'“”‘’「『]([^"'“”‘’」』]{1,30})["'“”‘’」』]/); if (m) f.plateText = m[1].trim(); }
  if (f.text == null) {
    // 판 문구가 아닌 첫 따옴표 = 케이크 위 문구
    const all = [...rest.matchAll(new RegExp(QUOTE.source, 'g'))].map((m) => m[1].trim()).filter((q) => q !== f.plateText);
    if (all.length) f.text = all[0];
  }
  if (!f.candles) {
    const m = rest.match(/((?:큰|작은|숫자|생일)?\s*초\s*\d+\s*개(?:\s*[,·와과]?\s*(?:큰|작은|숫자)?\s*초\s*\d+\s*개)?)/) || rest.match(/(숫자\s*초\s*\d*\s*개?|생일\s*초|캔들\s*\d*\s*개?)/);
    if (m) f.candles = m[1].replace(/\s+/g, ' ').trim();
  }
  if (!f.allergy) { const m = rest.match(/(알레르기|알러지)\s*(?:는|은)?\s*[:：]?\s*([^/\n,.]+)/); if (m) f.allergy = /없/.test(m[2]) ? '없음' : clean(m[2]); }
  const g = ruleParseOrder(rest).got;
  if (!f.date) { const d = dateOf(rest); if (d) f.date = d; }
  if (!f.time && g.time) f.time = g.time;
  for (const k of ['size', 'flavor', 'cream']) if (!f[k] && g[k]) f[k] = g[k];
  if (!f.flavor && /딸기\s*맛/.test(rest)) f.flavor = 'strawberry';
  const extras = new Set(g.extras || []);
  if (f.plateText) extras.add('plate');
  if (f.candles && f.candles !== '없음') extras.add(/숫자/.test(f.candles) ? 'numcandle' : 'candle');
  const miss = KAKAO_NEED.filter((k) => f[k] == null || f[k] === '');
  return { f, extras: [...extras], toppings: g.toppings || [], design: g.design || null, shape: g.shape || null, miss };
}

// 화면에서 쓰는 주문 옵션으로 (빈 칸은 기본값, 사장님이 고친 값 그대로)
export function kakaoToOrder(f, extra = {}) {
  return {
    shape: extra.shape || 'round', size: f.size || 'h1', design: extra.design || 'simple', cream: f.cream || 'white', flavor: f.flavor || 'vanilla',
    text: f.text || '', noText: !f.text, font: 'jua', textColor: 'choco', toppings: extra.toppings || [], extras: extra.extras || [],
    date: f.date || ymd(today()), time: f.time || '12:00', request: f.request || '', allergy: f.allergy && f.allergy !== '없음' ? f.allergy : '',
    plateText: f.plateText || '', candles: f.candles && f.candles !== '없음' ? f.candles : '', pickName: null,
  };
}
