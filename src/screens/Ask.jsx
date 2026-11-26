// iAKE AI에게 물어보기 + 사장님 문의 대화
// · 가게 화면의 'iAKE AI에게 물어보기' 카드 → AI 대화(/c/ai/:가게) : 가게 정보로 바로 답하고, 답 끝에 '(AI가 답변했어요)'
// · 가게 정보로 답할 수 없는 질문은 사장님 대화(/c/ask/:가게)로 자동 전달 → 사장님 답장은 그 대화에서 본다
// · 아직 입점 전인 가게는 사장님께 바로 보낼 수 없어서 카카오맵·인스타·전화로 이어 준다
// · 사장님은 /o/ask/:문의 에서 답장한다
import { useEffect, useRef, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { Header, Empty, toast } from '../components/ui.jsx';
import { useApp, setState, getState } from '../lib/state.js';
import { nav, back, queryOf } from '../lib/router.js';
import { getStores, nextOpenDay, mapLinks, canOrderInApp, hoursOf } from '../lib/stores.js';
import { estimate } from '../lib/price.js';
import { range, won, maskName } from '../lib/util.js';
import { askClaude } from '../lib/ai.js';
import { SIZES, styleName } from '../data/catalog.js';
import { kakaoLinks } from '../lib/kakao.js';
import { readLink } from '../lib/notify.js';
import { askOf, askById, canAskOwner, sendAsk, replyAsk, markAskSeen, askLink } from '../lib/asks.js';

const hm = (at) => new Date(at).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' });
const mid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const dayWord = (n) => (n === 0 ? '오늘' : n === 1 ? '내일' : `${n}일 뒤`);
const ieyo = (w) => { const c = w.charCodeAt(w.length - 1) - 0xac00; return w + (c >= 0 && c % 28 ? '이에요' : '예요'); }; // 받침 있으면 '이에요'

// iAKE AI 얼굴 (요리사 모자 쓴 강아지, 점선 동그라미)
export function AiAvatar({ size = 44 }) {
  return (
    <span className="aiava" style={{ width: size, height: size }} aria-hidden>
      <svg viewBox="0 0 48 48" fill="none" stroke="#5B4A42" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13.6 26.5c-3.6.8-4.6 7.6-1.8 10.4 1.6 1.2 3.6-.4 4-3.4M34.4 26.5c3.6.8 4.6 7.6 1.8 10.4-1.6 1.2-3.6-.4-4-3.4" fill="#F3E1CF" />
        <ellipse cx="24" cy="30.5" rx="10.6" ry="9.2" fill="#fff" />
        <path d="M16 20.5h16v-4.2a5 5 0 0 0-2.6-8.3 6 6 0 0 0-10.8 0A5 5 0 0 0 16 16.3z" fill="#fff" />
        <path d="M16 20.5h16" />
        <circle cx="20.2" cy="29.2" r="1.3" fill="#3A2F2A" stroke="none" />
        <circle cx="27.8" cy="29.2" r="1.3" fill="#3A2F2A" stroke="none" />
        <ellipse cx="24" cy="32.4" rx="1.8" ry="1.25" fill="#3A2F2A" stroke="none" />
        <path d="M21.8 34.6q2.2 1.8 4.4 0" />
        <circle cx="17.4" cy="32.4" r="1.6" fill="#F4B6C2" stroke="none" />
        <circle cx="30.6" cy="32.4" r="1.6" fill="#F4B6C2" stroke="none" />
      </svg>
    </span>
  );
}

// ── 가게 정보로 답하기: { a: 답, ok: 가게 정보로 답했나 } — ok 가 아니면 사장님께 넘긴다 ──
export function ruleAnswer(s, q) {
  const t = q.replace(/\s/g, '');
  const yes = (a) => ({ a, ok: true }), no = (a = '') => ({ a, ok: false });
  const has = (re) => [s.note, s.priceNote, s.lead, s.hours, ...(s.notices || [])].filter(Boolean).find((x) => re.test(x));
  const faq = (s.faq || []).find((f) => f.q.replace(/\s/g, '').split('').filter((c) => t.includes(c)).length >= Math.min(4, f.q.length - 1));
  if (faq) return yes(faq.a);
  const base = (size) => estimate(s, { size, design: 'simple', shape: 'round', cream: 'white', flavor: 'vanilla', text: 'a' });
  if (/예약금|입금|결제|계좌|선결제/.test(t)) {
    if (!s.ops?.deposit) return no();
    const e = base('h1');
    return yes(`주문이 확정되면 예약금 ${s.ops.deposit}%를 먼저 받아요. 1호 기본(${won(e.lo)}) 기준이면 ${won(Math.round((e.lo * s.ops.deposit) / 100 / 100) * 100)}이에요. 남은 금액은 픽업 때 내면 돼요.`);
  }
  if (/당일|급하/.test(t) || /오늘(주문|픽업|받|되|돼|가능)/.test(t)) {
    if (s.ops) {
      if (s.ops.sameDay) return yes(`네! 당일 주문은 오늘 ${s.ops.cutoff}까지 받아요 😊`);
      const n = nextOpenDay(s, getState().orders);
      return yes(`당일 주문은 어려워요 🥲 픽업 ${s.ops.leadDays}일 전까지 주문을 받아서, 가장 빠른 픽업은 ${n ? ieyo(dayWord(n.diff)) : '가게에 확인이 필요해요'}!`);
    }
    if (s.sameDay === true) return yes(`공개 정보로는 당일 케이크도 판매해요${s.lead ? ` (${s.lead})` : ''}. 디자인이 정해져 있을 수 있어요.`);
    if (s.sameDay === false) return yes(`당일 주문은 어려워요 🥲 ${s.lead || '보통 2~3일 전 예약이 필요해요'}.`);
    return no();
  }
  if (/휴무|쉬는|쉬어|쉬나|영업|몇시|시간|오픈|문열|마감|닫/.test(t)) {
    const h = hoursOf(s);
    if (!h.time && !h.off) return no();
    return yes(ieyo([h.time && `${s.ops ? '픽업' : '영업'} 시간은 ${h.time}`, h.off].filter(Boolean).join(' · ')) + '.');
  }
  if (/가격|얼마|비싸|원$|만원|비용/.test(t)) {
    const m = q.match(/([1-3])\s*호/);
    const zid = m ? `h${m[1]}` : /미니|도시락/.test(t) ? 'mini' : null;
    const tail = s.menu ? '' : ' (공개 정보·수원 평균으로 계산한 추정이에요)';
    if (zid) {
      const z = SIZES.find((x) => x.id === zid);
      if (s.menu && s.menu.sizes?.[zid] == null) return yes(`${z.name} 사이즈는 만들지 않아요.`);
      const e = base(zid);
      return yes(`${z.name}는 기본 레터링 기준 ${range(e.lo, e.hi, true)}이에요${tail}. 장식·맛을 고르면 주문서에서 바로 계산돼요.`);
    }
    const r = SIZES.filter((z) => !s.menu || s.menu.sizes?.[z.id] != null).map((z) => `${z.name} ${range(base(z.id).lo, base(z.id).hi, true)}`);
    return yes(`기본 레터링 기준 ${r.join(', ')}이에요${tail}. 장식·맛을 고르면 주문서에서 바로 계산돼요.`);
  }
  if (/주차/.test(t)) { const x = has(/주차/); return x ? yes(`가게 안내에 이렇게 있어요: ${x}`) : no(); }
  if (/캐릭터|그림|저작권|도안/.test(t)) return yes(s.styles?.includes('character') ? '네, 그림·캐릭터 케이크를 만들어요 🎨 저작권이 있는 캐릭터는 사장님이 가능 여부를 확인해요.' : '이 가게 목록에는 그림·캐릭터 케이크가 없어요. 주문서 요청사항에 적으면 사장님이 확인해 드려요.');
  if (/도시락|미니|작은/.test(t)) return s.menu ? yes(s.menu.sizes?.mini != null ? `미니(10~12cm, 1~2인용)는 ${won(s.menu.sizes.mini)}부터예요.` : '미니 사이즈는 만들지 않아요.') : s.price?.mini ? yes(`공개 정보로는 미니(10~12cm)가 ${range(s.price.mini[0], s.price.mini[1], true)}부터예요.`) : no();
  if (/떡|쌀|앙금/.test(t)) return s.styles?.includes('rice') ? yes('떡케이크(설기·앙금 장식)를 만들어요.') : no();
  if (/사진|포토/.test(t)) return s.styles?.includes('photo') ? yes('포토 케이크를 만들어요. 주문서에서 사진을 첨부하면 돼요.') : no();
  if (/보냉|포장|멀리/.test(t)) { const x = has(/보냉/); return yes(x ? `가게 안내에 이렇게 있어요: ${x}` : s.menu?.extras?.icebag != null ? `보냉백은 ${won(s.menu.extras.icebag)}이에요.` : '30분 넘게 이동하면 주문서에서 보냉백을 요청해 보세요.'); }
  if (/변경|취소|환불/.test(t)) { const x = has(/변경|취소|환불/); return x ? yes(`가게 안내에 이렇게 있어요: ${x}`) : no(); }
  if (/픽업|언제|빠른|며칠/.test(t)) { const n = nextOpenDay(s, getState().orders); return yes(n ? `가장 빠른 픽업은 ${ieyo(dayWord(n.diff))}!` : '가까운 날짜에는 픽업이 어려워요. 주문서에서 가능한 날짜를 골라 주세요.'); }
  return no();
}
async function answer(s, q, claudeKey) {
  if (claudeKey) {
    try {
      const h = hoursOf(s);
      const info = { 이름: s.name, 주소: s.addr, 스타일: (s.styles || []).map(styleName), 영업시간: h.time, 휴무: h.off, 당일: s.sameDay, 주문마감: s.lead, 가격표: s.menu?.sizes || s.price || '공개 가격 없음(수원 평균으로 추정)', 가격메모: s.priceNote, 메모: s.note, 안내사항: s.notices, 자주묻는질문: s.faq, 예약금: s.ops?.deposit };
      const a = await askClaude({ key: claudeKey, system: '너는 케이크 가게의 iAKE AI야. 주어진 가게 정보에 있는 내용만 근거로 손님 질문에 1~2문장, 친근한 존댓말로 답해. 공개 가격·평균 가격은 추정이라고 밝혀. 가게 정보로 답할 수 없는 질문이면 다른 말 없이 정확히 [사장님께] 라고만 답해.', content: [{ type: 'text', text: `가게 정보: ${JSON.stringify(info)}\n\n손님 질문: ${q}` }] });
      const txt = String(a || '').trim();
      if (txt && !txt.includes('[사장님께]')) return { a: txt, ok: true };
      if (txt.includes('[사장님께]')) return { a: '', ok: false };
    } catch { /* 규칙으로 답한다 */ }
  }
  return ruleAnswer(s, q);
}

// 입점 전 가게: 직접 물어볼 곳
function ContactBtns({ s }) {
  const L = mapLinks(s), kl = s.k ? kakaoLinks(s.k) : null, phone = s.k?.phone;
  return (
    <div className="ctbtns">
      <a href={kl ? kl.place : L.kakao} target="_blank" rel="noreferrer"><Icon n="map" size="sm" />카카오맵</a>
      {L.insta && <a href={L.insta} target="_blank" rel="noreferrer"><Icon n="insta" size="sm" />인스타</a>}
      {phone && <a href={`tel:${phone.replace(/[^\d]/g, '')}`}><Icon n="chat" size="sm" />전화</a>}
    </div>
  );
}

// ── 가게 화면 카드 ──
const CHIPS = ['당일 주문 돼요?', '1호 가격은?', '휴무일은?', '캐릭터 그림 돼요?', '주차 돼요?', '예약금은?'];
export function AskCard({ s }) {
  const [q, setQ] = useState('');
  const owner = canAskOwner(s);
  const go = (text) => nav(`/c/ai/${s.id}${text ? `?q=${encodeURIComponent(text)}` : ''}`);
  return (
    <div className="askcard">
      <div className="ah">
        <AiAvatar size={48} />
        <div className="grow"><b>iAKE AI에게 물어보기</b><small>{owner ? '가게 정보로 바로 답하고, 모르는 건 사장님께 연결해요' : '가게 정보로 바로 답하고, 모르는 건 연락처를 알려 드려요'}</small></div>
      </div>
      <div className="chips">{CHIPS.map((x) => <button key={x} className="chip" onClick={() => go(x)}>{x}</button>)}</div>
      <div className="row askin">
        <input className="inp grow" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing && q.trim()) go(q.trim()); }} placeholder="궁금한 걸 물어보세요" maxLength={120} />
        <button className="askgo" onClick={() => (q.trim() ? go(q.trim()) : go(''))}>질문</button>
      </div>
    </div>
  );
}

// ── iAKE AI 대화 ──
const SUGG = ['가장 빠른 픽업은 언제예요?', '1호 가격은 얼마예요?', '캐릭터 그림도 되나요?', '예약금은 얼마예요?'];
export function AskAI({ params, path }) {
  const st = useApp();
  const s = getStores(st).find((x) => x.id === params.id);
  const log = st.aiChats?.[params.id] || [];
  const [mode, setMode] = useState('ai'); // 'ai' | 'owner'(판매자 문의: 사장님께 바로)
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [first] = useState(() => log[0]?.at || new Date().toISOString());
  const body = useRef(null);
  const asked = useRef(false);
  const owner = canAskOwner(s);
  const add = (items) => setState((x) => ({ ...x, aiChats: { ...(x.aiChats || {}), [params.id]: [...(x.aiChats?.[params.id] || []), ...items].slice(-60) } }));
  const now = () => new Date().toISOString();
  const forward = (qq, direct) => {
    if (owner) {
      sendAsk(s, qq, !direct);
      add([{ id: mid(), by: 'ai', kind: 'fwd', at: now(), text: direct ? '사장님께 보냈어요! 답장이 오면 알림으로 알려 드릴게요 💌' : '사장님께 전달할게요! 사장님이 확인하시면 답장 주실 거예요 💌' }]);
    } else {
      add([{ id: mid(), by: 'ai', kind: 'contact', at: now(), text: '이 질문은 가게 정보에 없어요. 아직 iAKE 입점 전인 가게라 사장님께 바로 전달은 안 돼요. 아래에서 가게에 직접 물어봐 주세요.' }]);
    }
  };
  const ask = async (text, m = mode) => {
    const qq = (text ?? q).trim();
    if (!qq || busy || !s) return;
    setQ('');
    add([{ id: mid(), by: 'me', text: qq, at: now() }]);
    if (m === 'owner') { forward(qq, true); return; }
    setBusy(true);
    const r = await answer(s, qq, getState().settings.claudeKey);
    if (r.ok) add([{ id: mid(), by: 'ai', ai: true, text: r.a, at: now() }]);
    else forward(qq, false);
    setBusy(false);
  };
  // 가게 화면에서 질문을 들고 오면 바로 묻기 (한 번만)
  useEffect(() => {
    const q0 = queryOf(path).get('q');
    if (q0 && s && !asked.current) { asked.current = true; nav(`/c/ai/${s.id}`, { replace: true }); ask(q0, 'ai'); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const b = body.current; if (b) b.scrollTop = b.scrollHeight; }, [log.length, busy]);
  if (!s) return <div className="screen"><Header title="iAKE AI" fallback="/c" /><Empty icon="search">가게 정보를 찾을 수 없어요.</Empty></div>;
  const seller = () => {
    if (!owner) { add([{ id: mid(), by: 'ai', kind: 'contact', at: now(), text: '아직 iAKE 입점 전인 가게라 앱으로 사장님께 바로 보낼 수 없어요. 아래에서 가게에 직접 물어봐 주세요.' }]); return; }
    if (mode === 'owner') { setMode('ai'); return; }
    setMode('owner');
    toast('이제 적는 내용은 사장님께 바로 가요');
  };
  return (
    <div className="screen aichat">
      <Header title={s.name} fallback={`/store/${s.id}`} />
      <div className="aibody gingham-pink" ref={body}>
        <div className="aibanner">AI 답변은 가게 정보 기준이에요 · 정확한 건 사장님께</div>
        <div className="am ai">
          <AiAvatar />
          <div className="col">
            <div className="nm">iAKE AI</div>
            <div className="bub greet">
              <div className="gt">안녕하세요! {s.name}의 iAKE AI예요 🐾<br />추천 질문을 누르면 바로 답해 드려요. {owner ? '다른 질문은 사장님께 전달할게요!' : '모르는 건 가게 연락처를 알려 드릴게요!'}</div>
              <div className="sugg"><b>AI 추천 질문</b>{SUGG.map((x) => <button key={x} onClick={() => ask(x, 'ai')}>{x}</button>)}</div>
            </div>
            <div className="tm">{hm(first)}</div>
          </div>
        </div>
        {log.map((m, i) => (m.by === 'me' ? (
          <div key={m.id || i} className="am me"><div className="bub">{m.text}</div><div className="tm">{hm(m.at)}</div></div>
        ) : (
          <div key={m.id || i} className="am ai">
            <AiAvatar />
            <div className="col">
              <div className="bub">{m.text}{m.ai && <small className="aitag"> (AI가 답변했어요)</small>}</div>
              {m.kind === 'fwd' && <button className="fwdbtn" onClick={() => nav(`/c/ask/${s.id}`)}>사장님 채팅에서 보기 →</button>}
              {m.kind === 'contact' && <ContactBtns s={s} />}
              <div className="tm">{hm(m.at)}</div>
            </div>
          </div>
        )))}
        {busy && <div className="am ai"><AiAvatar /><div className="col"><div className="bub typing"><i /><i /><i /></div></div></div>}
      </div>
      <div className="aifoot">
        <div className="pills">
          <button className="pillbtn" onClick={() => (mode === 'owner' ? setMode('ai') : back(`/store/${s.id}`))}>이전으로</button>
          <button className={`pillbtn pink ${mode === 'owner' ? 'on' : ''}`} onClick={seller}>판매자 문의</button>
        </div>
        <div className="row sendrow">
          <input className="inp grow" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) ask(); }} placeholder={mode === 'owner' ? '사장님께 물어볼 내용을 적어주세요' : '궁금한 걸 물어보세요'} maxLength={200} />
          <button className={`sendbtn ${q.trim() ? 'on' : ''}`} onClick={() => ask()} aria-label="보내기"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" /></svg></button>
        </div>
      </div>
    </div>
  );
}

// ── 사장님 문의 대화 (손님: /c/ask/:가게 · 사장님: /o/ask/:문의) ──
const OWNER_QUICK = ['네, 가능해요!', '주문서 요청사항에 적어 주시면 맞춰 드릴게요', '죄송해요, 그건 어려워요'];
function AskRoom({ params, role }) {
  const st = useApp();
  const a = role === 'o' ? askById(params.id, st) : askOf(params.id, st);
  const storeId = role === 'o' ? a?.storeId : params.id;
  const s = getStores(st).find((x) => x.id === storeId);
  const [q, setQ] = useState('');
  const body = useRef(null);
  const n = a?.msgs.length || 0;
  useEffect(() => { if (a) { markAskSeen(a.id, role); readLink(role, askLink(a, role)); } const b = body.current; if (b) b.scrollTop = b.scrollHeight; }, [n]); // eslint-disable-line react-hooks/exhaustive-deps
  const canSend = role === 'o' ? !!a : canAskOwner(s);
  const send = (text) => {
    const t = (text ?? q).trim();
    if (!t) return;
    setQ('');
    if (role === 'o') replyAsk(a.id, 'o', t);
    else if (a) replyAsk(a.id, 'c', t);
    else sendAsk(s, t);
  };
  const title = role === 'o' ? `손님 문의 · ${a?.customer?.name ? maskName(a.customer.name) : '손님'}` :`${s?.name || a?.storeName || '가게'} 사장님`;
  return (
    <div className="screen aichat">
      <Header title={title} fallback={role === 'o' ? '/o' : '/c/orders'}
        right={role === 'c' && s && canOrderInApp(s) ? <button className="btn xs sec" onClick={() => nav(`/order/${s.id}`)}>주문서 쓰기</button> : null} />
      <div className={`aibody ${role === 'o' ? 'gingham-green' : 'gingham-pink'}`} ref={body}>
        <div className="aibanner">{role === 'o' ? '주문 전 손님 문의예요 · 답장하면 손님에게 바로 가요' : '주문 전 문의예요 · 사장님이 답장하면 알림으로 알려 드려요'}</div>
        {!a && <div className="small muted center" style={{ padding: '40px 10px' }}>{canSend ? '아직 보낸 문의가 없어요. 궁금한 걸 사장님께 물어보세요.' : '아직 iAKE 입점 전인 가게라 앱으로 바로 물어볼 수 없어요.'}{!canSend && s && <ContactBtns s={s} />}</div>}
        {a?.msgs.map((m) => {
          const mine = m.by === role;
          return (
            <div key={m.id} className={`am ${mine ? 'me' : 'ai'}`}>
              {!mine && <span className="oava">{role === 'o' ? '손' : (s?.name || a.storeName || '가')[0]}</span>}
              <div className="col">
                {m.fwd && <div className="fwdtag">iAKE AI가 전달한 질문</div>}
                <div className="bub">{m.text}</div>
                <div className="tm">{hm(m.at)}</div>
              </div>
            </div>
          );
        })}
      </div>
      {canSend && (
        <div className="aifoot">
          {role === 'o' && <div className="chips" style={{ marginBottom: 8 }}>{OWNER_QUICK.map((x) => <button key={x} className="chip sm" onClick={() => send(x)}>{x}</button>)}</div>}
          <div className="row sendrow">
            <input className="inp grow" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) send(); }} placeholder={role === 'o' ? '손님에게 답장' : '사장님께 물어볼 내용을 적어주세요'} maxLength={300} />
            <button className={`sendbtn ${q.trim() ? 'on' : ''}`} onClick={() => send()} aria-label="보내기"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" /></svg></button>
          </div>
        </div>
      )}
    </div>
  );
}
export const AskRoomC = (p) => <AskRoom {...p} role="c" />;
export const AskRoomO = (p) => <AskRoom {...p} role="o" />;
