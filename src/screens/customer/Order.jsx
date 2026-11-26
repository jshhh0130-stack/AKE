// 주문서 (11/23 UI): 두 단계로 간단하게
//  1/2 가게 대표 디자인을 고르거나, 원하는 사진을 올린다 (사진은 AI 실사·그림판으로 다듬을 수 있어요)
//  2/2 사이즈 · 시트 맛 · 레터링 문구 · 픽업 날짜·시간 · 요청사항 → 요청서 보내기 (주문 확인 창 없이 바로 보내고, 완료 화면에서 요약을 보여 줌)
//  예전 7단계 항목(크림 색·글씨·장식·알레르기·판 문구)은 '더 꾸미기(선택)'에, 이름·연락처·안내사항·선물은 맨 아래에 그대로 있다.
import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import { CakeView, Header, toast, PhotoPick, Empty, Toggle, Portal } from '../../components/ui.jsx';
import AIStudio from '../../components/AIStudio.jsx';
import Sketch from '../../components/Sketch.jsx';
import { fitImage, saveEdited } from '../../lib/imagegen.js';
import { useApp, setState } from '../../lib/state.js';
import { nav, queryOf } from '../../lib/router.js';
import { getStores, dayStatus, slotsOf, canOrderInApp, isPeak } from '../../lib/stores.js';
import { estimate } from '../../lib/price.js';
import { createOrder } from '../../lib/orders.js';
import { photoToOptions, aiAnalyzePhoto } from '../../lib/ai.js';
import { loadImage, toDataURL, analyzeImage } from '../../lib/image.js';
import { cakeSVG } from '../../lib/cake.js';
import { storeDesigns, designLabel } from '../../lib/designs.js';
import { makeCatOf } from '../../data/makeCats.js';
import { won, today, addDays, ymd, DOW, textLen } from '../../lib/util.js';
import { SIZES, FLAVORS, RICE_FLAVORS, CREAMS, CREAM_ADD, TEXT_COLORS, FONTS, TOPPINGS, EXTRAS, QUICK_TEXTS, SIZE_MULT, sizeOf, optName, designOf, textColorOf } from '../../data/catalog.js';

// 앱 시안(그림)을 사진 파일로 — AI 실사·그림판의 바탕으로 쓴다 (문구는 그림판에서 예쁜 글씨로 따로 얹음)
async function sianPng(view) {
  const svg = cakeSVG({ ...view, text: '' }, { uid: 'sx', fancy: true }).replace('<svg ', '<svg width="900" height="750" ');
  const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('시안을 그림으로 바꾸지 못했어요')); i.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); });
  const c = document.createElement('canvas'); c.width = 900; c.height = 750;
  c.getContext('2d').drawImage(im, 0, 0, 900, 750);
  return c.toDataURL('image/jpeg', 0.9);
}

function addOf(store, kind, id, base, size) {
  const m = SIZE_MULT[size] ?? 1;
  const known = store.menu?.[kind]?.[id];
  if (known != null) return [known, known, true];
  if (!base) return [0, 0, false];
  const sc = kind === 'designs' ? id !== 'photo' : kind === 'flavors' || base.scale;
  return [Math.round((base[0] * (sc ? m : 1)) / 500) * 500, Math.round((base[1] * (sc ? m : 1)) / 500) * 500, false];
}
const plus = (a, b) => (b === 0 ? '' : a === b ? ` +${a % 1000 ? (a / 1000).toFixed(1) : a / 1000}천` : ` +${Math.round(a / 1000)}~${Math.round(b / 1000)}천`);

function initialOrder(store, from, photo, ai) {
  const sizes = store.menu ? SIZES.filter((z) => store.menu.sizes?.[z.id] != null).map((z) => z.id) : SIZES.map((z) => z.id);
  const rice = store.styles?.includes('rice') && !store.styles?.includes('lettering');
  const o = {
    shape: 'round', size: sizes.includes('h1') ? 'h1' : sizes[0] || 'h1', design: 'simple', cream: 'white', flavor: rice ? 'baek' : 'vanilla',
    text: '', noText: false, font: 'jua', textColor: 'berry', toppings: [], extras: [], date: null, time: null,
    request: '', allergy: '', refPhoto: null, plateText: '', variant: 0, pickId: null, pickName: null,
  };
  if (ai) { // AI로 만든 케이크: 그 이미지가 주문서 가운데에 · 문구·요청도 그대로
    Object.assign(o, { refPhoto: ai.src, text: ai.text || '', request: ai.request || '', design: makeCatOf(ai.cat)?.design || 'simple', pickName: 'AI로 만든 케이크', _ai: true });
    // AI 만들 때 고른 옵션(모양·크기·크림·글씨·장식)도 주문서에 그대로 → 예상 금액에도 반영
    const ao = ai.opts;
    if (ao) Object.assign(o, { shape: ao.shape || o.shape, size: sizes.includes(ao.size) ? ao.size : o.size, cream: ao.cream || o.cream, textColor: ao.textColor || o.textColor, font: ['jua', 'pen', 'gaegu', 'gowun'].includes(ao.font) ? ao.font : o.font, toppings: ao.toppings || [], extras: [ao.candle && 'candle', ao.plateText?.trim() && 'plate'].filter(Boolean), plateText: (ao.plateText || '').trim() });
  } else if (from) Object.assign(o, from, { date: null, time: null, pickName: from.pickName || `지난 주문 · ${designOf(from.design).name}` });
  else if (photo && Date.now() - (photo.at || 0) < 6 * 3600e3) {
    Object.assign(o, { design: photo.design || o.design, shape: photo.shape || o.shape, cream: photo.cream || o.cream, refPhoto: photo.thumb || null }, photoToOptions(photo.ai));
    o._fromPhoto = true;
  }
  return o;
}
// 대표 디자인 고르기: 디자인 모양·색만 가져오고, 문구·날짜는 손님 것 그대로
const applyPick = (o, d) => {
  const { text, date, time, caption, ...look } = d.design || d.opt || {}; // eslint-disable-line no-unused-vars
  return { ...o, ...look, pickId: d.id, pickName: d.name, refPhoto: null, _fromPhoto: false };
};

export default function OrderForm({ params, path }) {
  const st = useApp();
  const store = useMemo(() => getStores(st).find((s) => s.id === params.id), [st.shop, st.found, params.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const q = queryOf(path);
  const from = useMemo(() => { try { return q.get('from') ? JSON.parse(q.get('from')) : null; } catch { return null; } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const pickQ = q.get('pick');
  const photoQ = st.find?.photo ? { ...st.find.photo, at: st.find.at } : null;
  const aiQ = q.get('ai') && st.aiDraft ? st.aiDraft : null;
  const designs = useMemo(() => storeDesigns(store), [store]);
  const [o, setO] = useState(() => {
    if (!store) return null;
    const base = initialOrder(store, from, photoQ, aiQ);
    const d = pickQ && storeDesigns(store).find((x) => x.id === pickQ);
    return d ? applyPick(base, d) : base;
  });
  // 처음에 사진을 넣고(사진으로 찾기 · AI로 만들기) 이 가게에 왔으면 디자인 고르기는 건너뛰고 바로 2단계
  const [step, setStep] = useState(() => (from || o?._ai || o?._fromPhoto || (pickQ && o?.pickId) ? 2 : 1));
  const [more, setMore] = useState(false);
  const [studio, setStudio] = useState(null); // AI 실사 창 { inputs }
  const [sketchSrc, setSketchSrc] = useState(null); // 그림판 바탕
  const [name, setName] = useState(st.me?.name || '');
  const [phone, setPhone] = useState(st.me?.phone || '');
  const [okNotice, setOkNotice] = useState(false);
  const [gift, setGift] = useState(false);
  const [to, setTo] = useState('');
  const [gmsg, setGmsg] = useState('');
  const scroller = useRef(null);
  useEffect(() => { if (o?._fromPhoto) toast('찾을 때 넣은 사진을 주문서에 넣었어요. 가게 디자인으로 바꾸려면 ‘바꾸기’를 눌러 주세요', 3500); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { scroller.current?.scrollTo({ top: 0 }); }, [step]);
  const est = useMemo(() => (store && o ? estimate(store, o) : null), [store, o]);
  if (!store || !o) return <div className="screen"><Header title="주문서" fallback="/c" /><Empty icon="search">가게를 찾을 수 없어요.</Empty></div>;
  const set = (patch) => setO((x) => ({ ...x, ...patch }));
  const form = store.form || {};
  const toggleIn = (key, id) => setO((x) => ({ ...x, [key]: x[key].includes(id) ? x[key].filter((i) => i !== id) : [...x[key], id] }));
  const rice = store.styles?.includes('rice') && !store.styles?.includes('lettering');
  const flavors = rice ? RICE_FLAVORS : FLAVORS;
  const sizesOK = store.menu ? SIZES.filter((z) => store.menu.sizes?.[z.id] != null) : SIZES;
  const lim = sizeOf(o.size).limit;
  const tl = textLen(o.text);
  const days = Array.from({ length: 21 }, (_, i) => { const d = addDays(today(), i); const key = ymd(d); return { key, d, i, ds: dayStatus(store, key, st.orders) }; });
  const times = slotsOf(store).filter((t) => { if (o.date !== ymd(today())) return true; const now = new Date(); const [h, m] = t.split(':').map(Number); return h * 60 + m > now.getHours() * 60 + now.getMinutes() + 120; });
  const view = { ...o, text: o.noText ? '' : o.text, photo: o.design === 'photo' ? o.refPhoto : undefined };
  const inApp = canOrderInApp(store);
  const sel = o.pickId || (o.refPhoto ? 'photo' : null);
  const pick = o.pickId ? designs.find((d) => d.id === o.pickId) : null;
  const pickSrc = pick?.src || (!o.pickId ? o.refPhoto : null);
  const needNotice = (store.notices || []).length > 0;
  const phoneOK = !inApp || /^01\d-?\d{3,4}-?\d{4}$/.test(phone.replace(/\s/g, ''));

  // 사진: 첨부 → (키가 있으면) AI가 읽고 비슷하게 채움 / AI 실사·그림판 결과도 같은 자리로
  const choosePhoto = (patch) => set({ ...patch, pickId: null, pickName: null });
  const photoFill = async (file) => {
    try {
      const el = await loadImage(file);
      const an = analyzeImage(el);
      let patch = { refPhoto: toDataURL(el, 480, 0.82, true), design: an.design, cream: an.cream };
      if (st.settings.claudeKey) {
        toast('AI가 사진을 읽는 중…', 2500);
        try { const r = await aiAnalyzePhoto(st.settings.claudeKey, toDataURL(el, 900, 0.85)); if (r.is_cake) patch = { ...patch, ...photoToOptions(r) }; } catch (e) { toast(e.message); }
      }
      choosePhoto(patch);
      toast('사진을 올렸어요. 사장님이 보고 견적을 줘요');
    } catch (e) { toast(e.message || '사진을 읽지 못했어요'); }
  };
  const putRef = async (src) => {
    try { choosePhoto({ refPhoto: await fitImage(src, { max: 560, q: 0.82 }) }); toast('이 사진으로 주문서를 채웠어요. 사장님께 함께 보내져요', 3200); }
    catch { toast('사진을 넣지 못했어요'); }
  };
  const sketchTexts = !o.noText && o.text ? [{ t: o.text, font: o.font, color: textColorOf(o.textColor).hex }] : [];
  const openStudio = async () => {
    let sian = null;
    try { sian = await sianPng(view); } catch { /* 시안 없이 */ }
    setStudio({ inputs: [o.refPhoto && { id: 'ref', label: '내 참고 사진', src: o.refPhoto }, sian && { id: 'sian', label: '앱 시안', src: sian }].filter(Boolean) });
  };
  const openSketch = async () => {
    let src = o.refPhoto;
    if (!src) { try { src = await sianPng(view); } catch (e) { toast(e.message); return; } }
    setSketchSrc(src);
  };

  // 2단계: 빠진 것 → 버튼이 알려 주고 누르면 그 자리로
  const need = [
    [!(o.date && o.time), '픽업 날짜·시간', 'f-pick'],
    [!(o.noText || tl > 0), '레터링 문구', 'f-text'],
    [designOf(o.design).needPhoto && !o.refPhoto, '인쇄할 사진', 'f-req'],
    [!name.trim(), '이름', 'f-me'],
    [!phoneOK, '연락처', 'f-me'],
    [needNotice && !okNotice, '안내사항 확인', 'f-notice'],
    [gift && !to.trim(), '받는 분', 'f-gift'],
  ].filter((x) => x[0]);
  const goNeed = () => document.getElementById(need[0][2])?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const send = () => {
    setState({ me: { name: name.trim(), phone: phone.trim() } });
    const { _fromPhoto, _ai, ...oo } = o; // eslint-disable-line no-unused-vars
    // 가게 사진을 골랐으면 그 사진을 주문서 사진으로 함께 (사장님이 바로 알아보게)
    const withPic = pick?.shopPhoto && !oo.refPhoto ? { ...oo, refPhoto: pick.src } : oo;
    const order = createOrder(store, withPic, { name: name.trim(), phone: phone.trim() }, gift ? { to: to.trim(), msg: gmsg.trim(), from: name.trim() } : null);
    nav(`/done/${order.id}`, { replace: true });
  };

  return (
    <div className="screen ordf">
      <Header title={`${store.name} 주문서`} fallback={`/store/${store.id}`} onBack={step === 2 && !o._ai ? () => setStep(1) : undefined} right={<span className="steptag">{step}/2</span>} />
      {step === 1 ? (
        <div className="scroll pad" ref={scroller} style={{ paddingBottom: 110 }}>
          <h2 className="otitle">어떤 케이크로 할까요?</h2>
          <p className="olead">가게 대표 디자인을 고르거나, 원하는 사진을 올려 주세요.</p>
          <div className="dgrid">
            {/* 원하는 사진으로 */}
            <div className={`dcard ${sel === 'photo' ? 'on' : ''}`}>
              {o.refPhoto ? (
                <button className="im" onClick={() => choosePhoto({})} aria-label="이 사진으로 주문"><img src={o.refPhoto} alt="" />{sel === 'photo' && <span className="ck"><Icon n="check" size="sm" /></span>}</button>
              ) : (
                <PhotoPick onPick={photoFill} className="im up"><span className="pl"><Icon n="plus" /></span><b>사진 올리기</b></PhotoPick>
              )}
              <div className="dt"><b>원하는 사진으로</b><small>사장님이 보고 견적 줘요</small></div>
              {o.refPhoto && (
                <div className="dtools">
                  <PhotoPick onPick={photoFill} className="chip sm">바꾸기</PhotoPick>
                  <button className="chip sm" onClick={openStudio}><Icon n="wand" size="sm" />AI 실사</button>
                  <button className="chip sm" onClick={openSketch}><Icon n="pen" size="sm" />그림판</button>
                </div>
              )}
            </div>
            {/* 가게 대표 디자인 */}
            {designs.map((d) => (
              <button key={d.id} className={`dcard ${sel === d.id ? 'on' : ''}`} onClick={() => setO((x) => applyPick(x, d))}>
                <div className="im">{d.src ? <img src={d.thumb || d.src} alt="" loading="lazy" /> : <CakeView o={d.design} />}{sel === d.id && <span className="ck"><Icon n="check" size="sm" /></span>}</div>
                <div className="dt"><b>{d.name}</b><small>{designLabel(d)}</small></div>
              </button>
            ))}
          </div>
          {designs[0]?.gen && <div className="xs muted" style={{ marginTop: 10 }}>아직 가게가 대표 디자인을 올리지 않아서, 가게 스타일로 그린 예시예요. 실물은 조금 달라요.</div>}
          {designs.some((d) => d.sample) && <div className="xs muted" style={{ marginTop: 10 }}>‘예시 주문 넣어 보기’로 넣은 예시 사진이에요. 사장님이 작품 사진을 올리면 바뀌어요.</div>}
          {!sel && o.pickName && <div className="note" style={{ marginTop: 10 }}>{o.pickName}</div>}
        </div>
      ) : (
        <div className="scroll pad" ref={scroller} style={{ paddingBottom: 110 }}>
          {o._ai ? (
            <div className="aihero"><img src={o.refPhoto} alt="AI로 만든 케이크" /><small>AI로 만든 케이크 · 이 이미지가 사장님께 함께 가요</small></div>
          ) : (
          <div className="picked">
            <div className="pth">{pickSrc ? <img src={pickSrc} alt="" /> : <CakeView o={view} />}</div>
            <div className="grow" style={{ minWidth: 0 }}>
              <small>{o.pickId ? '고른 디자인' : o.pickName ? '다시 주문' : '내 사진으로'}</small>
              <b>{o.pickName && o.pickId ? o.pickName : o.pickName || '원하는 사진'}</b>
              <span>{sizeOf(o.size).name} · {optName(flavors, o.flavor)}</span>
            </div>
            <button className="btn xs line" onClick={() => setStep(1)}>바꾸기</button>
          </div>
          )}

          <div className="flbl">사이즈</div>
          <div className="g4">
            {sizesOK.map((z) => <button key={z.id} className={`opt2 ${o.size === z.id ? 'on' : ''}`} onClick={() => set({ size: z.id })}>{z.name}<small>{z.cm}cm</small></button>)}
          </div>

          <div className="flbl">{rice ? '설기 맛' : '시트 맛'}</div>
          <div className="chips wrap">{flavors.map((f) => { const [a, b] = f.add[1] === 0 ? [0, 0] : addOf(store, 'flavors', f.id, f.add, o.size); return <button key={f.id} className={`chip ${o.flavor === f.id ? 'on' : ''}`} onClick={() => set({ flavor: f.id })}>{f.name}{plus(a, b)}</button>; })}</div>

          <div className="flbl row" id="f-text"><span className="grow">레터링 문구</span><span className={`cnt2 ${tl > lim ? 'over' : ''}`}>{tl}/{lim}</span></div>
          <input className="inp" maxLength={40} value={o.text} disabled={o.noText} placeholder="예) 다희야 생일 축하해" onChange={(e) => set({ text: e.target.value, noText: false, textOk: null })} />
          {!o.noText && tl === 0 && <div className="chips" style={{ marginTop: 8 }}>{QUICK_TEXTS.slice(0, 6).map((t) => <button key={t} className="chip sm" onClick={() => set({ text: t, noText: false })}>{t}</button>)}</div>}
          {tl > 0 && <div className="spell">한 글자씩 확인: <b>{[...o.text].map((c) => (c === ' ' ? '␣' : c)).join(' ')}</b>{tl > lim && <div style={{ color: 'var(--warn)', fontWeight: 700, marginTop: 4 }}>권장 {lim}자를 넘었어요. 글씨가 작아질 수 있어 사장님이 확인해요.</div>}
            {/* 손님이 확인하면 종이 주문서 문구 옆에 '손님 확인' 도장이 찍힌다 */}
            <button className={`spellok ${o.textOk ? 'on' : ''}`} onClick={() => set({ textOk: o.textOk ? null : new Date().toISOString() })}>{o.textOk ? <><Icon n="check" size="sm" />문구 확인 완료 · 사장님 주문서에 도장이 찍혀요</> : '한 글자씩 맞는지 확인했어요'}</button></div>}
          <label className="check" style={{ marginTop: 4 }}><input type="checkbox" checked={o.noText} onChange={(e) => set({ noText: e.target.checked })} />문구 없이 주문할게요</label>

          <div className="flbl" id="f-pick">픽업</div>
          <div className="dayrow">
            {days.map(({ key, d, i, ds }) => (
              <button key={key} disabled={!ds.ok} className={`dchip ${o.date === key ? 'on' : ''}`} onClick={() => set({ date: key, time: null })}>
                <small>{i === 0 ? '오늘' : i === 1 ? '내일' : DOW[d.getDay()]}</small><b>{d.getMonth() + 1}/{d.getDate()}</b>
                {!ds.ok ? <em>{ds.code === 'closed' ? '휴무' : ds.code === 'full' ? '마감' : ''}</em> : ds.peak ? <em className="peak">성수기</em> : null}
              </button>
            ))}
          </div>
          {o.date && isPeak(store, o.date) && <div className="peaknote"><span className="tag pink">성수기</span><span>이 날은 <b>예약금 100%</b>이고 <b>주문 변경이 어려워요</b>.</span></div>}
          {o.date ? (times.length ? <div className="g4" style={{ marginTop: 8 }}>{times.map((t) => <button key={t} className={`opt2 ${o.time === t ? 'on' : ''}`} onClick={() => set({ time: t })}>{t}</button>)}</div>
            : <div className="small muted" style={{ marginTop: 8 }}>이 날은 고를 수 있는 시간이 없어요. 다른 날을 골라 주세요.</div>)
            : <div className="xs muted" style={{ marginTop: 6 }}>{store.ops ? (store.ops.sameDay ? `당일은 ${store.ops.cutoff}까지 주문돼요.` : `픽업 ${store.ops.leadDays}일 전까지 주문할 수 있어요.`) : '이 가게 마감 규칙은 공개 정보 기준(보통 2일 전)이라 사장님이 다시 확인해요.'}</div>}

          <div className="flbl" id="f-req">요청사항 <span className="xs muted" style={{ fontWeight: 500 }}>(선택)</span></div>
          <textarea className="inp" maxLength={200} value={o.request} onChange={(e) => set({ request: e.target.value })} placeholder="예) 글씨는 조금 크게, 하트는 왼쪽 위에 작게" />
          {!o._ai && (form.refPhoto !== false || designOf(o.design).needPhoto) && (
            <div className="row" style={{ marginTop: 8 }}>
              {o.refPhoto && <img src={o.refPhoto} alt="" style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover' }} />}
              <PhotoPick onPick={async (f) => { try { const el = await loadImage(f); set({ refPhoto: toDataURL(el, 480, 0.82, true) }); } catch { toast('사진을 읽지 못했어요'); } }} className="btn line sm"><Icon n="image" size="sm" />{o.refPhoto ? '사진 바꾸기' : designOf(o.design).needPhoto ? '인쇄할 사진 첨부 (필수)' : '참고 사진 첨부'}</PhotoPick>
              {o.refPhoto && <button className="btn ghost sm" onClick={() => set({ refPhoto: null })}>빼기</button>}
            </div>
          )}
          {form.allergy !== false && <input className="inp" style={{ marginTop: 8 }} maxLength={60} value={o.allergy} onChange={(e) => set({ allergy: e.target.value })} placeholder="알레르기가 있으면 적어 주세요 (예: 견과류)" />}

          {/* 예전 주문서의 세부 항목은 접어 둔다 */}
          <button className="morebtn" onClick={() => setMore(!more)}>
            <span className="grow"><b>더 꾸미기</b> <span className="xs muted">(선택) 크림 색 · 글씨 · 장식</span></span><Icon n={more ? 'down' : 'right'} size="sm" />
          </button>
          {more && (
            <div className="fadeup">
              <div className="flbl">겉 크림 색</div>
              <div className="swatches">{CREAMS.map((c) => { const known = store.menu?.creams?.[c.tone]; const [a, b] = c.tone === 'base' ? [0, 0] : known != null ? [known, known] : CREAM_ADD[c.tone]; return <button key={c.id} className={`sw ${o.cream === c.id ? 'on' : ''}`} onClick={() => set({ cream: c.id })}><i style={{ background: c.hex }} />{c.name}<small>{b === 0 ? '기본' : plus(a, b).trim()}</small></button>; })}</div>
              {!o.noText && form.fontChoice !== false && <><div className="flbl">글씨체</div><div className="chips wrap">{FONTS.map((f) => <button key={f.id} className={`chip ${o.font === f.id ? 'on' : ''}`} style={{ fontFamily: f.css }} onClick={() => set({ font: f.id })}>{f.name}</button>)}</div></>}
              {!o.noText && <><div className="flbl">글씨 색</div><div className="swatches">{TEXT_COLORS.map((c) => <button key={c.id} className={`sw ${o.textColor === c.id ? 'on' : ''}`} onClick={() => set({ textColor: c.id })}><i style={{ background: c.hex }} />{c.name}</button>)}</div></>}
              <div className="flbl">토핑 · 장식</div>
              <div className="chips wrap">{TOPPINGS.map((t) => { const [a, b] = addOf(store, 'toppings', t.id, t.add, o.size); return <button key={t.id} className={`chip ${o.toppings.includes(t.id) ? 'on' : ''}`} onClick={() => toggleIn('toppings', t.id)}>{t.name}{plus(a, b)}</button>; })}</div>
              {form.extras !== false && <><div className="flbl">함께 받기</div><div className="chips wrap">{EXTRAS.filter((t) => t.id !== 'plate' || form.plateText !== false).map((t) => { const known = store.menu?.extras?.[t.id]; const [a, b] = known != null ? [known, known] : t.add; return <button key={t.id} className={`chip ${o.extras.includes(t.id) ? 'on' : ''}`} onClick={() => toggleIn('extras', t.id)}>{t.name}{b === 0 ? ' 무료' : plus(a, b)}</button>; })}</div></>}
              {o.extras.includes('plate') && <input className="inp" style={{ marginTop: 8 }} maxLength={20} value={o.plateText} onChange={(e) => set({ plateText: e.target.value })} placeholder="판 문구 (예: Happy Day)" />}
            </div>
          )}

          <div className="flbl" id="f-me">주문하는 분</div>
          <div className="row"><input className="inp" style={{ flex: 1 }} value={name} onChange={(e) => setName(e.target.value)} placeholder="이름" maxLength={20} /><input className="inp" style={{ flex: 1.4 }} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={inApp ? '010-0000-0000' : '연락처(선택)'} inputMode="tel" maxLength={13} /></div>
          <div className="xs muted" style={{ marginTop: 6 }}>{inApp ? '사장님이 확정·픽업 안내에만 써요. 이 기기와 해당 가게 주문함에만 저장돼요.' : '주문서에 함께 적어 드려요. 서버로 보내지 않아요.'}</div>

          {needNotice && (
            <div className="card pad" style={{ marginTop: 14 }} id="f-notice">
              <div className="b small">{store.name} 안내사항</div>
              {store.notices.map((n, i) => <div key={i} className="small" style={{ padding: '4px 0' }}>{i + 1}. {n}</div>)}
              <label className="check"><input type="checkbox" checked={okNotice} onChange={(e) => setOkNotice(e.target.checked)} />안내사항을 모두 확인했어요</label>
            </div>
          )}
          <div className="card pad" style={{ marginTop: 12 }} id="f-gift">
            <div className="row"><span className="grow"><b className="small">선물로 보내기</b><div className="xs muted">받는 분이 직접 픽업하고, 선물 카드 링크를 보낼 수 있어요</div></span><Toggle on={gift} onChange={setGift} label="선물" /></div>
            {gift && (
              <div style={{ marginTop: 10 }}>
                <input className="inp" value={to} onChange={(e) => setTo(e.target.value)} placeholder="받는 분 이름" maxLength={20} />
                <textarea className="inp" style={{ marginTop: 6, minHeight: 60 }} value={gmsg} onChange={(e) => setGmsg(e.target.value)} placeholder="선물 카드 메시지 (예: 생일 축하해! 맛있게 먹어)" maxLength={80} />
              </div>
            )}
          </div>
          <div className="xs muted center" style={{ margin: '14px 0' }}>앱 금액은 모두 예상가예요. 최종 금액은 사장님이 주문을 받을 때 정해요</div>
        </div>
      )}

      <div className="stickybar ordbar">
        <div className="pp">예상가 · 최종 금액은 사장님이 정해요<b>약 {won(est.lo)}</b></div>
        {step === 1
          ? <button className="btn pri grow" disabled={!sel} onClick={() => setStep(2)}>{sel ? '이 디자인으로 계속' : '디자인을 골라 주세요'}</button>
          : need.length ? <button className="btn pri grow" style={{ opacity: 0.85, fontSize: 14.5 }} onClick={goNeed}>{need[0][1]}{need.length > 1 ? ` 외 ${need.length - 1}개` : ''} 남았어요</button>
          : <button className="btn pri grow" onClick={send}>{inApp ? '요청서 보내기' : '주문서 완성하기'}</button>}
      </div>

      <AIStudio open={!!studio} onClose={() => setStudio(null)} inputs={studio?.inputs} opts={o} onUse={putRef} useLabel="이 사진으로 주문하기" sketchTexts={sketchTexts} />
      {sketchSrc && <Portal><Sketch src={sketchSrc} title="그림판 · 원하는 걸 그려 보세요" texts={sketchTexts} onClose={() => setSketchSrc(null)} onSave={(out) => { saveEdited(out, { opts: o }); putRef(out); }} /></Portal>}
    </div>
  );
}
