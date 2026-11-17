import { useMemo, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import { CustomerTabBar } from '../../components/TabBar.jsx';
import { CakeView, Header, Empty, StatusTag, toast } from '../../components/ui.jsx';
import { NotiSettings } from '../../components/Noti.jsx';
import { LogoBadge } from '../../components/Logo.jsx';
import { useApp, setState } from '../../lib/state.js';
import { nav } from '../../lib/router.js';
import { getStores, rankStores, mapLinks, canOrderInApp, shopToStore } from '../../lib/stores.js';
import { STATUS, ACTIVE, unreadOf, evText, applyEvent, mkEvent } from '../../lib/orders.js';
import { estimate, ruleCheck } from '../../lib/price.js';
import { orderLink, giftLink } from '../../lib/share.js';
import { orderView, orderText } from '../../lib/ordertext.js';
import { range, won, fmtDate, ago, shareText, copyText, maskPhone } from '../../lib/util.js';
import { SHAPES, sizeOf, designOf, creamOf, optName } from '../../data/catalog.js';
import { flavorName } from '../../lib/ordertext.js';
import { StoreCard } from './Home.jsx';
import { fromSeed } from '../../lib/claim.js';

export function OrderDone({ params }) {
  const st = useApp();
  const order = st.orders.find((x) => x.id === params.id);
  const [link, setLink] = useState(null);
  if (!order) return <div className="screen"><Header title="주문" fallback="/c" /><Empty>주문을 찾을 수 없어요.</Empty></div>;
  const store = getStores(st).find((s) => s.id === order.storeId);
  const ext = order.status === 'external';
  const auto = order.status === 'confirmed';
  const o = order.o;
  const getLink = async () => { const l = link || (await orderLink(order)); setLink(l); return l; };
  const local = st.shop && st.shop.id === order.storeId;
  // 발표·체험용: 이 가게 사장님이 되어 방금 보낸 주문서를 받아 본다 (이 기기에서만)
  const tryOwner = () => {
    if (local) { setState({ role: 'owner' }); nav(`/o/order/${order.id}`, { replace: true }); toast('사장님 화면이에요. 방금 보낸 주문서가 도착해 있어요'); return; }
    if (st.shop && !confirm(`지금 등록된 가게(${st.shop.name}) 대신 ‘${order.storeName}’로 체험할까요?`)) return;
    const shop = fromSeed(store);
    const sstore = shopToStore(shop, 'partner');
    setState((s) => ({
      ...s, role: 'owner', shop, shopKeys: null,
      orders: s.orders.map((x) => (x.id === order.id ? { ...x, status: 'requested', est: estimate(sstore, x.o), checks: ruleCheck(sstore, { ...x.o, date: null }, {}), seen: { ...(x.seen || {}), o: 0 } } : x)),
    }));
    nav(`/o/order/${order.id}`, { replace: true });
    toast('체험: 이 가게 사장님 화면이에요. 공개 정보로 가게를 임시 등록했어요', 3800);
  };
  return (
    <div className="screen">
      <Header title={ext ? '주문서 완성' : '주문 요청 완료'} onBack={() => nav(`/store/${order.storeId}`, { replace: true })} />
      <div className="scroll pad">
        <div className={`okmark ${auto ? 'ok' : ''}`}><Icon n={ext ? 'receipt' : 'check'} size="lg" /></div>
        <h2 className="center" style={{ margin: 0, fontSize: 22 }}>{ext ? '주문서가 완성됐어요' : auto ? '주문이 바로 확정됐어요!' : '사장님께 보냈어요!'}</h2>
        <p className="center small muted" style={{ margin: '6px 0 16px' }}>
          {ext ? <>이 가게는 아직 디어 케이크 입점 전이에요.<br />완성된 주문서를 가게 카톡·인스타로 그대로 보내 주세요.</>
            : auto ? <>사장님이 정해 둔 규칙 안의 주문이라 자동 확정됐어요.<br />대화방에서 사장님과 바로 이야기할 수 있어요.</>
            : <>{order.storeName} 사장님이 확인하고 최종 금액을 확정해요.<br />답이 오면 알림으로 알려 드려요.</>}
        </p>
        <div className="ticket">
          <div className="stage"><CakeView o={orderView(order)} fancy /></div>
          <div className="tb">
            <div className="row"><b className="grow">{order.storeName}</b><StatusTag status={order.status} /></div>
            <div className="xs muted">{order.id} · {fmtDate(o.date)} {o.time} 픽업</div>
            <div className="hr" />
            <div className="kv"><span>케이크</span><b>{sizeOf(o.size).name} · {optName(SHAPES, o.shape)} · {designOf(o.design).name}</b></div>
            <div className="kv"><span>맛·크림</span><b>{flavorName(o)} · {creamOf(o.cream).name}</b></div>
            <div className="kv"><span>문구</span><b>{o.noText ? '문구 없음' : `“${o.text}”`}</b></div>
            <div className="kv"><span>{order.finalPrice != null ? '확정 금액' : '예상 금액'}</span><b className="pink">{order.finalPrice != null ? won(order.finalPrice) : range(order.est?.lo, order.est?.hi)}</b></div>
          </div>
        </div>
        <div className="col" style={{ marginTop: 14 }}>
          {ext ? (<>
            <button className="btn pri block" onClick={async () => { const l = await getLink(); const ok = await copyText(orderText(order, l)); toast(ok ? '주문서를 복사했어요. 가게 채팅창에 붙여 넣으세요' : '복사하지 못했어요'); }}><Icon n="copy" size="sm" /> 주문서 글 복사하기</button>
            <button className="btn line block" onClick={async () => { const l = await getLink(); const r = await shareText({ title: '케이크 주문서', text: orderText(order), url: l }); if (r === 'copied') toast('공유 대신 복사했어요'); }}><Icon n="share" size="sm" /> 카톡·문자로 보내기</button>
            {store && <div className="linkrow" style={{ marginTop: 0 }}>{store.insta && <a href={mapLinks(store).insta} target="_blank" rel="noreferrer"><Icon n="insta" />인스타 열기</a>}<a href={mapLinks(store).kakao} target="_blank" rel="noreferrer"><Icon n="chat" />카카오맵</a><a href={mapLinks(store).naver} target="_blank" rel="noreferrer"><Icon n="search" />네이버지도</a></div>}
          </>) : <button className="btn pri block" onClick={() => nav(`/c/order/${order.id}`, { replace: true })}><Icon n="chat" size="sm" /> 대화방 열기</button>}
          {order.gift && <button className="btn sec block" onClick={async () => { const url = await giftLink(order); const r = await shareText({ title: '케이크 선물이 도착했어요', text: `${order.gift.to}님, ${order.gift.from || '친구'}님이 보낸 케이크 선물이 도착했어요! 🎂`, url }); if (r === 'copied') toast('선물 카드 링크를 복사했어요. 받는 분께 보내 주세요'); }}>🎁 {order.gift.to}님께 선물 카드 보내기</button>}
          {store && (local || store.kind === 'public') && <button className="btn sec block" onClick={tryOwner}><Icon n="swap" size="sm" /> (체험) 이 가게 사장님 화면에서 받아 보기</button>}
          <button className="btn ghost block" onClick={() => nav('/c', { replace: true })}>지도로 돌아가기</button>
        </div>
        <div style={{ height: 24 }} />
      </div>
    </div>
  );
}

export function MyOrders() {
  const st = useApp();
  const [tab, setTab] = useState('now');
  const mine = st.orders.filter((o) => o.mine).sort((a, b) => (b.ev?.[b.ev.length - 1]?.at || b.createdAt).localeCompare(a.ev?.[a.ev.length - 1]?.at || a.createdAt));
  const list = mine.filter((o) => (tab === 'now' ? [...ACTIVE, 'external'].includes(o.status) : !ACTIVE.includes(o.status) && o.status !== 'external'));
  return (
    <div className="screen fade">
      <div className="hdr"><h1 style={{ paddingLeft: 10 }}>주문·대화</h1></div>
      <div className="pad" style={{ paddingBottom: 0 }}><div className="seg"><button className={tab === 'now' ? 'on' : ''} onClick={() => setTab('now')}>진행 중</button><button className={tab === 'past' ? 'on' : ''} onClick={() => setTab('past')}>지난 주문</button></div></div>
      <div className="scroll pad with-tab">
        {list.length === 0 && <Empty icon="💬">{tab === 'now' ? <>진행 중인 주문이 없어요.<br />지도에서 마음에 드는 가게를 찾아보세요!<div style={{ marginTop: 12 }}><button className="btn pri sm" onClick={() => nav('/c', { replace: true })}>케이크 가게 찾기</button></div></> : '지난 주문이 없어요.'}</Empty>}
        {list.map((o) => {
          const un = unreadOf(o, 'c');
          const last = [...(o.ev || [])].reverse().find((e) => e.t !== 'img');
          return (
            <button key={o.id} className="ocard" onClick={() => nav(`/c/order/${o.id}`)}>
              <div className="th"><CakeView o={orderView(o)} /></div>
              <div className="grow">
                <div className="t1"><span className="grow">{o.storeName}</span><StatusTag status={o.status} /></div>
                <div className="t2">{fmtDate(o.o.date)} {o.o.time} · {sizeOf(o.o.size).name} {designOf(o.o.design).name} · <b className="pink">{o.finalPrice != null ? won(o.finalPrice) : range(o.est?.lo, o.est?.hi, true)}</b></div>
                <div className="lastmsg">{un > 0 && <span className="un">{un}</span>}<span>{last ? `${last.by === 'o' ? '사장님: ' : last.by === 's' ? '' : '나: '}${evText(last, o).split('\n')[0]}` : ''}</span><small>{last ? ago(last.at) : ''}</small></div>
              </div>
            </button>
          );
        })}
      </div>
      <CustomerTabBar current="/c/orders" />
    </div>
  );
}

export function Saved() {
  const st = useApp();
  const stores = getStores(st);
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
        <div className="sec-t"><h3>알림</h3></div>
        <NotiSettings role="c" />
        <div className="sec-t"><h3>설정</h3></div>
        <div className="card" style={{ padding: '0 14px' }}>
          <button className="list-row" onClick={() => { setState({ role: 'owner' }); nav(st.shop ? '/o' : '/o/setup', { replace: true }); }}><Icon n="swap" /><div className="grow"><div className="t">사장님 모드로 바꾸기</div><div className="s">가게 등록·주문 관리</div></div><Icon n="right" size="sm" /></button>
          <button className="list-row" onClick={() => nav('/settings')}><Icon n="map" /><div className="grow"><div className="t">지도 · AI 연결</div><div className="s">{st.settings.googleKey ? '구글 지도' : st.settings.kakaoKey ? '카카오 지도' : '기본 지도'} · {st.settings.claudeKey ? 'AI 연결됨' : 'AI 키 없음'}</div></div><Icon n="right" size="sm" /></button>
          <button className="list-row" onClick={() => nav('/guide')}><Icon n="info" /><div className="grow"><div className="t">사용 가이드 다시 보기</div></div><Icon n="right" size="sm" /></button>
          <button className="list-row" onClick={() => nav('/insight')}><Icon n="chart" /><div className="grow"><div className="t">시장 데이터 · 인사이트</div><div className="s">수원 가게 분석 · 가격 분포 · 시장 근거</div></div><Icon n="right" size="sm" /></button>
          <button className="list-row" onClick={() => nav('/about')}><Icon n="receipt" /><div className="grow"><div className="t">앱 정보 · 데이터 출처</div><div className="s">가게 정보와 가격 추정 방법</div></div><Icon n="right" size="sm" /></button>
        </div>
      </div>
      <CustomerTabBar current="/c/my" />
    </div>
  );
}
