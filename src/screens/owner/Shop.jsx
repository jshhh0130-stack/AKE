import { useEffect, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import { OwnerTabBar } from '../../components/TabBar.jsx';
import { NotiSettings } from '../../components/Noti.jsx';
import { CakeView, Header, QR, toast, Loading } from '../../components/ui.jsx';
import { useApp, setState, patchShop } from '../../lib/state.js';
import { nav } from '../../lib/router.js';
import { shopLinkCode, liveStatus, onLiveStatus } from '../../lib/live.js';
import { addSampleOrders, removeSampleOrders } from '../../lib/orders.js';
import { copyText, shareText, DOW, won } from '../../lib/util.js';
import { styleName } from '../../data/catalog.js';
import { heroBg } from '../customer/Store.jsx';
import { InfoEditor, StylesEditor, MenuEditor, OpsEditor, LookEditor, NoticeEditor, PortfolioEditor, FormEditor, readiness } from './Editors.jsx';

const SECTIONS = {
  info: { t: '기본 정보', s: '이름·주소·SNS·만드는 케이크', icon: 'store' },
  menu: { t: '가격표', s: '사이즈별 기본가 · 옵션 추가금 (한 번만)', icon: 'won' },
  form: { t: '주문서 항목', s: '손님이 채울 항목 켜고 끄기', icon: 'list' },
  ops: { t: '운영·마감', s: '휴무·마감·하루 주문 수·자동 확정', icon: 'calendar' },
  look: { t: '가게 꾸미기', s: '대표 색·대표 케이크·소개글', icon: 'palette' },
  notice: { t: '안내사항·자주 묻는 질문', s: '주문 전 꼭 확인할 내용', icon: 'info' },
  portfolio: { t: '작품 사진', s: '실제 케이크 사진 올리기', icon: 'image' },
  share: { t: '주문 링크·QR', s: '손님 폰에서 주문이 실시간으로 와요', icon: 'qr' },
  noti: { t: '알림 설정', s: '새 주문·시안·메시지 알림', icon: 'bell' },
};

export function OwnerShop() {
  const st = useApp();
  const shop = st.shop;
  if (!shop) { nav('/o/setup', { replace: true }); return null; }
  const rd = readiness(shop);
  const done = Object.fromEntries(rd.items.map(([k, , ok]) => [k, ok]));
  const hasSample = st.orders.some((o) => o.sample);
  return (
    <div className="screen fade">
      <div className="hdr"><h1 style={{ paddingLeft: 10 }}>내 가게</h1><button className="ib" onClick={() => nav(`/store/${shop.id}`)} aria-label="손님 화면"><Icon n="eye" /></button></div>
      <div className="scroll pad with-tab">
        <div className="pv">
          <div style={{ ...heroBg(shop), height: 140, position: 'relative' }}><CakeView o={shop.hero} bg={false} fancy style={{ position: 'absolute', left: '50%', bottom: -4, width: 220, height: 'auto', transform: 'translateX(-50%)' }} /></div>
          <div className="pad">
            <div className="b" style={{ fontSize: 18 }}>{shop.name}</div>
            <div className="small muted">{shop.gu} {shop.dong} · {shop.styles.map(styleName).join(', ')}</div>
            <div className="small" style={{ marginTop: 6 }}>{shop.intro || '소개글이 아직 없어요'}</div>
            <div className="row" style={{ marginTop: 10 }}>
              <button className="btn sm line grow" onClick={() => nav(`/store/${shop.id}`)}><Icon n="eye" size="sm" />손님 화면 보기</button>
              <button className="btn sm pri grow" onClick={() => nav('/o/shop/share')}><Icon n="qr" size="sm" />주문 링크·QR</button>
            </div>
          </div>
        </div>
        {rd.pct < 100 && <div className="card pad" style={{ marginTop: 12 }}><div className="row"><b className="grow">가게 준비도</b><b className="pink">{rd.pct}%</b></div><div className="prog" style={{ marginTop: 8 }}><i style={{ width: rd.pct + '%' }} /></div></div>}
        <div className="sec-t"><h3>꼭 필요한 설정</h3></div>
        {['info', 'menu', 'ops'].map((k) => <SetRow key={k} k={k} ok={done[k]} shop={shop} />)}
        <div className="sec-t"><h3>더 꾸미기</h3></div>
        {['look', 'portfolio', 'notice', 'form', 'noti'].map((k) => <SetRow key={k} k={k} ok={done[k] ?? true} shop={shop} />)}
        <div className="sec-t"><h3>그 밖에</h3></div>
        <div className="card" style={{ padding: '0 14px' }}>
          <button className="list-row" onClick={() => { setState({ role: 'customer' }); nav(st.seenGuide ? '/c' : '/guide', { replace: true }); }}><Icon n="swap" /><div className="grow"><div className="t">고객 모드로 바꾸기</div></div><Icon n="right" size="sm" /></button>
          <button className="list-row" onClick={() => nav('/settings')}><Icon n="map" /><div className="grow"><div className="t">지도 · AI 연결</div><div className="s">구글 지도 · 가격표 사진 읽기 · 소개글 AI</div></div><Icon n="right" size="sm" /></button>
          <button className="list-row" onClick={() => nav('/insight')}><Icon n="chart" /><div className="grow"><div className="t">시장 데이터</div><div className="s">수원 가게 가격 분포·스타일 비교</div></div><Icon n="right" size="sm" /></button>
          <button className="list-row" onClick={() => { if (hasSample) { removeSampleOrders(); toast('예시 주문을 지웠어요'); } else { addSampleOrders(); toast('예시 주문을 넣었어요'); } }}><Icon n="receipt" /><div className="grow"><div className="t">{hasSample ? '예시 주문 지우기' : '예시 주문 넣어 보기'}</div><div className="s">주문·매출 화면 둘러보기용</div></div></button>
          <button className="list-row" onClick={() => { if (confirm('지금 가게 정보를 지우고 처음부터 다시 등록할까요? (주문 기록은 남아요)')) { setState({ shop: null, shopKeys: null }); nav('/o/setup', { replace: true }); } }}><Icon n="refresh" /><div className="grow"><div className="t">다른 가게로 다시 등록</div></div><Icon n="right" size="sm" /></button>
        </div>
      </div>
      <OwnerTabBar current="/o/shop" />
    </div>
  );
}

function SetRow({ k, ok, shop }) {
  const S = SECTIONS[k];
  let s = S.s;
  if (k === 'menu') { const v = Object.entries(shop.menu.sizes).filter(([, p]) => p != null); s = v.length ? v.slice(0, 3).map(([z, p]) => `${{ mini: '미니', h1: '1호', h2: '2호', h3: '3호' }[z]} ${won(p)}`).join(' · ') : S.s; }
  if (k === 'ops') s = `${shop.ops.closedDays.length ? shop.ops.closedDays.map((d) => DOW[d]).join('·') + ' 휴무' : '휴무 없음'} · ${shop.ops.sameDay ? '당일 가능' : `${shop.ops.leadDays}일 전 마감`} · 하루 ${shop.ops.dailyMax}건${shop.ops.autoConfirm ? ' · 자동 확정' : ''}`;
  if (k === 'portfolio') s = `${shop.portfolio.length}개 · 3개 이상 올리면 좋아요`;
  return (
    <button className={`setrow ${ok ? 'done' : ''}`} onClick={() => nav(`/o/shop/${k}`)}>
      <span className="ic"><Icon n={ok && !['noti', 'form'].includes(k) ? 'check' : S.icon} /></span>
      <div className="grow"><div className="t">{S.t}</div><div className="s">{s}</div></div>
      <Icon n="right" size="sm" />
    </button>
  );
}

function ShareBox({ shop }) {
  const [links, setLinks] = useState(null);
  const [live, setLive] = useState(liveStatus());
  useEffect(() => onLiveStatus(() => setLive(liveStatus())), []);
  useEffect(() => {
    let dead = false;
    (async () => { const base = location.href.split('#')[0]; const [s, l] = await Promise.all([shopLinkCode(true), shopLinkCode(false)]); if (!dead) setLinks({ qr: `${base}#/j/${s}`, full: `${base}#/j/${l}` }); })().catch(() => toast('링크를 만들지 못했어요'));
    return () => { dead = true; };
  }, [shop.updatedAt]);
  if (!links) return <Loading text="주문 링크를 만드는 중…" />;
  return (
    <div className="col" style={{ alignItems: 'center', gap: 14 }}>
      <div className={`note ${live === 'on' ? 'ok' : 'warn'}`} style={{ width: '100%' }}>{live === 'on' ? '● 실시간 연결됨 — 손님이 이 링크로 주문하면 이 폰에 바로 도착해요' : '○ 연결 중… 인터넷을 확인해 주세요'}</div>
      <div className="small muted center">손님이 QR을 찍거나 링크를 누르면 <b>{shop.name}</b> 주문서가 열려요. 인스타그램 프로필·카카오톡 채널·가게 계산대에 붙여 두세요.</div>
      <div className="qrbox card"><QR text={links.qr} size={190} /></div>
      <div className="btns" style={{ width: '100%' }}>
        <button className="btn line" onClick={async () => toast((await copyText(links.full)) ? '주문 링크를 복사했어요' : '복사 실패')}><Icon n="copy" size="sm" />링크 복사</button>
        <button className="btn pri" onClick={async () => { const r = await shareText({ title: shop.name, text: `${shop.name} 케이크 주문은 여기서 해 주세요! 가격을 바로 보고 주문할 수 있어요 🎂`, url: links.full }); if (r === 'copied') toast('주문 링크를 복사했어요'); }}><Icon n="share" size="sm" />공유하기</button>
      </div>
      <div className="note" style={{ width: '100%', lineHeight: 1.6 }}>
        <b>어떻게 전달되나요?</b><br />· 주문과 대화는 암호화돼서 손님 폰 ↔ 사장님 폰으로 바로 전달돼요.<br />· 앱을 열어 두면 새 주문 알림이 떠요. 닫아 둔 동안 온 주문은 다시 열 때(12시간 안) 들어와요.<br />· 가격표를 바꾸면 손님 화면에도 자동으로 반영돼요.
      </div>
    </div>
  );
}

export function ShopEdit({ params }) {
  const st = useApp();
  const shop = st.shop;
  if (!shop) { nav('/o/setup', { replace: true }); return null; }
  const k = params.sec;
  const S = SECTIONS[k] || SECTIONS.info;
  const set = (p) => patchShop(p);
  return (
    <div className="screen">
      <Header title={S.t} fallback="/o/shop" right={!['share', 'noti'].includes(k) && <span className="tag ok" style={{ marginRight: 10 }}>자동 저장</span>} />
      <div className="scroll pad" style={{ paddingBottom: 90 }}>
        {k === 'info' && <><InfoEditor shop={shop} set={set} /><div className="lbl">만드는 케이크</div><StylesEditor shop={shop} set={set} /></>}
        {k === 'menu' && <MenuEditor shop={shop} set={set} />}
        {k === 'ops' && <OpsEditor shop={shop} set={set} />}
        {k === 'look' && <LookEditor shop={shop} set={set} />}
        {k === 'notice' && <NoticeEditor shop={shop} set={set} />}
        {k === 'portfolio' && <PortfolioEditor shop={shop} set={set} />}
        {k === 'form' && <FormEditor shop={shop} set={set} />}
        {k === 'share' && <ShareBox shop={shop} />}
        {k === 'noti' && <NotiSettings role="o" />}
      </div>
      <div className="stickybar" style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
        <button className="btn pri grow" onClick={() => nav('/o/shop', { replace: true })}>완료</button>
      </div>
    </div>
  );
}
