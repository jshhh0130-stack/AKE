// AI 기능 (선택). 설정에 Claude API 키를 넣으면 진짜 AI가 동작하고,
// 키가 없으면 기기 안의 규칙 기반 분석으로 대신한다. 키는 이 기기(localStorage)에만 저장된다.
import { SIZES, SHAPES, DESIGNS, FLAVORS, RICE_FLAVORS, CREAMS, TEXT_COLORS, TOPPINGS, EXTRAS, STYLES } from '../data/catalog.js';
import { ymd, today, addDays, DOW } from './util.js';

const MODEL = 'claude-opus-5-5';
export class AIError extends Error {}
let SDK = null;
async function sdk() { if (!SDK) SDK = (await import('@anthropic-ai/sdk')).default; return SDK; }

export async function askClaude({ key, system, content, schema, effort = 'low' }) {
  if (!key) throw new AIError('설정에서 Claude API 키를 넣으면 AI 기능을 쓸 수 있어요.');
  const Anthropic = await sdk();
  const client = new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true, maxRetries: 1, timeout: 120000 });
  let res;
  try {
    res = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default', // 안전 정책으로 거절될 때 서버가 다른 모델로 자동 재시도
      output_config: schema ? { effort, format: { type: 'json_schema', schema } } : { effort },
      system,
      messages: [{ role: 'user', content }],
    });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) throw new AIError('API 키가 맞지 않아요. 설정에서 키를 다시 확인해 주세요.');
    if (e instanceof Anthropic.PermissionDeniedError) throw new AIError('이 키로는 쓸 수 없는 기능이에요.');
    if (e instanceof Anthropic.RateLimitError) throw new AIError('요청이 많아 잠시 막혔어요. 조금 뒤에 다시 해 주세요.');
    if (e instanceof Anthropic.BadRequestError) throw new AIError('요청이 거절됐어요: ' + String(e.message || '').slice(0, 140));
    if (e instanceof Anthropic.APIConnectionError) throw new AIError('인터넷 연결을 확인해 주세요.');
    if (e instanceof Anthropic.APIError) throw new AIError(`AI 서버 오류(${e.status ?? '?'})가 났어요. 잠시 뒤 다시 해 주세요.`);
    throw new AIError('AI 호출에 실패했어요.');
  }
  if (res.stop_reason === 'refusal') throw new AIError('AI가 이 요청은 처리하지 않았어요.');
  if (res.stop_reason === 'max_tokens') throw new AIError('AI 응답이 너무 길어 끊겼어요. 다시 해 주세요.');
  const text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  if (!schema) return text.trim();
  try { return JSON.parse(text); } catch { throw new AIError('AI 응답을 읽지 못했어요. 다시 해 주세요.'); }
}

const ids = (list) => list.map((x) => x.id);
const b64 = (dataURL) => ({ type: 'image', source: { type: 'base64', media_type: dataURL.slice(5, dataURL.indexOf(';')), data: dataURL.slice(dataURL.indexOf(',') + 1) } });

// 1) 케이크 사진 분석
const PHOTO_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['is_cake', 'shape', 'size_guess', 'cream_colors', 'styles', 'design', 'toppings', 'lettering_text', 'needs_owner_check', 'summary_ko'],
  properties: {
    is_cake: { type: 'boolean' },
    shape: { type: 'string', enum: ['round', 'heart', 'square', 'unknown'] },
    size_guess: { type: 'string', enum: [...ids(SIZES), 'unknown'] },
    cream_colors: { type: 'array', items: { type: 'string', enum: ids(CREAMS) } },
    styles: { type: 'array', items: { type: 'string', enum: ids(STYLES) } },
    design: { type: 'string', enum: ids(DESIGNS) },
    toppings: { type: 'array', items: { type: 'string', enum: [...ids(TOPPINGS), ...ids(EXTRAS)] } },
    lettering_text: { type: 'string' },
    needs_owner_check: { type: 'array', items: { type: 'string' } },
    summary_ko: { type: 'string' },
  },
};
export async function aiAnalyzePhoto(key, dataURL) {
  return askClaude({
    key, effort: 'medium', schema: PHOTO_SCHEMA,
    system: '너는 한국 커스텀·레터링 케이크 주문을 돕는 분석가야. 사진 속 케이크를 보고 주문서 항목으로 정리해. 보이지 않는 것은 추측하지 말고 비워 둬. 저작권 캐릭터·로고·사람 얼굴 사진이 있으면 needs_owner_check에 한국어로 적어. summary_ko는 존댓말 한두 문장.',
    content: [b64(dataURL), { type: 'text', text: '이 케이크 사진을 주문서 항목으로 정리해 주세요. 케이크가 아니면 is_cake=false.' }],
  });
}

// 2) 한 줄 요청 → 주문서 옵션
const ORDER_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['size', 'shape', 'design', 'cream', 'flavor', 'text', 'text_color', 'toppings', 'extras', 'date', 'time', 'request', 'unsure'],
  properties: {
    size: { type: 'string', enum: [...ids(SIZES), 'none'] },
    shape: { type: 'string', enum: [...ids(SHAPES), 'none'] },
    design: { type: 'string', enum: [...ids(DESIGNS), 'none'] },
    cream: { type: 'string', enum: [...ids(CREAMS), 'none'] },
    flavor: { type: 'string', enum: [...ids(FLAVORS), ...ids(RICE_FLAVORS), 'none'] },
    text: { type: 'string' },
    text_color: { type: 'string', enum: [...ids(TEXT_COLORS), 'none'] },
    toppings: { type: 'array', items: { type: 'string', enum: ids(TOPPINGS) } },
    extras: { type: 'array', items: { type: 'string', enum: ids(EXTRAS) } },
    date: { type: 'string' },
    time: { type: 'string' },
    request: { type: 'string' },
    unsure: { type: 'array', items: { type: 'string' } },
  },
};
export async function aiParseOrder(key, sentence) {
  const t = today();
  return askClaude({
    key, schema: ORDER_SCHEMA,
    system: `너는 케이크 주문서 작성 도우미야. 손님의 한 줄 요청을 주문서 항목으로 바꿔. 오늘은 ${ymd(t)} (${DOW[t.getDay()]}요일). 날짜는 YYYY-MM-DD, 시간은 HH:MM(24시간). 말하지 않은 항목은 'none' 또는 빈 문자열. 케이크 위 문구는 따옴표 안의 말이나 '…라고 써 줘' 같은 부분만 text에 넣어. 애매한 것은 unsure에 한국어로.`,
    content: [{ type: 'text', text: sentence }],
  });
}

// 2-1) 말로 찾기: "영통 근처 4만원대 캐릭터 케이크" → 찾기 조건
const FIND_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['styles', 'budget_min', 'budget_max', 'gu', 'place', 'same_day', 'summary_ko'],
  properties: {
    styles: { type: 'array', items: { type: 'string', enum: ['lettering', 'photo', 'character', 'flower', 'rice', '3d', 'tiered'] } },
    budget_min: { type: 'integer' }, budget_max: { type: 'integer' },
    gu: { type: 'string', enum: ['영통구', '권선구', '팔달구', '장안구', 'none'] },
    place: { type: 'string' },
    same_day: { type: 'boolean' },
    summary_ko: { type: 'string' },
  },
};
export async function aiParseFind(key, sentence) {
  return askClaude({
    key, schema: FIND_SCHEMA,
    system: '너는 수원시 커스텀 케이크 가게 찾기 도우미야. 손님의 말을 찾기 조건으로 바꿔. styles: 레터링=lettering, 사진=photo, 그림·캐릭터(산리오 등)=character, 꽃·앙금=flower, 떡케이크=rice, 입체·피규어=3d, 2단=tiered. 예산은 원 단위(없으면 0, 0). "4만원대"는 40000~49999. gu는 수원의 구 이름을 말했을 때만, 아니면 none. place는 동네·역 이름(없으면 빈 문자열). same_day는 당일·오늘·급함일 때 true. summary_ko는 "이렇게 이해했어요: …" 형태의 존댓말 한 문장.',
    content: [{ type: 'text', text: sentence }],
  });
}

// 3) 가격표 사진 → 가격표
const MENU_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['mini', 'h1', 'h2', 'h3', 'heart', 'square', 'addons', 'notes'],
  properties: {
    mini: { type: 'integer' }, h1: { type: 'integer' }, h2: { type: 'integer' }, h3: { type: 'integer' },
    heart: { type: 'integer' }, square: { type: 'integer' },
    addons: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['name', 'price'], properties: { name: { type: 'string' }, price: { type: 'integer' } } } },
    notes: { type: 'string' },
  },
};
export async function aiReadMenu(key, dataURL) {
  return askClaude({
    key, effort: 'medium', schema: MENU_SCHEMA,
    system: '케이크 가게 가격표 사진을 읽어 숫자로 정리해. 사이즈: 미니(10~13cm, 도시락 크기 포함), 1호(15cm), 2호(18cm), 3호(21cm). 표에 없는 값은 0. 하트·사각 모양 추가금이 있으면 heart·square에. 나머지 추가 옵션은 addons에 원 단위 정수로.',
    content: [b64(dataURL), { type: 'text', text: '이 가격표를 정리해 주세요.' }],
  });
}

// 4) 가게 소개글
export async function aiWriteIntro(key, shop) {
  return askClaude({
    key,
    system: '한국 동네 케이크 공방의 앱 소개글을 써. 2문장, 70자 안팎, 따뜻하고 담백한 존댓말. 과장 광고 표현(최고, 1등 등)은 쓰지 마. 소개글만 출력.',
    content: [{ type: 'text', text: `가게 이름: ${shop.name}\n동네: ${shop.gu} ${shop.dong}\n잘하는 케이크: ${shop.styles.map((s) => STYLES.find((x) => x.id === s)?.name).join(', ')}\n분위기 키워드: ${shop.keywords || '따뜻함, 정성'}` }],
  });
}

// ── 키 없이 동작하는 규칙 기반 버전 ──
export function ruleIntro(shop) {
  const st = shop.styles.map((s) => STYLES.find((x) => x.id === s)?.name).filter(Boolean);
  const where = [shop.gu, shop.dong].filter(Boolean).join(' ');
  return `${where ? where + '에서 ' : ''}${st.slice(0, 2).join('·') || '커스텀'} 케이크를 만드는 ${shop.name || '작은 공방'}이에요. 미리보기로 고른 그대로, 하나하나 정성껏 만들어 드릴게요.`;
}

export function ruleParseOrder(text, { validDate } = {}) {
  const t = text.trim();
  const got = {}, said = [], unsure = [];
  let m;
  if (/도시락|미니/.test(t)) got.size = 'mini'; else if ((m = t.match(/([1-3])\s*호/))) got.size = 'h' + m[1];
  if (/하트/.test(t) && !/하트\s*도트/.test(t)) got.shape = 'heart'; else if (/사각|네모/.test(t)) got.shape = 'square'; else if (/원형|동그/.test(t)) got.shape = 'round';
  const cmap = [['hotpink', /진핑크|진한\s*분홍|핫핑크/], ['pink', /분홍|핑크/], ['lavender', /라벤더|보라/], ['sky', /하늘|파랑|블루|스카이/], ['butter', /노랑|옐로|버터/], ['mint', /민트|초록|그린/], ['peach', /피치|살구|주황/], ['navy', /네이비|남색/], ['cocoa', /코코아|갈색|브라운/], ['white', /흰|화이트|하얀/]];
  for (const [id, re] of cmap) if (re.test(t)) { got.cream = id; break; }
  const dmap = [['vintage', /빈티지|프릴|레이스/], ['flower', /꽃|플라워/], ['drip', /드립/], ['heartdots', /하트\s*도트|도트|땡땡이/], ['photo', /사진|포토/], ['character', /그림|캐릭터|곰돌이|강아지|고양이|일러스트/], ['simple', /심플|기본|깔끔/]];
  for (const [id, re] of dmap) if (re.test(t)) { got.design = id; break; }
  const fmap = [['choco', /초코(?!\s*드립)/], ['strawberry', /딸기\s*(맛|시트)/], ['earlgrey', /얼그레이/], ['oreo', /오레오/], ['blueberry', /블루베리/], ['creamcheese', /크림치즈/], ['vanilla', /바닐라/], ['baek', /백설기/], ['heuk', /흑임자/], ['pumpkin', /단호박/]];
  for (const [id, re] of fmap) if (re.test(t)) { got.flavor = id; break; }
  if ((m = t.match(/["'“”‘’「『]([^"'“”‘’」』]{1,40})["'“”‘’」』]/))) got.text = m[1].trim();
  else if ((m = t.match(/(?:문구는?|글씨는?)\s*[:：]?\s*([^,.]+?)\s*(?:라고|로|으로)?\s*(?:써|적어|넣어)/))) got.text = m[1].trim();
  const tops = [];
  if (/체리/.test(t)) tops.push('cherry');
  if (/생딸기|딸기\s*(올|토핑|장식)/.test(t)) tops.push('strawberry');
  if (/스프링클/.test(t)) tops.push('sprinkle');
  if (/진주|펄/.test(t)) tops.push('pearl');
  if (/리본/.test(t)) tops.push('ribbon');
  if (/생화/.test(t)) tops.push('freshflower');
  if (/마카롱/.test(t)) tops.push('macaron');
  if (tops.length) got.toppings = tops;
  const exs = [];
  if (/숫자\s*초/.test(t)) exs.push('numcandle'); else if (/초\s*(도|넣|꽂|주)|생일\s*초|캔들/.test(t)) exs.push('candle');
  if (/토퍼/.test(t)) exs.push('topper');
  if (/판\s*문구|판에/.test(t)) exs.push('plate');
  if (/카드|편지/.test(t)) exs.push('card');
  if (/보냉/.test(t)) exs.push('icebag');
  if (exs.length) got.extras = exs;
  // 날짜
  const t0 = today();
  let target = null;
  if (/오늘/.test(t)) target = 0; else if (/모레/.test(t)) target = 2; else if (/내일/.test(t)) target = 1;
  else if ((m = t.match(/(다음\s*주)?\s*(월|화|수|목|금|토|일)요일/))) { const wd = DOW.indexOf(m[2]); let diff = (wd - t0.getDay() + 7) % 7; if (diff === 0) diff = 7; if (m[1] && diff < 7) diff += 7; target = diff; }
  else if ((m = t.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/))) { const d = new Date(t0.getFullYear(), +m[1] - 1, +m[2]); if (d < t0) d.setFullYear(d.getFullYear() + 1); target = Math.round((d - t0) / 864e5); }
  if (target != null) {
    const key = ymd(addDays(t0, target));
    if (!validDate || validDate(key)) got.date = key; else unsure.push('고른 날짜는 주문 마감·휴무라 다른 날을 골라 주세요');
  }
  if ((m = t.match(/(오전|오후)?\s*(\d{1,2})\s*시(\s*반)?/))) { let hh = +m[2]; if ((m[1] === '오후' || (!m[1] && hh < 9)) && hh < 12) hh += 12; got.time = `${String(hh).padStart(2, '0')}:${m[3] ? '30' : '00'}`; }
  if (/알레르기|알러지/.test(t)) unsure.push('알레르기 내용은 요청사항에 자세히 적어 주세요');
  if (/캐릭터|로고|똑같이/.test(t)) unsure.push('그림·캐릭터는 사장님이 가능 여부를 확인해요');
  for (const [k, v] of Object.entries(got)) said.push(k === 'text' ? `문구 “${v}”` : k);
  return { got, unsure, count: Object.keys(got).length };
}

// 사진 분석 결과를 주문 옵션으로
export function photoToOptions(an) {
  const o = {};
  if (!an) return o;
  if (an.shape && an.shape !== 'unknown') o.shape = an.shape;
  if (an.size_guess && an.size_guess !== 'unknown') o.size = an.size_guess;
  if (an.design) o.design = an.design;
  const cream = an.cream_colors?.[0] || an.cream;
  if (cream) o.cream = cream;
  if (an.lettering_text) o.text = an.lettering_text;
  if (an.toppings?.length) {
    o.toppings = an.toppings.filter((x) => TOPPINGS.some((t) => t.id === x));
    o.extras = an.toppings.filter((x) => EXTRAS.some((t) => t.id === x));
  }
  return o;
}

// AI 실사 이미지(베타) — 외부 무료 생성 서비스. 문구·개인정보는 보내지 않고 모양·색·장식만 보낸다.
export function realisticImageURL(o, seed = 1) {
  const cream = CREAMS.find((c) => c.id === o.cream)?.name || 'white';
  const en = { white: 'white', 베이비핑크: 'baby pink', 피치: 'peach', 버터옐로: 'butter yellow', 민트: 'mint', 스카이: 'sky blue', 라벤더: 'lavender', 코코아: 'cocoa brown', 진핑크: 'hot pink', 네이비: 'navy', 화이트: 'white' }[cream] || 'white';
  const shape = { round: 'round', heart: 'heart-shaped', square: 'square' }[o.shape || 'round'];
  const size = o.size === 'mini' ? 'small mini cake' : 'cake';
  const design = { simple: 'simple piped buttercream border', vintage: 'vintage lambeth frills and garlands', heartdots: 'small piped hearts on the side', flower: 'piped buttercream flowers', drip: 'chocolate ganache drip', character: 'a cute hand-piped bear drawing on top', photo: 'an edible photo print on top' }[o.design || 'simple'];
  const tops = (o.toppings || []).map((t) => ({ cherry: 'cherries', strawberry: 'fresh strawberries', sprinkle: 'colorful sprinkles', pearl: 'sugar pearls', ribbon: 'a satin ribbon', freshflower: 'edible fresh flowers', macaron: 'macarons' }[t])).filter(Boolean);
  const prompt = `Korean lettering cake bakery product photo, ${shape} ${size}, smooth ${en} buttercream, ${design}${tops.length ? ', decorated with ' + tops.join(', ') : ''}, 45 degree angle, soft natural light, pastel background, plain top surface without any text, high detail`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=640&height=640&seed=${seed}&nologo=true`;
}
