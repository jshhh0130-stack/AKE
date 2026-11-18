import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import { CakeView, Header, Sheet, toast, PhotoPick, Empty, Toggle, Portal } from '../../components/ui.jsx';
import AIStudio from '../../components/AIStudio.jsx';
import Sketch from '../../components/Sketch.jsx';
import { fitImage, saveEdited } from '../../lib/imagegen.js';
import { useApp, setState } from '../../lib/state.js';
import { nav, queryOf, navAfterSheet } from '../../lib/router.js';
import { getStores, dayStatus, slotsOf, canOrderInApp } from '../../lib/stores.js';
import { estimate, ruleCheck, verdictOf, basisText } from '../../lib/price.js';
import { createOrder } from '../../lib/orders.js';
import { ruleParseOrder, aiParseOrder, photoToOptions, aiAnalyzePhoto } from '../../lib/ai.js';
import { loadImage, toDataURL, analyzeImage } from '../../lib/image.js';
import { storeLook, cakeSVG } from '../../lib/cake.js';

// 앱 시안(그림)을 사진 파일로 — AI 실사·그림판의 바탕으로 쓴다 (문구는 그림판에서 예쁜 글씨로 따로 얹음)
async function sianPng(view) {
  const svg = cakeSVG({ ...view, text: '' }, { uid: 'sx', fancy: true }).replace('<svg ', '<svg width="900" height="750" ');
  const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('시안을 그림으로 바꾸지 못했어요')); i.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); });
  const c = document.createElement('canvas'); c.width = 900; c.height = 750;
  c.getContext('2d').drawImage(im, 0, 0, 900, 750);
  return c.toDataURL('image/jpeg', 0.9);
}
import { range, won, today, addDays, ymd, DOW, fmtDate, textLen, parseYmd } from '../../lib/util.js';
import { SIZES, SHAPES, DESIGNS, FLAVORS, RICE_FLAVORS, CREAMS, CREAM_ADD, TEXT_COLORS, FONTS, TOPPINGS, EXTRAS, QUICK_TEXTS, SIZE_MULT, sizeOf, optName, designOf, creamOf, fontOf, textColorOf } from '../../data/catalog.js';

const SIZE_CMP = { mini: '손바닥~휴대폰보다 작아요', h1: '휴대폰 길이쯤', h2: '휴대폰보다 조금 커요', h3: 'A4 종이 짧은 쪽 정도' };
const priceTxt = (lo, hi, exact) => (lo == null ? '' : lo === 0 && hi === 0 ? '기본' : exact || lo === hi ? `+${won(lo)}` : `+${(lo / 1000).toFixed(lo % 1000 ? 1 : 0)}~${(hi / 1000).toFixed(hi % 1000 ? 1 : 0)}천원`);

function addOf(store, kind, id, base, size) {
  const m = SIZE_MULT[size] ?? 1;
  const known = store.menu?.[kind]?.[id];
  if (known != null) return [known, known, true];
  if (!base) return [0, 0, false];
  const sc = kind === 'designs' ? id !== 'photo' : kind === 'flavors' || base.scale;
  return [Math.round((base[0] * (sc ? m : 1)) / 500) * 500, Math.round((base[1] * (sc ? m : 1)) / 500) * 500, false];
}

function Sec({ ctx, id, n, title, sub, req, children }) {
  const { sec, setSec, done } = ctx;
  return (
    <div className={`acc ${done[id] ? 'done' : ''}`} id={`sec-${id}`}>
      <button className="ah" onClick={() => setSec(sec === id ? null : id)}>
        <span className="n">{done[id] ? <Icon n="check" size="sm" /> : n}</span>
        <span className="at"><b>{title}</b><span>{sub}</span></span>
        {req && !done[id] && <span className="req">필수</span>}
        <Icon n={sec === id ? 'down' : 'right'} size="sm" />
      </button>
      {sec === id && <div className="ab fadeup">{children}</div>}
    </div>
  );
}

function initialOrder(store, from, photo) {
  const sizes = store.menu ? SIZES.filter((z) => store.menu.sizes?.[z.id] != null).map((z) => z.id) : SIZES.map((z) => z.id);
  const rice = store.styles?.includes('rice') && !store.styles?.includes('lettering');
  const o = {
    shape: 'round', size: sizes.includes('h1') ? 'h1' : sizes[0] || 'h1', design: 'simple', cream: 'white', flavor: rice ? 'baek' : 'vanilla',
    text: '', noText: false, font: 'jua', textColor: 'berry', toppings: [], extras: [], date: null, time: null,
    request: '', allergy: '', refPhoto: null, plateText: '', variant: 0,
  };
  if (from) Object.assign(o, from, { date: null, time: null });
  else if (photo && Date.now() - (photo.at || 0) < 6 * 3600e3) {
    Object.assign(o, { design: photo.design || o.design, shape: photo.shape || o.shape, cream: photo.cream || o.cream, refPhoto: photo.thumb || null }, photoToOptions(photo.ai));
    o._fromPhoto = true;
  }
  return o;
}

export default function OrderForm({ params, path }) {
  const st = useApp();
  const store = useMemo(() => getStores(st).find((s) => s.id === params.id), [st.shop, st.found, params.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const q = queryOf(path);
  const from = useMemo(() => { try { return q.get('from') ? JSON.parse(q.get('from')) : null; } catch { return null; } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const photoQ = st.find?.photo ? { ...st.find.photo, at: st.find.at } : null;
  const [o, setO] = useState(() => (store ? initialOrder(store, from, photoQ) : null));
  const [sec, setSec] = useState('design');
  const [mini, setMini] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [varOpen, setVarOpen] = useState(false);
  const [studio, setStudio] = useState(null); // AI 실사 창 { inputs }
  const [sketchSrc, setSketchSrc] = useState(null); // 그림판 바탕
  const [aiText, setAiText] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const scroller = useRef(null);
  useEffect(() => { if (o?._fromPhoto) toast('내 사진 분석 결과로 디자인을 미리 채웠어요'); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const est = useMemo(() => (store && o ? estimate(store, o) : null), [store, o]);
  const checks = useMemo(() => (store && o ? ruleCheck(store, o, { orders: st.orders }) : []), [store, o, st.orders]);
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
  const done = {
    design: true,
    size: !!o.size,
    pickup: !!(o.date && o.time),
    taste: !!(o.flavor && o.cream),
    text: o.noText || tl > 0,
    deco: true,
    req: !designOf(o.design).needPhoto || !!o.refPhoto,
  };
  const missing = [['pickup', '픽업 날짜·시간'], ['text', '문구'], ['req', '포토 케이크 사진']].filter(([k]) => !done[k]);
  const v = verdictOf(checks);
  const view = { ...o, text: o.noText ? '' : o.text, photo: o.design === 'photo' ? o.refPhoto : undefined };
  const inApp = canOrderInApp(store);
  // AI 실사 · 그림판: 결과는 주문서 '참고 사진'으로 들어가 사장님께 함께 전달돼요
  const sketchTexts = !o.noText && o.text ? [{ t: o.text, font: o.font, color: textColorOf(o.textColor).hex }] : [];
  const putRef = async (src) => {
    try { set({ refPhoto: await fitImage(src, { max: 560, q: 0.82 }) }); toast('주문서 참고 사진으로 넣었어요. 사장님께 함께 보내져요', 3200); }
    catch { toast('사진을 넣지 못했어요'); }
  };
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

  const fillFromParsed = (got, unsure = []) => {
    const patch = {};
    const said = [];
    const ok = (val, list) => val && val !== 'none' && list.some((x) => x.id === val);
    if (ok(got.size, sizesOK)) { patch.size = got.size; said.push(sizeOf(got.size).name); }
    if (ok(got.shape, SHAPES)) { patch.shape = got.shape; said.push(optName(SHAPES, got.shape)); }
    if (ok(got.design, DESIGNS)) { patch.design = got.design; said.push(designOf(got.design).name); }
    if (ok(got.cream, CREAMS)) { patch.cream = got.cream; said.push(creamOf(got.cream).name); }
    if (ok(got.flavor, flavors)) { patch.flavor = got.flavor; said.push(optName(flavors, got.flavor) + ' 맛'); }
    const tc = got.text_color || got.textColor;
    if (ok(tc, TEXT_COLORS)) patch.textColor = tc;
    if (got.text) { patch.text = got.text.slice(0, 40); patch.noText = false; said.push(`문구 “${got.text}”`); }
    if (got.toppings?.length) { patch.toppings = got.toppings.filter((t) => TOPPINGS.some((x) => x.id === t)); said.push(patch.toppings.map((t) => optName(TOPPINGS, t)).join('·')); }
    if (got.extras?.length) { patch.extras = got.extras.filter((t) => EXTRAS.some((x) => x.id === t)); said.push(patch.extras.map((t) => optName(EXTRAS, t)).join('·')); }
    if (got.date && /^\d{4}-\d{2}-\d{2}$/.test(got.date)) {
      if (dayStatus(store, got.date, st.orders).ok) { patch.date = got.date; said.push(fmtDate(got.date)); } else unsure.push(`${fmtDate(got.date)}은(는) ${dayStatus(store, got.date, st.orders).reason}`);
    }
    if (got.time && /^\d{2}:\d{2}$/.test(got.time)) { patch.time = got.time; said.push(got.time); }
    if (got.request) patch.request = got.request;
    set(patch);
    toast(said.length ? `${said.length}개 항목을 채웠어요 · ${said.slice(0, 4).join(', ')}${unsure.length ? ` (확인: ${unsure[0]})` : ''}` : '알아들은 항목이 없어요. 예시처럼 적어 주세요', 4200);
  };
  const runAI = async () => {
    if (!aiText.trim()) { toast('원하는 케이크를 한 줄로 적어 주세요'); return; }
    setAiBusy(true);
    try {
      if (st.settings.claudeKey) {
        const r = await aiParseOrder(st.settings.claudeKey, aiText);
        fillFromParsed(r, r.unsure || []);
      } else {
        const r = ruleParseOrder(aiText, { validDate: (k) => dayStatus(store, k, st.orders).ok });
        fillFromParsed(r.got, r.unsure);
      }
    } catch (e) { toast(e.message); const r = ruleParseOrder(aiText); fillFromParsed(r.got, r.unsure); }
    setAiBusy(false);
  };
  const photoFill = async (file) => {
    try {
      const el = await loadImage(file);
      const thumb = toDataURL(el, 420, 0.82, true);
      const an = analyzeImage(el);
      let patch = { refPhoto: thumb, design: an.design, cream: an.cream };
      if (st.settings.claudeKey) {
        toast('AI가 사진을 읽는 중…', 2500);
        try { const r = await aiAnalyzePhoto(st.settings.claudeKey, toDataURL(el, 900, 0.85)); if (r.is_cake) patch = { ...patch, ...photoToOptions(r) }; } catch (e) { toast(e.message); }
      }
      set(patch);
      toast('사진을 첨부하고 비슷하게 채웠어요');
    } catch (e) { toast(e.message || '사진을 읽지 못했어요'); }
  };
  const combos = (store.portfolio?.filter((p) => p.design).map((p) => ({ ...p.design, caption: p.caption })) || []).slice(0, 3);
  while (combos.length < 3) { const l = storeLook(store, combos.length + 2); combos.push({ ...l, caption: `${designOf(l.design).name} · ${sizeOf(l.size).name}` }); }

  const ctx = { sec, setSec, done };
  const nextSec = (cur) => { const order = ['design', 'size', 'pickup', 'taste', 'text', 'deco', 'req']; const i = order.indexOf(cur); setSec(order[i + 1] || null); };
  const goMissing = () => { const m = missing[0]?.[0]; if (m) { setSec(m); setTimeout(() => document.getElementById(`sec-${m}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); } };

  return (
    <div className="screen">
      <Header title={`${store.name} 주문서`} fallback={`/store/${store.id}`} right={<span className="tag" style={{ marginRight: 8 }}>{Object.values(done).filter(Boolean).length}/7</span>} />
      <div className={`oprev ${mini ? 'mini' : ''}`}>
        <div className="stage">
          <CakeView o={view} />
          <span className="size-cmp"><Icon n="ruler" /> {sizeOf(o.size).name} · 지름 {sizeOf(o.size).cm}cm · {sizeOf(o.size).serves}</span>
          {!mini && <div className="tools">
            <button onClick={() => setVarOpen(true)}><Icon n="sparkle" size="sm" />시안 3가지</button>
            <button onClick={openStudio}><Icon n="wand" size="sm" />AI 실사</button>
            <button onClick={openSketch}><Icon n="pen" size="sm" />그림판</button>
          </div>}
          <span className="cap">참고 그림 · 실물과 조금 다를 수 있어요</span>
        </div>
        <div className="pricebar">
          <span className="small muted">예상</span><b>{range(est.lo, est.hi)}</b>
          <span className={`tag ${est.exact ? 'ok' : 'mute'}`}>{est.exact ? '가게 가격표 기준' : '추정 범위'}</span>
          <span className="grow" />
          {v.ok ? <span className="tag ok"><Icon n="check" />규칙 안</span> : <span className="tag warn">확인 {v.warn}</span>}
        </div>
      </div>
      <div className="scroll pad" ref={scroller} onScroll={(e) => setMini(e.currentTarget.scrollTop > 60)} style={{ paddingBottom: 110 }}>
        <div className="ai-box">
          <h4><Icon n="sparkle" size="sm" /> 한 줄로 채우기 {st.settings.claudeKey ? <span className="tag dark">AI</span> : <span className="tag mute">자동</span>}</h4>
          <div className="small muted" style={{ marginBottom: 8 }}>원하는 케이크를 글로 쓰면 이 가게 옵션 안에서 채워 드려요. 애매한 건 사장님께 넘겨요.</div>
          <div className="row" style={{ alignItems: 'stretch' }}>
            <textarea className="inp grow" style={{ minHeight: 62, fontSize: 14.5 }} value={aiText} onChange={(e) => setAiText(e.target.value)} placeholder="예) 토요일 오후 3시 1호 핑크 하트, 문구는 '생일 축하해 지민아' 초도 넣어주세요" />
            <button className="btn dark" style={{ minHeight: 'auto', padding: '0 14px', whiteSpace: 'nowrap', lineHeight: 1.25 }} onClick={runAI} disabled={aiBusy}>{aiBusy ? '읽는 중' : '채우기'}</button>
          </div>
          <div className="chips" style={{ marginTop: 8 }}>
            {["내일 미니 초코 '고생했어'", "토요일 2시 2호 화이트 꽃 '칠순 축하드려요'", "1호 하늘색 빈티지 '합격 축하해' 체리"].map((e) => <button key={e} className="chip sm" onClick={() => setAiText(e)}>{e}</button>)}
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            {photoQ?.thumb ? <button className="btn sm line grow" onClick={() => { set({ design: photoQ.design || o.design, shape: photoQ.shape || o.shape, cream: photoQ.cream || o.cream, refPhoto: photoQ.thumb, ...photoToOptions(photoQ.ai) }); toast('내 사진 기준으로 채웠어요'); }}><img src={photoQ.thumb} alt="" style={{ width: 22, height: 22, borderRadius: 6, objectFit: 'cover' }} /> 내 사진으로 채우기</button>
              : <PhotoPick onPick={photoFill} className="btn sm line grow"><Icon n="image" size="sm" /> 원하는 사진으로 채우기</PhotoPick>}
          </div>
          <div className="lbl">이 가게 추천 조합</div>
          <div className="opts c3">
            {combos.map((c, i) => <button key={i} className="opt" onClick={() => { const { caption, ...d } = c; set({ ...d, text: o.text || d.text, variant: d.variant || 0 }); toast('조합을 채웠어요. 날짜만 고르면 돼요!'); }}><div className="thumb"><CakeView o={c} /></div><small>{c.caption}</small></button>)}
          </div>
        </div>

        <Sec ctx={ctx} id="design" n={1} title="디자인 · 모양" sub={`${designOf(o.design).name} · ${optName(SHAPES, o.shape)}`}>
          <div className="lbl">모양</div>
          <div className="opts c3">
            {SHAPES.map((s) => { const [a, b, ex] = s.id === 'round' ? [0, 0, true] : (store.menu?.shapes?.[s.id] != null ? [store.menu.shapes[s.id], store.menu.shapes[s.id], true] : store.addon?.[s.id] != null ? [store.addon[s.id], store.addon[s.id], true] : [...s.add, false]);
              return <button key={s.id} className={`opt ${o.shape === s.id ? 'on' : ''}`} onClick={() => set({ shape: s.id })}>{s.name}<span className="pr">{priceTxt(a, b, ex)}</span></button>; })}
          </div>
          <div className="lbl">디자인 <span className="xs muted">사진처럼 바로 바뀌어요</span></div>
          <div className="opts c3">
            {DESIGNS.map((d) => { const [a, b, ex] = d.id === 'simple' ? [0, 0, true] : addOf(store, 'designs', d.id, d.add, o.size); const notHere = d.style && !store.styles?.includes(d.style);
              return (
                <button key={d.id} className={`opt ${o.design === d.id ? 'on' : ''}`} onClick={() => set({ design: d.id })}>
                  {(d.check || notHere) && <span className="flag">{notHere ? '확인' : '상담'}</span>}
                  <div className="thumb"><CakeView o={{ ...view, design: d.id, text: o.text || '축하해', photo: d.id === 'photo' ? o.refPhoto : undefined }} /></div>
                  {d.name}<small>{d.desc}</small><span className="pr">{priceTxt(a, b, ex)}</span>
                </button>
              ); })}
          </div>
          {designOf(o.design).needPhoto && <div className="note warn" style={{ marginTop: 10 }}>포토 케이크는 인쇄할 사진이 필요해요. 7번 “요청사항·사진”에서 첨부해 주세요.</div>}
          <button className="btn sec block sm" style={{ marginTop: 12 }} onClick={() => nextSec('design')}>다음: 크기</button>
        </Sec>

        <Sec ctx={ctx} id="size" n={2} title="크기" sub={`${sizeOf(o.size).name} · 지름 ${sizeOf(o.size).cm}cm · ${sizeOf(o.size).serves}`} req>
          <div className="opts c3">
            {SIZES.map((z) => { const ok = sizesOK.some((x) => x.id === z.id); const e = estimate(store, { size: z.id, design: 'simple', shape: 'round', cream: 'white', flavor: 'vanilla', text: 'a' });
              return <button key={z.id} disabled={!ok} className={`opt ${o.size === z.id ? 'on' : ''}`} onClick={() => set({ size: z.id })}>{z.name}<small>{z.cm}cm · {z.serves}</small><span className="pr">{ok ? range(e.lo, e.hi, true) : '안 만들어요'}</span></button>; })}
          </div>
          <div className="note" style={{ marginTop: 10 }}>크기 감 잡기: {sizeOf(o.size).name}은(는) 지름 {sizeOf(o.size).cm}cm — <b>{SIZE_CMP[o.size]}</b> · 문구는 {lim}자까지 예쁘게 들어가요</div>
          <button className="btn sec block sm" style={{ marginTop: 12 }} onClick={() => nextSec('size')}>다음: 픽업 날짜</button>
        </Sec>

        <Sec ctx={ctx} id="pickup" n={3} title="픽업 날짜 · 시간" sub={o.date ? `${fmtDate(o.date)} ${o.time || '· 시간 선택'}` : '아직 안 골랐어요'} req>
          <div className="xs muted" style={{ marginBottom: 8 }}>회색 날짜는 휴무·마감이에요. {store.ops ? (store.ops.sameDay ? `당일은 ${store.ops.cutoff}까지 주문돼요.` : `픽업 ${store.ops.leadDays}일 전까지 주문할 수 있어요.`) : '이 가게 마감 규칙은 공개 정보 기준(보통 2일 전)이라 사장님이 다시 확인해요.'}</div>
          <div className="chips" style={{ paddingBottom: 4 }}>
            {days.map(({ key, d, i, ds }) => (
              <button key={key} disabled={!ds.ok} className={`opt ${o.date === key ? 'on' : ''}`} style={{ flex: 'none', minWidth: 62, padding: '8px 6px' }} onClick={() => set({ date: key, time: null })}>
                {i === 0 ? '오늘' : i === 1 ? '내일' : `${d.getMonth() + 1}.${d.getDate()}`}
                <small>{ds.ok ? (ds.left != null && ds.left <= 2 ? `${ds.left}자리` : DOW[d.getDay()]) : ds.code === 'closed' ? '휴무' : ds.code === 'full' ? '마감' : DOW[d.getDay()]}</small>
              </button>
            ))}
          </div>
          {o.date && (
            <>
              <div className="lbl">시간</div>
              <div className="opts c4">{times.map((t) => <button key={t} className={`opt ${o.time === t ? 'on' : ''}`} onClick={() => { set({ time: t }); nextSec('pickup'); }}>{t}</button>)}</div>
              {times.length === 0 && <div className="small muted">이 날은 고를 수 있는 시간이 없어요. 다른 날을 골라 주세요.</div>}
            </>
          )}
        </Sec>

        <Sec ctx={ctx} id="taste" n={4} title="맛 · 크림 색" sub={`${optName(flavors, o.flavor)} · ${creamOf(o.cream).name}`}>
          <div className="lbl">{rice ? '설기 맛' : '시트·크림 맛'}</div>
          <div className="opts c3">{flavors.map((f) => { const [a, b, ex] = f.add[1] === 0 ? [0, 0, true] : addOf(store, 'flavors', f.id, f.add, o.size); return <button key={f.id} className={`opt ${o.flavor === f.id ? 'on' : ''}`} onClick={() => set({ flavor: f.id })}>{f.name}<span className="pr">{priceTxt(a, b, ex)}</span></button>; })}</div>
          <div className="lbl">겉 크림 색</div>
          <div className="swatches">{CREAMS.map((c) => { const known = store.menu?.creams?.[c.tone]; const [a, b] = c.tone === 'base' ? [0, 0] : known != null ? [known, known] : CREAM_ADD[c.tone];
            return <button key={c.id} className={`sw ${o.cream === c.id ? 'on' : ''}`} onClick={() => set({ cream: c.id })}><i style={{ background: c.hex }} />{c.name}<small>{b === 0 ? '기본' : priceTxt(a, b, known != null)}</small></button>; })}</div>
          <button className="btn sec block sm" style={{ marginTop: 12 }} onClick={() => nextSec('taste')}>다음: 문구</button>
        </Sec>

        <Sec ctx={ctx} id="text" n={5} title="문구" sub={o.noText ? '문구 없이' : o.text ? `“${o.text}”` : '아직 안 적었어요'} req>
          <div className="inp-w">
            <input className="inp" style={{ paddingRight: 64 }} maxLength={40} value={o.text} placeholder="케이크 위에 쓸 문구" onChange={(e) => set({ text: e.target.value, noText: false })} />
            <span className={`cnt ${tl > lim ? 'over' : ''}`}>{tl}/{lim}</span>
          </div>
          <div className="chips" style={{ marginTop: 8 }}>{QUICK_TEXTS.map((t) => <button key={t} className="chip sm" onClick={() => set({ text: t, noText: false })}>{t}</button>)}</div>
          {tl > 0 && <div className="spell">한 글자씩 확인: <b>{[...o.text].map((c) => (c === ' ' ? '␣' : c)).join(' ')}</b>{tl > lim && <div style={{ color: 'var(--warn)', fontWeight: 700, marginTop: 4 }}>권장 {lim}자를 넘었어요. 글씨가 작아질 수 있어 사장님이 확인해요.</div>}</div>}
          <label className="check" style={{ marginTop: 6 }}><input type="checkbox" checked={o.noText} onChange={(e) => set({ noText: e.target.checked })} />문구 없이 주문할게요</label>
          {!o.noText && (
            <>
              {form.fontChoice !== false && <div className="lbl">글씨체</div>}
              {form.fontChoice !== false && <div className="opts c3">{FONTS.map((f) => <button key={f.id} className={`opt ${o.font === f.id ? 'on' : ''}`} onClick={() => set({ font: f.id })}><span style={{ fontFamily: f.css, fontSize: 18, fontWeight: 700 }}>{(o.text || '축하해').slice(0, 6)}</span><small>{f.name}</small></button>)}</div>}
              <div className="lbl">글씨 색</div>
              <div className="swatches">{TEXT_COLORS.map((c) => <button key={c.id} className={`sw ${o.textColor === c.id ? 'on' : ''}`} onClick={() => set({ textColor: c.id })}><i style={{ background: c.hex }} />{c.name}</button>)}</div>
            </>
          )}
          <button className="btn sec block sm" style={{ marginTop: 12 }} onClick={() => nextSec('text')}>다음: 장식</button>
        </Sec>

        <Sec ctx={ctx} id="deco" n={6} title="장식 · 추가 (선택)" sub={[...o.toppings.map((t) => optName(TOPPINGS, t)), ...o.extras.map((t) => optName(EXTRAS, t))].join(', ') || '없음'}>
          <div className="lbl">토핑·장식</div>
          <div className="opts c2">{TOPPINGS.map((t) => { const [a, b, ex] = addOf(store, 'toppings', t.id, t.add, o.size); return <button key={t.id} className={`opt ${o.toppings.includes(t.id) ? 'on' : ''}`} style={{ textAlign: 'left' }} onClick={() => toggleIn('toppings', t.id)}>{t.check && <span className="flag">상담</span>}{t.name}<small>{t.desc}</small><span className="pr">{priceTxt(a, b, ex)}</span></button>; })}</div>
          {form.extras !== false && <div className="lbl">함께 받기</div>}
          {form.extras !== false && <div className="opts c2">{EXTRAS.filter((t) => t.id !== 'plate' || form.plateText !== false).map((t) => { const known = store.menu?.extras?.[t.id]; const [a, b, ex] = known != null ? [known, known, true] : [...t.add, false]; return <button key={t.id} className={`opt ${o.extras.includes(t.id) ? 'on' : ''}`} style={{ textAlign: 'left' }} onClick={() => toggleIn('extras', t.id)}>{t.name}<small>{t.desc}</small><span className="pr">{b === 0 ? '무료' : priceTxt(a, b, ex)}</span></button>; })}</div>}
          {o.extras.includes('plate') && <div className="field" style={{ marginTop: 10 }}><label>판 문구</label><input className="inp" maxLength={20} value={o.plateText} onChange={(e) => set({ plateText: e.target.value })} placeholder="예) Happy Day, 사랑해 엄마" /></div>}
          <button className="btn sec block sm" style={{ marginTop: 12 }} onClick={() => nextSec('deco')}>다음: 요청사항</button>
        </Sec>

        <Sec ctx={ctx} id="req" n={7} title="요청사항 · 사진 (선택)" sub={o.refPhoto ? '참고 사진 첨부됨' : o.request ? o.request : '없음'} req={designOf(o.design).needPhoto}>
          {(form.refPhoto !== false || designOf(o.design).needPhoto) && <><div className="lbl">참고 사진 {designOf(o.design).needPhoto && <span className="pink xs">포토 케이크 필수</span>}</div>
          <div className="row">
            {o.refPhoto && <img src={o.refPhoto} alt="" style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'cover' }} />}
            <PhotoPick onPick={async (f) => { try { const el = await loadImage(f); set({ refPhoto: toDataURL(el, 480, 0.82, true) }); } catch { toast('사진을 읽지 못했어요'); } }} className="btn line sm"><Icon n="image" size="sm" />{o.refPhoto ? '사진 바꾸기' : '사진 첨부'}</PhotoPick>
            {o.refPhoto && <button className="btn ghost sm" onClick={() => set({ refPhoto: null })}>빼기</button>}
          </div></>}
          <div className="field" style={{ marginTop: 14 }}><label>사장님께 요청할 것</label><textarea className="inp" maxLength={200} value={o.request} onChange={(e) => set({ request: e.target.value })} placeholder="예) 글씨는 조금 크게, 하트는 왼쪽 위에 작게" /></div>
          {form.allergy !== false && <div className="field"><label>알레르기 <span className="xs muted">ⓘ 있으면 꼭 적어 주세요</span></label><input className="inp" maxLength={60} value={o.allergy} onChange={(e) => set({ allergy: e.target.value })} placeholder="예) 견과류 알레르기" /></div>}
        </Sec>
        <div className="xs muted center" style={{ margin: '14px 0' }}>기타 요청이 있으면 사장님이 최종 가격을 확정해요</div>
      </div>
      <div className="stickybar" style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
        <div className="pp">예상 금액<b>{range(est.lo, est.hi, true)}</b></div>
        {missing.length ? <button className="btn pri grow" onClick={goMissing} style={{ opacity: 0.9 }}>{missing.map((m) => m[1]).join(' · ')} 남았어요</button>
          : <button className="btn pri grow" onClick={() => setConfirm(true)}>문구 확인하고 주문 요청 →</button>}
      </div>

      <VariantSheet open={varOpen} onClose={() => setVarOpen(false)} view={view} onPick={(k) => { set({ variant: k }); setVarOpen(false); toast(`시안 ${k + 1}로 바꿨어요`); }} current={o.variant} />
      <AIStudio open={!!studio} onClose={() => setStudio(null)} inputs={studio?.inputs} opts={o} onUse={putRef} useLabel="주문서 참고 사진으로 넣기" sketchTexts={sketchTexts} />
      {sketchSrc && <Portal><Sketch src={sketchSrc} title="그림판 · 원하는 걸 그려 보세요" texts={sketchTexts} onClose={() => setSketchSrc(null)} onSave={(out) => { saveEdited(out, { opts: o }); putRef(out); }} /></Portal>}
      <ConfirmSheet open={confirm} onClose={() => setConfirm(false)} store={store} o={o} view={view} est={est} checks={checks} v={v} inApp={inApp} />
    </div>
  );
}

function VariantSheet({ open, onClose, view, onPick, current }) {
  return (
    <Sheet open={open} onClose={onClose} title="시안 3가지 비교">
      <div className="small muted" style={{ marginBottom: 10 }}>고른 옵션은 그대로 두고 테두리·장식 배치·문구 꾸밈만 바꿔 그렸어요. 마음에 드는 시안을 누르세요.</div>
      <div className="col" style={{ gap: 10 }}>
        {[0, 1, 2].map((k) => (
          <button key={k} className="card" style={{ overflow: 'hidden', border: current === k ? '2px solid var(--p500)' : undefined, textAlign: 'left' }} onClick={() => onPick(k)}>
            <CakeView o={{ ...view, variant: k }} fancy style={{ height: 190, background: 'var(--p50)' }} />
            <div className="row" style={{ padding: '8px 12px' }}><b className="grow">시안 {k + 1} · {['기본 배치', '셸 테두리 + 오른쪽 장식', '진주 링 + 하트 포인트'][k]}</b>{current === k && <span className="tag ok">선택됨</span>}</div>
          </button>
        ))}
      </div>
    </Sheet>
  );
}

function ConfirmSheet({ open, onClose, store, o, view, est, checks, v, inApp }) {
  const st = useApp();
  const [okText, setOkText] = useState(false);
  const [okNotice, setOkNotice] = useState(false);
  const [name, setName] = useState(st.me?.name || '');
  const [phone, setPhone] = useState(st.me?.phone || '');
  const [gift, setGift] = useState(false);
  const [to, setTo] = useState('');
  const [gmsg, setGmsg] = useState('');
  const needNotice = (store.notices || []).length > 0;
  const textOK = o.noText || okText;
  const nameOK = name.trim().length >= 1;
  const phoneOK = !inApp || /^01\d-?\d{3,4}-?\d{4}$/.test(phone.replace(/\s/g, ''));
  const giftOK = !gift || to.trim().length >= 1;
  const can = textOK && (!needNotice || okNotice) && nameOK && phoneOK && giftOK;
  const send = () => {
    setState({ me: { name: name.trim(), phone: phone.trim() } });
    const order = createOrder(store, o, { name: name.trim(), phone: phone.trim() }, gift ? { to: to.trim(), msg: gmsg.trim(), from: name.trim() } : null);
    onClose();
    navAfterSheet(order.status === 'external' ? `/done/${order.id}` : `/done/${order.id}`);
  };
  const deco = [...o.toppings.map((t) => optName(TOPPINGS, t)), ...o.extras.map((t) => optName(EXTRAS, t))];
  return (
    <Sheet open={open} onClose={onClose} title="주문서 확인"
      footer={<button className="btn pri block" disabled={!can} onClick={send}>{inApp ? '사장님께 보내기' : '주문서 완성하기'}{!can && ' (위 항목을 확인해 주세요)'}</button>}>
      <div style={{ borderRadius: 18, overflow: 'hidden' }}><CakeView o={view} fancy style={{ height: 200 }} /></div>
      {!o.noText && (
        <div className="card pad" style={{ marginTop: 12, background: '#FFFCF5', borderColor: '#F6E7C8' }}>
          <div className="b small">문구 확인 (오타 방지)</div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 5, margin: '6px 0', wordBreak: 'break-all' }}>{[...o.text].map((c) => (c === ' ' ? '␣' : c)).join(' ')}</div>
          <div className="xs muted">␣ 는 띄어쓰기예요 · {fontOf(o.font).name} · {textColorOf(o.textColor).name} 글씨</div>
          <label className="check"><input type="checkbox" checked={okText} onChange={(e) => setOkText(e.target.checked)} />문구·띄어쓰기가 맞아요</label>
        </div>
      )}
      <div className="card pad" style={{ marginTop: 12 }}>
        <div className="kv"><span>가게</span><b>{store.name}</b></div>
        <div className="kv"><span>픽업</span><b>{fmtDate(o.date)} {o.time}</b></div>
        <div className="kv"><span>모양·크기</span><b>{optName(SHAPES, o.shape)} · {sizeOf(o.size).name} ({sizeOf(o.size).cm}cm)</b></div>
        <div className="kv"><span>디자인</span><b>{designOf(o.design).name}{o.variant ? ` · 시안 ${o.variant + 1}` : ''}</b></div>
        <div className="kv"><span>맛·크림</span><b>{optName([...FLAVORS, ...RICE_FLAVORS], o.flavor)} · {creamOf(o.cream).name}</b></div>
        {deco.length > 0 && <div className="kv"><span>장식·추가</span><b>{deco.join(', ')}</b></div>}
        {o.plateText && <div className="kv"><span>판 문구</span><b>{o.plateText}</b></div>}
        {o.request && <div className="kv"><span>요청</span><b>{o.request}</b></div>}
        {o.allergy && <div className="kv"><span>알레르기</span><b>{o.allergy}</b></div>}
        {o.refPhoto && <div className="kv"><span>참고 사진</span><img src={o.refPhoto} alt="" style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover' }} /></div>}
      </div>
      <div className="card pad" style={{ marginTop: 12 }}>
        <div className="b small">예상 금액 계산</div>
        <div className="breakdown">{est.lines.map((l, i) => <div key={i} className="kv"><span>{l.label}</span><span>{l.lo === l.hi ? won(l.lo) : `${l.lo.toLocaleString()}~${won(l.hi)}`}</span></div>)}</div>
        <div className="total"><span className="small muted">예상 합계</span><b>{range(est.lo, est.hi)}</b></div>
        <div className="xs muted">{basisText(est.basis)}{est.exact ? '' : ' · 최종 금액은 사장님이 확정해요'}</div>
      </div>
      <ul className="rules">{checks.map((c, i) => <li key={i} className={c.ok ? 'k' : 'w'}><i>{c.ok ? <Icon n="check" size="sm" /> : '!'}</i><span>{c.t}</span></li>)}</ul>
      <div className={`verdict ${v.ok ? 'ok' : 'w'}`}>{v.ok ? <Icon n="check" size="sm" /> : '!'} {v.text}</div>
      {inApp && store.ops?.autoConfirm && v.ok && est.exact && <div className="note ok" style={{ marginTop: 8 }}>이 가게는 규칙 안 주문을 <b>바로 자동 확정</b>해요.</div>}
      {needNotice && (
        <div className="card pad" style={{ marginTop: 12 }}>
          <div className="b small">{store.name} 안내사항</div>
          {store.notices.map((n, i) => <div key={i} className="small" style={{ padding: '4px 0' }}>{i + 1}. {n}</div>)}
          <label className="check"><input type="checkbox" checked={okNotice} onChange={(e) => setOkNotice(e.target.checked)} />안내사항을 모두 확인했어요</label>
        </div>
      )}
      <div className="lbl" style={{ marginTop: 16 }}>주문하는 분</div>
      <div className="row"><input className="inp" style={{ flex: 1 }} value={name} onChange={(e) => setName(e.target.value)} placeholder="이름" maxLength={20} /><input className="inp" style={{ flex: 1.4 }} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={inApp ? '010-0000-0000' : '연락처(선택)'} inputMode="tel" maxLength={13} /></div>
      <div className="xs muted" style={{ marginTop: 6 }}>{inApp ? '사장님이 확정·픽업 안내에만 써요. 이 기기와 해당 가게 주문함에만 저장돼요.' : '주문서에 함께 적어 드려요. 서버로 보내지 않아요.'}</div>
      <div className="card pad" style={{ marginTop: 12 }}>
        <div className="row"><span className="grow"><b className="small">선물로 보내기</b><div className="xs muted">받는 분이 직접 픽업하고, 선물 카드 링크를 보낼 수 있어요</div></span><Toggle on={gift} onChange={setGift} label="선물" /></div>
        {gift && (
          <div style={{ marginTop: 10 }}>
            <input className="inp" value={to} onChange={(e) => setTo(e.target.value)} placeholder="받는 분 이름" maxLength={20} />
            <textarea className="inp" style={{ marginTop: 6, minHeight: 60 }} value={gmsg} onChange={(e) => setGmsg(e.target.value)} placeholder="선물 카드 메시지 (예: 생일 축하해! 맛있게 먹어)" maxLength={80} />
          </div>
        )}
      </div>
    </Sheet>
  );
}
