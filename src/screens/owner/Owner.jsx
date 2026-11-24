import { useMemo, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import { OwnerTabBar } from '../../components/TabBar.jsx';
import { NotiBell } from '../../components/Noti.jsx';
import { CakeView, Empty, StatusTag, toast, Seg, Sheet, Field } from '../../components/ui.jsx';
import { useApp, setState, patchShop } from '../../lib/state.js';
import { nav } from '../../lib/router.js';
import { act, nextStatus, NEXT_LABEL, OWNER_NAME, ACTIVE, SALES, ordersCSV, downloadText, unreadOf, evText, removeSampleOrders } from '../../lib/orders.js';
import { flavorName } from '../../lib/ordertext.js';
import { orderView } from '../../lib/ordertext.js';
import { won, range, fmtDate, mdDate, relDay, ymd, today, addDays, parseYmd, DOW, ago, maskName, man, pad } from '../../lib/util.js';
import { SIZES, DESIGNS, sizeOf, designOf } from '../../data/catalog.js';
import { readiness } from './Editors.jsx';
import OrderThumb from '../../components/OrderThumb.jsx';
import OrderPaper from '../../components/OrderPaper.jsx';

const amount = (o) => o.finalPrice ?? o.est?.lo ?? 0;
// 시간대별 인사말 (11/23 UI): 아침 05~11시 · 낮 11~17시 · 저녁·밤 17~05시. 한 시간 동안은 같은 말을 보여 준다.
const GREET = {
  am: ['좋은 아침이에요, 사장님!', '오븐 예열 완료! 오늘도 화이팅', '오늘 첫 케이크, 기분 좋게!', '아침 크림이 제일 예쁘게 올라가요'],
  day: ['오늘도 달콤한 하루 되세요', '점심은 꼭 챙겨 드세요!', '오후 픽업 전, 잠깐 숨 돌려요', '누군가의 생일이 완성되는 중!'],
  pm: ['늦은 밤까지 화이팅하시네요!', '오늘 하루도 수고 많으셨어요', '내일 픽업, 미리 체크해 볼까요?', '오늘 케이크로 누군가 웃고 있어요', '마감까지 조금만 더 힘내요!'],
};
function greeting(d = new Date(), k = 0) {
  const h = d.getHours();
  const list = h >= 5 && h < 11 ? GREET.am : h >= 11 && h < 17 ? GREET.day : GREET.pm;
  return list[k % list.length]; // 처음엔 무작위, 누르면 다음 인사말
}
function useShopOrders() {
  const st = useApp();
  const list = st.shop ? st.orders.filter((o) => o.storeId === st.shop.id) : [];
  return { st, shop: st.shop, list };
}
function NoShop() {
  return <div className="screen"><Empty icon="store">아직 등록한 가게가 없어요.<div style={{ marginTop: 14 }}><button className="btn pri" onClick={() => nav('/o/setup', { replace: true })}>가게 등록하기</button></div></Empty></div>;
}

export function OCard({ o, quick = true, list = false }) {
  const st = useApp();
  const n = nextStatus(o.status);
  const needDeposit = (st.shop?.ops?.deposit || 0) > 0 && ['confirmed', 'proof', 'making', 'ready'].includes(o.status);
  const un = unreadOf(o, 'o');
  const last = [...(o.ev || [])].reverse().find((e) => e.t !== 'img' && e.by !== 'o');
  const req = o.status === 'requested';
  const price = o.finalPrice != null ? o.finalPrice : o.est?.lo;
  const decline = () => { if (confirm('이 주문을 거절할까요?')) { act(o.id, 'o', 'decline'); toast('주문을 거절했어요'); } };
  const approve = () => { act(o.id, 'o', 'approve', { price: o.est.lo }); toast(`수락했어요 · ${won(o.est.lo)} 확정`); nav(`/o/order/${o.id}`); };
  // 주문·대화 목록: [이름 · 픽업 시간] / [사진] 크기·맛 “문구” 금액 / [거절][수락하고 금액 보내기]
  if (list) {
    return (
      <div className={`ocard oc3 ${['declined', 'canceled'].includes(o.status) ? 'dim' : ''}`} role="button" onClick={() => nav(`/o/order/${o.id}`)}>
        <div className="top"><b>{maskName(o.customer?.name)}{o.sample && <span className="tag mute">예시</span>}</b><span>{mdDate(o.o.date)} {o.o.time} 픽업</span></div>
        <div className="mid">
          <div className="th round"><OrderThumb order={o} /></div>
          <div className="grow" style={{ minWidth: 0 }}><small>{sizeOf(o.o.size).name} · {flavorName(o.o)}</small><div className="tx">{o.o.noText ? '문구 없음' : `“${o.o.text}”`}</div></div>
          <b className="pr">{man(price || 0)}</b>
        </div>
        {un > 0 && last && !req && <div className="lastmsg"><span className="un">{un}</span><span>{evText(last, o).split('\n')[0]}</span></div>}
        {quick && req && (
          <div className="acts2" onClick={(e) => e.stopPropagation()}>
            <button className="btn sm ghost" onClick={decline}>거절</button>
            <button className="btn sm ok2" onClick={approve}>수락하고 금액 보내기</button>
          </div>
        )}
        {!req && <div className={`stline ${['declined', 'canceled'].includes(o.status) ? 'no' : ''}`}>{o.status === 'declined' ? '거절함' : o.status === 'canceled' ? '손님이 취소했어요' : o.status === 'done' ? '✓ 픽업 완료' : `✓ ${OWNER_NAME[o.status] || ''}${needDeposit ? (o.paid ? ' · 입금 완료' : ' · 입금 전') : ''}`}</div>}
        {quick && n && !req && (
          <div className="acts2" onClick={(e) => e.stopPropagation()}><button className="btn sm ok2" onClick={() => { act(o.id, 'o', 'advance', { to: n }); toast(`${NEXT_LABEL[o.status]} 처리했어요`); }}>{NEXT_LABEL[o.status]} →</button></div>
        )}
      </div>
    );
  }
  return (
    <div className="ocard oc2" role="button" onClick={() => nav(`/o/order/${o.id}`)}>
      <div className="oc-top">
        <div className="th round"><OrderThumb order={o} /></div>
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="t1"><span className="grow">{maskName(o.customer?.name)}{o.sample && <span className="tag mute" style={{ marginLeft: 4 }}>예시</span>}</span>{req ? <small className="when">{mdDate(o.o.date)} {o.o.time}</small> : <StatusTag status={o.status} owner />}</div>
          <div className="t2">{sizeOf(o.o.size).name} · {o.o.noText ? '문구 없음' : `“${o.o.text}”`}</div>
          {!req && <div className="t2">{relDay(o.o.date)} {o.o.time} · <b style={{ color: 'var(--ink)' }}>{won(price || 0)}</b>{needDeposit && <> · <span className={`tag ${o.paid ? 'pink' : 'warn'}`}>{o.paid ? '입금 완료' : '입금 전'}</span></>}</div>}
          {un > 0 && last && !req && <div className="lastmsg"><span className="un">{un}</span><span>{evText(last, o).split('\n')[0]}</span></div>}
        </div>
      </div>
      {quick && req && (
        <div className="acts2" onClick={(e) => e.stopPropagation()}>
          <button className="btn sm ghost" onClick={decline}>거절</button>
          <button className="btn sm ok2" onClick={approve}>수락 · {man(o.est.lo)}</button>
        </div>
      )}
      {quick && n && (
        <div className="acts2" onClick={(e) => e.stopPropagation()}><button className="btn sm ok2" onClick={() => { act(o.id, 'o', 'advance', { to: n }); toast(`${NEXT_LABEL[o.status]} 처리했어요`); }}>{NEXT_LABEL[o.status]} →</button></div>
      )}
    </div>
  );
}// 사장님 첫 화면 새 요청: 손님이 보낸 주문서를 종이 한 장처럼 (케이크 사진 포함) · 누르면 대화방에서 채팅
function ReqSheet({ o }) {
  const decline = () => { if (confirm('이 주문을 거절할까요?')) { act(o.id, 'o', 'decline'); toast('주문을 거절했어요'); } };
  const approve = () => { act(o.id, 'o', 'approve', { price: o.est.lo }); toast(`주문을 받았어요 · 손님에게 '주문되었습니다'를 보냈어요`); nav(`/o/order/${o.id}`); };
  return (
    <div className="reqsheet" role="button" onClick={() => nav(`/o/order/${o.id}`)}>
      <OrderPaper order={o} compact />
      <div className="acts3" onClick={(e) => e.stopPropagation()}>
        <button className="btn sm ghost" onClick={decline}>거절</button>
        <button className="btn sm line" onClick={() => nav(`/o/order/${o.id}`)}><Icon n="chat" size="sm" />채팅</button>
        <button className="btn sm ok2" onClick={approve}>주문 받기 · {man(o.est.lo)}</button>
      </div>
    </div>
  );
}// 오늘 픽업 한 줄: [시간] 이름 · 크기 / “문구” [다음 단계]
function PickRow({ o }) {
  const n = nextStatus(o.status);
  return (
    <div className="pickrow" role="button" onClick={() => nav(`/o/order/${o.id}`)}>
      <b className="tm">{o.o.time}</b>
      <div className="grow" style={{ minWidth: 0 }}><div className="t1">{maskName(o.customer?.name)} · {sizeOf(o.o.size).name}</div><div className="t2">{o.o.noText ? '문구 없음' : `“${o.o.text}”`}</div></div>
      {n ? <button className="btn xs ok2" onClick={(e) => { e.stopPropagation(); act(o.id, 'o', 'advance', { to: n }); toast(`${NEXT_LABEL[o.status]} 처리했어요`); }}>{NEXT_LABEL[o.status]}</button> : <StatusTag status={o.status} owner />}
    </div>
  );
}

export function OwnerHome() {
  const { st, shop, list } = useShopOrders();
  const [gi, setGi] = useState(() => Math.floor(Math.random() * 4));
  if (!shop) return <NoShop />;
  const t = ymd(today());
  const reqs = list.filter((o) => o.status === 'requested').sort((a, b) => a.o.date.localeCompare(b.o.date));
  const talk = list.filter((o) => o.status !== 'requested' && ACTIVE.includes(o.status) && unreadOf(o, 'o') > 0);
  const todays = list.filter((o) => o.o.date === t && ['confirmed', 'proof', 'making', 'ready', 'done'].includes(o.status)).sort((a, b) => a.o.time.localeCompare(b.o.time));
  const week = list.filter((o) => ACTIVE.includes(o.status) && o.o.date > t && o.o.date <= ymd(addDays(today(), 7))).sort((a, b) => (a.o.date + a.o.time).localeCompare(b.o.date + b.o.time));
  const ym = t.slice(0, 7);
  const monthSales = list.filter((o) => SALES.includes(o.status) && o.o.date.startsWith(ym)).reduce((a, o) => a + amount(o), 0);
  const rd = readiness(shop);
  const samples = list.some((o) => o.sample);
  return (
    <div className="screen fade">
      <div className="scroll with-tab">
        <div className="owner-top">
          <div className="sname"><Icon n="store" size="sm" /><span className="grow" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{shop.name}</span>
            <button className={`openpill ${shop.ops.paused ? 'off' : ''}`} onClick={() => { patchShop((s) => ({ ops: { ...s.ops, paused: !s.ops.paused } })); toast(shop.ops.paused ? '주문을 다시 받아요' : '새 주문을 잠시 멈췄어요'); }}><i />{shop.ops.paused ? '잠시 쉬는 중' : '주문 받는 중'}</button>
            <NotiBell role="o" dark />
          </div>
          <h2 className="greet" onClick={() => setGi((g) => g + 1)} title="누르면 다른 인사말">{greeting(new Date(), gi)}</h2>
          <div className="kpis">
            <button onClick={() => nav('/o/orders', { replace: true })}><small>새 요청</small><b>{reqs.length}</b></button>
            <div><small>오늘 픽업</small><b>{todays.filter((o) => o.status !== 'done').length}</b></div>
            <button onClick={() => nav('/o/sales', { replace: true })}><small>이번 달 매출</small><b>{man(monthSales)}</b></button>
          </div>
        </div>
        <div className="pad">
          {samples && <div className="note row" style={{ marginBottom: 12 }}><span className="grow">예시 주문이 들어 있어요. 실제로 쓰기 전에 지워 주세요.</span><button className="btn xs line" onClick={() => { removeSampleOrders(); toast('예시 주문을 지웠어요'); }}>예시 지우기</button></div>}
          <div className="sec-t"><h3><i className="num">1</i>확인이 필요한 주문</h3><button className="more" onClick={() => nav('/o/orders', { replace: true })}>전체 ›</button></div>
          {reqs.length === 0 ? <div className="card pad small muted">새로 온 요청이 없어요.</div> : reqs.map((o) => <ReqSheet key={o.id} o={o} />)}
          {talk.length > 0 && (<><div className="sec-t"><h3><i className="num">2</i>새 소식 (자동 확정 · 손님 메시지)</h3></div>{talk.map((o) => <OCard key={o.id} o={o} quick={false} />)}</>)}
          <div className="sec-t"><h3><i className="num">{talk.length ? 3 : 2}</i>오늘 픽업 · {fmtDate(t)}</h3></div>
          {todays.length === 0 ? <div className="card pad small muted">오늘 픽업 예정이 없어요.</div> : todays.map((o) => <PickRow key={o.id} o={o} />)}
          {week.length > 0 && (<>
            <div className="sec-t"><h3>이번 주 일정</h3></div>
            <div className="card" style={{ padding: '0 14px' }}>{week.slice(0, 8).map((o) => (
              <button key={o.id} className="list-row" onClick={() => nav(`/o/order/${o.id}`)}>
                <span className="tag" style={{ minWidth: 54, justifyContent: 'center' }}>{relDay(o.o.date)}</span>
                <div className="grow"><div className="t small">{o.o.time} · {sizeOf(o.o.size).name} {designOf(o.o.design).name}</div><div className="s">{maskName(o.customer?.name)} · “{o.o.text}”</div></div>
                <StatusTag status={o.status} owner />
              </button>))}</div>
          </>)}
          {rd.pct < 100 && (<>
            <div className="sec-t"><h3>가게 준비도</h3></div>
            <div className="card pad">
              <div className="prog"><i style={{ width: rd.pct + '%' }} /></div>
              <div className="chips wrap" style={{ marginTop: 10 }}>{rd.items.map(([k, n, ok]) => <button key={k} className={`chip sm ${ok ? 'soft on' : ''}`} onClick={() => nav(`/o/shop/${k}`)}><Icon n={ok ? 'check' : 'plus'} /> {n}</button>)}</div>
            </div>
          </>)}
          <div className="btns" style={{ marginTop: 12 }}>
            <button className="btn line sm" onClick={() => nav(`/store/${shop.id}`)}><Icon n="eye" size="sm" />손님 화면 보기</button>
            <button className="btn sec sm" onClick={() => nav('/o/shop/share')}><Icon n="qr" size="sm" />주문 링크·QR</button>
          </div>
        </div>
      </div>
      <OwnerTabBar current="/o" />
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
  const first = month, startDow = first.getDay(), dim = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cnt = {};
  list.filter((o) => !['declined', 'canceled'].includes(o.status)).forEach((o) => { cnt[o.o.date] = (cnt[o.o.date] || 0) + 1; });
  const dayList = list.filter((o) => o.o.date === selDay && !['declined', 'canceled'].includes(o.status)).sort((a, b) => a.o.time.localeCompare(b.o.time));
  return (
    <div className="screen fade">
      <div className="hdr big"><h1 style={{ paddingLeft: 12 }}>주문·대화</h1>
        <div style={{ width: 140, marginRight: 8 }}><Seg value={view} onChange={setView} items={[['list', '목록'], ['cal', '달력']]} /></div></div>
      {view === 'list' ? (<>
        <div className="pad gingham" style={{ paddingBottom: 6 }}><div className="seg">{[['new', `새 요청 ${groups.new.length}`], ['doing', `진행 중 ${groups.doing.length}`], ['done', '완료·취소']].map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div></div>
        <div className="scroll pad with-tab gingham" style={{ paddingTop: 6 }}>
          {cur.length === 0 && (
            <div className="oempty">
              <i><Icon n="box" /></i>
              <b>{tab === 'new' ? '새로 온 요청이 없어요.' : tab === 'doing' ? '진행 중인 주문이 없어요.' : '완료·취소된 주문이 없어요.'}</b>
              <span>주문 링크·QR을 인스타 프로필에 걸어 두면 손님이 바로 주문해요.</span>
              <button className="btn sec sm" onClick={() => nav('/o/shop/share')}>주문 링크·QR 보기</button>
            </div>
          )}
          {cur.map((o) => <OCard key={o.id} o={o} quick={tab !== 'done'} list />)}
        </div>
      </>) : (
        <div className="scroll pad with-tab gingham">
          <div className="row" style={{ marginBottom: 10 }}>
            <button className="btn xs line" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="이전 달"><Icon n="back" size="sm" /></button>
            <b className="grow center">{month.getFullYear()}년 {month.getMonth() + 1}월</b>
            <button className="btn xs line" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="다음 달"><Icon n="right" size="sm" /></button>
          </div>
          <div className="cal">
            {DOW.map((d) => <div key={d} className="h">{d}</div>)}
            {Array.from({ length: startDow }, (_, i) => <div key={'e' + i} />)}
            {Array.from({ length: dim }, (_, i) => {
              const key = ymd(new Date(first.getFullYear(), first.getMonth(), i + 1));
              const off = shop.ops.closedDays.includes(new Date(first.getFullYear(), first.getMonth(), i + 1).getDay()) || shop.ops.holidays.includes(key);
              return <button key={key} className={`d ${off ? 'off' : ''} ${key === ymd(today()) ? 'today' : ''} ${key === selDay ? 'sel' : ''}`} onClick={() => setSelDay(key)}>{i + 1}{off ? <small>휴무</small> : cnt[key] ? <small>{cnt[key]}건</small> : null}{off && cnt[key] ? <i className="dot" /> : null}</button>;
            })}
          </div>
          <div className="sec-t"><h3>{fmtDate(selDay)} · {dayList.length}건</h3><span className="more">하루 최대 {shop.ops.dailyMax}건</span></div>
          {dayList.length === 0 ? <div className="card pad small muted">이 날은 주문이 없어요.</div> : dayList.map((o) => <OCard key={o.id} o={o} list />)}
        </div>
      )}
      <OwnerTabBar current="/o/orders" />
    </div>
  );
}

// ───────── 매출 · 장부 · 근무기록 ─────────
const pct = (a, b) => (b > 0 ? Math.round(((a - b) / b) * 100) : null);
function Delta({ now, prev, label }) {
  const p = pct(now, prev);
  if (p == null) return <span className="xs muted">{label} 기록 없음</span>;
  return <span className="xs" style={{ color: p >= 0 ? 'var(--ok)' : 'var(--danger)', fontWeight: 800 }}>{p >= 0 ? '▲' : '▼'} {Math.abs(p)}% <span className="muted" style={{ fontWeight: 600 }}>{label} 대비</span></span>;
}
// 막대 그래프: 값 눈금 + 누르면 그 막대 값 표시
function Bars({ bars, sel, onSel, unit = '원' }) {
  const max = Math.max(1, ...bars.map((b) => b.v));
  const top = max >= 10000 ? Math.ceil(max / 50000) * 50000 : Math.max(1, max);
  const fmt = (v) => (unit === '원' ? (v >= 10000 ? `${Math.round(v / 10000)}만` : v) : v);
  return (
    <div className="bars">
      <div className="yaxis"><span>{fmt(top)}</span><span>{fmt(top / 2)}</span><span>0</span></div>
      <div className="plot">
        <i className="grid" style={{ top: 0 }} /><i className="grid" style={{ top: '50%' }} /><i className="grid" style={{ top: '100%' }} />
        {bars.map((b) => (
          <button key={b.key} className={`bar ${b.v ? '' : 'zero'} ${sel === b.key ? 'sel' : ''} ${b.today ? 'today' : ''}`} onClick={() => onSel(sel === b.key ? null : b.key)} aria-label={`${b.title} ${b.v.toLocaleString()}${unit}`}>
            {sel === b.key && <em>{unit === '원' ? won(b.v) : `${b.v}${unit}`}</em>}
            <i style={{ height: `${Math.max(b.v ? 2 : 0, (b.v / top) * 100)}%` }} />
            <span>{b.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function Sales() {
  const st = useApp();
  const { shop, list } = useShopOrders();
  const [tab, setTab] = useState('sales');
  if (!shop) return <NoShop />;
  return (
    <div className="screen fade">
      <div className="hdr big"><h1 style={{ paddingLeft: 12 }}>매출·장부</h1></div>
      <div className="pad" style={{ paddingBottom: 0 }}><Seg value={tab} onChange={setTab} items={[['sales', '매출'], ['book', '월별 장부'], ['work', '근무기록']]} /></div>
      <div className="scroll pad with-tab">
        {list.some((o) => o.sample) && <div className="note" style={{ marginBottom: 10 }}>예시 주문이 포함된 숫자예요.</div>}
        {tab === 'sales' && <SalesTab st={st} shop={shop} list={list} />}
        {tab === 'book' && <BookTab shop={shop} list={list} />}
        {tab === 'work' && <WorkTab st={st} shop={shop} list={list} />}
      </div>
      <OwnerTabBar current="/o/sales" />
    </div>
  );
}

function SalesTab({ st, shop, list }) {
  const [period, setPeriod] = useState('month');
  const [metric, setMetric] = useState('sales');
  const [sel, setSel] = useState(null);
  const sold = useMemo(() => list.filter((o) => SALES.includes(o.status)), [list]);
  const t0 = today(), tKey = ymd(t0);
  const sum = (os) => os.reduce((a, o) => a + amount(o), 0);
  const between = (a, b) => sold.filter((o) => o.o.date >= ymd(a) && o.o.date <= ymd(b));
  let bars = [], nowOs = [], prevOs = [], title = '', prevLabel = '';
  if (period === 'today') {
    nowOs = sold.filter((o) => o.o.date === tKey); prevOs = sold.filter((o) => o.o.date === ymd(addDays(t0, -7))); title = `오늘 (${fmtDate(tKey)})`; prevLabel = '지난주 같은 요일';
    bars = Array.from({ length: 7 }, (_, i) => { const d = addDays(t0, i - 6); const os = sold.filter((o) => o.o.date === ymd(d)); return { key: ymd(d), label: i === 6 ? '오늘' : DOW[d.getDay()], title: fmtDate(ymd(d)), os, today: i === 6 }; });
  } else if (period === 'week') {
    const start = addDays(t0, -t0.getDay());
    nowOs = between(start, addDays(start, 6)); prevOs = between(addDays(start, -7), addDays(start, -1)); title = `이번 주 (${start.getMonth() + 1}/${start.getDate()}~)`; prevLabel = '지난주';
    bars = Array.from({ length: 7 }, (_, i) => { const d = addDays(start, i); const os = sold.filter((o) => o.o.date === ymd(d)); return { key: ymd(d), label: DOW[d.getDay()], title: fmtDate(ymd(d)), os, today: ymd(d) === tKey }; });
  } else {
    const first = new Date(t0.getFullYear(), t0.getMonth(), 1), dim = new Date(t0.getFullYear(), t0.getMonth() + 1, 0).getDate();
    const pFirst = new Date(t0.getFullYear(), t0.getMonth() - 1, 1), pLast = new Date(t0.getFullYear(), t0.getMonth(), 0);
    nowOs = between(first, new Date(t0.getFullYear(), t0.getMonth(), dim)); prevOs = between(pFirst, pLast); title = `이번 달 (${t0.getMonth() + 1}월)`; prevLabel = '지난달';
    bars = Array.from({ length: dim }, (_, i) => { const d = new Date(t0.getFullYear(), t0.getMonth(), i + 1); const os = sold.filter((o) => o.o.date === ymd(d)); return { key: ymd(d), label: (i + 1) % 5 === 0 || i === 0 ? String(i + 1) : '', title: fmtDate(ymd(d)), os, today: ymd(d) === tKey }; });
  }
  bars = bars.map((b) => ({ ...b, v: metric === 'sales' ? sum(b.os) : b.os.length }));
  const selBar = bars.find((b) => b.key === sel);
  const focus = selBar ? selBar.os : nowOs;
  const total = sum(nowOs);
  // 정산 예정: 확정됐지만 아직 픽업 전(받을 돈) / 그중 예약금 입금 확인 전
  const pending = list.filter((o) => ['confirmed', 'proof', 'making', 'ready'].includes(o.status));
  const unpaid = pending.filter((o) => !o.paid);
  const goal = st.goal || 3000000;
  const ym = tKey.slice(0, 7);
  const monthTotal = sum(sold.filter((o) => o.o.date.startsWith(ym)));
  const daysLeft = new Date(t0.getFullYear(), t0.getMonth() + 1, 0).getDate() - t0.getDate();
  const top = (key, nameOf) => { const c = {}; focus.forEach((o) => { c[o.o[key]] = (c[o.o[key]] || 0) + 1; }); return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, n]) => ({ name: nameOf(k), n })); };
  const decided = list.map((o) => { const req = o.ev?.find((e) => e.t === 'request'); const f = o.ev?.find((e) => ['approve', 'auto', 'change', 'decline'].includes(e.t)); return req && f ? { mins: (new Date(f.at) - new Date(req.at)) / 60000, auto: f.t === 'auto' } : null; }).filter(Boolean);
  return (
    <>
      <Seg value={period} onChange={(p) => { setPeriod(p); setSel(null); }} items={[['today', '오늘'], ['week', '이번 주'], ['month', '이번 달']]} />
      <div className="card pad" style={{ marginTop: 10 }}>
        <div className="small muted">{title} 매출</div>
        <div className="bignum">{won(total)}</div>
        <div className="row" style={{ gap: 12 }}><Delta now={total} prev={sum(prevOs)} label={prevLabel} /><span className="xs muted">주문 {nowOs.length}건 · 평균 {nowOs.length ? won(Math.round(total / nowOs.length / 100) * 100) : '-'}</span></div>
      </div>
      <div className="card pad" style={{ marginTop: 10 }}>
        <div className="row"><b className="grow">{period === 'month' ? '날짜별' : '요일별'} {metric === 'sales' ? '매출' : '주문 수'}</b><div style={{ width: 132 }}><Seg value={metric} onChange={setMetric} items={[['sales', '매출'], ['count', '주문 수']]} /></div></div>
        <Bars bars={bars} sel={sel} onSel={setSel} unit={metric === 'sales' ? '원' : '건'} />
        <div className="xs muted center">{selBar ? `${selBar.title} · ${won(sum(selBar.os))} · ${selBar.os.length}건` : '막대를 누르면 그날 금액과 주문이 보여요'}</div>
      </div>
      <div className="kpis light" style={{ marginTop: 10, gridTemplateColumns: '1fr 1fr' }}>
        <div><small>정산 예정 (픽업 전 확정 주문)</small><b style={{ fontSize: 18 }}>{won(sum(pending))}</b><span className="xs muted">{pending.length}건</span></div>
        <div><small>예약금 입금 확인 전</small><b style={{ fontSize: 18, color: unpaid.length ? 'var(--warn)' : undefined }}>{unpaid.length}건</b><span className="xs muted">{won(sum(unpaid))}</span></div>
      </div>
      <div className="card pad" style={{ marginTop: 10 }}>
        <div className="row"><span className="grow b">이번 달 목표</span><button className="btn xs ghost" onClick={() => { const v = prompt('이번 달 목표 매출(원)을 적어 주세요', String(goal)); if (v && +v.replace(/[^\d]/g, '') > 0) setState({ goal: +v.replace(/[^\d]/g, '') }); }}><Icon n="edit" size="sm" />바꾸기</button></div>
        <div className="prog" style={{ marginTop: 8 }}><i style={{ width: Math.min(100, (monthTotal / goal) * 100) + '%' }} /></div>
        <div className="small" style={{ marginTop: 6 }}><b>{won(monthTotal)}</b> / {won(goal)} ({Math.round((monthTotal / goal) * 100)}%)</div>
        <div className="xs muted">{monthTotal < goal && daysLeft > 0 ? `남은 ${daysLeft}일 동안 하루 ${won(Math.ceil((goal - monthTotal) / daysLeft / 1000) * 1000)}씩 팔면 달성해요` : '목표를 달성했어요. 축하해요!'}</div>
      </div>
      {focus.length > 0 && (
        <div className="card pad" style={{ marginTop: 10 }}>
          <div className="b">많이 나간 케이크 <span className="xs muted">{selBar ? selBar.title : title}</span></div>
          {[['크기', top('size', (k) => sizeOf(k).name)], ['디자인', top('design', (k) => designOf(k).name)]].map(([lab, arr]) => (
            <div key={lab} style={{ marginTop: 8 }}><div className="xs muted">{lab}</div>{arr.map((a) => <div key={a.name} className="hbar"><span>{a.name}</span><i><b style={{ width: `${(a.n / arr[0].n) * 100}%` }} /></i><em>{a.n}건</em></div>)}</div>
          ))}
        </div>
      )}
      {decided.length > 0 && (() => { const avg = decided.reduce((a, d) => a + d.mins, 0) / decided.length; return (
        <div className="card pad" style={{ marginTop: 10 }}>
          <div className="b">응대 지표 <span className="xs muted">전체 {decided.length}건</span></div>
          <div className="kpis light" style={{ marginTop: 8 }}>
            <div><small>평균 첫 응답</small><b style={{ fontSize: 16 }}>{avg < 60 ? `${Math.round(avg)}분` : `${(avg / 60).toFixed(1)}시간`}</b></div>
            <div><small>자동 확정</small><b style={{ fontSize: 16 }}>{Math.round((decided.filter((d) => d.auto).length / decided.length) * 100)}%</b></div>
            <div><small>줄인 상담 시간</small><b style={{ fontSize: 16 }}>~{Math.round((decided.length * 12) / 60)}시간</b></div>
          </div>
          <div className="xs muted" style={{ marginTop: 6 }}>‘줄인 상담 시간’은 카톡 상담 1건에 12분이 든다고 가정한 추정이에요.</div>
        </div>); })()}
      <div className="sec-t"><h3>{selBar ? selBar.title : title} 주문 {focus.length}건</h3>{focus.length > 0 && <button className="more" onClick={() => { downloadText(`${shop.name}_매출_${selBar ? selBar.key : period}.csv`, ordersCSV(focus)); toast('엑셀(CSV)로 저장했어요'); }}>엑셀로 받기 ›</button>}</div>
      {focus.length === 0 && <div className="card pad small muted">이 기간에는 주문이 없어요.</div>}
      <div className="card" style={{ padding: focus.length ? '0 14px' : 0 }}>
        {focus.slice().sort((a, b) => (b.o.date + b.o.time).localeCompare(a.o.date + a.o.time)).slice(0, 40).map((o) => (
          <button key={o.id} className="list-row" onClick={() => nav(`/o/order/${o.id}`)}><span className="tag mute">{fmtDate(o.o.date, false)}</span><div className="grow"><div className="t small">{sizeOf(o.o.size).name} {designOf(o.o.design).name}</div><div className="s">{maskName(o.customer?.name)} · {o.o.time}</div></div><b>{won(amount(o))}</b></button>
        ))}
      </div>
    </>
  );
}

// 월별 장부: 달력 칸마다 그날 주문 수·매출, 날짜를 누르면 주문 하나하나
function BookTab({ shop, list }) {
  const [month, setMonth] = useState(() => { const d = today(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [selDay, setSelDay] = useState(null);
  const ymKey = ymd(month).slice(0, 7);
  const sold = list.filter((o) => SALES.includes(o.status) && o.o.date.startsWith(ymKey));
  const canceled = list.filter((o) => ['canceled', 'declined'].includes(o.status) && o.o.date.startsWith(ymKey));
  const byDay = {};
  sold.forEach((o) => { const d = (byDay[o.o.date] = byDay[o.o.date] || { n: 0, v: 0, os: [] }); d.n++; d.v += amount(o); d.os.push(o); });
  const total = sold.reduce((a, o) => a + amount(o), 0);
  const dim = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate(), startDow = month.getDay();
  const maxV = Math.max(1, ...Object.values(byDay).map((d) => d.v));
  const days = Object.keys(byDay).sort();
  const best = days.slice().sort((a, b) => byDay[b].v - byDay[a].v)[0];
  const rows = selDay ? (byDay[selDay]?.os || []) : sold.slice().sort((a, b) => (a.o.date + a.o.time).localeCompare(b.o.date + b.o.time));
  // 주차별 합계
  const weeks = [];
  for (let d = 1; d <= dim; d++) { const dt = new Date(month.getFullYear(), month.getMonth(), d); const w = Math.floor((d + startDow - 1) / 7); weeks[w] = weeks[w] || { n: 0, v: 0, from: d, to: d }; weeks[w].to = d; const x = byDay[ymd(dt)]; if (x) { weeks[w].n += x.n; weeks[w].v += x.v; } }
  return (
    <>
      <div className="row" style={{ marginBottom: 10 }}>
        <button className="btn xs line" onClick={() => { setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1)); setSelDay(null); }} aria-label="이전 달"><Icon n="back" size="sm" /></button>
        <b className="grow center" style={{ fontSize: 17 }}>{month.getFullYear()}년 {month.getMonth() + 1}월 장부</b>
        <button className="btn xs line" onClick={() => { setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1)); setSelDay(null); }} aria-label="다음 달"><Icon n="right" size="sm" /></button>
      </div>
      <div className="kpis light">
        <div><small>매출</small><b style={{ fontSize: 17 }}>{man(total)}원</b></div>
        <div><small>주문</small><b style={{ fontSize: 17 }}>{sold.length}건</b></div>
        <div><small>평균 단가</small><b style={{ fontSize: 17 }}>{sold.length ? man(Math.round(total / sold.length / 100) * 100) + '원' : '-'}</b></div>
      </div>
      <div className="card pad" style={{ marginTop: 10 }}>
        <div className="cal book">
          {DOW.map((d) => <div key={d} className="h">{d}</div>)}
          {Array.from({ length: startDow }, (_, i) => <div key={'e' + i} />)}
          {Array.from({ length: dim }, (_, i) => {
            const dt = new Date(month.getFullYear(), month.getMonth(), i + 1), key = ymd(dt), x = byDay[key];
            const off = shop.ops.closedDays.includes(dt.getDay()) || shop.ops.holidays.includes(key);
            // 매출 많을수록 진한 초록 5단계 · 휴무는 점선 · 앞으로 올 날은 옅은 회색
            const lv = x ? Math.min(4, 1 + Math.floor((x.v / maxV) * 3.999)) : 0;
            const future = key > ymd(today());
            return (
              <button key={key} className={`d hv${x ? lv : off ? 'off' : future ? 'f' : '0'} ${key === selDay ? 'sel' : ''}`} onClick={() => setSelDay(selDay === key ? null : key)}>
                <span className="dn">{i + 1}</span>
                {x ? <small>{man(x.v)}</small> : off ? <small className="offt">휴무</small> : null}
              </button>
            );

          })}
        </div>
        <div className="heatlegend"><span>적음</span><i className="hv1" /><i className="hv2" /><i className="hv3" /><i className="hv4" /><i className="hv5" /><span>많음</span><span className="grow" style={{ textAlign: 'right' }}>날짜를 누르면 그날 주문</span></div>
        {best && <div className="xs muted" style={{ marginTop: 6 }}>가장 많이 판 날: {fmtDate(best)} ({won(byDay[best].v)})</div>}
      </div>
      <div className="card pad" style={{ marginTop: 10 }}>
        <div className="b small">주차별 합계</div>
        {weeks.filter(Boolean).map((w, i) => <div key={i} className="hbar"><span>{i + 1}주 <small className="muted">{w.from}~{w.to}일</small></span><i><b style={{ width: `${(w.v / Math.max(1, ...weeks.filter(Boolean).map((x) => x.v))) * 100}%` }} /></i><em>{w.n}건 · {man(w.v)}</em></div>)}
        {canceled.length > 0 && <div className="xs muted" style={{ marginTop: 6 }}>취소·거절 {canceled.length}건은 매출에서 뺐어요.</div>}
      </div>
      <div className="sec-t"><h3>{selDay ? fmtDate(selDay) : `${month.getMonth() + 1}월 전체`} · {rows.length}건</h3>
        <span className="row" style={{ gap: 10 }}>{selDay && <button className="more" onClick={() => setSelDay(null)}>전체 보기</button>}{rows.length > 0 && <button className="more" onClick={() => { downloadText(`${shop.name}_장부_${selDay || ymKey}.csv`, ordersCSV(rows)); toast('엑셀(CSV)로 저장했어요'); }}>엑셀 ›</button>}</span></div>
      {rows.length === 0 ? <div className="card pad small muted">주문이 없어요.</div> : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table className="ledger">
            <thead><tr><th>날짜</th><th>주문</th><th>손님</th><th className="r">금액</th><th>입금</th></tr></thead>
            <tbody>{rows.map((o) => (
              <tr key={o.id} onClick={() => nav(`/o/order/${o.id}`)}>
                <td>{parseYmd(o.o.date).getDate()}일<small>{o.o.time}</small></td>
                <td>{sizeOf(o.o.size).name} {designOf(o.o.design).name}<small>{o.o.noText ? '문구 없음' : `“${o.o.text}”`}</small></td>
                <td>{maskName(o.customer?.name)}</td>
                <td className="r"><b>{amount(o).toLocaleString()}</b></td>
                <td>{o.paid ? <span className="tag ok">완료</span> : <span className="tag warn">전</span>}</td>
              </tr>))}
              <tr className="sum"><td colSpan={3}>합계 {rows.length}건</td><td className="r"><b>{rows.reduce((a, o) => a + amount(o), 0).toLocaleString()}</b></td><td /></tr>
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// 근무기록: 누가 언제 몇 시간 일했는지 + 그날 만든 케이크 수·매출
function WorkTab({ st, shop, list }) {
  const [month, setMonth] = useState(() => { const d = today(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [add, setAdd] = useState(null);
  const [staffOpen, setStaffOpen] = useState(false);
  const ymKey = ymd(month).slice(0, 7);
  const logs = (st.worklog || []).filter((w) => w.date.startsWith(ymKey)).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  const staff = st.staff?.length ? st.staff : [{ name: '사장님', wage: 0 }];
  const hours = (w) => { const [sh, sm] = w.start.split(':').map(Number), [eh, em] = w.end.split(':').map(Number); return Math.max(0, (eh * 60 + em - sh * 60 - sm - (w.rest || 0)) / 60); };
  const wageOf = (n) => staff.find((s) => s.name === n)?.wage || 0;
  const per = {};
  logs.forEach((w) => { const p = (per[w.name] = per[w.name] || { h: 0, days: new Set() }); p.h += hours(w); p.days.add(w.date); });
  const sold = list.filter((o) => SALES.includes(o.status) && o.o.date.startsWith(ymKey));
  const made = {}; sold.forEach((o) => { made[o.o.date] = (made[o.o.date] || 0) + 1; });
  const totalH = logs.reduce((a, w) => a + hours(w), 0), totalPay = logs.reduce((a, w) => a + hours(w) * wageOf(w.name), 0);
  const save = () => {
    if (!add.name || !add.date || add.end <= add.start) { toast('이름·날짜·시간을 확인해 주세요'); return; }
    setState((s) => ({ ...s, worklog: [...(s.worklog || []).filter((w) => w.id !== add.id), { ...add, id: add.id || 'w' + Date.now().toString(36) }] }));
    setAdd(null); toast('근무 기록을 저장했어요');
  };
  const byDate = {}; logs.forEach((w) => { (byDate[w.date] = byDate[w.date] || []).push(w); });
  return (
    <>
      <div className="row" style={{ marginBottom: 10 }}>
        <button className="btn xs line" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="이전 달"><Icon n="back" size="sm" /></button>
        <b className="grow center" style={{ fontSize: 17 }}>{month.getFullYear()}년 {month.getMonth() + 1}월 근무기록</b>
        <button className="btn xs line" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="다음 달"><Icon n="right" size="sm" /></button>
      </div>
      <div className="kpis light">
        <div><small>근무 시간</small><b style={{ fontSize: 17 }}>{totalH.toFixed(1)}시간</b></div>
        <div><small>인건비</small><b style={{ fontSize: 17 }}>{totalPay ? man(Math.round(totalPay / 100) * 100) + '원' : '-'}</b></div>
        <div><small>만든 케이크</small><b style={{ fontSize: 17 }}>{sold.length}개</b></div>
      </div>
      <div className="btns" style={{ marginTop: 10 }}>
        <button className="btn pri sm" style={{ flex: 2 }} onClick={() => setAdd({ name: staff[0].name, date: ymd(today()), start: shop.ops.pickupStart || '10:00', end: shop.ops.pickupEnd || '19:00', rest: 60, memo: '' })}><Icon n="plus" size="sm" />근무 기록 추가</button>
        <button className="btn line sm" onClick={() => setStaffOpen(true)}><Icon n="user" size="sm" />직원·시급</button>
      </div>
      {Object.keys(per).length > 0 && (
        <div className="card" style={{ marginTop: 10, overflow: 'hidden' }}>
          <table className="ledger"><thead><tr><th>이름</th><th className="r">일수</th><th className="r">시간</th><th className="r">시급</th><th className="r">급여</th></tr></thead>
            <tbody>{Object.entries(per).map(([n, p]) => <tr key={n}><td><b>{n}</b></td><td className="r">{p.days.size}일</td><td className="r">{p.h.toFixed(1)}</td><td className="r">{wageOf(n) ? wageOf(n).toLocaleString() : '-'}</td><td className="r"><b>{wageOf(n) ? Math.round(p.h * wageOf(n)).toLocaleString() : '-'}</b></td></tr>)}
              <tr className="sum"><td colSpan={2}>합계</td><td className="r">{totalH.toFixed(1)}</td><td /><td className="r"><b>{totalPay ? Math.round(totalPay).toLocaleString() : '-'}</b></td></tr></tbody></table>
        </div>
      )}
      <div className="sec-t"><h3>날짜별 기록</h3><span className="more">{logs.length}건</span></div>
      {logs.length === 0 && <div className="card pad small muted">이 달 근무 기록이 없어요. ‘근무 기록 추가’로 출근·퇴근 시간을 적어 보세요.<br />그날 만든 케이크 수와 함께 볼 수 있어요.</div>}
      {Object.entries(byDate).map(([d, ws]) => (
        <div key={d} className="card pad" style={{ marginBottom: 8 }}>
          <div className="row"><b className="grow">{fmtDate(d)}</b><span className="tag">{made[d] || 0}개 제작</span><span className="tag mute">{ws.reduce((a, w) => a + hours(w), 0).toFixed(1)}시간</span></div>
          {ws.map((w) => <button key={w.id} className="list-row" style={{ padding: '9px 0' }} onClick={() => setAdd(w)}><div className="grow"><div className="t small">{w.name} · {w.start}~{w.end}{w.rest ? ` (휴게 ${w.rest}분)` : ''}</div>{w.memo && <div className="s">{w.memo}</div>}</div><b className="small">{hours(w).toFixed(1)}h</b><Icon n="edit" size="sm" /></button>)}
        </div>
      ))}
      <Sheet open={!!add} onClose={() => setAdd(null)} title={add?.id ? '근무 기록 고치기' : '근무 기록 추가'}
        footer={<div className="btns">{add?.id && <button className="btn danger" style={{ flex: 0.6 }} onClick={() => { setState((s) => ({ ...s, worklog: s.worklog.filter((w) => w.id !== add.id) })); setAdd(null); toast('지웠어요'); }}>삭제</button>}<button className="btn pri" style={{ flex: 2 }} onClick={save}>저장</button></div>}>
        {add && (<>
          <div className="lbl">누가</div>
          <div className="chips wrap">{staff.map((s) => <button key={s.name} className={`chip ${add.name === s.name ? 'on' : ''}`} onClick={() => setAdd({ ...add, name: s.name })}>{s.name}</button>)}</div>
          <Field label="날짜"><input type="date" className="inp" value={add.date} onChange={(e) => setAdd({ ...add, date: e.target.value })} /></Field>
          <div className="row"><Field label="출근"><input type="time" className="inp" value={add.start} onChange={(e) => setAdd({ ...add, start: e.target.value })} /></Field><Field label="퇴근"><input type="time" className="inp" value={add.end} onChange={(e) => setAdd({ ...add, end: e.target.value })} /></Field></div>
          <div className="lbl">휴게 시간</div>
          <Seg value={add.rest || 0} onChange={(v) => setAdd({ ...add, rest: v })} items={[[0, '없음'], [30, '30분'], [60, '1시간'], [90, '1시간 30분']]} />
          <Field label="메모"><input className="inp" value={add.memo || ''} onChange={(e) => setAdd({ ...add, memo: e.target.value })} placeholder="예) 2호 캐릭터 3개 제작, 재료 정리" maxLength={80} /></Field>
        </>)}
      </Sheet>
      <StaffSheet open={staffOpen} onClose={() => setStaffOpen(false)} staff={staff} />
    </>
  );
}
function StaffSheet({ open, onClose, staff }) {
  const [name, setName] = useState('');
  const upd = (list) => setState((s) => ({ ...s, staff: list }));
  return (
    <Sheet open={open} onClose={onClose} title="직원 · 시급">
      <div className="small muted" style={{ marginBottom: 8 }}>시급을 넣으면 근무 시간으로 한 달 급여가 자동 계산돼요. (사장님은 0원으로 두면 돼요)</div>
      <div className="card" style={{ padding: '0 12px' }}>
        {staff.map((s, i) => (
          <div key={s.name} className="pricerow"><div className="nm">{s.name}</div>
            <span className="w"><input className="inp" inputMode="numeric" value={s.wage ? s.wage.toLocaleString() : ''} placeholder="시급" onChange={(e) => upd(staff.map((x, k) => (k === i ? { ...x, wage: +e.target.value.replace(/[^\d]/g, '') || 0 } : x)))} /></span>
            {staff.length > 1 && <button className="btn xs ghost" onClick={() => upd(staff.filter((_, k) => k !== i))}>삭제</button>}
          </div>))}
      </div>
      <div className="row" style={{ marginTop: 10 }}><input className="inp grow" value={name} onChange={(e) => setName(e.target.value)} placeholder="직원 이름 추가" maxLength={12} /><button className="btn dark sm" style={{ minHeight: 48 }} onClick={() => { const n = name.trim(); if (n && !staff.some((s) => s.name === n)) { upd([...staff, { name: n, wage: 10320 }]); setName(''); } }}>추가</button></div>
      <div className="xs muted" style={{ marginTop: 8 }}>새 직원 시급은 2026년 최저시급(10,320원)으로 채워져요. 바꿀 수 있어요.</div>
    </Sheet>
  );
}
