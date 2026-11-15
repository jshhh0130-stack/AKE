import { useEffect, useMemo, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import { CustomerTabBar } from '../../components/TabBar.jsx';
import { CakeView, Header, Empty, StatusTag, Stars, toast } from '../../components/ui.jsx';
import { LogoBadge } from '../../components/Logo.jsx';
import { useApp, setState } from '../../lib/state.js';
import { nav } from '../../lib/router.js';
import { getStores, rankStores, mapLinks, canOrderInApp } from '../../lib/stores.js';
import { STATUS, ACTIVE, custAcceptChange, custApproveProof, custCancel, custReview, loadDemoShop, markSeen } from '../../lib/orders.js';
import { orderLink, giftLink } from '../../lib/share.js';

export function GiftButton({ order }) {
  if (!order.gift) return null;
  return (
    <button className="btn sec block" onClick={async () => {
      const url = await giftLink(order);
      const r = await shareText({ title: '케이크 선물이 도착했어요', text: `${order.gift.to}님, ${order.gift.from || '친구'}님이 보낸 케이크 선물이 도착했어요! 🎂`, url });
      if (r === 'copied') toast('선물 카드 링크를 복사했어요. 받는 분께 보내 주세요');
    }}>🎁 {order.gift.to}님께 선물 카드 보내기</button>
  );
}
import { range, won, fmtDate, ago, shareText, copyText, maskPhone } from '../../lib/util.js';
import { SHAPES, FLAVORS, RICE_FLAVORS, TOPPINGS, EXTRAS, sizeOf, designOf, creamOf, fontOf, textColorOf, optName } from '../../data/catalog.js';
import { DEMO_ID } from '../../data/demo.js';
import { StoreCard } from './Home.jsx';

export const orderView = (order) => ({ ...order.o, text: order.o.noText ? '' : order.o.text, photo: order.o.design === 'photo' ? order.refThumb : undefined });
export function orderText(order, link) {
  const o = order.o;
  const deco = [...(o.toppings || []).map((t) => optName(TOPPINGS, t)), ...(o.extras || []).map((t) => optName(EXTRAS, t))];
  return [
    `[디어 케이크 주문서] ${order.id}`,
    `· 성함/연락처: ${order.customer?.name || ''}${order.customer?.phone ? ' / ' + order.customer.phone : ''}`,
    `· 픽업: ${fmtDate(o.date)} ${o.time || ''}`,
    `· 케이크: ${sizeOf(o.size).name}(${sizeOf(o.size).cm}cm) ${optName(SHAPES, o.shape)} / ${designOf(o.design).name}`,
    `· 맛/크림: ${optName([...FLAVORS, ...RICE_FLAVORS], o.flavor)} / ${creamOf(o.cream).name}`,
    `· 문구: ${o.noText ? '없음' : `"${o.text}" (${fontOf(o.font).name}체, ${textColorOf(o.textColor).name})`}`,
    deco.length ? `· 장식/추가: ${deco.join(', ')}${o.plateText ? ` (판 문구: ${o.plateText})` : ''}` : null,
    o.request ? `· 요청사항: ${o.request}` : null,
    o.allergy ? `· 알레르기: ${o.allergy}` : null,
    order.gift ? `· 선물: 받는 분 ${order.gift.to}님이 픽업해요` : null,
    `· 예상 금액: ${range(order.est?.lo, order.est?.hi)} (디어 케이크 계산)`,
    link ? `· 시안 보기: ${link}` : null,
  ].filter(Boolean).join('\n');
}

export function Timeline({ order }) {
  const s = order.status;
  const steps = [
    ['요청서 보냄', '미리보기와 옵션이 작업지시서로 전달됐어요'],
    ['사장님 확인', s === 'change' ? '사장님이 수정 제안을 보냈어요' : '가게 규칙에 맞는지 확인해요'],
    ['주문 확정', order.finalPrice ? `최종 ${won(order.finalPrice)}` : '확정되면 예약금 안내가 와요'],
    ['제작', s === 'proof' ? '제작 전 시안을 확인해 주세요' : '정성껏 만들어요'],
    ['픽업', `${fmtDate(order.o.date)} ${order.o.time || ''}`],
  ];
  const step = STATUS[s]?.step ?? 0;
  return (
    <ul className="tl">
      {steps.map(([b, sm], i) => {
        const cls = i < step ? 'done' : i === step ? 'now' : '';
        return <li key={i} className={['declined', 'canceled'].includes(s) ? '' : s === 'done' ? 'done' : cls}><span className="d">{i + 1}</span><div><b>{b}</b><small>{sm}</small></div></li>;
      })}
    </ul>
  );
}

function Ticket({ order, children }) {
  const o = order.o;
  return (
    <div className="ticket">
      <div className="stage"><CakeView o={orderView(order)} fancy /></div>
      <div className="tb">
        <div className="row"><b className="grow">{order.storeName}</b><StatusTag status={order.status} /></div>
        <div className="xs muted">{order.id} · {fmtDate(o.date)} {o.time} 픽업</div>
        <div className="hr" />
        <div className="kv"><span>케이크</span><b>{sizeOf(o.size).name} · {optName(SHAPES, o.shape)} · {designOf(o.design).name}</b></div>
        <div className="kv"><span>맛·크림</span><b>{optName([...FLAVORS, ...RICE_FLAVORS], o.flavor)} · {creamOf(o.cream).name}</b></div>
        <div className="kv"><span>문구</span><b>{o.noText ? '문구 없음' : `“${o.text}”`}</b></div>
        <div className="kv"><span>{order.finalPrice ? '확정 금액' : '예상 금액'}</span><b className="pink">{order.finalPrice ? won(order.finalPrice) : range(order.est?.lo, order.est?.hi)}</b></div>
        {children}
      </div>
    </div>
  );
}

export function OrderDone({ params }) {
  const st = useApp();
  const order = st.orders.find((x) => x.id === params.id);
  const [link, setLink] = useState(null);
  if (!order) return <div className="screen"><Header title="주문" fallback="/c" /><Empty>주문을 찾을 수 없어요.</Empty></div>;
  const store = getStores(st).find((s) => s.id === order.storeId);
  const ext = order.status === 'external';
  const auto = order.status === 'confirmed';
  const getLink = async () => { const l = link || (await orderLink(order)); setLink(l); return l; };
  const toOwner = () => {
    if (order.storeId === DEMO_ID && st.shop?.id !== DEMO_ID) loadDemoShop();
    setState({ role: 'owner' });
    nav(`/o/order/${order.id}`, { replace: true });
    toast('사장님 화면이에요. 손님이 보낸 주문서가 도착해 있어요');
  };
  return (
    <div className="screen">
      <Header title={ext ? '주문서 완성' : '주문 요청 완료'} onBack={() => nav(`/store/${order.storeId}`, { replace: true })} />
      <div className="scroll pad">
        <div className={`okmark ${auto ? 'ok' : ''}`}><Icon n={ext ? 'receipt' : 'check'} size="lg" /></div>
        <h2 className="center" style={{ margin: 0, fontSize: 22 }}>{ext ? '주문서가 완성됐어요' : auto ? '주문이 바로 확정됐어요!' : '사장님께 보냈어요!'}</h2>
        <p className="center small muted" style={{ margin: '6px 0 16px' }}>
          {ext ? <>이 가게는 아직 디어 케이크 입점 전이에요.<br />완성된 주문서를 가게 카톡·인스타로 그대로 보내 주세요.</>
            : auto ? <>사장님이 정해 둔 규칙 안의 주문이라 자동 확정됐어요.<br />예약금 안내를 기다려 주세요.</>
            : <>{order.storeName} 사장님이 확인하고 최종 금액을 확정해 드려요.<br />확인 필요한 항목 {order.checks.filter((c) => !c.ok).length}개도 함께 보냈어요.</>}
        </p>
        <Ticket order={order}>{!ext && <Timeline order={order} />}</Ticket>
        {ext && (
          <div className="col" style={{ marginTop: 14 }}>
            <button className="btn pri block" onClick={async () => { const l = await getLink(); const ok = await copyText(orderText(order, l)); toast(ok ? '주문서를 복사했어요. 가게 채팅창에 붙여 넣으세요' : '복사하지 못했어요'); }}><Icon n="copy" size="sm" /> 주문서 글 복사하기</button>
            <button className="btn line block" onClick={async () => { const l = await getLink(); const r = await shareText({ title: '케이크 주문서', text: orderText(order), url: l }); if (r === 'copied') toast('공유 대신 복사했어요'); }}><Icon n="share" size="sm" /> 카톡·문자로 보내기</button>
            {store && (
              <div className="linkrow" style={{ marginTop: 0 }}>
                {store.insta && <a href={mapLinks(store).insta} target="_blank" rel="noreferrer"><Icon n="insta" />인스타 열기</a>}
                <a href={mapLinks(store).kakao} target="_blank" rel="noreferrer"><Icon n="chat" />카카오맵</a>
                <a href={mapLinks(store).naver} target="_blank" rel="noreferrer"><Icon n="search" />네이버지도</a>
              </div>
            )}
            <div className="note">가게에 보낼 때 “디어 케이크 주문서예요”라고 말해 주세요. 링크를 열면 사장님도 시안을 볼 수 있어요.</div>
          </div>
        )}
        {ext && order.gift && <div style={{ marginTop: 10 }}><GiftButton order={order} /></div>}
        {!ext && (
          <div className="col" style={{ marginTop: 14 }}>
            <GiftButton order={order} />
            <button className="btn pri block" onClick={() => nav(`/c/order/${order.id}`, { replace: true })}>주문 상태 보기</button>
            {canOrderInApp(store) && <button className="btn sec block" onClick={toOwner}><Icon n="swap" size="sm" /> (체험) 사장님 화면에서 받아 보기</button>}
            <button className="btn ghost block" onClick={() => nav('/c', { replace: true })}>지도로 돌아가기</button>
          </div>
        )}
        <div style={{ height: 24 }} />
      </div>
    </div>
  );
}

export function MyOrders() {
  const st = useApp();
  const [tab, setTab] = useState('now');
  const mine = st.orders.filter((o) => o.mine).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const list = mine.filter((o) => (tab === 'now' ? [...ACTIVE, 'external'].includes(o.status) : !ACTIVE.includes(o.status) && o.status !== 'external'));
  return (
    <div className="screen fade">
      <div className="hdr"><h1 style={{ paddingLeft: 10 }}>주문내역</h1></div>
      <div className="pad" style={{ paddingBottom: 0 }}><div className="seg"><button className={tab === 'now' ? 'on' : ''} onClick={() => setTab('now')}>진행 중</button><button className={tab === 'past' ? 'on' : ''} onClick={() => setTab('past')}>지난 주문</button></div></div>
      <div className="scroll pad with-tab">
        {list.length === 0 && <Empty icon="🧾">{tab === 'now' ? <>진행 중인 주문이 없어요.<br />지도에서 마음에 드는 가게를 찾아보세요!</> : '지난 주문이 없어요.'}</Empty>}
        {list.map((o) => (
          <button key={o.id} className="ocard" onClick={() => nav(`/c/order/${o.id}`)}>
            <div className="th"><CakeView o={orderView(o)} /></div>
            <div className="grow">
              <div className="t1"><span className="grow">{o.storeName}</span><StatusTag status={o.status} /></div>
              <div className="t2">{fmtDate(o.o.date)} {o.o.time} · {sizeOf(o.o.size).name} {designOf(o.o.design).name}</div>
              <div className="t2"><b className="pink">{o.finalPrice ? won(o.finalPrice) : range(o.est?.lo, o.est?.hi)}</b> · {ago(o.createdAt)}</div>
              {(o.history?.length || 0) > (st.seen?.[o.id] ?? o.history?.length ?? 0) && <div className="tag dark" style={{ marginTop: 6 }}>● 새 소식</div>}
              {o.status === 'change' && <div className="tag warn" style={{ marginTop: 6 }}>사장님 수정 제안 확인하기</div>}
              {o.status === 'proof' && <div className="tag warn" style={{ marginTop: 6 }}>시안 확인하기</div>}
            </div>
          </button>
        ))}
      </div>
      <CustomerTabBar current="/c/orders" />
    </div>
  );
}

export function CustomerOrder({ params }) {
  const st = useApp();
  const order = st.orders.find((x) => x.id === params.id);
  const [stars, setStars] = useState(5);
  const [rv, setRv] = useState('');
  useEffect(() => { if (order) markSeen(order); }, [order?.history?.length]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!order) return <div className="screen"><Header title="주문" fallback="/c/orders" /><Empty>주문을 찾을 수 없어요.</Empty></div>;
  const store = getStores(st).find((s) => s.id === order.storeId);
  const s = order.status;
  const msgs = order.history || [];
  return (
    <div className="screen">
      <Header title="주문 상세" fallback="/c/orders" />
      <div className="scroll pad">
        <Ticket order={order}>{s !== 'external' && <Timeline order={order} />}</Ticket>
        {s === 'change' && (
          <div className="card pad" style={{ marginTop: 12, borderColor: '#F6D9B5' }}>
            <div className="b">사장님 수정 제안</div>
            <div className="small" style={{ margin: '6px 0' }}>{msgs.filter((m) => m.type === 'change').slice(-1)[0]?.msg}</div>
            {order.proposedPrice && <div className="kv"><span>제안 금액</span><b className="pink">{won(order.proposedPrice)}</b></div>}
            <div className="btns" style={{ marginTop: 10 }}><button className="btn line" onClick={() => { custCancel(order.id); toast('주문을 취소했어요'); }}>취소</button><button className="btn pri" style={{ flex: 2 }} onClick={() => { custAcceptChange(order.id); toast('수정 제안을 수락했어요. 주문이 확정됐어요!'); }}>제안 수락하고 확정</button></div>
          </div>
        )}
        {s === 'proof' && (
          <div className="card pad" style={{ marginTop: 12 }}>
            <div className="b">제작 전 시안이 도착했어요</div>
            <div style={{ margin: '10px 0', borderRadius: 14, overflow: 'hidden', background: 'var(--p50)' }}>{order.proofPhoto ? <img src={order.proofPhoto} alt="시안" style={{ width: '100%' }} /> : <CakeView o={orderView(order)} fancy style={{ height: 180 }} />}</div>
            <div className="small muted">{msgs.filter((m) => m.type === 'proof').slice(-1)[0]?.msg}</div>
            <button className="btn pri block" style={{ marginTop: 10 }} onClick={() => { custApproveProof(order.id); toast('시안을 승인했어요. 제작을 시작해요!'); }}>시안 승인하기</button>
          </div>
        )}
        {s === 'external' && (
          <div className="note" style={{ marginTop: 12 }}>입점 전 가게라 앱에서 상태가 바뀌지 않아요. 주문서를 가게에 보내고 답을 기다려 주세요.
            <div className="row" style={{ marginTop: 8 }}><button className="btn sm line" onClick={async () => { const ok = await copyText(orderText(order, await orderLink(order))); toast(ok ? '주문서를 복사했어요' : '복사 실패'); }}>주문서 복사</button>{store?.insta && <a className="btn sm line" href={mapLinks(store).insta} target="_blank" rel="noreferrer">인스타</a>}</div>
          </div>
        )}
        {order.paid && ['confirmed', 'proof', 'making', 'ready', 'done'].includes(s) && <div className="note ok" style={{ marginTop: 12 }}>✓ 사장님이 예약금 입금을 확인했어요.</div>}
        {!order.paid && ['confirmed', 'making', 'ready'].includes(s) && store?.ops?.deposit ? <div className="note pink" style={{ marginTop: 12 }}>예약금 {store.ops.deposit}%({won(Math.round(((order.finalPrice || order.est.lo) * store.ops.deposit) / 100 / 100) * 100)})를 입금하면 제작이 시작돼요. 계좌는 사장님이 안내해요.</div> : null}
        <div className="sec-t"><h3>대화 기록</h3></div>
        {msgs.map((m, i) => <div key={i} className={`msg ${m.by === 'customer' ? 'me' : m.by === 'system' ? 'sys' : ''}`}><small>{m.by === 'customer' ? '나' : m.by === 'system' ? '자동 확정' : `${order.storeName} 사장님`} · {ago(m.at)}</small>{m.msg}</div>)}
        {s === 'done' && !order.review && (
          <div className="card pad" style={{ marginTop: 14 }}>
            <div className="b">후기를 남겨 주세요</div>
            <div className="row" style={{ margin: '8px 0' }}>{[1, 2, 3, 4, 5].map((n) => <button key={n} onClick={() => setStars(n)} style={{ color: '#FFB400' }}><Icon n="star" style={{ width: 30, height: 30, fill: n <= stars ? '#FFB400' : 'none', stroke: '#FFB400' }} /></button>)}</div>
            <textarea className="inp" value={rv} onChange={(e) => setRv(e.target.value)} placeholder="미리보기랑 얼마나 비슷했나요?" maxLength={200} />
            <button className="btn pri block" style={{ marginTop: 8 }} onClick={() => { custReview(order.id, stars, rv.trim() || '좋았어요!'); toast('후기 고마워요!'); }}>후기 올리기</button>
          </div>
        )}
        {order.review && <div className="card pad" style={{ marginTop: 14 }}><Stars n={order.review.stars} /><div className="small" style={{ marginTop: 4 }}>{order.review.text}</div></div>}
        {s === 'requested' && <button className="btn danger block" style={{ marginTop: 16 }} onClick={() => { if (confirm('주문 요청을 취소할까요?')) { custCancel(order.id); toast('주문을 취소했어요'); } }}>주문 요청 취소</button>}
        {order.gift && <div style={{ marginTop: 12 }}><GiftButton order={order} /></div>}
        {['done', 'canceled', 'declined', 'external'].includes(s) && (
          <button className="btn sec block" style={{ marginTop: 10 }} onClick={() => { const { date, time, refPhoto, ...d } = order.o; nav(`/order/${order.storeId}?from=${encodeURIComponent(JSON.stringify(d))}`); }}><Icon n="refresh" size="sm" /> 같은 케이크 다시 주문하기</button>
        )}
        {store && (store.insta || store.kakao) && (
          <div className="linkrow">
            {store.insta && <a href={mapLinks(store).insta} target="_blank" rel="noreferrer"><Icon n="insta" />인스타 문의</a>}
            <a href={mapLinks(store).kakao} target="_blank" rel="noreferrer"><Icon n="map" />카카오맵</a>
            <a href={mapLinks(store).route} target="_blank" rel="noreferrer"><Icon n="pin" />길찾기</a>
          </div>
        )}
        <button className="btn ghost block" style={{ marginTop: 10 }} onClick={() => nav(`/store/${order.storeId}`)}>가게 보기</button>
        <div style={{ height: 24 }} />
      </div>
    </div>
  );
}

export function Saved() {
  const st = useApp();
  const stores = useMemo(() => getStores(st), [st.shop, st.found]); // eslint-disable-line react-hooks/exhaustive-deps
  const rows = rankStores(stores.filter((s) => st.favs.includes(s.id)), { loc: st.loc, radius: 9999, sort: 'near' });
  return (
    <div className="screen fade">
      <div className="hdr"><h1 style={{ paddingLeft: 10 }}>찜한 가게</h1></div>
      <div className="scroll pad with-tab">
        {rows.length === 0 && <Empty icon="💗">찜한 가게가 없어요.<br />가게 카드의 하트를 눌러 모아 보세요.</Empty>}
        {rows.map((r) => <StoreCard key={r.s.id} r={r} fav onFav={() => setState((x) => ({ ...x, favs: x.favs.filter((i) => i !== r.s.id) }))} onClick={() => nav(`/store/${r.s.id}`)} />)}
      </div>
      <CustomerTabBar current="/c/saved" />
    </div>
  );
}

export function My() {
  const st = useApp();
  const mine = st.orders.filter((o) => o.mine);
  return (
    <div className="screen fade">
      <div className="hdr"><h1 style={{ paddingLeft: 10 }}>마이</h1></div>
      <div className="scroll pad with-tab">
        <div className="card pad row" style={{ gap: 14 }}>
          <LogoBadge size={52} />
          <div className="grow"><div className="b" style={{ fontSize: 17 }}>{st.me?.name ? `${st.me.name}님` : '디어 케이크 고객님'}</div><div className="small muted">{st.me?.phone ? maskPhone(st.me.phone) : '주문하면 이름이 저장돼요'}</div></div>
        </div>
        <div className="kpis light" style={{ marginTop: 12 }}>
          <div><small>주문</small><b>{mine.length}</b></div>
          <div><small>진행 중</small><b>{mine.filter((o) => ACTIVE.includes(o.status)).length}</b></div>
          <div><small>찜</small><b>{st.favs.length}</b></div>
        </div>
        <div className="sec-t"><h3>설정</h3></div>
        <div className="card" style={{ padding: '0 14px' }}>
          <button className="list-row" onClick={() => { setState({ role: 'owner' }); nav(st.shop ? '/o' : '/o/setup', { replace: true }); }}><Icon n="swap" /><div className="grow"><div className="t">사장님 모드로 바꾸기</div><div className="s">가게 등록·주문 관리</div></div><Icon n="right" size="sm" /></button>
          <button className="list-row" onClick={() => nav('/guide')}><Icon n="info" /><div className="grow"><div className="t">사용 가이드 다시 보기</div></div><Icon n="right" size="sm" /></button>
          <button className="list-row" onClick={() => nav('/settings')}><Icon n="sparkle" /><div className="grow"><div className="t">AI · 지도 연결</div><div className="s">{st.settings.claudeKey ? 'AI 연결됨' : 'AI 키 없음(기본 분석 사용)'} · {st.settings.kakaoKey ? '카카오 지도' : '기본 지도'}</div></div><Icon n="right" size="sm" /></button>
          <button className="list-row" onClick={() => nav('/insight')}><Icon n="chart" /><div className="grow"><div className="t">시장 데이터 · 인사이트</div><div className="s">수원 가게 {'43'}곳 분석 · 가격 분포 · 시장 근거</div></div><Icon n="right" size="sm" /></button>
          <button className="list-row" onClick={() => nav('/about')}><Icon n="receipt" /><div className="grow"><div className="t">앱 정보 · 데이터 출처</div><div className="s">가게 정보와 가격 추정 방법</div></div><Icon n="right" size="sm" /></button>
        </div>
      </div>
      <CustomerTabBar current="/c/my" />
    </div>
  );
}
