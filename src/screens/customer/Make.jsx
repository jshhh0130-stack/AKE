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
import { makeCakeImage, saveEdited } from '../../lib/imagegen.js';
import { loadImage, toDataURL } from '../../lib/image.js';
import { getStores, rankStores } from '../../lib/stores.js';
import { MAKE_CATS, makeCatOf } from '../../data/makeCats.js';
import { StoreCard, usePlaces } from './Home.jsx';

const BASE = import.meta.env.BASE_URL;
const cardImg = (c) => (c.img ? `${BASE}gallery/s/${c.img}.webp` : c.ex ? `${BASE}examples/${c.ex}.jpeg` : null);
const TEXT_MAX = 28, REQ_MAX = 100;

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
  if (!cat) return <div className="screen"><Header title="AI로 케이크 만들기" fallback="/c/make" /><Empty icon="search">카테고리를 찾을 수 없어요.</Empty></div>;
  const hasKey = !!st.settings?.geminiKey;
  const missing = cat.photo === 'need' && !img ? '이미지를 먼저 올려 주세요' : cat.textNeed && !text.trim() ? '레터링 문구를 적어 주세요' : '';
  const onPick = async (f) => { try { const el = await loadImage(f); setImg(toDataURL(el, 1024, 0.9)); } catch (e) { toast(e.message || '사진을 읽지 못했어요'); } };
  const make = async () => {
    if (missing) { toast(missing); return; }
    setBusy('준비하는 중…');
    try {
      const r = await makeCakeImage({ cat, image: img, text, request: req, onStatus: setBusy });
      setState({ aiDraft: { id: r.pic.id, cat: cat.id, src: r.pic.src, text: text.trim(), request: req.trim(), engine: r.engine, at: Date.now() } });
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

        <div className="mk-lbl row"><span className="grow">추가 요청 사항 <span>(선택)</span></span><small>{req.length}/{REQ_MAX}</small></div>
        <textarea className="inp mk-inp" rows={3} value={req} maxLength={REQ_MAX} onChange={(e) => setReq(e.target.value)} placeholder={cat.reqPh} />

        <div className="mk-engine">{hasKey ? <><b>구글 나노바나나</b>로 한 장 만들어요 · 1장 약 50~90원</> : <><b>무료 AI</b>로 만들어요 · 마이 › 지도·AI 연결에서 구글 제미나이 키를 넣으면 더 정확해요 (한글 문구는 키가 있을 때만 그려요)</>}</div>
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
          {d.text && <div><span>레터링</span><b>“{d.text}”</b></div>}
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
