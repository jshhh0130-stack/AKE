// 주문 대화방 — 손님과 사장님이 같은 화면 구조로 본다.
// 위: 주문 요약(시안·금액·진행 단계) / 가운데: 지금 해야 할 일 버튼 + 대화 / 아래: 메시지 입력
import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { CakeView, Header, Empty, StatusTag, Stars, toast, PhotoPick, PriceInput, Sheet, Seg } from '../components/ui.jsx';
import { useApp, patchShop } from '../lib/state.js';
import { nav, queryOf } from '../lib/router.js';
import { getStores, shopToStore, mapLinks, dayStatus, slotsOf, canOrderInApp, isPeak, depositOf } from '../lib/stores.js';
import { estimate, ruleCheck, verdictOf } from '../lib/price.js';
import { act, evText, markSeen, STATUS, nextStatus, NEXT_LABEL, diffSummary, changeList, isSystemish } from '../lib/orders.js';
import { readLink } from '../lib/notify.js';
import { liveStatus, onLiveStatus } from '../lib/live.js';
import { orderView, orderText, decoList, flavorName, pickupNotice } from '../lib/ordertext.js';
import { orderLink, giftLink } from '../lib/share.js';
import { loadImage, toDataURL } from '../lib/image.js';
import { won, man, range, fmtDate, relDay, ago, maskName, maskPhone, shareText, copyText, today, addDays, ymd, DOW, textLen } from '../lib/util.js';
import { SHAPES, SIZES, CREAMS, TEXT_COLORS, FONTS, sizeOf, designOf, creamOf, fontOf, textColorOf, optName } from '../data/catalog.js';
import OrderThumb from '../components/OrderThumb.jsx';
import { PaidCake } from '../components/HandDrawn.jsx';
import OrderPaper from '../components/OrderPaper.jsx';

const STEPS = ['요청', '확인', '확정', '제작', '픽업'];
// onPick 이 있으면 단계를 눌러 그 단계에서 있었던 일을 다시 볼 수 있다 (사장님)
function Steps({ status, onPick, sel }) {
  const step = STATUS[status]?.step ?? 0;
  const dead = ['declined', 'canceled'].includes(status);
  return (
    <div className={`steps ${onPick ? 'pickable' : ''}`}>
      {STEPS.map((s, i) => {
        const cls = `st ${dead ? '' : status === 'done' || i < step ? 'done' : i === step ? 'now' : ''} ${sel === i ? 'sel' : ''}`;
        const inner = <><i>{status === 'done' || i < step ? <Icon n="check" /> : i + 1}</i><span>{s}</span></>;
        return onPick ? <button key={s} className={cls} onClick={(e) => { e.stopPropagation(); onPick(sel === i ? null : i); }}>{inner}</button> : <div key={s} className={cls}>{inner}</div>;
      })}
    </div>
  );
}
// 단계별로 있었던 일 (사장님이 단계를 누르면)
const STEP_OF = (ev) => (['request', 'revise'].includes(ev.t) ? 0 : ['approve', 'auto', 'change', 'decline', 'accept', 'cancel'].includes(ev.t) ? 1 : ['paid', 'proof', 'proofok', 'prooffix'].includes(ev.t) ? 2 : ev.t === 'advance' ? (ev.to === 'making' ? 3 : 4) : ev.t === 'review' ? 4 : -1);
function StepDetail({ order, i, onClose }) {
  const evs = (order.ev || []).filter((e) => STEP_OF(e) === i);
  const proofImgs = i === 2 || i === 3 ? (order.ev || []).filter((e) => e.t === 'proof' && e.img && order.imgs?.[e.img]).map((e) => order.imgs[e.img]) : [];
  return (
    <div className="card pad stepdetail fadeup">
      <div className="row"><b className="grow">{i + 1}단계 · {STEPS[i]}</b><button className="btn xs ghost" onClick={onClose}>닫기</button></div>
      {i === 0 && <div style={{ marginTop: 10 }}><OrderPaper order={order} compact /></div>}
      {proofImgs.length > 0 && <div className="row" style={{ marginTop: 10, gap: 6 }}>{proofImgs.map((src, k) => <img key={k} src={src} alt="시안" style={{ width: 84, height: 84, borderRadius: 12, objectFit: 'cover' }} />)}</div>}
      {evs.length ? (
        <div className="stepevs">{evs.map((e) => <div key={e.id} className="sev"><span>{evText(e, order).split('\n')[0]}</span><small>{new Date(e.at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</small></div>)}</div>
      ) : <div className="small muted" style={{ marginTop: 8 }}>{i === 2 && order.finalPrice != null ? `확정 금액 ${won(order.finalPrice)} · ${order.paid ? '입금 완료' : '입금 전'}` : '아직 이 단계 기록이 없어요.'}</div>}
    </div>
  );
}

function useLive() { const [v, set] = useState(liveStatus()); useEffect(() => onLiveStatus(() => set(liveStatus())), []); return v; }

function Summary({ order, role, open, setOpen, stepSel, onStep }) {
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
      <Steps status={order.status} onPick={onStep} sel={stepSel} />
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
        <input id="talk-inp" className="inp grow" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && send()} placeholder={role === 'o' ? '손님에게 메시지' : '사장님에게 메시지'} maxLength={500} />
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
    const patch = p.text != null && p.text !== x.text ? { ...p, textOk: p.textOk ?? null } : p;
    act(order.id, 'c', 'revise', { patch, est, summary, changes: changeList(x, p), msg: msg.trim() });
    // 가게 규칙 안이고 가격표로 정확히 계산되면 다시 자동 확정
    if (store && canOrderInApp(store) && store.ops?.autoConfirm && est.exact && !msg.trim() && verdictOf(ruleCheck(store, cur, { orders: st.orders.filter((o) => o.id !== order.id) })).ok) act(order.id, 's', 'auto', { price: est.lo });
    onClose();
    toast('수정 요청을 보냈어요');
  };
  return (
    <Sheet open={open} onClose={onClose} title="주문 내용 고치기" footer={<button className="btn pri block" onClick={submit}>{summary ? `수정 요청 보내기 · 예상 ${range(est.lo, est.hi, true)}` : '수정 요청 보내기'}</button>}>
      <div style={{ height: 170, borderRadius: 14, overflow: 'hidden', background: 'var(--p50)' }}><CakeView o={{ ...orderView(order), ...p, text: cur.noText ? '' : cur.text }} /></div>
      {summary && <div className="note pink" style={{ marginTop: 8 }}>바뀌는 점: <b>{summary}</b></div>}
      <div className="lbl">문구</div>
      <div className="inp-w"><input className="inp" style={{ paddingRight: 64 }} maxLength={40} value={cur.text || ''} onChange={(e) => setP({ ...p, text: e.target.value, noText: false })} /><span className={`cnt ${textLen(cur.text) > lim ? 'over' : ''}`}>{textLen(cur.text)}/{lim}</span></div>
{cur.text && <div className="spell">한 글자씩 확인: <b>{[...cur.text].map((c) => (c === ' ' ? '␣' : c)).join(' ')}</b>
        {p.text != null && p.text !== x.text && <button className={`spellok ${p.textOk ? 'on' : ''}`} onClick={() => setP({ ...p, textOk: p.textOk ? null : new Date().toISOString() })}>{p.textOk ? <><Icon n="check" size="sm" />새 문구 확인 완료</> : '한 글자씩 맞는지 확인했어요'}</button>}</div>}
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

// ── 결제 화면 (iAKE v2 · 체험용 가상 결제) ──
// 주문·대화 목록의 'N원 결제하기 →' 또는 대화방 안내 카드에서 들어온다.
// 예약금/전액 · 결제 수단 4가지 · '취소 어려움' 확인 체크 → 결제. 실제 돈은 나가지 않는다.
const PAY_METHODS = [['kakao', '카카오페이', 'pay'], ['toss', '토스페이', 'toss'], ['naver', '네이버페이', 'N'], ['card', '신용·체크카드', '▭']];
export const needsPay = (order, store) => ['confirmed', 'proof', 'making', 'ready'].includes(order.status) && order.finalPrice != null && !order.paid && canOrderInApp(store);
export function PayScreen({ params }) {
  const st = useApp();
  const order = st.orders.find((x) => x.id === params.id);
  const store = order ? getStores(st).find((s) => s.id === order.storeId) : null;
  const dep = order ? depositOf(store, order.o?.date) : 0;
  const [how, setHow] = useState(dep && dep < 100 ? 'dep' : 'all');
  const [m, setM] = useState('kakao');
  const [agree, setAgree] = useState(false);
  const [done, setDone] = useState(null);
  if (!order) return <div className="screen"><Header title="결제하기" fallback="/c/orders" /><Empty>주문을 찾을 수 없어요.</Empty></div>;
  const total = order.finalPrice ?? order.est?.lo ?? 0;
  const depAmt = dep ? Math.round((total * dep) / 100 / 100) * 100 : 0;
  const amt = how === 'dep' && dep ? depAmt : total;
  const lines = (order.est?.lines || []).filter((l) => l.lo);
  const sum = lines.reduce((a, l) => a + l.lo, 0);
  const rows = lines.length ? lines.map((l) => [l.label, l.lo]) : [[`케이크 (${sizeOf(order.o.size).name})`, total]];
  if (sum && sum !== total) rows.push(['사장님 조정', total - sum]);
  const x = order.o;
  if (done) {
    return (
      <div className="screen">
        <div className="scroll gingham donebody">
          <div className="paidart2"><PaidCake /></div>
          <h2 className="donet" style={{ marginTop: 22 }}>결제가 완료됐어요!<br />{order.storeName}에서 지금 만들기 시작해요</h2>
          <p className="dones" style={{ marginTop: 8, fontSize: 13.5 }}>시안이 오면 알림으로 알려드릴게요</p>
          <div className="sumcard" style={{ marginTop: 26 }}>
            <div className="kv"><span>결제 금액</span><b>{won(done.amt)}</b></div>
            <div className="kv"><span>결제 수단</span><b>{done.method}</b></div>
            <div className="kv"><span>{done.rest > 0 ? '픽업 때 잔금' : '남은 금액'}</span><b>{done.rest > 0 ? won(done.rest) : '없음'}</b></div>
            <div className="kv"><span>픽업</span><b>{fmtDate(x.date)} {x.time}</b></div>
          </div>
          <div style={{ flex: 1, minHeight: 20 }} />
          <div className="btns donebtns">
            <button className="btn line" onClick={() => nav('/c/orders', { replace: true })}>주문 내역</button>
            <button className="btn pri" onClick={() => nav(`/c/order/${order.id}`, { replace: true })}>사장님과 대화</button>
          </div>
          <div className="xs muted center" style={{ marginTop: 8 }}>체험용 가상 결제예요. 실제로 돈이 나가지 않았어요.</div>
        </div>
      </div>
    );
  }
  const pay = () => {
    if (!agree) { toast('확인 항목에 체크해 주세요'); return; }
    const method = PAY_METHODS.find((y) => y[0] === m)[1];
    act(order.id, 'c', 'paid', { paid: true, amount: amt, method, rest: total - amt, mock: true });
    setDone({ amt, method, rest: total - amt });
  };
  return (
    <div className="screen payscr">
      <Header title="결제하기" fallback="/c/orders" />
      <div className="scroll pad" style={{ background: '#FAF8F5' }}>
        <div className="paysum">
          <div className="th"><OrderThumb order={order} /></div>
          <div className="grow" style={{ minWidth: 0 }}>
            <b>{order.storeName}</b>
            <div className="s">{sizeOf(x.size).name} · {flavorName(x)}{x.noText ? '' : ` · “${x.text}”`}</div>
            <div className="w">{fmtDate(x.date)} {x.time} 픽업</div>
          </div>
        </div>
        <div className="paynote"><span className="ck">✓</span><span><b>사장님이 금액을 확정했어요.</b><br />결제하면 바로 제작이 시작돼요.</span></div>
        <div className="paybox">
          {rows.map(([l, v], i) => <div key={i} className="kv"><span>{l}</span><span>{v < 0 ? '-' : ''}{won(Math.abs(v))}</span></div>)}
          <div className="kv"><span>픽업</span><span>무료</span></div>
          <div className="kv tot"><span>최종 금액</span><b>{won(total)}</b></div>
        </div>
        <div className="flbl">얼마나 결제할까요?</div>
        <div className="g2">
          {dep > 0 && dep < 100 && <button className={`payopt ${how === 'dep' ? 'on' : ''}`} onClick={() => setHow('dep')}><small>예약금 {dep}%</small><b>{won(depAmt)}</b><span>잔금 {won(total - depAmt)}은 픽업 때</span></button>}
          <button className={`payopt ${how === 'all' || !dep || dep >= 100 ? 'on' : ''}`} onClick={() => setHow('all')}><small>{dep >= 100 ? '성수기 · 전액 결제' : '전액 결제'}</small><b>{won(total)}</b><span>픽업 때 바로 받아가요</span></button>
        </div>
        <div className="flbl">결제 수단</div>
        <div className="g2">{PAY_METHODS.map(([id, nm, ic]) => <button key={id} className={`payopt row ${m === id ? 'on' : ''}`} onClick={() => setM(id)}><i className={`pm ${id}`}>{ic}</i><b>{nm}</b></button>)}</div>
        <button className={`agree ${agree ? 'on' : ''}`} onClick={() => setAgree(!agree)}><i>{agree ? '✓' : ''}</i>제작 시작 후에는 취소가 어려운 점을 확인했어요</button>
        <div className="xs muted" style={{ margin: '8px 4px 0' }}>체험용 가상 결제예요. 실제로 돈이 나가지 않아요.{store?.ops?.account ? ` 실제 입금 계좌: ${store.ops.account}` : ''}</div>
      </div>
      <div className="paybar"><button className={`btn block ${agree ? 'paygo' : 'payoff'}`} onClick={pay}>{agree ? `${won(amt)} 결제하기` : '확인 항목에 체크해 주세요'}</button></div>
    </div>
  );
}
// 대화방 안에서: 결제 안내 한 장 → 결제 화면으로
function PayPrompt({ order }) {
  return (
    <button className="payprompt" onClick={() => nav(`/c/pay/${order.id}`)}>
      <span className="ck">✓</span>
      <span className="grow"><b>사장님이 금액을 확정했어요</b><small>결제하면 바로 제작이 시작돼요</small></span>
      <span className="go">{won(order.finalPrice)} 결제하기 →</span>
    </button>
  );
}
// ───────── 손님 화면 ─────────
const C_QUICK = ['당일 픽업 되나요?', '사진 보낼게요', '문구 바꿀 수 있어요?'];
export function CustomerOrder({ params, path }) {
  const st = useApp();
  const order = st.orders.find((x) => x.id === params.id);
  const [open, setOpen] = useState(false);
  const [revise, setRevise] = useState(false);
  const [fix, setFix] = useState(false);
  const [stars, setStars] = useState(5);
  const [rv, setRv] = useState('');
  const sc = useRef(null);
  const n = order?.ev?.length || 0;
  useEffect(() => { if (order) { markSeen(order.id, 'c'); readLink('c', `/c/order/${order.id}`); } sc.current?.scrollTo({ top: 1e6, behavior: 'smooth' }); }, [n]); // eslint-disable-line react-hooks/exhaustive-deps
  // 톡방으로 바로 (주문·대화 목록의 '사장님과 톡방' · 확정 카드)
  const goTalk = () => { sc.current?.scrollTo({ top: 1e6, behavior: 'smooth' }); setTimeout(() => document.getElementById('talk-inp')?.focus(), 350); };
  useEffect(() => { if (queryOf(path || '').get('chat')) { const t = setTimeout(goTalk, 450); return () => clearTimeout(t); } return undefined; }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!order) return <div className="screen"><Header title="주문" fallback="/c/orders" /><Empty>주문을 찾을 수 없어요.</Empty></div>;
  const store = getStores(st).find((s) => s.id === order.storeId);
  const s = order.status;
  const lastChange = [...order.ev].reverse().find((e) => e.t === 'change');
  const depPct = depositOf(store, order.o.date);
  const dep = depPct && order.finalPrice != null ? Math.round((order.finalPrice * depPct) / 100 / 100) * 100 : 0;
  const peak = isPeak(store, order.o.date);
  const canRevise = ['requested', 'change', 'confirmed', 'proof'].includes(s) && !peak;
  return (
    <div className="screen">
      <Header title={order.storeName} fallback="/c/orders" right={<span style={{ marginRight: 10 }}><StatusTag status={s} paid={order.paid} /></span>} />
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
            {lastChange?.changes?.length > 0 && <div className="note pink" style={{ marginBottom: 8 }}>바뀌는 점: <b>{lastChange.changes.map((c) => `${c.k} ${c.from} → ${c.to}`).join(', ')}</b></div>}
            {order.proposedPrice != null && <div className="kv"><span>사장님이 정한 최종 금액</span><b className="pink">{won(order.proposedPrice)}</b></div>}
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
        {needsPay(order, store) && <PayPrompt order={order} />}
        {['confirmed', 'proof', 'making', 'ready'].includes(s) && (
          <button className="talkgo" onClick={goTalk}>
            <span className="ic"><Icon n="chat" /></span>
            <span className="grow"><b>주문이 확정됐어요! 사장님과 톡방</b><small>시안 · 픽업 이야기는 여기서 바로 해요</small></span>
            <span className="go">톡방으로 →</span>
          </button>
        )}
        {peak && ['requested', 'change', 'confirmed', 'proof'].includes(s) && <div className="note pink" style={{ marginTop: 10 }}>성수기 날짜 주문이라 <b>주문 변경이 어려워요</b>. 꼭 필요하면 사장님께 메시지로 물어봐 주세요.</div>}
        {['confirmed', 'making', 'ready'].includes(s) && dep > 0 && !order.paid && !canOrderInApp(store) && <div className="note pink" style={{ marginTop: 10 }}>예약금 {depPct}% <b>{won(dep)}</b>{store.ops.account ? <> → <b>{store.ops.account}</b></> : ''} 입금하면 제작을 시작해요. 사장님이 확인하면 알려 드려요.</div>}
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
    </div>
  );
}

// ───────── 사장님 화면 ─────────
// 가격 산정 도우미: 이 가게의 비슷한 지난 주문(같은 사이즈·같은 디자인) 3건 + 누르면 더하고 빼는 추가금 칩
const addsOf = (o) => [...decoList(o), o.plateText ? '판 문구' : null].filter(Boolean);
function PriceHelper({ order, orders, shop, price, setPrice }) {
  const x = order.o;
  const [on, setOn] = useState([]);
  const past = orders.filter((p) => p.id !== order.id && p.storeId === order.storeId && p.finalPrice != null && p.o && !['declined', 'canceled'].includes(p.status));
  const sameKind = (p) => (x.pickId && p.o.pickId === x.pickId) || p.o.design === x.design;
  let sim = past.filter((p) => p.o.size === x.size && sameKind(p));
  let label = '같은 사이즈 · 같은 디자인';
  if (sim.length < 3) { const more = past.filter((p) => p.o.size === x.size && !sim.includes(p)); if (more.length) { sim = [...sim, ...more]; label = '같은 사이즈'; } }
  sim = sim.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 3);
  const m = shop?.menu || {};
  const ADD = [['디자인비', m.designs?.[x.design] || 5000], ['판 문구', m.extras?.plate ?? 1000], ['생과일', m.toppings?.strawberry ?? 5000], ['생화', m.toppings?.freshflower ?? 10000], ['토퍼', m.extras?.topper ?? 4000], ['긴 문구', m.longText ?? 2000], ['그림 난이도', 5000], ['보냉백', m.extras?.icebag ?? 3000]].filter(([, v]) => v > 0);
  const toggle = (k, v) => { if (on.includes(k)) { setOn(on.filter((i) => i !== k)); setPrice(Math.max(0, (price || 0) - v)); } else { setOn([...on, k]); setPrice((price || 0) + v); } };
  return (
    <div className="phelp">
      <div className="ph-t"><Icon n="wand" size="sm" />가격 산정 도우미</div>
      {sim.length ? (
        <div className="ph-sim">
          <small>{label} 지난 주문 · 누르면 그 금액으로</small>
          {sim.map((p) => (
            <button key={p.id} className="ph-row" onClick={() => setPrice(p.finalPrice)}>
              <span className="grow"><b>{fmtDate(p.o.date)} · {sizeOf(p.o.size).name} {p.o.pickName || designOf(p.o.design).name}</b><em>{addsOf(p.o).join(' · ') || '추가 없음'}</em></span>
              <strong>{won(p.finalPrice)}</strong>
            </button>
          ))}
        </div>
      ) : <div className="xs muted">아직 비슷한 지난 주문이 없어요. 주문이 쌓이면 여기에 보여요.</div>}
      <small className="ph-l">추가금 (눌러서 더하기 · 빼기)</small>
      <div className="chips wrap">{ADD.map(([k, v]) => <button key={k} className={`chip sm ${on.includes(k) ? 'on' : ''}`} onClick={() => toggle(k, v)}>{on.includes(k) ? '−' : '+'} {k} {won(v)}</button>)}</div>
    </div>
  );
}
// 사장님 '수정': 금액·문구·판 문구·픽업·크기를 고쳐서 손님에게 제안 → 손님이 받으면 그대로 확정
function OwnerChangeSheet({ open, onClose, order, shop, price0 }) {
  const x = order.o;
  const [p, setP] = useState({});
  const [price, setPrice] = useState(price0);
  const [msg, setMsg] = useState('');
  useEffect(() => { if (open) { setP({}); setPrice(price0); setMsg(''); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const cur = { ...x, ...p };
  const changes = changeList(x, p);
  const sizes = SIZES.filter((z) => shop?.menu?.sizes?.[z.id] != null);
  const send = () => {
    act(order.id, 'o', 'change', { price, patch: p, changes, msg: msg.trim() || '이렇게 바꾸면 만들 수 있어요. 괜찮으시면 확정해 주세요!' });
    onClose();
    toast('손님에게 수정 제안을 보냈어요. 손님이 받으면 바로 확정돼요');
  };
  return (
    <Sheet open={open} onClose={onClose} title="주문 수정해서 보내기" footer={<button className="btn ok block" onClick={send}>손님에게 수정 제안 보내기 · {won(price || 0)}</button>}>
      <div className="small muted">바꿀 곳만 고치면 손님에게 ‘바뀌는 점’이 그대로 가요. 손님이 받으면 주문이 확정돼요.</div>
      <div className="lbl">최종 금액</div>
      <div className="pricerow" style={{ border: 0, padding: 0 }}><PriceInput value={price} onChange={(v) => setPrice(v ?? 0)} /></div>
      <div className="lbl">문구</div>
      <input className="inp" value={cur.noText ? '' : cur.text || ''} onChange={(e) => setP({ ...p, text: e.target.value, noText: !e.target.value })} placeholder="문구 없음" maxLength={40} />
      <div className="lbl">판 문구</div>
      <input className="inp" value={cur.plateText || ''} onChange={(e) => setP({ ...p, plateText: e.target.value })} placeholder="없음" maxLength={24} />
      <div className="lbl">픽업 날짜 · 시간</div>
      <div className="row"><input type="date" className="inp grow" value={cur.date || ''} onChange={(e) => setP({ ...p, date: e.target.value })} /><input type="time" className="inp" style={{ width: 130 }} value={cur.time || ''} onChange={(e) => setP({ ...p, time: e.target.value })} /></div>
      {sizes.length > 0 && <><div className="lbl">크기</div><div className="chips wrap">{sizes.map((z) => <button key={z.id} className={`chip sm ${cur.size === z.id ? 'on' : ''}`} onClick={() => setP({ ...p, size: z.id })}>{z.name}</button>)}</div></>}
      <div className="lbl">손님께 한마디</div>
      <textarea className="inp" value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={200} placeholder="예) 캐릭터는 저작권 때문에 비슷한 느낌으로 그려 드려요" />
      {changes.length > 0 && <div className="note pink" style={{ marginTop: 8 }}>바뀌는 점: <b>{changes.map((c) => `${c.k} ${c.from} → ${c.to}`).join(', ')}</b></div>}
    </Sheet>
  );
}
// 주문서 크게 보기: 모든 칸 + 문구 한 글자씩 + 금액 내역 · 글씨 크게/작게
function PaperZoom({ order, onClose }) {
  const [z, setZ] = useState(1.2);
  return (
    <div className="pzoom fadeup" role="dialog" aria-label="주문서 크게 보기">
      <div className="pzbar">
        <b className="grow">주문서 크게 보기</b>
        <button onClick={() => setZ(Math.max(1, +(z - 0.15).toFixed(2)))} aria-label="작게">가−</button>
        <button onClick={() => setZ(Math.min(1.8, +(z + 0.15).toFixed(2)))} aria-label="크게">가+</button>
        <button className="x" onClick={onClose} aria-label="닫기"><Icon n="close" /></button>
      </div>
      <div className="pzbody"><div style={{ zoom: z }}><OrderPaper order={order} zoom /></div></div>
    </div>
  );
}
const TEMPLATES = ['주문 잘 받았어요! 미리보기 그대로 만들어 드릴게요 :)', '문구 위치는 가운데로 해 드릴게요.', '캐릭터는 저작권 때문에 비슷한 느낌으로 그려 드려요.', '그날은 주문이 많아 다른 시간은 어떠세요?', '요청하신 장식 때문에 금액이 조금 추가돼요.'];
// 새 요청일 때 빠른 답장 (수정은 버튼 대신 채팅으로)
const REQ_QUICK = ['주문서 확인했어요! 곧 확정해 드릴게요', '문구 위치는 가운데로 해 드릴게요', '그날은 어려워서 다른 시간은 어떠세요?'];
export function OwnerOrderDetail({ params, path }) {
  const st = useApp();
  const o = st.orders.find((x) => x.id === params.id);
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState(null);
  const [msg, setMsg] = useState('');
  const [stepSel, setStepSel] = useState(null); // 눌러서 다시 보는 단계 (0~4)
  const [zoom, setZoom] = useState(false); // 주문서 크게 보기
  const [chg, setChg] = useState(false); // 수정해서 보내기
  useEffect(() => { if (queryOf(path || '').get('edit')) setChg(true); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const sc = useRef(null);
  const n = o?.ev?.length || 0;
  // 새 요청이면 종이 주문서가 먼저 보이게 맨 위, 그 뒤로는 대화 맨 아래로
  useEffect(() => { if (o) { markSeen(o.id, 'o'); readLink('o', `/o/order/${o.id}`); } sc.current?.scrollTo({ top: o?.status === 'requested' && n <= 2 ? 0 : 1e6, behavior: 'smooth' }); }, [n]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (o) setPrice(o.finalPrice ?? o.proposedPrice ?? o.est?.lo ?? 0); }, [o?.status, o?.est?.lo]); // eslint-disable-line react-hooks/exhaustive-deps
  const store = useMemo(() => (st.shop ? shopToStore(st.shop, 'partner') : null), [st.shop]);
  if (!o) return <div className="screen"><Header title="주문" fallback="/o/orders" /><Empty>주문을 찾을 수 없어요.</Empty></div>;
  const x = o.o;
  const checks = store ? ruleCheck(store, { ...x, date: null }, {}) : o.checks || [];
  const v = verdictOf(checks);
  const s = o.status;
  const lastRevise = [...o.ev].reverse().find((e) => e.t === 'revise');
  const lastFix = [...o.ev].reverse().find((e) => e.t === 'prooffix');
  const depPct = st.shop ? depositOf(store, x.date) : 0;
  const dep = depPct && o.finalPrice != null ? Math.round((o.finalPrice * depPct) / 100 / 100) * 100 : 0;
  const sendProof = async (file) => {
    try {
      let key = null;
      if (file) { const el = await loadImage(file); key = 'proof' + Date.now().toString(36); act(o.id, 'o', 'img', { key, d: toDataURL(el, 360, 0.62) }); }
      act(o.id, 'o', 'proof', { img: key, msg: msg.trim() || (file ? '이렇게 만들 예정이에요. 확인 부탁드려요!' : '앱 시안 그대로 만들 예정이에요. 확인 부탁드려요!') });
      setMsg(''); toast('시안을 보냈어요. 손님이 확정하면 알려 드려요');
    } catch { toast('사진을 읽지 못했어요'); }
  };
  const confirmText = () => [`[${st.shop?.name || o.storeName}] ${o.customer?.name || ''}님, 케이크 주문이 확정됐어요!`, `· 픽업: ${fmtDate(x.date)} ${x.time}`, `· 케이크: ${sizeOf(x.size).name} ${designOf(x.design).name} / “${x.noText ? '문구 없음' : x.text}”`, `· 확정 금액: ${won(o.finalPrice)}`, dep && !o.paid ? `· 예약금 ${depPct}%: ${won(dep)}${st.shop.ops.account ? ` → ${st.shop.ops.account}` : ''} (입금 후 제작 시작)` : null, o.paid ? '· 예약금 입금 확인 완료' : null, st.shop?.addr ? `· 주소: ${st.shop.addr}` : null].filter(Boolean).join('\n');
  return (
    <div className="screen">
      <Header title={`${maskName(o.customer?.name)}님 주문`} fallback="/o/orders" right={<span style={{ marginRight: 10 }}><StatusTag status={s} owner /></span>} />
      <div className="scroll pad room" ref={sc}>
        {/* 위: 5단계(눌러서 지난 단계 보기) · 가운데: 종이 주문서를 크게 (크게 보기 버튼) */}
        <div className="card ownsteps"><Steps status={s} onPick={setStepSel} sel={stepSel} /></div>
        {stepSel != null && <StepDetail order={o} i={stepSel} onClose={() => setStepSel(null)} />}
        <div className="paperwrap">
          <OrderPaper order={o} />
          <button className="zoombtn" onClick={() => setZoom(true)}><Icon n="search" size="sm" />주문서 크게 보기</button>
        </div>
        {s === 'requested' && (
          <div className="card pad todo newreq">
            {lastRevise?.summary && <div className="note pink" style={{ marginBottom: 8 }}>손님이 주문을 고쳤어요 · <b>{lastRevise.summary}</b></div>}
            {!v.ok && <ul className="rules" style={{ marginBottom: 8 }}>{checks.filter((c) => !c.ok).map((c, i) => <li key={i} className="w"><i>!</i><span>{c.t}</span></li>)}</ul>}
            {isPeak(store, x.date) && <div className="note pink" style={{ marginBottom: 8 }}>성수기 날짜 주문이에요 · 예약금 100% · 손님은 주문을 바꿀 수 없어요</div>}
            <div className="row"><span className="grow"><b>최종 금액</b><div className="xs muted">손님에게는 예상가 {range(o.est?.lo, o.est?.hi, true)}로 보였어요</div></span><div className="pricerow" style={{ border: 0, padding: 0 }}><PriceInput value={price} onChange={(vv) => setPrice(vv ?? 0)} /></div></div>
            <PriceHelper order={o} orders={st.orders} shop={st.shop} price={price} setPrice={setPrice} />
            <div className="btns" style={{ marginTop: 10 }}>
              <button className="btn ghost" onClick={() => { if (confirm('이 주문을 거절할까요?')) { act(o.id, 'o', 'decline'); toast('주문을 거절했어요'); } }}>거절</button>
              <button className="btn line" onClick={() => setChg(true)}><Icon n="edit" size="sm" />수정</button>
              <button className="btn ok" style={{ flex: 2.2 }} onClick={() => { act(o.id, 'o', 'approve', { price }); toast(`주문을 받았어요 · 손님에게 '주문되었습니다'를 보냈어요`); }}>주문 받기 · {man(price || 0)}</button>
            </div>
            <div className="xs muted" style={{ marginTop: 8 }}>고칠 게 있으면 아래 채팅으로 손님께 바로 말해 주세요. 예) “문구는 가운데로 할게요”</div>
          </div>
        )}
        {s === 'change' && <div className="note warn" style={{ marginTop: 10 }}>손님에게 수정 제안({won(o.proposedPrice)})을 보냈어요. 손님이 수락하면 확정돼요.</div>}
        {s === 'confirmed' && (
          <div className="card pad todo">
            <div className="row"><span className="grow b">{o.needProof ? '손님이 시안 수정을 요청했어요' : '확정된 주문이에요'}</span>{dep > 0 && <button className={`deptog ${o.paid ? 'on' : ''}`} onClick={() => { act(o.id, 'o', 'paid', { paid: !o.paid }); toast(o.paid ? '입금 확인을 취소했어요' : '입금 확인! 손님에게 알렸어요'); }}>{o.paid ? '입금 확인 ✓' : '입금 대기'}</button>}</div>
            {o.needProof && lastFix && <div className="note pink" style={{ marginTop: 6 }}>{evText(lastFix, o)}</div>}
            <div className="row" style={{ marginTop: 8 }}><span className="grow small muted">확정 금액</span><b className="pink" style={{ fontSize: 18 }}>{won(o.finalPrice)}</b></div>
            {dep > 0 && <div className="small" style={{ marginTop: 6, fontWeight: 600 }}>예약금 {depPct}%{isPeak(store, x.date) ? ' (성수기)' : ''} · <b>{won(dep)}</b></div>}
            <input className="inp" style={{ marginTop: 8 }} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="시안과 함께 보낼 말 (선택)" maxLength={200} />
            <div className="btns" style={{ marginTop: 8 }}>
              <PhotoPick className="btn line sm" onPick={sendProof}><Icon n="image" size="sm" />시안 사진 보내기</PhotoPick>
              <button className="btn line sm" onClick={() => sendProof(null)}><Icon n="cake" size="sm" />앱 시안으로 확인받기</button>
            </div>
            <button className="btn go block" style={{ marginTop: 8 }} onClick={() => { act(o.id, 'o', 'advance', { to: 'making' }); toast('제작을 시작했어요'); }}>{o.needProof ? '시안 없이 제작 시작 →' : '제작 시작 →'}</button>
            <button className="btn xs ghost block" style={{ marginTop: 8 }} onClick={async () => { const r = await shareText({ title: '주문 확정 안내', text: confirmText() }); toast(r === 'copied' ? '안내 문구를 복사했어요. 손님 카톡에 붙여 넣으세요' : r === 'shared' ? '손님에게 보냈어요' : '공유를 취소했어요'); }}><Icon n="chat" size="sm" /> 카톡·문자로도 확정 안내 보내기</button>
          </div>
        )}
        {s === 'proof' && <div className="note warn" style={{ marginTop: 10 }}>손님이 시안을 확인하고 있어요. 확정하거나 수정 요청하면 알려 드려요.</div>}
        {['making', 'ready'].includes(s) && (
          <div className="card pad todo">
            <div className="row"><span className="grow b">{s === 'making' ? '제작 중이에요' : '픽업을 기다리고 있어요'}</span>{dep > 0 && <button className={`deptog ${o.paid ? 'on' : ''}`} onClick={() => act(o.id, 'o', 'paid', { paid: !o.paid })}>{o.paid ? '입금 확인 ✓' : '입금 대기'}</button>}</div>
            <button className="btn go block" style={{ marginTop: 10 }} onClick={() => { act(o.id, 'o', 'advance', { to: nextStatus(s) }); toast(`${NEXT_LABEL[s]} 처리했어요`); }}>{NEXT_LABEL[s]} →</button>
          </div>
        )}
        {o.review && <div className="card pad" style={{ marginTop: 12 }}><div className="b small">손님 후기</div><Stars n={o.review.stars} /><div className="small">{o.review.text}</div></div>}
        {['done', 'ready', 'making'].includes(s) && st.shop && (st.shop.portfolio.some((p) => p.fromOrder === o.id)
          ? <div className="note ok" style={{ marginTop: 12 }}>이 케이크는 가게 작품에 들어가 있어요</div>
          : <button className="btn sec block sm" style={{ marginTop: 12 }} onClick={() => { const { date, time, request, allergy, ...d } = x; patchShop((sh) => ({ portfolio: [{ id: 'p' + Date.now(), fromOrder: o.id, design: d, caption: `${sizeOf(x.size).name} ${designOf(x.design).name}`, src: (o.proofImg && o.imgs?.[o.proofImg]) || undefined }, ...sh.portfolio].slice(0, 12) })); toast('가게 작품에 추가했어요'); }}><Icon n="image" size="sm" /> 이 케이크를 가게 작품에 추가</button>)}
        {['confirmed', 'proof', 'making', 'ready'].includes(s) && <button className="btn line block sm" style={{ marginTop: 12 }} onClick={async () => { const ok = await copyText(pickupNotice(o, st.shop)); toast(ok ? '픽업 전 안내를 복사했어요. 손님 카톡에 붙여 넣어 주세요' : '복사하지 못했어요'); }}><Icon n="copy" size="sm" />픽업 전 안내 복사 (시간 · 위치 · 보관법 · 초)</button>}
        <Thread order={o} role="o" />
        {o.customer?.phone && !o.sample && <div className="row" style={{ marginTop: 12 }}><a className="btn xs line" href={`tel:${o.customer.phone}`}><Icon n="phone" size="sm" />전화</a><a className="btn xs line" href={`sms:${o.customer.phone}`}><Icon n="chat" size="sm" />문자</a></div>}
        <div style={{ height: 12 }} />
      </div>
      {!['declined', 'canceled'].includes(s) && <Composer order={o} role="o" quick={s === 'requested' ? REQ_QUICK : TEMPLATES.slice(0, 3)} />}
      {zoom && <PaperZoom order={o} onClose={() => setZoom(false)} />}
      <OwnerChangeSheet open={chg} onClose={() => setChg(false)} order={o} shop={st.shop} price0={price ?? o.est?.lo ?? 0} />
    </div>
  );
}
