import { useMemo, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import TabBar, { OWNER_TABS } from '../../components/TabBar.jsx';
import { CakeView, Header, Empty, StatusTag, Stars, toast, PhotoPick, PriceInput, Seg } from '../../components/ui.jsx';
import { useApp, setState, patchShop } from '../../lib/state.js';
import { nav } from '../../lib/router.js';
import { shopToStore } from '../../lib/stores.js';
import { ruleCheck, verdictOf } from '../../lib/price.js';
import { ownerApprove, ownerChange, ownerDecline, ownerProof, ownerAdvance, nextStatus, ACTIVE, SALES, OWNER_NAME } from '../../lib/orders.js';
import { loadImage, toDataURL } from '../../lib/image.js';
import { won, range, fmtDate, relDay, ymd, today, addDays, parseYmd, DOW, ago, maskName, maskPhone, man } from '../../lib/util.js';
import { SHAPES, FLAVORS, RICE_FLAVORS, TOPPINGS, EXTRAS, SIZES, DESIGNS, sizeOf, designOf, creamOf, fontOf, textColorOf, optName } from '../../data/catalog.js';
import { orderView } from '../customer/Mine.jsx';
import { readiness } from './Editors.jsx';

const NEXT_LABEL = { confirmed: '제작 시작', proof: '제작 시작', making: '픽업 준비 완료', ready: '픽업 완료' };
const amount = (o) => o.finalPrice ?? o.est?.lo ?? 0;

function useShopOrders() {
  const st = useApp();
  const list = st.shop ? st.orders.filter((o) => o.storeId === st.shop.id) : [];
  return { st, shop: st.shop, list };
}

function NoShop() {
  return <div className="screen"><Empty icon="🏪">아직 등록한 가게가 없어요.<div style={{ marginTop: 14 }}><button className="btn pri" onClick={() => nav('/o/setup', { replace: true })}>가게 등록하기</button></div></Empty></div>;
}

export function OCard({ o, quick = true }) {
  const n = nextStatus(o.status);
  return (
    <div className="ocard" role="button" onClick={() => nav(`/o/order/${o.id}`)}>
      <div className="th"><CakeView o={orderView(o)} /></div>
      <div className="grow">
        <div className="t1"><span className="grow">{maskName(o.customer?.name)} · {sizeOf(o.o.size).name}</span><StatusTag status={o.status} owner /></div>
        <div className="t2">{relDay(o.o.date)} {fmtDate(o.o.date, true)} {o.o.time} · {designOf(o.o.design).name}</div>
        <div className="t2">{o.o.noText ? '문구 없음' : `“${o.o.text}”`} · <b style={{ color: 'var(--ink)' }}>{o.finalPrice ? won(o.finalPrice) : range(o.est?.lo, o.est?.hi, true)}</b></div>
        {quick && o.status === 'requested' && (
          <div className="acts" onClick={(e) => e.stopPropagation()}>
            <button className="btn xs ok" onClick={() => { ownerApprove(o.id, o.est.lo); toast(`승인했어요 · ${won(o.est.lo)}`); }}>승인 {man(o.est.lo)}원</button>
            <button className="btn xs line" onClick={() => nav(`/o/order/${o.id}`)}>수정 요청</button>
          </div>
        )}
        {quick && n && o.status !== 'proof' && (
          <div className="acts" onClick={(e) => e.stopPropagation()}><button className="btn xs dark" onClick={() => { ownerAdvance(o.id); toast(`${NEXT_LABEL[o.status]} 처리했어요`); }}>{NEXT_LABEL[o.status]} →</button></div>
        )}
      </div>
    </div>
  );
}

export function OwnerHome() {
  const { st, shop, list } = useShopOrders();
  if (!shop) return <NoShop />;
  const t = ymd(today());
  const reqs = list.filter((o) => o.status === 'requested').sort((a, b) => a.o.date.localeCompare(b.o.date));
  const todays = list.filter((o) => o.o.date === t && ['confirmed', 'proof', 'making', 'ready', 'done'].includes(o.status)).sort((a, b) => a.o.time.localeCompare(b.o.time));
  const week = list.filter((o) => ACTIVE.includes(o.status) && o.o.date > t && o.o.date <= ymd(addDays(today(), 7))).sort((a, b) => (a.o.date + a.o.time).localeCompare(b.o.date + b.o.time));
  const ym = t.slice(0, 7);
  const monthSales = list.filter((o) => SALES.includes(o.status) && o.o.date.startsWith(ym)).reduce((a, o) => a + amount(o), 0);
  const rd = readiness(shop);
  const autoCount = list.filter((o) => o.history?.some((h) => h.type === 'auto')).length;
  return (
    <div className="screen fade">
      <div className="scroll with-tab">
        <div className="owner-top">
          <div className="sname"><Icon n="store" size="sm" />{shop.name}{shop.demo && <span className="tag" style={{ background: '#ffffff22', color: '#fff' }}>체험용</span>}<span className="grow" />
            <button className="btn xs" style={{ background: shop.ops.paused ? '#E5484D' : '#ffffff22', color: '#fff' }} onClick={() => { patchShop((s) => ({ ops: { ...s.ops, paused: !s.ops.paused } })); toast(shop.ops.paused ? '주문을 다시 받아요' : '새 주문을 잠시 멈췄어요'); }}>{shop.ops.paused ? '주문 멈춤' : '주문 받는 중'}</button>
          </div>
          <h2>{reqs.length ? `확인할 주문 ${reqs.length}건이 있어요` : '오늘도 달콤한 하루 되세요 🍰'}</h2>
          <div className="kpis">
            <div><small>새 요청</small><b>{reqs.length}</b></div>
            <div><small>오늘 픽업</small><b>{todays.filter((o) => o.status !== 'done').length}</b></div>
            <div><small>이번 달 매출</small><b>{man(monthSales)}</b></div>
          </div>
        </div>
        <div className="pad">
          {shop.demo && <div className="note" style={{ marginBottom: 12 }}>체험용 가게예요. 주문·매출은 예시 데이터예요. 손님 모드에서 이 가게로 주문하면 여기로 들어와요.</div>}
          {autoCount > 0 && <div className="note ok" style={{ marginBottom: 12 }}>⚡ 규칙 안 주문 {autoCount}건은 사장님 대신 자동 확정됐어요.</div>}
          <div className="sec-t"><h3>확인이 필요한 주문</h3><button className="more" onClick={() => nav('/o/orders')}>전체 ›</button></div>
          {reqs.length === 0 ? <div className="card pad small muted">새로 온 요청이 없어요.</div> : reqs.map((o) => <OCard key={o.id} o={o} />)}
          <div className="sec-t"><h3>오늘 픽업 · {fmtDate(t)}</h3></div>
          {todays.length === 0 ? <div className="card pad small muted">오늘 픽업 예정이 없어요.</div> : todays.map((o) => <OCard key={o.id} o={o} />)}
          {week.length > 0 && (<>
            <div className="sec-t"><h3>이번 주 일정</h3></div>
            <div className="card" style={{ padding: '0 14px' }}>{week.slice(0, 8).map((o) => (
              <button key={o.id} className="list-row" onClick={() => nav(`/o/order/${o.id}`)}>
                <span className="tag" style={{ minWidth: 54, justifyContent: 'center' }}>{relDay(o.o.date)}</span>
                <div className="grow"><div className="t small">{o.o.time} · {sizeOf(o.o.size).name} {designOf(o.o.design).name}</div><div className="s">{maskName(o.customer?.name)} · “{o.o.text}”</div></div>
                <StatusTag status={o.status} owner />
              </button>))}</div>
          </>)}
          <div className="sec-t"><h3>가게 준비도</h3><span className="more">{rd.pct}% 완료</span></div>
          <div className="card pad">
            <div className="prog"><i style={{ width: rd.pct + '%' }} /></div>
            <div className="chips wrap" style={{ marginTop: 10 }}>{rd.items.map(([k, n, ok]) => <button key={k} className={`chip sm ${ok ? 'soft on' : ''}`} onClick={() => nav(`/o/shop/${k}`)}>{ok ? '✓' : '+'} {n}</button>)}</div>
          </div>
          <div className="btns" style={{ marginTop: 12 }}>
            <button className="btn line sm" onClick={() => nav(`/store/${shop.id}`)}><Icon n="eye" size="sm" />손님 화면 보기</button>
            <button className="btn line sm" onClick={() => nav('/o/shop/share')}><Icon n="link" size="sm" />주문 링크</button>
          </div>
        </div>
      </div>
      <TabBar tabs={OWNER_TABS.map((t) => (t.path === '/o/orders' ? { ...t, badge: reqs.length } : t))} current="/o" />
    </div>
  );
}

export function OwnerOrders() {
  const { shop, list } = useShopOrders();
  const [tab, setTab] = useState('new');
  const [view, setView] = useState('list');
  const [month, setMonth] = useState(() => { const d = today(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [selDay, setSelDay] = useState(ymd(today()));
  if (!shop) return <NoShop />;
  const groups = {
    new: list.filter((o) => o.status === 'requested'),
    doing: list.filter((o) => ['change', 'confirmed', 'proof', 'making', 'ready'].includes(o.status)),
    done: list.filter((o) => ['done', 'declined', 'canceled'].includes(o.status)),
  };
  const cur = (groups[tab] || []).slice().sort((a, b) => (tab === 'done' ? (b.o.date + b.o.time).localeCompare(a.o.date + a.o.time) : (a.o.date + a.o.time).localeCompare(b.o.date + b.o.time)));
  const byDate = {};
  cur.forEach((o) => { (byDate[o.o.date] = byDate[o.o.date] || []).push(o); });
  // 달력
  const first = month, startDow = first.getDay(), dim = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cnt = {};
  list.filter((o) => !['declined', 'canceled'].includes(o.status)).forEach((o) => { cnt[o.o.date] = (cnt[o.o.date] || 0) + 1; });
  const dayList = list.filter((o) => o.o.date === selDay && !['declined', 'canceled'].includes(o.status)).sort((a, b) => a.o.time.localeCompare(b.o.time));
  return (
    <div className="screen fade">
      <div className="hdr"><h1 style={{ paddingLeft: 10 }}>주문</h1><div style={{ width: 150, marginRight: 8 }}><Seg value={view} onChange={setView} items={[['list', '목록'], ['cal', '달력']]} /></div></div>
      {view === 'list' ? (<>
        <div className="pad" style={{ paddingBottom: 6 }}><div className="seg">{[['new', `새 요청 ${groups.new.length}`], ['doing', `진행 중 ${groups.doing.length}`], ['done', '완료·취소']].map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div></div>
        <div className="scroll pad with-tab" style={{ paddingTop: 6 }}>
          {cur.length === 0 && <Empty icon="📭">{tab === 'new' ? '새로 온 요청이 없어요.' : tab === 'doing' ? '진행 중인 주문이 없어요.' : '완료된 주문이 없어요.'}</Empty>}
          {Object.entries(byDate).map(([d, os]) => (
            <div key={d}><div className="sec-t" style={{ marginTop: 12 }}><h3 style={{ fontSize: 14.5 }}>{relDay(d)} · {fmtDate(d)}</h3><span className="more">{os.length}건</span></div>{os.map((o) => <OCard key={o.id} o={o} quick={tab !== 'done'} />)}</div>
          ))}
        </div>
      </>) : (
        <div className="scroll pad with-tab">
          <div className="row" style={{ marginBottom: 10 }}>
            <button className="btn xs line" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><Icon n="back" size="sm" /></button>
            <b className="grow center">{month.getFullYear()}년 {month.getMonth() + 1}월</b>
            <button className="btn xs line" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><Icon n="right" size="sm" /></button>
          </div>
          <div className="cal">
            {DOW.map((d) => <div key={d} className="h">{d}</div>)}
            {Array.from({ length: startDow }, (_, i) => <div key={'e' + i} />)}
            {Array.from({ length: dim }, (_, i) => {
              const key = ymd(new Date(first.getFullYear(), first.getMonth(), i + 1));
              const off = shop.ops.closedDays.includes(new Date(first.getFullYear(), first.getMonth(), i + 1).getDay()) || shop.ops.holidays.includes(key);
              return <button key={key} className={`d ${off ? 'off' : ''} ${key === ymd(today()) ? 'today' : ''} ${key === selDay ? 'sel' : ''}`} onClick={() => setSelDay(key)}>{i + 1}{cnt[key] ? <small>{cnt[key]}건</small> : off ? <small style={{ color: '#c7b9bf' }}>휴무</small> : null}</button>;
            })}
          </div>
          <div className="sec-t"><h3>{fmtDate(selDay)} · {dayList.length}건</h3><span className="more">하루 최대 {shop.ops.dailyMax}건</span></div>
          {dayList.length === 0 ? <div className="card pad small muted">이 날은 주문이 없어요.</div> : dayList.map((o) => <OCard key={o.id} o={o} />)}
        </div>
      )}
      <TabBar tabs={OWNER_TABS.map((t) => (t.path === '/o/orders' ? { ...t, badge: groups.new.length } : t))} current="/o/orders" />
    </div>
  );
}

const TEMPLATES = ['주문 잘 받았어요! 미리보기 그대로 만들어 드릴게요 :)', '문구 위치는 가운데로 해 드릴게요.', '캐릭터는 저작권 때문에 비슷한 느낌으로 그려 드려요.', '그날은 주문이 많아 다른 시간은 어떠세요?', '요청하신 장식 때문에 금액이 조금 추가돼요.'];

export function OwnerOrderDetail({ params }) {
  const st = useApp();
  const o = st.orders.find((x) => x.id === params.id);
  const [price, setPrice] = useState(o ? o.finalPrice ?? o.est?.lo : 0);
  const [msg, setMsg] = useState('');
  const [tab, setTab] = useState('pv');
  if (!o) return <div className="screen"><Header title="주문" fallback="/o/orders" /><Empty>주문을 찾을 수 없어요.</Empty></div>;
  const store = st.shop ? shopToStore(st.shop, 'partner') : null;
  const checks = store ? ruleCheck(store, { ...o.o, date: null }, {}) : o.checks || [];
  const v = verdictOf(checks);
  const x = o.o;
  const deco = [...(x.toppings || []).map((t) => optName(TOPPINGS, t)), ...(x.extras || []).map((t) => optName(EXTRAS, t))];
  const n = nextStatus(o.status);
  return (
    <div className="screen">
      <Header title={`주문 ${o.id}`} fallback="/o/orders" right={<span style={{ marginRight: 10 }}><StatusTag status={o.status} owner /></span>} />
      <div className="scroll pad" style={{ paddingBottom: 120 }}>
        <div className="card" style={{ overflow: 'hidden' }}>
          {o.refThumb && <div className="pad" style={{ paddingBottom: 0 }}><Seg value={tab} onChange={setTab} items={[['pv', '앱 시안'], ['ref', '손님 참고 사진']]} /></div>}
          <div style={{ height: 210, background: 'var(--p50)', margin: o.refThumb ? '10px 0 0' : 0 }}>
            {tab === 'ref' && o.refThumb ? <img src={o.refThumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <CakeView o={orderView(o)} fancy style={{ height: '100%' }} />}
          </div>
          <div className="pad">
            <div className="row"><b className="grow" style={{ fontSize: 17 }}>{relDay(x.date)} {fmtDate(x.date)} {x.time}</b><span className="tag">{sizeOf(x.size).name}</span></div>
            <div className="small muted">{maskName(o.customer?.name)} · {maskPhone(o.customer?.phone)} · {ago(o.createdAt)} 접수</div>
            {o.customer?.phone && !o.demo && <div className="row" style={{ marginTop: 8 }}><a className="btn xs line" href={`tel:${o.customer.phone}`}><Icon n="phone" size="sm" />전화</a><a className="btn xs line" href={`sms:${o.customer.phone}`}><Icon n="chat" size="sm" />문자</a></div>}
          </div>
        </div>
        <div className="card pad" style={{ marginTop: 12 }}>
          <div className="b small" style={{ marginBottom: 4 }}>작업지시서</div>
          <div className="kv"><span>모양·크기</span><b>{optName(SHAPES, x.shape)} · {sizeOf(x.size).name} ({sizeOf(x.size).cm}cm)</b></div>
          <div className="kv"><span>디자인</span><b>{designOf(x.design).name}{x.variant ? ` · 시안 ${x.variant + 1}` : ''}</b></div>
          <div className="kv"><span>맛·크림</span><b>{optName([...FLAVORS, ...RICE_FLAVORS], x.flavor)} · {creamOf(x.cream).name}</b></div>
          <div className="kv"><span>문구</span><b>{x.noText ? '없음' : `“${x.text}”`}</b></div>
          {!x.noText && <div className="spell" style={{ marginTop: 4 }}>한 글자씩: <b>{[...x.text].map((c) => (c === ' ' ? '␣' : c)).join(' ')}</b><div className="xs muted">{fontOf(x.font).name}체 · {textColorOf(x.textColor).name} 글씨 · 손님이 문구를 확인했어요</div></div>}
          {deco.length > 0 && <div className="kv"><span>장식·추가</span><b>{deco.join(', ')}</b></div>}
          {x.plateText && <div className="kv"><span>판 문구</span><b>{x.plateText}</b></div>}
          {x.request && <div className="kv"><span>요청</span><b>{x.request}</b></div>}
          {x.allergy && <div className="kv"><span>알레르기</span><b style={{ color: 'var(--danger)' }}>{x.allergy}</b></div>}
        </div>
        <ul className="rules">{checks.map((c, i) => <li key={i} className={c.ok ? 'k' : 'w'}><i>{c.ok ? '✓' : '!'}</i><span>{c.t}</span></li>)}</ul>
        <div className={`verdict ${v.ok ? 'ok' : 'w'}`}>{v.ok ? '✓ 가게 규칙 안 — 승인만 누르면 돼요' : `! 확인할 항목 ${v.warn}개 — 금액·메시지를 정해 승인하거나 수정 요청하세요`}</div>
        {o.status === 'requested' && (
          <div className="card pad" style={{ marginTop: 12 }}>
            <div className="row"><span className="grow small muted">손님이 본 예상 금액</span><b>{range(o.est?.lo, o.est?.hi)}</b></div>
            <div className="row" style={{ marginTop: 10 }}><span className="grow b">최종 금액</span><div className="pricerow" style={{ border: 0, padding: 0 }}><PriceInput value={price} onChange={(vv) => setPrice(vv ?? 0)} /></div></div>
            <div className="chips" style={{ marginTop: 8 }}>{[-1000, 1000, 3000, 5000].map((d) => <button key={d} className="chip sm" onClick={() => setPrice((p) => Math.max(0, (p || 0) + d))}>{d > 0 ? '+' : ''}{d.toLocaleString()}</button>)}</div>
            <div className="lbl">손님에게 한마디 (선택)</div>
            <div className="chips">{TEMPLATES.map((t) => <button key={t} className="chip sm" onClick={() => setMsg(t)}>{t.slice(0, 14)}…</button>)}</div>
            <textarea className="inp" style={{ marginTop: 8 }} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="메시지" maxLength={200} />
          </div>
        )}
        {o.status === 'change' && <div className="note warn" style={{ marginTop: 12 }}>손님에게 수정 제안({won(o.proposedPrice)})을 보냈어요. 손님이 수락하면 확정돼요.</div>}
        {o.status === 'proof' && <div className="note warn" style={{ marginTop: 12 }}>손님이 시안을 확인하고 있어요.</div>}
        {['confirmed', 'making', 'ready', 'done'].includes(o.status) && <div className="note ok" style={{ marginTop: 12 }}>확정 금액 <b>{won(o.finalPrice)}</b>{st.shop?.ops?.deposit ? ` · 예약금 ${st.shop.ops.deposit}%` : ''}</div>}
        {o.review && <div className="card pad" style={{ marginTop: 12 }}><div className="b small">손님 후기</div><Stars n={o.review.stars} /><div className="small">{o.review.text}</div></div>}
        <div className="sec-t"><h3>기록</h3></div>
        {(o.history || []).map((h, i) => <div key={i} className={`msg ${h.by === 'owner' ? 'me' : h.by === 'system' ? 'sys' : ''}`}><small>{h.by === 'owner' ? '나(사장님)' : h.by === 'system' ? '자동' : '손님'} · {ago(h.at)}</small>{h.msg}</div>)}
      </div>
      <div className="stickybar" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, flexWrap: 'wrap' }}>
        {o.status === 'requested' && (<>
          <button className="btn line" onClick={() => { const m = msg || '요청하신 부분은 이렇게 바꾸면 가능해요. 확인 부탁드려요!'; ownerChange(o.id, price, m); toast('손님에게 수정 제안을 보냈어요'); }}>수정 요청</button>
          <button className="btn ok grow" onClick={() => { ownerApprove(o.id, price, msg || undefined); toast(`승인했어요 · ${won(price)}`); }}><Icon n="check" size="sm" /> {won(price)}에 승인</button>
          <button className="btn xs ghost" style={{ width: '100%', minHeight: 26 }} onClick={() => { if (confirm('이 주문을 거절할까요?')) { ownerDecline(o.id, msg || undefined); toast('주문을 거절했어요'); } }}>이번 주문은 어려워요 (거절)</button>
        </>)}
        {o.status === 'confirmed' && (<>
          <PhotoPick className="btn line" onPick={async (f) => { try { const el = await loadImage(f); ownerProof(o.id, toDataURL(el, 640, 0.8)); toast('시안 사진을 손님에게 보냈어요'); } catch { toast('사진을 읽지 못했어요'); } }}><Icon n="image" size="sm" />시안 보내기</PhotoPick>
          <button className="btn dark grow" onClick={() => { ownerAdvance(o.id); toast('제작을 시작했어요'); }}>제작 시작 →</button>
        </>)}
        {n && o.status !== 'confirmed' && o.status !== 'proof' && <button className="btn dark grow" onClick={() => { ownerAdvance(o.id); toast(`${NEXT_LABEL[o.status]} 처리했어요`); }}>{NEXT_LABEL[o.status]} →</button>}
        {!n && o.status !== 'requested' && <button className="btn line grow" onClick={() => nav('/o/orders')}>주문 목록으로</button>}
        {o.status === 'proof' && <button className="btn line grow" onClick={() => nav('/o/orders')}>주문 목록으로</button>}
      </div>
    </div>
  );
}

export function Sales() {
  const st = useApp();
  const { shop, list } = useShopOrders();
  const [mode, setMode] = useState('day');
  const [month, setMonth] = useState(() => { const d = today(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [sel, setSel] = useState(null);
  const sold = useMemo(() => list.filter((o) => SALES.includes(o.status)), [list]);
  if (!shop) return <NoShop />;
  let bars = [];
  let periodOrders = [];
  if (mode === 'day') {
    const dim = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    bars = Array.from({ length: dim }, (_, i) => { const key = ymd(new Date(month.getFullYear(), month.getMonth(), i + 1)); const os = sold.filter((o) => o.o.date === key); return { key, label: (i + 1) % 5 === 1 ? String(i + 1) : '', v: os.reduce((a, o) => a + amount(o), 0), os, title: fmtDate(key) }; });
    periodOrders = sold.filter((o) => o.o.date.startsWith(ymd(month).slice(0, 7)));
  } else if (mode === 'week') {
    const start = addDays(today(), -today().getDay() - 7 * 7);
    bars = Array.from({ length: 8 }, (_, i) => { const a = addDays(start, i * 7), b = addDays(a, 6); const os = sold.filter((o) => o.o.date >= ymd(a) && o.o.date <= ymd(b)); return { key: ymd(a), label: `${a.getMonth() + 1}/${a.getDate()}`, v: os.reduce((s, o) => s + amount(o), 0), os, title: `${fmtDate(ymd(a), false)} 주` }; });
    periodOrders = bars.flatMap((b) => b.os);
  } else {
    bars = Array.from({ length: 6 }, (_, i) => { const d = new Date(today().getFullYear(), today().getMonth() - 5 + i, 1); const k = ymd(d).slice(0, 7); const os = sold.filter((o) => o.o.date.startsWith(k)); return { key: k, label: `${d.getMonth() + 1}월`, v: os.reduce((s, o) => s + amount(o), 0), os, title: `${d.getFullYear()}년 ${d.getMonth() + 1}월` }; });
    periodOrders = bars.flatMap((b) => b.os);
  }
  const selBar = bars.find((b) => b.key === sel);
  const focus = selBar ? selBar.os : periodOrders;
  const total = focus.reduce((a, o) => a + amount(o), 0);
  const max = Math.max(1, ...bars.map((b) => b.v));
  const ym = ymd(today()).slice(0, 7);
  const monthTotal = sold.filter((o) => o.o.date.startsWith(ym)).reduce((a, o) => a + amount(o), 0);
  const goal = st.goal || 3000000;
  const daysLeft = new Date(today().getFullYear(), today().getMonth() + 1, 0).getDate() - today().getDate();
  const pop = (key, list2, nameOf) => { const c = {}; focus.forEach((o) => { const k = o.o[key]; c[k] = (c[k] || 0) + 1; }); return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, n]) => `${nameOf(k)} ${n}건`); };
  return (
    <div className="screen fade">
      <div className="hdr"><h1 style={{ paddingLeft: 10 }}>정산</h1></div>
      <div className="scroll pad with-tab">
        {shop.demo && <div className="note" style={{ marginBottom: 10 }}>체험용 예시 데이터예요.</div>}
        <div className="card pad">
          <div className="row"><span className="grow small muted">이번 달 매출 ({today().getMonth() + 1}월 {today().getDate()}일까지)</span><button className="btn xs ghost" onClick={() => { const v = prompt('이번 달 목표 매출(원)을 적어 주세요', String(goal)); if (v && +v.replace(/[^\d]/g, '') > 0) setState({ goal: +v.replace(/[^\d]/g, '') }); }}><Icon n="edit" size="sm" />목표</button></div>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.6 }}>{won(monthTotal)}</div>
          <div className="prog" style={{ marginTop: 8 }}><i style={{ width: Math.min(100, (monthTotal / goal) * 100) + '%' }} /></div>
          <div className="xs muted" style={{ marginTop: 6 }}>목표 {won(goal)} 중 {Math.round((monthTotal / goal) * 100)}% · {monthTotal < goal && daysLeft > 0 ? `남은 ${daysLeft}일 동안 하루 ${won(Math.ceil((goal - monthTotal) / daysLeft / 1000) * 1000)}씩` : '목표 달성!'}</div>
        </div>
        <div style={{ margin: '14px 0 10px' }}><Seg value={mode} onChange={(m) => { setMode(m); setSel(null); }} items={[['day', '일별'], ['week', '주별'], ['month', '월별']]} /></div>
        {mode === 'day' && <div className="row" style={{ marginBottom: 6 }}><button className="btn xs line" onClick={() => { setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1)); setSel(null); }}><Icon n="back" size="sm" /></button><b className="grow center">{month.getFullYear()}년 {month.getMonth() + 1}월</b><button className="btn xs line" onClick={() => { setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1)); setSel(null); }}><Icon n="right" size="sm" /></button></div>}
        <div className="card pad">
          <div className="chart">{bars.map((b) => <button key={b.key} className={`bar ${b.v ? '' : 'zero'} ${sel === b.key ? 'sel' : ''}`} onClick={() => setSel(sel === b.key ? null : b.key)} aria-label={`${b.title} ${won(b.v)}`}><i style={{ height: `${(b.v / max) * 100}%` }} /><span>{b.label}</span></button>)}</div>
          <div className="xs muted center" style={{ marginTop: 6 }}>막대를 누르면 그 기간만 볼 수 있어요</div>
        </div>
        <div className="kpis light" style={{ marginTop: 12 }}>
          <div><small>{selBar ? selBar.title : '기간'} 매출</small><b style={{ fontSize: 16 }}>{man(total)}원</b></div>
          <div><small>건수</small><b style={{ fontSize: 16 }}>{focus.length}건</b></div>
          <div><small>평균 단가</small><b style={{ fontSize: 16 }}>{focus.length ? man(Math.round(total / focus.length / 100) * 100) + '원' : '-'}</b></div>
        </div>
        {focus.length > 0 && (
          <div className="card pad" style={{ marginTop: 12 }}>
            <div className="b small">많이 나간 옵션</div>
            <div className="small" style={{ marginTop: 6 }}>크기: {pop('size', SIZES, (k) => sizeOf(k).name).join(' · ')}</div>
            <div className="small">디자인: {pop('design', DESIGNS, (k) => designOf(k).name).join(' · ')}</div>
          </div>
        )}
        <div className="sec-t"><h3>{selBar ? selBar.title : '기간'} 주문 {focus.length}건</h3></div>
        {focus.slice().sort((a, b) => b.o.date.localeCompare(a.o.date)).slice(0, 30).map((o) => (
          <button key={o.id} className="list-row" onClick={() => nav(`/o/order/${o.id}`)}><span className="tag mute">{fmtDate(o.o.date, false)}</span><div className="grow"><div className="t small">{sizeOf(o.o.size).name} {designOf(o.o.design).name}</div><div className="s">{maskName(o.customer?.name)}</div></div><b>{won(amount(o))}</b></button>
        ))}
      </div>
      <TabBar tabs={OWNER_TABS} current="/o/sales" />
    </div>
  );
}
