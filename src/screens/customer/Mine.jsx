import { useMemo, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import { CustomerTabBar } from '../../components/TabBar.jsx';
import { CakeView, Header, Empty, StatusTag, toast } from '../../components/ui.jsx';
import { NotiSettings } from '../../components/Noti.jsx';
import { LogoBadge } from '../../components/Logo.jsx';
import { useApp, setState } from '../../lib/state.js';
import { nav } from '../../lib/router.js';
import { getStores, mapLinks, shopToStore } from '../../lib/stores.js';
import { kakaoKeyOf } from '../../lib/kakao.js';
import OrderThumb from '../../components/OrderThumb.jsx';
import { STATUS, ACTIVE, unreadOf, evText, applyEvent, mkEvent } from '../../lib/orders.js';
import { estimate, ruleCheck } from '../../lib/price.js';
import { orderLink, giftLink } from '../../lib/share.js';
import { orderView, orderText } from '../../lib/ordertext.js';
import { range, won, fmtDate, ago, shareText, copyText, maskPhone } from '../../lib/util.js';
import { SHAPES, sizeOf, designOf, creamOf, optName } from '../../data/catalog.js';
import { flavorName } from '../../lib/ordertext.js';
import { fromSeed } from '../../lib/claim.js';

// 제빵사 강아지 (손그림 느낌: 하얀 강아지 + 요리사 모자)
const BAKER_DOG = `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" stroke="#4A3B39" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
  <path d="M13 10q-1-6 4-6 2-3 6 0 5 0 4 6z" fill="#fff"/><path d="M13 10h14v3H13z" fill="#fff"/>
  <path d="M11 22q0-9 9-9t9 9q0 8-9 8t-9-8z" fill="#fff"/>
  <path d="M11 18q-5 1-4 7 2 2 4-1M29 18q5 1 4 7-2 2-4-1" fill="#F3E3D3"/>
  <circle cx="16.5" cy="21" r="1" fill="#4A3B39" stroke="none"/><circle cx="23.5" cy="21" r="1" fill="#4A3B39" stroke="none"/>
  <path d="M19 24.5q1 1.2 2 0" fill="none"/><ellipse cx="20" cy="23.3" rx="1.3" ry=".9" fill="#4A3B39" stroke="none"/>
  <circle cx="14.5" cy="24.5" r="1.4" fill="#F8C9D0" stroke="none"/><circle cx="25.5" cy="24.5" r="1.4" fill="#F8C9D0" stroke="none"/>
  <path d="M14 30q-1 5 2 5h8q3 0 2-5" fill="#fff"/>
</svg>`;

export function OrderDone({ params }) {
  const st = useApp();
  const order = st.orders.find((x) => x.id === params.id);
  const [link, setLink] = useState(null);
  if (!order) return <div className="screen"><Header title="주문" fallback="/c" /><Empty icon="receipt">주문을 찾을 수 없어요.</Empty></div>;
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
    <div className="screen donepage">
      <Header title={ext ? '주문서 완성' : '주문 요청 완료'} onBack={() => nav(`/store/${order.storeId}`, { replace: true })} />
      <div className="scroll pad gingham">
        {/* 점선 동그라미 안에 케이크 + 그 둘레를 빙글빙글 도는 제빵사 강아지 (11/23 UI) */}
        <div className="donehero">
          <div className="ring"><div className="pic"><OrderThumb order={order} /></div></div>
          <div className="orbit"><span className="dog" dangerouslySetInnerHTML={{ __html: BAKER_DOG }} /></div>
        </div>
        <h2 className="center" style={{ margin: 0, fontSize: 20, lineHeight: 1.4 }}>{ext ? '주문서가 완성됐어요' : auto ? '주문이 바로 확정됐어요!' : <>{order.storeName} 사장님께<br />주문서를 전송했어요!</>}</h2>
        <p className="center small muted" style={{ margin: '8px 0 16px' }}>
          {!ext && <>마음을 담아 정성껏 준비할게요.<br /></>}
          {ext ? <>이 가게는 아직 에이크 입점 전이에요.<br />완성된 주문서를 가게 카톡·인스타로 그대로 보내 주세요.</>
            : auto ? <>사장님이 정해 둔 규칙 안의 주문이라 자동 확정됐어요.</>
            : <>사장님이 확인하면 최종 금액을 알려드릴게요.</>}
        </p>
        <div className="sumcard">
          <div className="kv"><span>가게</span><b>{order.storeName}</b></div>
          <div className="kv"><span>디자인</span><b>{o.pickName || (order.imgs?.ref ? '원하는 사진으로' : designOf(o.design).name)}</b></div>
          <div className="kv"><span>케이크</span><b>{sizeOf(o.size).name} · {flavorName(o)}</b></div>
          <div className="kv"><span>레터링</span><b>{o.noText ? '문구 없음' : `“${o.text}”`}</b></div>
          <div className="kv"><span>픽업</span><b>{fmtDate(o.date)} {o.time}</b></div>
          <div className="kv"><span>{order.finalPrice != null ? '확정 금액' : '예상 금액'}</span><b>{order.finalPrice != null ? won(order.finalPrice) : `약 ${won(order.est?.lo)}`}</b></div>
        </div>
        {!ext && (
          <div className="btns" style={{ marginTop: 12 }}>
            <button className="btn line" onClick={() => nav('/c/orders', { replace: true })}>주문 내역</button>
            <button className="btn pri" onClick={() => nav(`/c/order/${order.id}`, { replace: true })}>사장님과 대화</button>
          </div>
        )}
        <div className="col" style={{ marginTop: 10 }}>
          {ext ? (<>
            <button className="btn pri block" onClick={async () => { const l = await getLink(); const ok = await copyText(orderText(order, l)); toast(ok ? '주문서를 복사했어요. 가게 채팅창에 붙여 넣으세요' : '복사하지 못했어요'); }}><Icon n="copy" size="sm" /> 주문서 글 복사하기</button>
            <button className="btn line block" onClick={async () => { const l = await getLink(); const r = await shareText({ title: '케이크 주문서', text: orderText(order), url: l }); if (r === 'copied') toast('공유 대신 복사했어요'); }}><Icon n="share" size="sm" /> 카톡·문자로 보내기</button>
            {store && <div className="linkrow" style={{ marginTop: 0 }}>{store.insta && <a href={mapLinks(store).insta} target="_blank" rel="noreferrer"><Icon n="insta" />인스타 열기</a>}<a href={mapLinks(store).kakao} target="_blank" rel="noreferrer"><Icon n="chat" />카카오맵</a><a href={mapLinks(store).naver} target="_blank" rel="noreferrer"><Icon n="search" />네이버지도</a></div>}
          </>) : null}
          {order.gift && <button className="btn sec block" onClick={async () => { const url = await giftLink(order); const r = await shareText({ title: '케이크 선물이 도착했어요', text: `${order.gift.to}님, ${order.gift.from || '친구'}님이 보낸 케이크 선물이 도착했어요!`, url }); if (r === 'copied') toast('선물 카드 링크를 복사했어요. 받는 분께 보내 주세요'); }}><Icon n="gift" size="sm" /> {order.gift.to}님께 선물 카드 보내기</button>}
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
      <div className="apphdr"><h1>주문·대화</h1></div>
      <div className="utabs"><button className={tab === 'now' ? 'on' : ''} onClick={() => setTab('now')}>진행 중</button><button className={tab === 'past' ? 'on' : ''} onClick={() => setTab('past')}>지난 주문</button></div>
      <div className="scroll pad with-tab gingham">
        {list.length === 0 && <Empty icon="chat">{tab === 'now' ? <>진행 중인 주문이 없어요.<br />지도에서 마음에 드는 가게를 찾아보세요.<div style={{ marginTop: 14 }}><button className="btn pri sm" onClick={() => nav('/c', { replace: true })}>케이크 가게 찾기</button></div></> : '지난 주문이 없어요.'}</Empty>}
        {list.map((o) => {
          const un = unreadOf(o, 'c');
          const last = [...(o.ev || [])].reverse().find((e) => e.t !== 'img');
          return (
            <button key={o.id} className="ocard" onClick={() => nav(`/c/order/${o.id}`)}>
              <div className="th"><OrderThumb order={o} badge /></div>
              <div className="grow">
                <div className="t1"><span className="grow">{o.storeName}</span><StatusTag status={o.status} /></div>
                <div className="t2">{fmtDate(o.o.date)} {o.o.time} · {sizeOf(o.o.size).name} {designOf(o.o.design).name} · <b style={{ color: 'var(--ink)' }}>{o.finalPrice != null ? won(o.finalPrice) : range(o.est?.lo, o.est?.hi, true)}</b></div>
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

export function My() {
  const st = useApp();
  const mine = st.orders.filter((o) => o.mine);
  return (
    <div className="screen fade">
      <div className="apphdr"><h1>마이</h1></div>
      <div className="scroll pad with-tab" style={{ paddingTop: 4 }}>
        <div className="card cream pad row" style={{ gap: 14 }}>
          <LogoBadge size={52} />
          <div className="grow"><div className="b" style={{ fontSize: 17 }}>{st.me?.name ? `${st.me.name}님` : '에이크 고객님'}</div><div className="small muted">{st.me?.phone ? maskPhone(st.me.phone) : '주문하면 이름이 저장돼요'}</div></div>
        </div>
        <div className="kpis light" style={{ marginTop: 10 }}>
          <button onClick={() => nav('/c/orders', { replace: true })}><small>주문</small><b>{mine.length}</b></button>
          <button onClick={() => nav('/c/saved', { replace: true })}><small>관심 케이크</small><b>{(st.likes || []).length}</b></button>
          <button onClick={() => nav('/c/saved?tab=store', { replace: true })}><small>찜한 가게</small><b>{st.favs.length}</b></button>
        </div>
        <div className="sec-t"><h3>알림</h3></div>
        <NotiSettings role="c" />
        <div className="sec-t"><h3>설정</h3></div>
        <div className="card" style={{ padding: '0 14px' }}>
          <button className="list-row" onClick={() => { setState({ role: 'owner' }); nav(st.shop ? '/o' : '/o/setup', { replace: true }); }}><Icon n="swap" /><div className="grow"><div className="t">사장님 모드로 바꾸기</div><div className="s">가게 등록·주문 관리</div></div><Icon n="right" size="sm" /></button>
          <button className="list-row" onClick={() => nav('/settings')}><Icon n="map" /><div className="grow"><div className="t">지도 · AI 연결</div><div className="s">{kakaoKeyOf(st.settings) ? '카카오 지도' : st.settings.googleKey ? '구글 지도' : '기본 지도'} · {st.settings.claudeKey ? 'AI 연결됨' : 'AI 키 없음'}</div></div><Icon n="right" size="sm" /></button>
          <button className="list-row" onClick={() => { setState({ seenTour: false }); nav('/c', { replace: true }); }}><Icon n="info" /><div className="grow"><div className="t">사용법 다시 보기</div><div className="s">지도 화면에서 하나씩 짚어 드려요</div></div><Icon n="right" size="sm" /></button>
          <button className="list-row" onClick={() => nav('/insight')}><Icon n="chart" /><div className="grow"><div className="t">시장 데이터 · 인사이트</div><div className="s">수원 가게 분석 · 가격 분포 · 시장 근거</div></div><Icon n="right" size="sm" /></button>
          <button className="list-row" onClick={() => nav('/about')}><Icon n="receipt" /><div className="grow"><div className="t">앱 정보 · 데이터 출처</div><div className="s">가게 정보와 가격 추정 방법</div></div><Icon n="right" size="sm" /></button>
        </div>
      </div>
      <CustomerTabBar current="/c/my" />
    </div>
  );
}
