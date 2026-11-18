// AI 실사 사진 만들기 — 넣은 사진(또는 고른 옵션)을 실사 케이크 사진으로
// 순서: ① 구글 제미나이(설정에 키가 있으면) → ② 허깅페이스 FLUX(무료 · 토큰이 있으면 하루 사용량이 늘어요)
//       → ③ AI Horde 무료 대기열(느림, 10~20분 · 앱을 닫았다 열어도 이어서 기다림)
// 만든 사진은 '예시 사진'이고 관심 › 내가 만든 사진에 모인다(이 기기 안에만 저장).
import { getState, setState } from './state.js';
import { notify } from './notify.js';
import { uid } from './util.js';

// ── 영어 문장 만들기 (FLUX는 영어를 잘 알아들어요) ──
const CREAM_EN = { white: 'white', pink: 'baby pink', peach: 'peach', butter: 'pastel butter yellow', mint: 'pastel mint green', sky: 'pastel sky blue', lavender: 'pastel lavender', cocoa: 'light cocoa brown', hotpink: 'hot pink', navy: 'navy blue' };
const SHAPE_EN = { round: 'round', heart: 'heart-shaped', square: 'square' };
const DESIGN_EN = { simple: 'simple piped shell border', vintage: 'vintage lambeth piped frills and garlands', heartdots: 'small piped hearts on the sides', flower: 'piped buttercream flowers', drip: 'glossy chocolate drip', character: 'a cute simple drawing hand-piped in buttercream on top', photo: 'an edible printed photo on top' };
const TOP_EN = { cherry: 'red cherries', strawberry: 'fresh strawberries', sprinkle: 'colorful sprinkles', pearl: 'small sugar pearls', ribbon: 'satin ribbon bows', freshflower: 'edible fresh flowers', macaron: 'macarons' };
const KO_EN = [[/핑크|분홍/, 'pink'], [/하늘|스카이|파랑|블루/, 'sky blue'], [/민트|초록/, 'mint green'], [/노랑|노란|버터/, 'butter yellow'], [/보라|라벤더/, 'lavender'], [/흰|하얀|화이트/, 'white'], [/초코|브라운|갈색/, 'chocolate'], [/빨강|빨간|레드/, 'red'], [/체리/, 'cherries'], [/딸기/, 'strawberries'], [/하트/, 'hearts'], [/리본/, 'ribbon bows'], [/장미/, 'roses'], [/꽃|플라워/, 'flowers'], [/진주|펄/, 'sugar pearls'], [/스프링클/, 'sprinkles'], [/별/, 'stars'], [/구름/, 'clouds'], [/곰/, 'teddy bear'], [/강아지/, 'puppy'], [/고양이/, 'cat'], [/토끼/, 'bunny'], [/빈티지|프릴/, 'vintage frills'], [/미니|작은/, 'small mini size'], [/2단/, 'two tiers'], [/초|캔들/, 'birthday candles'], [/마카롱/, 'macarons'], [/사각|네모/, 'square shape'], [/동그란|원형/, 'round shape'], [/금|골드/, 'gold accents'], [/은|실버/, 'silver accents']];
export function extraEn(t) {
  if (!t) return '';
  const w = [...new Set(KO_EN.filter(([re]) => re.test(t)).map(([, en]) => en))];
  return w.length ? `, with ${w.join(', ')}` : '';
}
export function optsPrompt(o = {}) {
  const parts = [`${SHAPE_EN[o.shape] || 'round'} ${o.size === 'mini' ? 'small mini ' : ''}korean custom cake`, `smooth ${CREAM_EN[o.cream] || 'white'} buttercream`, DESIGN_EN[o.design] || DESIGN_EN.simple];
  const tops = (o.toppings || []).map((t) => TOP_EN[t]).filter(Boolean);
  if (tops.length) parts.push('decorated with ' + tops.join(', '));
  if ((o.extras || []).includes('candle')) parts.push('thin birthday candles');
  return parts.join(', ');
}
const TAIL = 'soft natural window light, cafe table, shallow depth of field, realistic food photography, high detail';
// mode: 'real'(이 사진처럼 실사로) | 'onCake'(이 그림을 케이크 위에) | 'opts'(고른 옵션대로 새로)
export function buildPrompt(mode, o, extra) {
  const ex = extraEn(extra);
  if (mode === 'real') return `Turn this image into a realistic professional photo of a real Korean custom buttercream cake. Keep the same cake shape, colors and piped decorations${ex}. Remove all text and letters from the cake top and keep it smooth. ${TAIL}.`;
  if (mode === 'onCake') return `Create a realistic photo of a ${optsPrompt(o)} whose top is decorated with this picture, hand-piped in buttercream in a simple cute style${ex}. No text or letters. ${TAIL}.`;
  return `realistic photo of a ${optsPrompt(o)}${ex}, plain smooth top without any text, 45 degree angle, ${TAIL}, no text, no letters`;
}
const NEG = 'cartoon, illustration, drawing, painting, 3d render, text, letters, watermark, blurry, deformed';

// ── 사진 다루기 ──
const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = () => rej(new Error('사진을 열지 못했어요')); i.src = src; });
// 가운데를 잘라 w×h로 맞추기 (w·h 없으면 긴 쪽 max로 줄이기)
export async function fitImage(src, { max = 720, w, h, type = 'image/jpeg', q = 0.86 } = {}) {
  const img = await loadImg(src);
  const W0 = img.naturalWidth, H0 = img.naturalHeight;
  let sx = 0, sy = 0, sw = W0, sh = H0, ow, oh;
  if (w && h) { const r = w / h; if (W0 / H0 > r) { sw = H0 * r; sx = (W0 - sw) / 2; } else { sh = W0 / r; sy = (H0 - sh) / 2; } ow = w; oh = h; }
  else { const s = Math.min(1, max / Math.max(W0, H0)); ow = Math.round(W0 * s); oh = Math.round(H0 * s); }
  const c = document.createElement('canvas'); c.width = ow; c.height = oh;
  const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.fillStyle = '#fff'; x.fillRect(0, 0, ow, oh);
  x.drawImage(img, sx, sy, sw, sh, 0, 0, ow, oh);
  return c.toDataURL(type, q);
}
async function urlToDataURL(url, max = 720) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('만든 사진을 받아 오지 못했어요');
  const b = await r.blob();
  const u = URL.createObjectURL(b);
  try { return await fitImage(u, { max }); } finally { setTimeout(() => URL.revokeObjectURL(u), 3000); }
}
const rnd = () => Math.floor(Math.random() * 1e9);

// ── ① 구글 제미나이 (사진 고치기를 아주 잘해요 · 유료 키) ──
function findImage(o) { // 응답 어디에 있든 base64 사진 찾기 (보낸 사진이 되돌아오는 칸은 건너뜀)
  let out = null;
  const walk = (x, k) => {
    if (out || !x || typeof x !== 'object' || k === 'input' || k === 'contents') return;
    const mt = x.mime_type || x.mimeType;
    if (typeof x.data === 'string' && x.data.length > 800 && (!mt || /^image\//.test(mt))) { out = `data:${mt || 'image/png'};base64,${x.data}`; return; }
    for (const [kk, v] of Object.entries(x)) walk(v, kk);
  };
  walk(o);
  return out;
}
const gErr = (j, status) => { const m = j?.error?.message || ''; if (status === 400 && /API key/i.test(m)) return '제미나이 키가 맞지 않아요'; if (status === 403) return '제미나이 키 권한(결제·API 사용 설정)을 확인해 주세요'; if (status === 429) return '제미나이 사용량이 다 됐어요'; return m ? `제미나이: ${m.slice(0, 80)}` : '제미나이가 사진을 만들지 못했어요'; };
async function gemini(key, text, image) {
  const mime = image ? image.slice(5, image.indexOf(';')) : null;
  const b64 = image ? image.split(',')[1] : null;
  let last = '';
  // 새 방식 (Interactions API, 2026)
  try {
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', { method: 'POST', headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json', 'Api-Revision': '2026-05-20' }, body: JSON.stringify({ model: 'gemini-nano-banana-2.1', input: [{ type: 'text', text }, ...(image ? [{ type: 'image', mime_type: mime, data: b64 }] : [])], response_format: { type: 'image', mime_type: 'image/jpeg', aspect_ratio: '4:5' } }) });
    const j = await r.json().catch(() => ({}));
    const img = findImage(j); if (img) return img;
    last = gErr(j, r.status);
    if ([401, 403, 429].includes(r.status) || (r.status === 400 && /API key/i.test(j?.error?.message || ''))) throw new Error(last);
  } catch (e) { if (/키|권한|사용량/.test(e.message)) throw e; }
  // 예전 방식 (generateContent)
  for (const model of ['gemini-3.1-flash-image', 'gemini-2.5-flash-image']) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { method: 'POST', headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text }, ...(image ? [{ inline_data: { mime_type: mime, data: b64 } }] : [])] }], generationConfig: { responseModalities: ['IMAGE', 'TEXT'] } }) });
    const j = await r.json().catch(() => ({}));
    const img = findImage(j); if (img) return img;
    last = gErr(j, r.status);
    if ([401, 403, 429].includes(r.status)) break;
  }
  throw new Error(last || '제미나이가 사진을 만들지 못했어요');
}

// ── ② 허깅페이스 FLUX (공개 모델 · 무료 사용량은 인터넷 주소마다 하루 몇 번) ──
const HF = { kontext: 'https://black-forest-labs-flux-1-kontext-dev.hf.space', schnell: 'https://black-forest-labs-flux-1-schnell.hf.space' };
const cfgCache = {};
const hfConfig = (base) => (cfgCache[base] ||= fetch(`${base}/config`).then((r) => (r.ok ? r.json() : Promise.reject(new Error('무료 AI 서버가 응답하지 않아요')))).catch((e) => { delete cfgCache[base]; throw e; }));
async function hfRun(base, data, token, onStatus) {
  const cfg = await hfConfig(base);
  const fn_index = cfg.dependencies.findIndex((d) => d.api_name === 'infer');
  if (fn_index < 0) throw new Error('무료 AI 서버 형식이 바뀌었어요');
  const trigger_id = cfg.dependencies[fn_index].targets?.[0]?.[0] ?? null;
  const session_hash = Math.random().toString(36).slice(2, 12);
  const auth = token ? { Authorization: `Bearer ${token}` } : {};
  const j = await fetch(`${base}/gradio_api/queue/join`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...auth }, body: JSON.stringify({ data, fn_index, session_hash, event_data: null, trigger_id }) });
  if (!j.ok) throw new Error(`무료 AI 서버 오류 (${j.status})`);
  const res = await fetch(`${base}/gradio_api/queue/data?session_hash=${session_hash}`, { headers: auth });
  if (!res.ok || !res.body) throw new Error('무료 AI 서버에 연결하지 못했어요');
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  const t0 = Date.now();
  while (Date.now() - t0 < 180000) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let k;
    while ((k = buf.indexOf('\n\n')) >= 0) {
      const chunk = buf.slice(0, k); buf = buf.slice(k + 2);
      const line = chunk.split('\n').find((l) => l.startsWith('data:'));
      if (!line) continue;
      let msg; try { msg = JSON.parse(line.slice(5)); } catch { continue; }
      if (msg.msg === 'estimation') onStatus?.({ stage: 'hf', msg: msg.rank ? `무료 AI 줄 서는 중 · 앞에 ${msg.rank}명` : '무료 AI가 준비 중…' });
      else if (msg.msg === 'process_starts') onStatus?.({ stage: 'hf', msg: 'AI가 그리는 중… (20~40초)' });
      else if (msg.msg === 'process_completed') {
        reader.cancel().catch(() => {});
        if (!msg.success) { const e = new Error(msg.output?.error || msg.title || '무료 AI가 사진을 만들지 못했어요'); e.quota = /quota|limit/i.test(e.message); throw e; }
        const f = msg.output?.data?.[0];
        const url = f?.url || (f?.path ? `${base}/gradio_api/file=${f.path}` : null);
        if (!url) throw new Error('결과 사진이 없어요');
        return url;
      }
    }
  }
  reader.cancel().catch(() => {});
  throw new Error('무료 AI가 너무 오래 걸려요');
}

// ── ③ AI Horde 무료 대기열 (이름 없이 · 줄이 길면 10~20분) ──
const HORDE = 'https://aihorde.net/api/v2';
const HH = { 'Content-Type': 'application/json', apikey: '0000000000', 'Client-Agent': 'aike-cake-app:0.3:anon' };
async function hordeSubmit({ prompt, image, mode, w = 768, h = 960 }) {
  const body = image
    ? { prompt: `${prompt.replace(/Turn this image into |Create /, '')} ### ${NEG}`, params: { width: w, height: h, steps: 24, cfg_scale: 6, sampler_name: 'k_euler_a', denoising_strength: mode === 'onCake' ? 0.78 : 0.62, n: 1 }, models: ['AlbedoBase XL (SDXL)'], source_image: (await fitImage(image, { w, h, type: 'image/webp', q: 0.9 })).split(',')[1], source_processing: 'img2img', r2: false, nsfw: false, censor_nsfw: true, shared: false }
    : { prompt, params: { width: w, height: h, steps: 4, cfg_scale: 1, sampler_name: 'k_euler', n: 1 }, models: ['Flux.1-Schnell fp8 (Compact)'], r2: false, nsfw: false, censor_nsfw: true, shared: false };
  const r = await fetch(`${HORDE}/generate/async`, { method: 'POST', headers: HH, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!j.id) throw new Error(j.message ? `무료 대기열: ${j.message.slice(0, 80)}` : '무료 대기열에 넣지 못했어요');
  return j.id;
}

// 만든 사진 저장 (최근 8장)
function savePic(pic) {
  setState((s) => ({ ...s, aiPics: [pic, ...(s.aiPics || []).filter((p) => p.id !== pic.id)].slice(0, 8) }));
  return pic;
}
export const removePic = (id) => setState((s) => ({ ...s, aiPics: (s.aiPics || []).filter((p) => p.id !== id) }));
export function saveEdited(src, base = {}) { // 그림판으로 고친 사진도 '내가 만든 사진'에
  return savePic({ id: 'my-' + uid(), src, at: Date.now(), mode: base.mode || 'edit', opts: base.opts || {}, engine: base.engine || 'sketch', edited: true, from: base.id || base.from || null });
}
const optsOf = (o = {}) => ({ design: o.design, shape: o.shape, cream: o.cream, size: o.size, toppings: o.toppings, styles: o.styles });

// 대기열 일감 기다리기 (앱을 다시 열면 이어서)
let polling = false;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export async function resumeAIJobs() {
  if (polling) return;
  polling = true;
  try {
    while ((getState().aiJobs || []).length) {
      for (const job of getState().aiJobs || []) {
        try {
          if (Date.now() - job.at > 70 * 60e3) { dropJob(job.id); notify('c', 'status', 'AI 사진을 만들지 못했어요', '무료 대기열이 너무 길었어요. 다시 해 주세요', '/c/saved?cat=mine'); continue; }
          const c = await (await fetch(`${HORDE}/generate/check/${job.hid}`, { headers: HH })).json();
          if (c.faulted || c.is_possible === false) { dropJob(job.id); notify('c', 'status', 'AI 사진을 만들지 못했어요', '무료 대기열에서 실패했어요. 다시 해 주세요', '/c/saved?cat=mine'); continue; }
          if (!c.done) { setState((s) => ({ ...s, aiJobs: (s.aiJobs || []).map((j) => (j.id === job.id ? { ...j, queue: c.queue_position, wait: c.wait_time } : j)) })); continue; }
          const st = await (await fetch(`${HORDE}/generate/status/${job.hid}`, { headers: HH })).json();
          const g = st.generations?.[0];
          if (!g?.img || g.censored) { dropJob(job.id); continue; }
          const src = await fitImage(/^https?:/.test(g.img) ? g.img : `data:image/webp;base64,${g.img}`, { max: 720 });
          const pic = savePic({ id: 'my-' + uid(), src, at: Date.now(), mode: job.mode, opts: job.opts, engine: 'horde', job: job.id });
          dropJob(job.id);
          notify('c', 'status', 'AI 실사 사진이 완성됐어요', '관심 › 내가 만든 사진에서 볼 수 있어요', `/c/cake/${pic.id}`);
        } catch (e) { console.warn('ai job', e); }
      }
      await sleep(9000);
    }
  } finally { polling = false; }
}
const dropJob = (id) => setState((s) => ({ ...s, aiJobs: (s.aiJobs || []).filter((j) => j.id !== id) }));

/**
 * 실사 사진 만들기.
 * @returns {Promise<{pic?:object, job?:object, engine:string, note?:string}>} 바로 만들면 pic, 대기열로 가면 job
 */
export async function makeRealistic({ mode = 'real', image = null, opts = {}, extra = '', onStatus }) {
  const { geminiKey, hfToken } = getState().settings || {};
  const prompt = buildPrompt(image ? mode : 'opts', opts, extra);
  const meta = { mode: image ? mode : 'opts', opts: optsOf(opts) };
  const notes = [];
  const input = image ? await fitImage(image, { max: 1024, q: 0.9 }) : null;
  if (geminiKey) {
    onStatus?.({ stage: 'gemini', msg: '제미나이가 그리는 중… (10~30초)' });
    try {
      const ko = { real: '이 사진을 실제 한국 커스텀 버터크림 케이크 사진처럼 실사로 바꿔 주세요. 모양·색·짜기 장식은 그대로, 케이크 윗면의 글자는 지우고 매끈하게.', onCake: '이 그림을 크림으로 짠 그림처럼 올린 한국 커스텀 케이크 실사 사진을 만들어 주세요. 글자는 넣지 마세요.', opts: '아래 옵션의 한국 커스텀 케이크 실사 사진을 만들어 주세요. 윗면은 글자 없이 매끈하게.' }[meta.mode];
      const src = await fitImage(await gemini(geminiKey, `${ko}${extra ? ` 추가 요청: ${extra}.` : ''}\n${prompt}`, input), { max: 720 });
      return { pic: savePic({ id: 'my-' + uid(), src, at: Date.now(), ...meta, engine: 'gemini' }), engine: 'gemini' };
    } catch (e) { notes.push(e.message); onStatus?.({ stage: 'hf', msg: `${e.message} · 무료 AI로 바꿔서 해 볼게요` }); }
  }
  try {
    onStatus?.({ stage: 'hf', msg: '무료 AI(FLUX)에 연결하는 중…' });
    const url = input
      ? await hfRun(HF.kontext, [{ url: input, meta: { _type: 'gradio.FileData' } }, prompt, rnd(), false, 2.5, 24], hfToken, onStatus)
      : await hfRun(HF.schnell, [prompt, rnd(), false, 768, 960, 4], hfToken, onStatus);
    onStatus?.({ stage: 'hf', msg: '사진을 받아 오는 중…' });
    const src = await urlToDataURL(url);
    return { pic: savePic({ id: 'my-' + uid(), src, at: Date.now(), ...meta, engine: 'flux' }), engine: 'flux' };
  } catch (e) { notes.push(e.quota ? '오늘 무료 빠른 AI 사용량이 다 됐어요' : e.message); }
  onStatus?.({ stage: 'horde', msg: '무료 대기열에 넣는 중…' });
  const hid = await hordeSubmit({ prompt, image: input, mode: meta.mode });
  const job = { id: uid('job'), hid, at: Date.now(), ...meta, queue: null, wait: null };
  setState((s) => ({ ...s, aiJobs: [...(s.aiJobs || []), job] }));
  resumeAIJobs();
  return { job, engine: 'horde', note: notes[notes.length - 1] };
}

// 지금 쓸 수 있는 엔진 설명
export function engineInfo(settings = getState().settings || {}) {
  if (settings.geminiKey) return { name: '구글 제미나이', sub: '키 연결됨 · 가장 정확해요' };
  if (settings.hfToken) return { name: '무료 AI (FLUX)', sub: '허깅페이스 토큰 연결됨 · 하루 사용량이 넉넉해요' };
  return { name: '무료 AI (FLUX)', sub: '하루 몇 번 무료 · 다 쓰면 무료 대기열(10~20분)로 만들어요' };
}
