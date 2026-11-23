// 주문 대화방 — 손님과 사장님이 같은 화면 구조로 본다.
// 위: 주문 요약(시안·금액·진행 단계) / 가운데: 지금 해야 할 일 버튼 + 대화 / 아래: 메시지 입력
import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { CakeView, Header, Empty, StatusTag, Stars, toast, PhotoPick, PriceInput, Sheet, Seg } from '../components/ui.jsx';
import { useApp, patchShop } from '../lib/state.js';
import { nav } from '../lib/router.js';
import { getStores, shopToStore, mapLinks, dayStatus, slotsOf, canOrderInApp } from '../lib/stores.js';
import { estimate, ruleCheck, verdictOf } from '../lib/price.js';
import { act, evText, markSeen, STATUS, nextStatus, NEXT_LABEL, diffSummary, isSystemish } from '../lib/orders.js';
import { readLink } from '../lib/notify.js';
import { liveStatus, onLiveStatus } from '../lib/live.js';
import { orderView, orderText, decoList, flavorName } from '../lib/ordertext.js';
import { orderLink, giftLink } from '../lib/share.js';
import { loadImage, toDataURL } from '../lib/image.js';
import { won, range, fmtDate, relDay, ago, maskName, maskPhone, shareText, copyText, today, addDays, ymd, DOW, textLen } from '../lib/util.js';
import { SHAPES, CREAMS, TEXT_COLORS, FONTS, sizeOf, designOf, creamOf, fontOf, textColorOf, optName } from '../data/catalog.js';
import OrderThumb from '../components/OrderThumb.jsx';

const STEPS = ['요청', '확인', '확정', '제작', '픽업'];
function Steps({ status }) {
  const step = STATUS[status]?.step ?? 0;
  const dead = ['declined', 'canceled'].includes(status);
  return (
    <div className="steps">
      {STEPS.map((s, i) => <div key={s} className={`st ${dead ? '' : status === 'done' || i < step ? 'done' : i === step ? 'now' : ''}`}><i>{status === 'done' || i < step ? <Icon n="check" /> : i + 1}</i><span>{s}</span></div>)}
    </div>
  );
}

function useLive() { const [v, set] = useState(liveStatus()); useEffect(() => onLiveStatus(() => set(liveStatus())), []); return v; }

function Summary({ order, role, open, setOpen }) {
  const x = order.o;
  const deco = decoList(x);
  const [tab, setTab] = useState('pv');
  const ref = order.imgs?.ref;
  return (
    <div className="card room-sum">
      <button className="rs-top" onClick={() => setOpen(!open)}>
        <div className="rs-th"><OrderThumb order={order} /></div>
        <div className="grow">
          <div className="b">{role === 'o' ? `${maskName(order.customer?.name)} · ${sizeOf(x.size).name} ${x.pickName || designOf(x.design).name}` : `${sizeOf(x.size).name} ${x.pickName || designOf(x.design).name}`}</div>
          <div className="small muted">{relDay(x.date)} · {fmtDate(x.date)} {x.time} 픽업</div>
          <div className="small"><b className="pink">{order.finalPrice != null ? won(order.finalPrice) : range(order.est?.lo, order.est?.hi)}</b> <span className="muted">{order.finalPrice != null ? '확정' : '예상'}</span>{order.paid && <span className="tag ok" style={{ marginLeft: 6 }}>입금 완료</span>}</div>
        </div>
        <Icon n={open ? 'down' : 'right'} size="sm" />
      </button>
      <Steps status={order.status} />
      {open && (
        <div className="rs-body fadeup">
          {ref && <div style={{ marginBottom: 8 }}><Seg value={tab} onChange={setTab} items={[['pv', '앱 시안'], ['ref', role === 'o' ? '손님 참고 사진' : '내 참고 사진']]} /></div>}
          <div style={{ height: 190, borderRadius: 14, overflow: 'hidden', background: 'var(--p50)' }}>{tab === 'ref' && ref ? <img src={ref} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <CakeView o={orderView(order)} fancy />}</div>
          <div style={{ marginTop: 10 }}>
            {role === 'o' && <div className="kv"><span>주문자</span><b>{maskName(order.customer?.name)} · {maskPhone(order.customer?.phone)}</b></div>}
            {role === 'c' && <div className="kv"><span>가게</span><b>{order.storeName}</b></div>}
            <div className="kv"><span>모양·크기</span><b>{optName(SHAPES, x.shape)} · {sizeOf(x.size).name} ({sizeOf(x.size).cm}cm)</b></div>
            <div className="kv"><span>디자인</span><b>{x.pickName ? `${x.pickName} (가게 대표 디자인)` : ref ? '손님이 올린 사진으로' : designOf(x.design).name}{x.variant ? ` · 시안 ${x.variant + 1}` : ''}</b></div>
            <div className="kv"><span>맛·크림</span><b>{flavorName(x)} · {creamOf(x.cream).name}</b></div>
            <div className="kv"><span>문구</span><b>{x.noText ? '없음' : `“${x.text}”`}</b></div>
            {!x.noText && <div className="spell" style={{ marginTop: 4 }}>한 글자씩: <b>{[...x.text].map((c) => (c === ' ' ? '␣' : c)).join(' ')}</b><div className="xs muted">{fontOf(x.font).name}체 · {textColorOf(x.textColor).name} 글씨</div></div>}
            {deco.length > 0 && <div className="kv"><span>장식·추가</span><b>{deco.join(', ')}</b></div>}
            {x.plateText && <div className="kv"><span>판 문구</span><b>{x.plateText}</b></div>}
            {x.request && <div className="kv"><span>요청</span><b>{x.request}</b></div>}
            {x.allergy && <div className="kv"><span>알레르기</span><b style={{ color: 'var(--danger)' }}>{x.allergy}</b></div>}
            {order.gift && <div className="kv"><span>선물</span><b>받는 분 {order.gift.to}님이 픽업</b></div>}
            <div className="kv"><span>주문번호</span><b>{order.id}</b></div>
          </div>
        </div>
      )}
    </div>
  );
}

function Thread({ order, role }) {
  const evs = (order.ev || []).filter((e) => e.t !== 'img');
  return (
    <div className="thread">
      {evs.map((ev) => {
        const mine = ev.by === role, sys = ev.by === 's';
        const text = evText(ev, order);
        const img = ev.img ? order.imgs?.[ev.img] : null;
        if (sys || (isSystemish(ev) && ev.t !== 'request' && !ev.msg && ['advance', 'paid'].includes(ev.t))) {
          return <div key={ev.id} className="tsys"><span>{text}</span><small>{ago(ev.at)}</small></div>;
        }
        return (
          <div key={ev.id} className={`bub ${mine ? 'me' : ''} ${ev.t !== 'msg' ? 'act' : ''}`}>
            {!mine && <small className="who">{ev.by === 'o' ? `${order.storeName} 사장님` : maskName(order.customer?.name) + '님'}</small>}
            {ev.t === 'proof' && <div className="proofimg">{img ? <img src={img} alt="시안" /> : ev.img ? <div className="imgwait">사진 받는 중…</div> : <CakeView o={orderView(order)} fancy />}<span className="tag dark">제작 전 시안</span></div>}
            {ev.t === 'msg' && ev.img && (img ? <img className="chatimg" src={img} alt="" /> : <div className="imgwait">사진 받는 중…</div>)}
            {text && <div className="tx">{text}</div>}
            <small className="tm">{ago(ev.at)}</small>
          </div>
        );
      })}
    </div>
  );
}

function Composer({ order, role, quick = [] }) {
  const [text, setText] = useState('');
  const live = useLive();
  const send = () => { const t = text.trim(); if (!t) return; act(order.id, role, 'msg', { text: t.slice(0, 500) }); setText(''); };
  const sendPhoto = async (file) => {
    try {
      const el = await loadImage(file);
      const key = 'chat' + Date.now().toString(36);
      act(order.id, role, 'img', { key, d: toDataURL(el, 340, 0.6) });
      act(order.id, role, 'msg', { text: text.trim().slice(0, 300), img: key });
      setText('');
    } catch { toast('사진을 읽지 못했어요'); }
  };
  return (
    <div className="composer">
      {quick.length > 0 && <div className="chips" style={{ padding: '0 0 6px' }}>{quick.map((q) => <button key={q} className="chip sm" onClick={() => setText(q)}>{q.length > 16 ? q.slice(0, 15) + '…' : q}</button>)}</div>}
      <div className="row">
        <PhotoPick onPick={sendPhoto} className="cbtn"><Icon n="image" /></PhotoPick>
        <input className="inp grow" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && send()} placeholder={role === 'o' ? '손님에게 메시지' : '사장님에게 메시지'} maxLength={500} />
        <button className="cbtn send" onClick={send} aria-label="보내기" disabled={!text.trim()}><Icon n="right" /></button>
      </div>
      {order.chan && live !== 'on' && <div className="xs muted" style={{ marginTop: 4 }}>{live === 'offline' ? '인터넷이 끊겼어요. 연결되면 자동으로 보내요.' : '상대 폰과 연결하는 중…'}</div>}
    </div>
  );
}

// 손님: 주문 내용 고치기 (확정 전·후, 제작 시작 전까지)
function ReviseSheet({ open, onClose, order, store }) {
  const st = useApp();
  const x = order.o;
  const [p, setP] = useState({});
  const [msg, setMsg] = useState('');
  useEffect(() => { if (open) { setP({}); setMsg(''); } }, [open]);
  const cur = { ...x, ...p };
  const est = store ? estimate(store, cur) : order.est;
  const days = store ? Array.from({ length: 21 }, (_, i) => { const d = addDays(today(), i); const key = ymd(d); return { key, d, i, ok: dayStatus(store, key, st.orders.filter((o) => o.id !== order.id)).ok }; }) : [];
  const times = store ? slotsOf(store) : [];
  const summary = diffSummary(x, p);
  const lim = sizeOf(cur.size).limit;
  const submit = () => {
    if (!summary && !msg.trim()) { toast('바꿀 내용을 고르거나 적어 주세요'); return; }
    act(order.id, 'c', 'revise', { patch: p, est, summary, msg: msg.trim() });
    // 가게 규칙 안이고 가격표로 정확히 계산되면 다시 자동 확정
    if (store && canOrderInApp(store) && store.ops?.autoConfirm && est.exact && !msg.trim() && verdictOf(ruleCheck(store, cur, { orders: st.orders.filter((o) => o.id !== order.id) })).ok) act(order.id, 's', 'auto', { price: est.lo });
    onClose();
    toast('수정 요청을 보냈어요');
  };
  return (
    <Sheet open={open} onClose={onClose} title="주문 내용 고치기" footer={<button className="btn pri block" onClick={submit}>{summary ? `수정 요청 보내기 · ${range(est.lo, est.hi, true)}` : '수정 요청 보내기'}</button>}>
      <div style={{ height: 170, borderRadius: 14, overflow: 'hidden', background: 'var(--p50)' }}><CakeView o={{ ...orderView(order), ...p, text: cur.noText ? '' : cur.text }} /></div>
      {summary && <div className="note pink" style={{ marginTop: 8 }}>바뀌는 점: <b>{summary}</b></div>}
      <div className="lbl">문구</div>
      <div className="inp-w"><input className="inp" style={{ paddingRight: 64 }} maxLength={40} value={cur.text || ''} onChange={(e) => setP({ ...p, text: e.target.value, noText: false })} /><span className={`cnt ${textLen(cur.text) > lim ? 'over' : ''}`}>{textLen(cur.text)}/{lim}</span></div>
      {cur.text && <div className="spell">한 글자씩 확인: <b>{[...cur.text].map((c) => (c === ' ' ? '␣' : c)).join(' ')}</b></div>}
      <div className="lbl">글씨 색 · 글씨체</div>
      <div className="swatches">{TEXT_COLORS.map((c) => <button key={c.id} className={`sw ${cur.textColor === c.id ? 'on' : ''}`} style={{ width: 50 }} onClick={() => setP({ ...p, textColor: c.id })}><i style={{ background: c.hex, width: 30, height: 30 }} />{c.name}</button>)}</div>
      <div className="chips" style={{ marginTop: 8 }}>{FONTS.map((f) => <button key={f.id} className={`chip sm soft ${cur.font === f.id ? 'on' : ''}`} style={{ fontFamily: f.css }} onClick={() => setP({ ...p, font: f.id })}>{f.name}</button>)}</div>
      <div className="lbl">크림 색</div>
      <div className="swatches">{CREAMS.map((c) => <button key={c.id} className={`sw ${cur.cream === c.id ? 'on' : ''}`} style={{ width: 50 }} onClick={() => setP({ ...p, cream: c.id })}><i style={{ background: c.hex, width: 30, height: 30 }} />{c.name}</button>)}</div>
      {store && (<>
        <div className="lbl">픽업 날짜 · 시간</div>
        <div className="chips">{days.map(({ key, d, i, ok }) => <button key={key} disabled={!ok && key !== x.date} className={`opt ${cur.date === key ? 'on' : ''}`} style={{ flex: 'none', minWidth: 58, padding: '7px 5px' }} onClick={() => setP({ ...p, date: key })}>{i === 0 ? '오늘' : i === 1 ? '내일' : `${d.getMonth() + 1}.${d.getDate()}`}<small>{DOW[d.getDay()]}</small></button>)}</div>
        <div className="chips" style={{ marginTop: 6 }}>{times.map((t) => <button key={t} className={`chip sm soft ${cur.time === t ? 'on' : ''}`} onClick={() => setP({ ...p, time: t })}>{t}</button>)}</div>
      </>)}
      <div className="lbl">사장님께 한마디</div>
      <textarea className="inp" value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={200} placeholder="예) 하트를 조금 더 크게 해 주세요" />
      <div className="xs muted" style={{ marginTop: 6 }}>크기·디자인·맛을 바꾸려면 메시지로 요청해 주세요. 제작이 시작되면 고칠 수 없어요.</div>
    </Sheet>
  );
}
const FIX_TAGS = ['문구 수정', '글씨 크기·위치', '색상 변경', '그림 수정', '장식 추가·빼기'];
function ProofFixSheet({ open, onClose, order }) {
  const [tags, setTags] = useState([]);
  const [msg, setMsg] = useState('');
  useEffect(() => { if (open) { setTags([]); setMsg(''); } }, [open]);
  return (
    <Sheet open={open} onClose={onClose} title="시안 수정 요청" footer={<button className="btn pri block" disabled={!tags.length && !msg.trim()} onClick={() => { act(order.id, 'c', 'prooffix', { tags, msg: msg.trim() }); onClose(); toast('수정 요청을 보냈어요. 사장님이 다시 시안을 보내 줄 거예요'); }}>수정 요청 보내기</button>}>
      <div className="small muted">어디를 고치면 좋을지 골라 주세요. 사장님이 반영해서 시안을 다시 보내요.</div>
      <div className="chips wrap" style={{ marginTop: 10 }}>{FIX_TAGS.map((t) => <button key={t} className={`chip ${tags.includes(t) ? 'on' : ''}`} onClick={() => setTags(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t])}>{t}</button>)}</div>
      <textarea className="inp" style={{ marginTop: 10 }} value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={200} placeholder="자세히 적어 주세요 (예: ‘지민아’를 조금 더 크게)" />
    </Sheet>
  );
}

// ── 결제 (11/23 UI · 체험용 가상 결제): 사장님이 금액을 확정하면 예약금/전액 · 결제 수단을 골라 결제 ──
// 실제 결제는 일어나지 않는다. 결제하면 '입금 완료'로 표시되고 사장님 화면에도 바로 보인다.
const PAY_METHODS = [['kakao', '카카오페이', 'pay'], ['toss', '토스페이', 'toss']];
function PayCard({ order, store, onPaid }) {
  const total = order.finalPrice;
  const dep = store?.ops?.deposit || 0;
  const depAmt = dep ? Math.round((total * dep) / 100 / 100) * 100 : 0;
  const [how, setHow] = useState(dep ? 'dep' : 'all');
  const [m, setM] = useState('kakao');
  const amt = how === 'dep' ? depAmt : total;
  const lines = (order.est?.lines || []).filter((l) => l.lo);
  const sum = lines.reduce((a, l) => a + l.lo, 0);
  const rows = lines.map((l) => [l.label, l.lo]);
  if (sum && sum !== total) rows.push(['사장님 조정', total - sum]);
  const pay = () => {
    const method = PAY_METHODS.find((x) => x[0] === m)[1];
    act(order.id, 'c', 'paid', { paid: true, amount: amt, method, rest: total - amt, mock: true });
    onPaid({ amt, method, rest: total - amt });
  };
  return (
    <div className="paycard">
      <div className="paynote"><span className="ck"><Icon n="check" size="sm" /></span><span><b>사장님이 금액을 확정했어요.</b><br />결제하면 바로 제작이 시작돼요.</span></div>
      <div className="paybox">
        {rows.length ? rows.map(([l, v], i) => <div key={i} className="kv"><span>{l}</span><span>{v < 0 ? '-' : ''}{won(Math.abs(v))}</span></div>) : <div className="kv"><span>케이크 ({sizeOf(order.o.size).name})</span><span>{won(total)}</span></div>}
        <div className="kv"><span>픽업</span><span>무료</span></div>
        <div className="kv tot"><span>최종 금액</span><b>{won(total)}</b></div>
      </div>
      <div className="flbl">얼마나 결제할까요?</div>
      <div className="g2">
        {dep > 0 && <button className={`payopt ${how === 'dep' ? 'on' : ''}`} onClick={() => setHow('dep')}><small>예약금 {dep}%</small><b>{won(depAmt)}</b><span>잔금 {won(total - depAmt)}은 픽업 때</span></button>}
        <button className={`payopt ${how === 'all' ? 'on' : ''}`} onClick={() => setHow('all')}><small>전액 결제</small><b>{won(total)}</b><span>픽업 때 바로 받아 가요</span></button>
      </div>
      <div className="flbl">결제 수단</div>
      <div className="g2">{PAY_METHODS.map(([id, nm, ic]) => <button key={id} className={`payopt row ${m === id ? 'on' : ''}`} onClick={() => setM(id)}><i className={`pm ${id}`}>{ic}</i><b>{nm}</b></button>)}</div>
      <button className="btn pri block" style={{ marginTop: 12 }} onClick={pay}>{won(amt)} 결제하기</button>
      <div className="xs muted center" style={{ marginTop: 6 }}>체험용 가상 결제예요. 실제로 돈이 나가지 않아요.{store?.ops?.account ? ` 실제 입금은 ${store.ops.account}` : ''}</div>
    </div>
  );
}
const PAID_ART = `<svg viewBox="0 0 140 120" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="#4A3B39" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M30 70v30q0 6 8 6h64q8 0 8-6V70" fill="#fff"/><path d="M26 70q0-10 44-10t44 10q-3 7-8 2-5 8-11 1-6 8-12 0-6 8-12 0-6 8-12 0-6 8-11-1-5 6-8-2z" fill="#F8C9D0"/>
  <path d="M42 88l6 5 6-5 6 5 6-5 6 5 6-5 6 5 6-5 6 5" stroke-width="1.6"/>
  <path d="M52 58V44M70 56V40M88 58V44" stroke-width="3"/><path d="M52 38q-3 3 0 5 3-2 0-5zM70 34q-3 3 0 5 3-2 0-5zM88 38q-3 3 0 5 3-2 0-5z" fill="#F6B85C" stroke-width="1.4"/>
</svg>`;
function PaidOverlay({ info, order, onClose }) {
  return (
    <div className="paidov gingham" role="dialog" aria-label="결제 완료">
      <div className="paidart">
        {[0, 1, 2, 3, 4, 5].map((k) => <span key={k} className={`spark s${k}`}>★</span>)}
        <div dangerouslySetInnerHTML={{ __html: PAID_ART }} />
      </div>
      <h2>결제가 완료됐어요!<br />{order.storeName}에서 곧 만들기 시작해요</h2>
      <p className="small muted center" style={{ margin: '6px 0 16px' }}>시안이 오면 알림으로 알려드릴게요</p>
      <div className="sumcard">
        <div className="kv"><span>결제 금액</span><b>{won(info.amt)}</b></div>
        <div className="kv"><span>결제 수단</span><b>{info.method}</b></div>
        <div className="kv"><span>남은 금액</span><b>{info.rest > 0 ? `${won(info.rest)} (픽업 때)` : '없음'}</b></div>
        <div className="kv"><span>픽업</span><b>{fmtDate(order.o.date)} {order.o.time}</b></div>
      </div>
      <button className="btn pri block" style={{ marginTop: 14 }} onClick={onClose}>확인</button>
      <div className="xs muted center" style={{ marginTop: 6 }}>체험용 가상 결제예요. 실제로 돈이 나가지 않았어요.</div>
    </div>
  );
}

// ───────── 손님 화면 ─────────
const C_QUICK = ['당일 픽업 되나요?', '사진 보낼게요', '문구 바꿀 수 있어요?'];
export function CustomerOrder({ params }) {
  const st = useApp();
  const order = st.orders.find((x) => x.id === params.id);
  const [open, setOpen] = useState(false);
  const [revise, setRevise] = useState(false);
  const [fix, setFix] = useState(false);
  const [stars, setStars] = useState(5);
  const [rv, setRv] = useState('');
  const [paidInfo, setPaidInfo] = useState(null);
  const sc = useRef(null);
  const n = order?.ev?.length || 0;
  useEffect(() => { if (order) { markSeen(order.id, 'c'); readLink('c', `/c/order/${order.id}`); } sc.current?.scrollTo({ top: 1e6, behavior: 'smooth' }); }, [n]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!order) return <div className="screen"><Header title="주문" fallback="/c/orders" /><Empty>주문을 찾을 수 없어요.</Empty></div>;
  const store = getStores(st).find((s) => s.id === order.storeId);
  const s = order.status;
  const lastChange = [...order.ev].reverse().find((e) => e.t === 'change');
  const dep = store?.ops?.deposit && order.finalPrice != null ? Math.round((order.finalPrice * store.ops.deposit) / 100 / 100) * 100 : 0;
  const canRevise = ['requested', 'change', 'confirmed', 'proof'].includes(s);
  return (
    <div className="screen">
      <Header title={order.storeName} fallback="/c/orders" right={<span style={{ marginRight: 10 }}><StatusTag status={s} /></span>} />
      <div className="scroll pad room" ref={sc}>
        <Summary order={order} role="c" open={open} setOpen={setOpen} />
        {s === 'external' && (
          <div className="card pad todo">
            <div className="b">가게에 주문서를 직접 보내 주세요</div>
            <div className="small muted" style={{ margin: '4px 0 10px' }}>아직 에이크 입점 전인 가게라, 완성된 주문서를 가게 카톡·인스타로 보내야 해요.</div>
            <div className="btns"><button className="btn pri sm" onClick={async () => { const ok = await copyText(orderText(order, await orderLink(order))); toast(ok ? '주문서를 복사했어요. 가게 채팅창에 붙여 넣으세요' : '복사하지 못했어요'); }}><Icon n="copy" size="sm" />주문서 복사</button>
              <button className="btn line sm" onClick={async () => { const r = await shareText({ title: '케이크 주문서', text: orderText(order), url: await orderLink(order) }); if (r === 'copied') toast('공유 대신 복사했어요'); }}><Icon n="share" size="sm" />카톡·문자</button></div>
            {store && <div className="linkrow">{store.insta && <a href={mapLinks(store).insta} target="_blank" rel="noreferrer"><Icon n="insta" />인스타</a>}<a href={mapLinks(store).kakao} target="_blank" rel="noreferrer"><Icon n="chat" />카카오맵</a><a href={mapLinks(store).naver} target="_blank" rel="noreferrer"><Icon n="search" />네이버지도</a></div>}
          </div>
        )}
        {s === 'change' && (
          <div className="card pad todo">
            <div className="b">사장님이 수정 제안을 보냈어요</div>
            <div className="small" style={{ margin: '4px 0 8px' }}>{lastChange?.msg}</div>
            {order.proposedPrice != null && <div className="kv"><span>제안 금액</span><b className="pink">{won(order.proposedPrice)}</b></div>}
            <div className="btns" style={{ marginTop: 10 }}><button className="btn line sm" onClick={() => setRevise(true)}>다르게 요청</button><button className="btn pri sm" style={{ flex: 2 }} onClick={() => { act(order.id, 'c', 'accept'); toast('제안을 수락했어요. 주문이 확정됐어요!'); }}>이대로 확정하기</button></div>
          </div>
        )}
        {s === 'proof' && (
          <div className="card pad todo">
            <div className="b">제작 전 시안을 확인해 주세요</div>
            <div className="small muted" style={{ margin: '4px 0 10px' }}>아래 대화에서 시안을 보고, 괜찮으면 확정을, 고칠 곳이 있으면 수정 요청을 눌러 주세요.</div>
            <div className="btns"><button className="btn line sm" onClick={() => setFix(true)}>수정 요청</button><button className="btn pri sm" style={{ flex: 2 }} onClick={() => { act(order.id, 'c', 'proofok'); toast('시안을 확정했어요. 제작을 시작해요!'); }}>이대로 만들어 주세요</button></div>
          </div>
        )}
        {s === 'requested' && <div className="note" style={{ marginTop: 10 }}>사장님이 확인하고 있어요. 확정되면 알림으로 알려 드려요.</div>}
        {['confirmed', 'proof', 'making', 'ready'].includes(s) && order.finalPrice != null && !order.paid && canOrderInApp(store) && <PayCard order={order} store={store} onPaid={setPaidInfo} />}
        {['confirmed', 'making', 'ready'].includes(s) && dep > 0 && !order.paid && !canOrderInApp(store) && <div className="note pink" style={{ marginTop: 10 }}>예약금 {store.ops.deposit}% <b>{won(dep)}</b>{store.ops.account ? <> → <b>{store.ops.account}</b></> : ''} 입금하면 제작을 시작해요. 사장님이 확인하면 알려 드려요.</div>}
        {s === 'ready' && <div className="note ok" style={{ marginTop: 10 }}>케이크가 준비됐어요! {fmtDate(order.o.date)} {order.o.time}에 픽업해 주세요.</div>}
        <Thread order={order} role="c" />
        {s === 'done' && !order.review && (
          <div className="card pad" style={{ marginTop: 12 }}>
            <div className="b">후기를 남겨 주세요</div>
            <div className="row" style={{ margin: '8px 0' }}>{[1, 2, 3, 4, 5].map((k) => <button key={k} onClick={() => setStars(k)} aria-label={`${k}점`}><Icon n="star" style={{ width: 30, height: 30, fill: k <= stars ? 'var(--candle)' : 'none', stroke: 'var(--candle)' }} /></button>)}</div>
            <textarea className="inp" value={rv} onChange={(e) => setRv(e.target.value)} placeholder="미리보기랑 얼마나 비슷했나요?" maxLength={200} />
            <button className="btn pri block" style={{ marginTop: 8 }} onClick={() => { act(order.id, 'c', 'review', { stars, text: rv.trim() || '좋았어요!' }); toast('후기 고마워요!'); }}>후기 올리기</button>
          </div>
        )}
        {order.review && <div className="card pad" style={{ marginTop: 12 }}><Stars n={order.review.stars} /><div className="small" style={{ marginTop: 4 }}>{order.review.text}</div></div>}
        <div className="row wrap" style={{ marginTop: 14 }}>
          {canRevise && <button className="btn line sm" onClick={() => setRevise(true)}><Icon n="edit" size="sm" />주문 내용 고치기</button>}
          {order.gift && <button className="btn sec sm" onClick={async () => { const url = await giftLink(order); const r = await shareText({ title: '케이크 선물이 도착했어요', text: `${order.gift.to}님, ${order.gift.from || '친구'}님이 보낸 케이크 선물이 도착했어요!`, url }); if (r === 'copied') toast('선물 카드 링크를 복사했어요'); }}><Icon n="gift" size="sm" />선물 카드 보내기</button>}
          {store && <a className="btn line sm" href={mapLinks(store).route} target="_blank" rel="noreferrer"><Icon n="pin" size="sm" />길찾기</a>}
          <button className="btn ghost sm" onClick={() => nav(`/store/${order.storeId}`)}>가게 보기</button>
          {['done', 'canceled', 'declined', 'external'].includes(s) && <button className="btn sec sm" onClick={() => { const { date, time, ...d } = order.o; nav(`/order/${order.storeId}?from=${encodeURIComponent(JSON.stringify(d))}`); }}><Icon n="refresh" size="sm" />다시 주문</button>}
          {['requested', 'change'].includes(s) && <button className="btn danger sm" onClick={() => { if (confirm('주문 요청을 취소할까요?')) { act(order.id, 'c', 'cancel'); toast('주문을 취소했어요'); } }}>주문 취소</button>}
        </div>
        <div style={{ height: 12 }} />
      </div>
      {s !== 'external' && !['declined', 'canceled'].includes(s) && <Composer order={order} role="c" quick={s === 'done' ? [] : C_QUICK} />}
      <ReviseSheet open={revise} onClose={() => setRevise(false)} order={order} store={store} />
      <ProofFixSheet open={fix} onClose={() => setFix(false)} order={order} />
      {paidInfo && <PaidOverlay info={paidInfo} order={order} onClose={() => setPaidInfo(null)} />}
    </div>
  );
}

// ───────── 사장님 화면 ─────────
const TEMPLATES = ['주문 잘 받았어요! 미리보기 그대로 만들어 드릴게요 :)', '문구 위치는 가운데로 해 드릴게요.', '캐릭터는 저작권 때문에 비슷한 느낌으로 그려 드려요.', '그날은 주문이 많아 다른 시간은 어떠세요?', '요청하신 장식 때문에 금액이 조금 추가돼요.'];
export function OwnerOrderDetail({ params }) {
  const st = useApp();
  const o = st.orders.find((x) => x.id === params.id);
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState(null);
  const [msg, setMsg] = useState('');
  const [adjust, setAdjust] = useState(false);
  const sc = useRef(null);
  const n = o?.ev?.length || 0;
  useEffect(() => { if (o) { markSeen(o.id, 'o'); readLink('o', `/o/order/${o.id}`); } sc.current?.scrollTo({ top: 1e6, behavior: 'smooth' }); }, [n]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (o) setPrice(o.finalPrice ?? o.proposedPrice ?? o.est?.lo ?? 0); }, [o?.status, o?.est?.lo]); // eslint-disable-line react-hooks/exhaustive-deps
  const store = useMemo(() => (st.shop ? shopToStore(st.shop, 'partner') : null), [st.shop]);
  if (!o) return <div className="screen"><Header title="주문" fallback="/o/orders" /><Empty>주문을 찾을 수 없어요.</Empty></div>;
  const x = o.o;
  const checks = store ? ruleCheck(store, { ...x, date: null }, {}) : o.checks || [];
  const v = verdictOf(checks);
  const s = o.status;
  const lastRevise = [...o.ev].reverse().find((e) => e.t === 'revise');
  const lastFix = [...o.ev].reverse().find((e) => e.t === 'prooffix');
  const dep = st.shop?.ops?.deposit && o.finalPrice != null ? Math.round((o.finalPrice * st.shop.ops.deposit) / 100 / 100) * 100 : 0;
  const sendProof = async (file) => {
    try {
      let key = null;
      if (file) { const el = await loadImage(file); key = 'proof' + Date.now().toString(36); act(o.id, 'o', 'img', { key, d: toDataURL(el, 360, 0.62) }); }
      act(o.id, 'o', 'proof', { img: key, msg: msg.trim() || (file ? '이렇게 만들 예정이에요. 확인 부탁드려요!' : '앱 시안 그대로 만들 예정이에요. 확인 부탁드려요!') });
      setMsg(''); toast('시안을 보냈어요. 손님이 확정하면 알려 드려요');
    } catch { toast('사진을 읽지 못했어요'); }
  };
  const confirmText = () => [`[${st.shop?.name || o.storeName}] ${o.customer?.name || ''}님, 케이크 주문이 확정됐어요!`, `· 픽업: ${fmtDate(x.date)} ${x.time}`, `· 케이크: ${sizeOf(x.size).name} ${designOf(x.design).name} / “${x.noText ? '문구 없음' : x.text}”`, `· 확정 금액: ${won(o.finalPrice)}`, dep && !o.paid ? `· 예약금 ${st.shop.ops.deposit}%: ${won(dep)}${st.shop.ops.account ? ` → ${st.shop.ops.account}` : ''} (입금 후 제작 시작)` : null, o.paid ? '· 예약금 입금 확인 완료' : null, st.shop?.addr ? `· 주소: ${st.shop.addr}` : null].filter(Boolean).join('\n');
  return (
    <div className="screen">
      <Header title={`${maskName(o.customer?.name)}님 주문`} fallback="/o/orders" right={<span style={{ marginRight: 10 }}><StatusTag status={s} owner /></span>} />
      <div className="scroll pad room" ref={sc}>
        <Summary order={o} role="o" open={open} setOpen={setOpen} />
        {s === 'requested' && (
          <div className="card pad todo newreq">
            <div className="b">{lastRevise ? '손님이 주문을 고쳤어요 — 다시 확인해 주세요' : '새 주문 요청이에요'}</div>
            <div className="small muted" style={{ marginTop: 2 }}>손님이 보낸 요청서예요. 수락하면 금액이 확정되고 손님에게 결제 안내가 가요.</div>
            {lastRevise?.summary && <div className="note pink" style={{ marginTop: 6 }}>바뀐 점: <b>{lastRevise.summary}</b></div>}
            {!v.ok && <ul className="rules" style={{ marginTop: 8 }}>{checks.filter((c) => !c.ok).map((c, i) => <li key={i} className="w"><i>!</i><span>{c.t}</span></li>)}</ul>}
            <div className="btns" style={{ marginTop: 12 }}>
              <button className="btn ghost" onClick={() => { if (confirm('이 주문을 거절할까요?')) { act(o.id, 'o', 'decline', { msg: msg.trim() || undefined }); toast('주문을 거절했어요'); } }}>거절</button>
              <button className="btn ok" style={{ flex: 2.2 }} onClick={() => { act(o.id, 'o', 'approve', { price, msg: msg.trim() || undefined }); setMsg(''); toast(`수락했어요 · ${won(price)} 확정`); }}>수락하고 {won(price)} 확정</button>
            </div>
            <button className="morebtn" style={{ marginTop: 10 }} onClick={() => setAdjust(!adjust)}><span className="grow"><b>금액 바꾸기 · 수정 제안</b> <span className="xs muted">손님이 본 예상 {range(o.est?.lo, o.est?.hi, true)}</span></span><Icon n={adjust ? 'down' : 'right'} size="sm" /></button>
            {adjust && (
              <div className="fadeup">
                <div className="row" style={{ marginTop: 8 }}><span className="grow b">최종 금액</span><div className="pricerow" style={{ border: 0, padding: 0 }}><PriceInput value={price} onChange={(vv) => setPrice(vv ?? 0)} /></div></div>
                <div className="chips" style={{ marginTop: 6 }}>{[-1000, 1000, 3000, 5000].map((d) => <button key={d} className="chip sm" onClick={() => setPrice((p) => Math.max(0, (p || 0) + d))}>{d > 0 ? '+' : ''}{d.toLocaleString()}</button>)}</div>
                <input className="inp" style={{ marginTop: 8 }} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="손님에게 한마디 (선택)" maxLength={200} />
                <div className="chips" style={{ marginTop: 6 }}>{TEMPLATES.map((t) => <button key={t} className="chip sm" onClick={() => setMsg(t)}>{t.slice(0, 13)}…</button>)}</div>
                <button className="btn line block sm" style={{ marginTop: 10 }} onClick={() => { act(o.id, 'o', 'change', { price, msg: msg.trim() || '이렇게 바꾸면 가능해요. 확인 부탁드려요!' }); setMsg(''); toast('수정 제안을 보냈어요'); }}>이 금액으로 수정 제안 보내기</button>
              </div>
            )}
          </div>
        )}
        {s === 'change' && <div className="note warn" style={{ marginTop: 10 }}>손님에게 수정 제안({won(o.proposedPrice)})을 보냈어요. 손님이 수락하면 확정돼요.</div>}
        {s === 'confirmed' && (
          <div className="card pad todo">
            <div className="b">{o.needProof ? '손님이 시안 수정을 요청했어요' : '확정된 주문이에요'}</div>
            {o.needProof && lastFix && <div className="note pink" style={{ marginTop: 6 }}>{evText(lastFix, o)}</div>}
            <div className="row" style={{ marginTop: 8 }}><span className="grow small muted">확정 금액</span><b className="pink" style={{ fontSize: 18 }}>{won(o.finalPrice)}</b></div>
            {dep > 0 && <div className="row" style={{ marginTop: 6 }}><span className="grow small">예약금 {st.shop.ops.deposit}% · <b>{won(dep)}</b></span><button className={`btn xs ${o.paid ? 'line' : 'ok'}`} onClick={() => { act(o.id, 'o', 'paid', { paid: !o.paid }); toast(o.paid ? '입금 확인을 취소했어요' : '입금 확인! 손님에게 알렸어요'); }}>{o.paid ? '입금 완료' : '입금 확인'}</button></div>}
            <input className="inp" style={{ marginTop: 8 }} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="시안과 함께 보낼 말 (선택)" maxLength={200} />
            <div className="btns" style={{ marginTop: 8 }}>
              <PhotoPick className="btn line sm" onPick={sendProof}><Icon n="image" size="sm" />시안 사진 보내기</PhotoPick>
              <button className="btn line sm" onClick={() => sendProof(null)}><Icon n="cake" size="sm" />앱 시안으로 확인받기</button>
            </div>
            <button className="btn dark block" style={{ marginTop: 8 }} onClick={() => { act(o.id, 'o', 'advance', { to: 'making' }); toast('제작을 시작했어요'); }}>{o.needProof ? '시안 없이 제작 시작 →' : '제작 시작 →'}</button>
            <button className="btn xs ghost block" style={{ marginTop: 8 }} onClick={async () => { const r = await shareText({ title: '주문 확정 안내', text: confirmText() }); toast(r === 'copied' ? '안내 문구를 복사했어요. 손님 카톡에 붙여 넣으세요' : r === 'shared' ? '손님에게 보냈어요' : '공유를 취소했어요'); }}><Icon n="chat" size="sm" /> 카톡·문자로도 확정 안내 보내기</button>
          </div>
        )}
        {s === 'proof' && <div className="note warn" style={{ marginTop: 10 }}>손님이 시안을 확인하고 있어요. 확정하거나 수정 요청하면 알려 드려요.</div>}
        {['making', 'ready'].includes(s) && (
          <div className="card pad todo">
            <div className="row"><span className="grow b">{s === 'making' ? '제작 중이에요' : '픽업을 기다리고 있어요'}</span>{dep > 0 && <button className={`btn xs ${o.paid ? 'line' : 'ok'}`} onClick={() => act(o.id, 'o', 'paid', { paid: !o.paid })}>{o.paid ? '입금 완료' : '입금 확인'}</button>}</div>
            <button className="btn dark block" style={{ marginTop: 10 }} onClick={() => { act(o.id, 'o', 'advance', { to: nextStatus(s) }); toast(`${NEXT_LABEL[s]} 처리했어요`); }}>{NEXT_LABEL[s]} →</button>
          </div>
        )}
        {o.review && <div className="card pad" style={{ marginTop: 12 }}><div className="b small">손님 후기</div><Stars n={o.review.stars} /><div className="small">{o.review.text}</div></div>}
        {['done', 'ready', 'making'].includes(s) && st.shop && (st.shop.portfolio.some((p) => p.fromOrder === o.id)
          ? <div className="note ok" style={{ marginTop: 12 }}>이 케이크는 가게 작품에 들어가 있어요</div>
          : <button className="btn sec block sm" style={{ marginTop: 12 }} onClick={() => { const { date, time, request, allergy, ...d } = x; patchShop((sh) => ({ portfolio: [{ id: 'p' + Date.now(), fromOrder: o.id, design: d, caption: `${sizeOf(x.size).name} ${designOf(x.design).name}`, src: (o.proofImg && o.imgs?.[o.proofImg]) || undefined }, ...sh.portfolio].slice(0, 12) })); toast('가게 작품에 추가했어요'); }}><Icon n="image" size="sm" /> 이 케이크를 가게 작품에 추가</button>)}
        <Thread order={o} role="o" />
        {o.customer?.phone && !o.sample && <div className="row" style={{ marginTop: 12 }}><a className="btn xs line" href={`tel:${o.customer.phone}`}><Icon n="phone" size="sm" />전화</a><a className="btn xs line" href={`sms:${o.customer.phone}`}><Icon n="chat" size="sm" />문자</a></div>}
        <div style={{ height: 12 }} />
      </div>
      {!['declined', 'canceled'].includes(s) && <Composer order={o} role="o" quick={s === 'requested' ? [] : TEMPLATES.slice(0, 3)} />}
    </div>
  );
}
