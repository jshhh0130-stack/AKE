// 카톡 주문 붙여넣기 (사장님 '오늘' 화면)
// 손님이 카톡으로 보낸 주문 글을 붙여 넣으면 → 이름·픽업 날짜·시간·사이즈·맛·크림색·문구·판 문구·초·알레르기를 칸에 나눠 보여 주고
// 사장님이 고친 뒤 저장하면 → 종이 주문서 · 오늘 픽업 · 장부(매출)에 들어간다. 못 찾은 칸은 비워 두고 '확인 필요'.
import { useState } from 'react';
import Icon from '../../components/Icon.jsx';
import { Sheet, PriceInput, toast } from '../../components/ui.jsx';
import { useApp } from '../../lib/state.js';
import { nav } from '../../lib/router.js';
import { shopToStore } from '../../lib/stores.js';
import { estimate } from '../../lib/price.js';
import { createKakaoOrder } from '../../lib/orders.js';
import { aiParseKakao } from '../../lib/ai.js';
import { parseKakaoOrder, kakaoToOrder, KAKAO_EXAMPLES, KAKAO_NEED } from '../../lib/kakaoOrder.js';
import { SIZES, FLAVORS, RICE_FLAVORS, CREAMS } from '../../data/catalog.js';
import { won } from '../../lib/util.js';

export default function KakaoPaste({ open, onClose }) {
  const st = useApp();
  const shop = st.shop;
  const [src, setSrc] = useState('');
  const [f, setF] = useState(null); // 나눈 칸
  const [extra, setExtra] = useState({});
  const [miss, setMiss] = useState([]);
  const [price, setPrice] = useState(null);
  const [busy, setBusy] = useState(false);
  if (!shop) return null;
  const store = shopToStore(shop, 'partner');
  const sizes = SIZES.filter((z) => shop.menu?.sizes?.[z.id] != null);
  const flavors = shop.styles?.includes('rice') ? [...FLAVORS, ...RICE_FLAVORS] : FLAVORS;
  const reset = () => { setSrc(''); setF(null); setExtra({}); setMiss([]); setPrice(null); };
  const close = () => { reset(); onClose(); };
  const split = async () => {
    if (!src.trim()) { toast('카톡 주문 글을 붙여 넣어 주세요'); return; }
    setBusy(true);
    const r = parseKakaoOrder(src);
    let got = r.f;
    if (st.settings.claudeKey) {
      try { const a = await aiParseKakao(st.settings.claudeKey, src); got = { ...got, ...Object.fromEntries(Object.entries(a).filter(([, v]) => v)) }; } catch (e) { toast(`AI 대신 기본 규칙으로 나눴어요 (${e.message})`, 3000); }
    }
    const m = KAKAO_NEED.filter((k) => !got[k]);
    setF(got); setExtra({ extras: r.extras, toppings: r.toppings, design: r.design, shape: r.shape }); setMiss(m);
    const est = estimate(store, kakaoToOrder(got, { extras: r.extras, toppings: r.toppings, design: r.design, shape: r.shape }));
    setPrice(est.lo);
    setBusy(false);
    toast(m.length ? `칸을 나눴어요 · ${m.length}칸은 확인이 필요해요` : '칸을 모두 나눴어요', 2600);
  };
  const set = (k, v) => { setF((x) => ({ ...x, [k]: v })); if (v) setMiss((mm) => mm.filter((i) => i !== k)); };
  const Need = ({ k }) => (miss.includes(k) && !f?.[k] ? <span className="tag warn">확인 필요</span> : null);
  const save = () => {
    const o = kakaoToOrder(f, extra);
    const order = createKakaoOrder(shop, o, { name: f.name || '', phone: f.phone || '' }, price);
    toast('주문서로 저장했어요 · 오늘 픽업 · 장부에도 들어갔어요', 2600);
    close();
    nav(`/o/order/${order.id}`);
  };
  const est = f ? estimate(store, kakaoToOrder(f, extra)) : null;
  return (
    <Sheet open={open} onClose={close} title="카톡 주문 붙여넣기"
      footer={f ? <div className="btns"><button className="btn line" onClick={() => setF(null)}>다시 붙여넣기</button><button className="btn ok" style={{ flex: 2 }} onClick={save}>주문서로 저장 · {won(price || 0)}</button></div>
        : <button className="btn ok block" disabled={busy} onClick={split}>{busy ? '나누는 중…' : <><Icon n="wand" size="sm" />칸 나누기</>}</button>}>
      {!f ? (<>
        <div className="small muted">손님이 카톡으로 보낸 주문 글을 그대로 붙여 넣으세요. 이름 · 날짜 · 사이즈 · 문구 등을 칸에 나눠 드려요.{st.settings.claudeKey ? ' (AI가 함께 읽어요)' : ''}</div>
        <textarea className="inp kpaste" value={src} onChange={(e) => setSrc(e.target.value)} placeholder={'예)\n성함: 김지수 / 010-1234-5678\n11월 28일 오후 2시 픽업\n1호 초코, 연핑크 크림\n문구: 지수야 생일 축하해'} />
        <div className="chips" style={{ marginTop: 8 }}>{KAKAO_EXAMPLES.map((x, i) => <button key={i} className="chip sm" onClick={() => setSrc(x)}>예시 {i + 1}</button>)}</div>
      </>) : (
        <div className="kfields">
          {miss.length > 0 && <div className="note warn" style={{ marginBottom: 8 }}>못 찾은 칸 {miss.length}개는 비워 뒀어요. ‘확인 필요’ 칸을 채워 주세요.</div>}
          <div className="kf2">
            <label><span>이름 <Need k="name" /></span><input className="inp" value={f.name || ''} onChange={(e) => set('name', e.target.value)} placeholder="손님 이름" /></label>
            <label><span>연락처</span><input className="inp" value={f.phone || ''} onChange={(e) => set('phone', e.target.value)} placeholder="010-0000-0000" inputMode="tel" /></label>
          </div>
          <div className="kf2">
            <label><span>픽업 날짜 <Need k="date" /></span><input type="date" className="inp" value={f.date || ''} onChange={(e) => set('date', e.target.value)} /></label>
            <label><span>시간 <Need k="time" /></span><input type="time" className="inp" value={f.time || ''} onChange={(e) => set('time', e.target.value)} /></label>
          </div>
          <div className="klbl">사이즈 <Need k="size" /></div>
          <div className="chips wrap">{sizes.map((z) => <button key={z.id} className={`chip sm ${f.size === z.id ? 'on' : ''}`} onClick={() => set('size', z.id)}>{z.name}</button>)}</div>
          <div className="klbl">맛 <Need k="flavor" /></div>
          <div className="chips wrap">{flavors.map((x) => <button key={x.id} className={`chip sm ${f.flavor === x.id ? 'on' : ''}`} onClick={() => set('flavor', x.id)}>{x.name}</button>)}</div>
          <div className="klbl">크림 색 <Need k="cream" /></div>
          <div className="swatches">{CREAMS.map((c) => <button key={c.id} className={`sw ${f.cream === c.id ? 'on' : ''}`} onClick={() => set('cream', c.id)}><i style={{ background: c.hex }} />{c.name}</button>)}</div>
          <label className="kf1"><span>문구 <Need k="text" /></span><input className="inp" value={f.text || ''} onChange={(e) => set('text', e.target.value)} placeholder="케이크 위 문구" /></label>
          <div className="kf2">
            <label><span>판 문구</span><input className="inp" value={f.plateText || ''} onChange={(e) => set('plateText', e.target.value)} placeholder="없으면 비워 두기" /></label>
            <label><span>초</span><input className="inp" value={f.candles || ''} onChange={(e) => set('candles', e.target.value)} placeholder="예) 큰 초 1, 작은 초 3" /></label>
          </div>
          <label className="kf1"><span>알레르기</span><input className="inp" value={f.allergy || ''} onChange={(e) => set('allergy', e.target.value)} placeholder="없음" /></label>
          <label className="kf1"><span>요청사항</span><textarea className="inp" style={{ minHeight: 56 }} value={f.request || ''} onChange={(e) => set('request', e.target.value)} /></label>
          <div className="row" style={{ marginTop: 10 }}><span className="grow"><b className="small">최종 금액</b><div className="xs muted">가격표 기준 예상가 {est ? won(est.lo) : '-'}</div></span><div className="pricerow" style={{ border: 0, padding: 0 }}><PriceInput value={price} onChange={(v) => setPrice(v ?? 0)} /></div></div>
        </div>
      )}
    </Sheet>
  );
}
