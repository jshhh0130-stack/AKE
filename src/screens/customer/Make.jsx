// AI로 원하는 케이크 만들기 — 한 흐름
//  카테고리 10개 → 사진·레터링 문구·추가 요청 → [바로 만들기] → 결과
//  → [그림 꾸미기](그림판) 또는 [이대로 주문하기] → 이 케이크를 만들 수 있는 가게(1km 이내 · 1km 밖, 가까운 순)
//  → 가게 → 주문서(만든 이미지가 가운데에 들어가 있음) → 사장님께
// 만든 이미지는 st.aiDraft 에 담아 두고 가게·주문서로 넘긴다 (이 기기에만 저장).
import { useMemo, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import { Header, PhotoPick, Portal, CakeView, Empty, toast } from '../../components/ui.jsx';
import Sketch from '../../components/Sketch.jsx';
import { useApp, setState } from '../../lib/state.js';
import { nav } from '../../lib/router.js';
import { makeCakeImage, saveEdited, MAKE_DEFAULT, LAYOUTS, OCCASIONS } from '../../lib/imagegen.js';
import { SHAPES, SIZES, CREAMS, TEXT_COLORS, TOPPINGS, creamOf, sizeOf, optName, textColorOf } from '../../data/catalog.js';
import { loadImage, toDataURL } from '../../lib/image.js';
import { getStores, rankStores } from '../../lib/stores.js';
import { MAKE_CATS, makeCatOf } from '../../data/makeCats.js';
import { StoreCard, usePlaces } from './Home.jsx';

const BASE = import.meta.env.BASE_URL;
const cardImg = (c) => (c.src ? `${BASE}${c.src}` : c.img ? `${BASE}gallery/s/${c.img}.webp` : c.ex ? `${BASE}examples/${c.ex}.jpeg` : null);
const TEXT_MAX = 28, REQ_MAX = 100;
const FONT_OPTS = [['jua', '동글동글 귀엽게'], ['pen', '손글씨'], ['gaegu', '삐뚤빼뚤'], ['gowun', '단정하게']];

function CatImg({ c }) {
  const [bad, setBad] = useState(false);
  const src = cardImg(c);
  if (!src || bad) return <CakeView o={{ shape: 'round', design: c.design || 'simple', cream: 'white', text: c.name }} />;
  return <img src={src} alt="" loading="lazy" onError={() => setBad(true)} />;
}

// ① 카테고리 10개
export function MakeHome() {
  return (
    <div className="screen mk">
      <Header title="AI로 케이크 만들기" fallback="/c" />
      <div className="scroll pad" style={{ paddingBottom: 30 }}>
        <div className="mk-eyebrow">AI 케이크 놀이터</div>
        <h2 className="mk-title">나만의 케이크 만들기</h2>
        <p className="mk-lead">무엇을 케이크로 바꿔볼까요?</p>
        <div className="mk-grid">
          {MAKE_CATS.map((c) => (
            <button key={c.id} className="mk-card" onClick={() => nav(`/c/make/${c.id}`)}>
              <div className="im"><CatImg c={c} /></div>
              <small>{c.badge}</small>
              <b>{c.name}</b>
              <span>{c.sub}</span>
              <em>시작하기 ›</em>
            </button>
          ))}
        </div>
        <div className="xs muted" style={{ marginTop: 14, lineHeight: 1.6 }}>카드 사진은 AI 예시예요. 실제 케이크는 가게마다 조금씩 달라요.</div>
      </div>
    </div>
  );
}

// ② 사진 · 레터링 문구 · 추가 요청 → 바로 만들기
export function MakeForm({ params }) {
  const st = useApp();
  const cat = makeCatOf(params.cat);
  const [img, setImg] = useState(null);
  const [text, setText] = useState('');
  const [req, setReq] = useState('');
  const [busy, setBusy] = useState('');
  const [op, setOp] = useState(() => ({ ...MAKE_DEFAULT, textColor: params.cat === 'letter' ? 'berry' : 'choco', layout: params.cat === 'letter' ? 'center' : 'below' }));
  const setO = (p) => setOp((x) => ({ ...x, ...p }));
  const togTop = (id) => setOp((x) => ({ ...x, toppings: x.toppings.includes(id) ? x.toppings.filter((y) => y !== id) : [...x.toppings, id] }));
  if (!cat) return <div className="screen"><Header title="AI로 케이크 만들기" fallback="/c/make" /><Empty icon="search">카테고리를 찾을 수 없어요.</Empty></div>;
  const hasKey = !!st.settings?.geminiKey;
  const missing = !hasKey ? '구글 제미나이 키를 연결해 주세요' : cat.photo === 'need' && !img ? '이미지를 먼저 올려 주세요' : cat.textNeed && !text.trim() ? '레터링 문구를 적어 주세요' : '';
  const onPick = async (f) => { try { const el = await loadImage(f); setImg(toDataURL(el, 1024, 0.9)); } catch (e) { toast(e.message || '사진을 읽지 못했어요'); } };
  const make = async () => {
    if (missing) { toast(missing); return; }
    setBusy('준비하는 중…');
    try {
      const r = await makeCakeImage({ cat, image: img, text, request: req, opts: op, onStatus: setBusy });
      setState({ aiDraft: { id: r.pic.id, cat: cat.id, src: r.pic.src, text: text.trim(), request: req.trim(), opts: op, engine: r.engine, at: Date.now() } });
      nav('/c/make/result');
    } catch (e) { toast(e.message || '이미지를 만들지 못했어요', 4500); }
    setBusy('');
  };
  return (
    <div className="screen mk">
      <Header title={cat.name} fallback="/c/make" />
      <div className="scroll pad" style={{ paddingBottom: 120 }}>
        <div className="mk-eyebrow">{cat.badge}</div>
        <h2 className="mk-title">{cat.name}</h2>
        <p className="mk-lead">{cat.sub}</p>

        {cat.photo !== 'none' && (<>
          <div className="mk-lbl">참고 이미지{cat.photo === 'opt' && <span> (선택)</span>}</div>
          {img ? (
            <div className="mk-up has"><img src={img} alt="" /><div className="mk-upbtns"><PhotoPick onPick={onPick} className="btn xs line">바꾸기</PhotoPick><button className="btn xs line" onClick={() => setImg(null)}>빼기</button></div></div>
          ) : (
            <PhotoPick onPick={onPick} className="mk-up"><span className="ic"><Icon n="upload" /></span><b>탭하여 사진 올리기</b><small>{cat.photo === 'need' ? '사진을 올려 주세요' : '없으면 비워 둬도 돼요'}</small></PhotoPick>
          )}
          {cat.photoHint && <div className="mk-hint">{cat.photoHint}</div>}
        </>)}

        <div className="mk-lbl row"><span className="grow">레터링 문구{!cat.textNeed && <span> (선택)</span>}</span><small>{text.length}/{TEXT_MAX}</small></div>
        <input className="inp mk-inp" value={text} maxLength={TEXT_MAX} onChange={(e) => setText(e.target.value)} placeholder={cat.textPh} />

        {text.trim() && (
          <div className="mk-opts">
            <div className="mk-olbl">글씨 색</div>
            <div className="mk-sw">{TEXT_COLORS.map((c) => <button key={c.id} className={op.textColor === c.id ? 'on' : ''} onClick={() => setO({ textColor: c.id })}><i style={{ background: c.hex }} />{c.name}</button>)}</div>
            <div className="mk-olbl">글씨 느낌</div>
            <div className="mk-chips">{FONT_OPTS.map(([id, nm]) => <button key={id} className={op.font === id ? 'on' : ''} onClick={() => setO({ font: id })}>{nm}</button>)}</div>
            <div className="mk-olbl">글씨 자리</div>
            <div className="mk-chips">{LAYOUTS.filter(([id]) => cat.id !== 'letter' || id !== 'below').map(([id, nm]) => <button key={id} className={op.layout === id ? 'on' : ''} onClick={() => setO({ layout: id })}>{nm}</button>)}</div>
          </div>
        )}

        <div className="mk-lbl">꾸미기 옵션 <span>(고른 대로 그려요)</span></div>
        <div className="mk-opts">
          <div className="mk-olbl">어떤 날이에요?</div>
          <div className="mk-chips">{OCCASIONS.map(([id, nm]) => <button key={id || 'none'} className={op.occasion === id ? 'on' : ''} onClick={() => setO({ occasion: id })}>{nm}</button>)}</div>
          <div className="mk-olbl">사진 느낌</div>
          <div className="mk-chips"><button className={op.photo === 'top' ? 'on' : ''} onClick={() => setO({ photo: 'top' })}>위에서 찍은 도안 사진</button><button className={op.photo === 'cafe' ? 'on' : ''} onClick={() => setO({ photo: 'cafe' })}>카페 테이블 · 비스듬히</button></div>
          {cat.id !== 'shape' && cat.id !== 'remake' && (<>
            <div className="mk-olbl">모양 · 크기</div>
            <div className="mk-chips">{SHAPES.map((s) => <button key={s.id} className={op.shape === s.id ? 'on' : ''} onClick={() => setO({ shape: s.id })}>{s.name}</button>)}<span className="sep" />{SIZES.map((z) => <button key={z.id} className={op.size === z.id ? 'on' : ''} onClick={() => setO({ size: z.id })}>{z.name}</button>)}</div>
          </>)}
          {cat.id !== 'remake' && (<>
            <div className="mk-olbl">크림 색</div>
            <div className="mk-sw">{CREAMS.map((c) => <button key={c.id} className={op.cream === c.id ? 'on' : ''} onClick={() => setO({ cream: c.id })}><i style={{ background: c.hex }} />{c.name}</button>)}</div>
          </>)}
          <div className="mk-olbl">장식 <span>(여러 개 가능)</span></div>
          <div className="mk-chips">{TOPPINGS.map((t) => <button key={t.id} className={op.toppings.includes(t.id) ? 'on' : ''} onClick={() => togTop(t.id)}>{t.name}</button>)}<button className={op.candle ? 'on' : ''} onClick={() => setO({ candle: !op.candle })}>파티 초</button></div>
        </div>

        <div className="mk-lbl row"><span className="grow">추가 요청 사항 <span>(선택)</span></span><small>{req.length}/{REQ_MAX}</small></div>
        <textarea className="inp mk-inp" rows={3} value={req} maxLength={REQ_MAX} onChange={(e) => setReq(e.target.value)} placeholder={cat.reqPh} />

        {hasKey ? (<>
          <div className="mk-lbl">만들기 품질</div>
          <div className="mk-qual">
            <button className={op.quality === 'pro' ? 'on' : ''} onClick={() => setO({ quality: 'pro' })}><b>글씨 정확하게</b><small>나노바나나 Pro · 1장 약 180원</small></button>
            <button className={op.quality === 'std' ? 'on' : ''} onClick={() => setO({ quality: 'std' })}><b>기본</b><small>나노바나나 2 · 1장 약 90원</small></button>
          </div>
          <div className="xs muted" style={{ marginTop: 6 }}>한글 레터링은 ‘글씨 정확하게’가 훨씬 잘 써요.</div>
        </>) : (
          <div className="mk-engine">
            <b>구글 제미나이 키를 먼저 연결해 주세요</b><br />이 기기에 키가 아직 없어요. 마이 › 지도·AI 연결 › AI 실사 사진에 키를 넣으면 바로 만들 수 있어요.
            <button className="btn sm sec" style={{ marginTop: 10, width: '100%' }} onClick={() => nav('/settings')}>키 연결하러 가기</button>
          </div>
        )}
        <div className="xs muted" style={{ marginTop: 6 }}>올린 사진은 이미지를 만들 때만 쓰고 따로 저장하지 않아요.</div>
      </div>
      <div className="stickybar mk-bar">
        <span className="grow mk-miss">{missing || '준비됐어요'}</span>
        <button className="btn pri" disabled={!!missing || !!busy} onClick={make}><Icon n="sparkle" size="sm" />바로 만들기</button>
      </div>
      {busy && (
        <div className="mk-busy"><div className="loader" /><b>케이크를 만드는 중이에요</b><small>{busy}</small></div>
      )}
    </div>
  );
}

// ③ 결과: 그림 꾸미기 / 이대로 주문하기
export function MakeResult() {
  const st = useApp();
  const d = st.aiDraft;
  const [sketch, setSketch] = useState(false);
  if (!d) return <div className="screen"><Header title="AI로 케이크 만들기" fallback="/c/make" /><Empty icon="sparkle">만든 케이크가 없어요.<div style={{ marginTop: 12 }}><button className="btn pri sm" onClick={() => nav('/c/make', { replace: true })}>케이크 만들러 가기</button></div></Empty></div>;
  const cat = makeCatOf(d.cat);
  return (
    <div className="screen mk">
      <Header title="생성 완료" onBack={() => nav(`/c/make/${d.cat}`, { replace: true })} />
      <div className="scroll pad" style={{ paddingBottom: 150 }}>
        <h2 className="mk-title center" style={{ marginTop: 4 }}>나만의 케이크를 완성했어요.</h2>
        <div className="mk-result"><img src={d.src} alt="만든 케이크" /><span className="ai">AI 예시</span>{d.edited && <span className="ed">그림판으로 꾸밈</span>}</div>
        <div className="mk-sum">
          <div><span>종류</span><b>{cat?.name || '케이크'}</b></div>
          {d.opts && <div><span>케이크</span><b>{optName(SHAPES, d.opts.shape)} · {sizeOf(d.opts.size).name} · {creamOf(d.opts.cream).name} 크림</b></div>}
          {d.text && <div><span>레터링</span><b>“{d.text}”{d.opts ? ` · ${textColorOf(d.opts.textColor).name}` : ''}</b></div>}
          {d.opts && (d.opts.toppings?.length > 0 || d.opts.candle) && <div><span>장식</span><b>{[...d.opts.toppings.map((t) => optName(TOPPINGS, t)), d.opts.candle && '파티 초'].filter(Boolean).join(', ')}</b></div>}
          {d.request && <div><span>요청</span><b>{d.request}</b></div>}
        </div>
        <button className="linkbtn" style={{ display: 'flex', margin: '10px auto 0' }} onClick={() => nav(`/c/make/${d.cat}`, { replace: true })}><Icon n="refresh" size="sm" />다시 만들기</button>
      </div>
      <div className="mk-actions">
        <button className="btn pri block" onClick={() => setSketch(true)}><Icon n="pen" size="sm" />그림 꾸미기</button>
        <button className="btn line block" onClick={() => nav('/c/make/shops')}>이대로 주문하기 ›</button>
      </div>
      {sketch && <Portal><Sketch src={d.src} title="그림 꾸미기" onClose={() => setSketch(false)} onSave={(out) => { saveEdited(out, { from: d.id }); setState((s) => ({ ...s, aiDraft: { ...s.aiDraft, src: out, edited: true } })); setSketch(false); toast('꾸민 그림으로 바꿨어요'); }} /></Portal>}
    </div>
  );
}

// ④ 이 케이크를 만들 수 있는 가게 — 1km 이내 · 1km 밖 (가까운 순)
export function MakeShops() {
  const st = useApp();
  usePlaces();
  const d = st.aiDraft;
  const cat = d ? makeCatOf(d.cat) : null;
  const stores = getStores(st);
  const rows = useMemo(() => {
    if (!d) return [];
    const opt = { loc: st.loc, radius: 20, sort: 'near' };
    let r = rankStores(stores, { ...opt, find: { styles: cat?.styles || [] } });
    const exact = r.filter((x) => !x.partial);
    if (exact.length) r = exact;
    if (!r.length) r = rankStores(stores, { ...opt, find: null });
    return r.sort((a, b) => a.d - b.d);
  }, [stores.length, st.loc.lat, st.loc.lng, d?.cat]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!d) { nav('/c/make', { replace: true }); return null; }
  const near = rows.filter((r) => r.d <= 1);
  const far = rows.filter((r) => r.d > 1).slice(0, 15);
  const fav = (id) => setState((s) => ({ ...s, favs: s.favs.includes(id) ? s.favs.filter((x) => x !== id) : [...s.favs, id] }));
  const card = (r) => <StoreCard key={r.s.id} r={r} fav={st.favs.includes(r.s.id)} onFav={() => fav(r.s.id)} onClick={() => nav(`/store/${r.s.id}?ai=1`)} />;
  return (
    <div className="screen mk">
      <Header title="이 케이크를 만들 수 있는 가게" fallback="/c/make/result" />
      <div className="scroll pad" style={{ paddingTop: 8, paddingBottom: 30 }}>
        <div className="mk-shophead">
          <img src={d.src} alt="" />
          <div className="grow"><b>{cat?.name || '케이크'} 케이크와 비슷한 가게</b><small>{st.loc.label} 기준 · 가까운 순 · 가게를 눌러 주문하면 이 이미지가 주문서에 들어가요</small></div>
        </div>
        <div className="mk-sec"><b>1km 이내</b><span>{near.length}곳</span></div>
        {near.length ? near.map(card) : <div className="card pad small muted">1km 안에는 맞는 가게가 없어요. 아래 조금 먼 가게를 봐 주세요.</div>}
        <div className="mk-sec"><b>1km 밖</b><span>가까운 순 {far.length}곳</span></div>
        {far.length ? far.map(card) : <div className="card pad small muted">더 먼 곳에도 맞는 가게가 없어요.</div>}
      </div>
    </div>
  );
}
