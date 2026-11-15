import Icon from '../../components/Icon.jsx';
import TabBar, { OWNER_TABS } from '../../components/TabBar.jsx';
import { CakeView, Header, QR, toast } from '../../components/ui.jsx';
import { useApp, setState, patchShop } from '../../lib/state.js';
import { nav } from '../../lib/router.js';
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
  share: { t: '주문 링크·QR', s: '인스타 프로필에 걸어 두세요', icon: 'link' },
};

export const shopLink = (shop) => `${location.href.split('#')[0]}#/store/${shop.id}`;

export function OwnerShop() {
  const st = useApp();
  const shop = st.shop;
  if (!shop) { nav('/o/setup', { replace: true }); return null; }
  const rd = readiness(shop);
  const done = Object.fromEntries(rd.items.map(([k, , ok]) => [k, ok]));
  return (
    <div className="screen fade">
      <div className="hdr"><h1 style={{ paddingLeft: 10 }}>내 가게</h1><button className="ib" onClick={() => nav(`/store/${shop.id}`)} aria-label="손님 화면"><Icon n="eye" /></button></div>
      <div className="scroll pad with-tab">
        <div className="pv">
          <div style={{ ...heroBg(shop), height: 140, position: 'relative' }}><CakeView o={shop.hero} bg={false} fancy style={{ position: 'absolute', left: '50%', bottom: -4, width: 220, transform: 'translateX(-50%)' }} /></div>
          <div className="pad">
            <div className="row"><b className="grow" style={{ fontSize: 18 }}>{shop.name}</b>{shop.demo && <span className="tag mute">체험용</span>}</div>
            <div className="small muted">{shop.gu} {shop.dong} · {shop.styles.map(styleName).join(', ')}</div>
            <div className="small" style={{ marginTop: 6 }}>{shop.intro || '소개글이 아직 없어요'}</div>
            <div className="row" style={{ marginTop: 10 }}>
              <button className="btn sm line grow" onClick={() => nav(`/store/${shop.id}`)}><Icon n="eye" size="sm" />손님 화면으로 보기</button>
              <button className="btn sm sec grow" onClick={() => nav('/o/shop/share')}><Icon n="link" size="sm" />주문 링크</button>
            </div>
          </div>
        </div>
        <div className="card pad" style={{ marginTop: 12 }}>
          <div className="row"><b className="grow">가게 준비도</b><b className="pink">{rd.pct}%</b></div>
          <div className="prog" style={{ marginTop: 8 }}><i style={{ width: rd.pct + '%' }} /></div>
        </div>
        <div className="sec-t"><h3>필수 설정</h3></div>
        {['info', 'menu', 'ops'].map((k) => <SetRow key={k} k={k} ok={done[k]} shop={shop} />)}
        <div className="sec-t"><h3>세부 설정</h3></div>
        {['look', 'notice', 'portfolio', 'form', 'share'].map((k) => <SetRow key={k} k={k} ok={done[k] ?? true} shop={shop} />)}
        <div className="sec-t"><h3>사장님 사용 가이드</h3></div>
        <div className="card pad small" style={{ lineHeight: 1.7 }}>
          <div><b>1. 가격표를 한 번만 정해요</b> — 크기별 기본가·추가금을 넣으면 손님 주문서에 정확한 가격이 떠요.</div>
          <div><b>2. 주문 링크를 걸어요</b> — 인스타 프로필·카톡 채널에 링크(또는 QR)를 걸면 손님이 바로 주문서를 열어요.</div>
          <div><b>3. 새 요청은 두 버튼</b> — 규칙 안 주문은 자동 확정, 나머지는 ‘승인’ 또는 ‘수정 요청’만 누르세요.</div>
          <div><b>4. 확정 후 흐름</b> — 입금 확인 → (필요하면) 시안 보내기 → 제작 시작 → 픽업 준비 완료 → 픽업 완료.</div>
          <div><b>5. 정산</b> — 일별·주별·월별 매출과 인기 옵션을 보고, 엑셀로 받아 장부에 써요.</div>
        </div>
        <button className="setrow" style={{ marginTop: 10 }} onClick={() => nav('/insight')}><span className="ic"><Icon n="chart" /></span><div className="grow"><div className="t">시장 데이터 · 인사이트</div><div className="s">수원 가게 가격 분포·스타일 비교</div></div><Icon n="right" size="sm" /></button>
        <div className="sec-t"><h3>계정</h3></div>
        <div className="card" style={{ padding: '0 14px' }}>
          <button className="list-row" onClick={() => { setState({ role: 'customer' }); nav(st.seenGuide ? '/c' : '/guide', { replace: true }); }}><Icon n="swap" /><div className="grow"><div className="t">고객 모드로 바꾸기</div></div><Icon n="right" size="sm" /></button>
          <button className="list-row" onClick={() => nav('/settings')}><Icon n="sparkle" /><div className="grow"><div className="t">AI · 지도 연결</div><div className="s">가격표 사진 읽기·소개글 AI</div></div><Icon n="right" size="sm" /></button>
          <button className="list-row" onClick={() => { if (confirm('지금 가게 정보를 지우고 처음부터 다시 등록할까요? (주문 기록은 남아요)')) { setState({ shop: null }); nav('/o/setup', { replace: true }); } }}><Icon n="refresh" /><div className="grow"><div className="t">다른 가게로 다시 등록</div></div><Icon n="right" size="sm" /></button>
        </div>
      </div>
      <TabBar tabs={OWNER_TABS} current="/o/shop" />
    </div>
  );
}

function SetRow({ k, ok, shop }) {
  const S = SECTIONS[k];
  let s = S.s;
  if (k === 'menu') { const v = Object.entries(shop.menu.sizes).filter(([, p]) => p != null); s = v.length ? v.slice(0, 3).map(([z, p]) => `${{ dosirak: '도시락', mini: '미니', h1: '1호', h2: '2호', h3: '3호' }[z]} ${won(p)}`).join(' · ') : S.s; }
  if (k === 'ops') s = `${shop.ops.closedDays.length ? shop.ops.closedDays.map((d) => DOW[d]).join('·') + ' 휴무' : '휴무 없음'} · ${shop.ops.sameDay ? '당일 가능' : `${shop.ops.leadDays}일 전 마감`} · 하루 ${shop.ops.dailyMax}건${shop.ops.autoConfirm ? ' · 자동 확정' : ''}`;
  if (k === 'portfolio') s = `${shop.portfolio.length}개 · 3개 이상 올리면 좋아요`;
  return (
    <button className={`setrow ${ok ? 'done' : ''}`} onClick={() => nav(`/o/shop/${k}`)}>
      <span className="ic"><Icon n={ok ? 'check' : S.icon} /></span>
      <div className="grow"><div className="t">{S.t}</div><div className="s">{s}</div></div>
      <Icon n="right" size="sm" />
    </button>
  );
}

export function ShopEdit({ params }) {
  const st = useApp();
  const shop = st.shop;
  if (!shop) { nav('/o/setup', { replace: true }); return null; }
  const k = params.sec;
  const S = SECTIONS[k] || SECTIONS.info;
  const set = (p) => patchShop(p);
  const link = shopLink(shop);
  return (
    <div className="screen">
      <Header title={S.t} fallback="/o/shop" right={<span className="tag ok" style={{ marginRight: 10 }}>자동 저장</span>} />
      <div className="scroll pad" style={{ paddingBottom: 90 }}>
        {k === 'info' && <><InfoEditor shop={shop} set={set} /><div className="lbl">만드는 케이크</div><StylesEditor shop={shop} set={set} /></>}
        {k === 'menu' && <MenuEditor shop={shop} set={set} />}
        {k === 'ops' && <OpsEditor shop={shop} set={set} />}
        {k === 'look' && <LookEditor shop={shop} set={set} />}
        {k === 'notice' && <NoticeEditor shop={shop} set={set} />}
        {k === 'portfolio' && <PortfolioEditor shop={shop} set={set} />}
        {k === 'form' && <FormEditor shop={shop} set={set} />}
        {k === 'share' && (
          <div className="col" style={{ alignItems: 'center', gap: 14 }}>
            <div className="small muted center">이 링크를 인스타그램 프로필·카카오톡 채널·네이버 플레이스 ‘주문하기’에 걸어 두면, 손님이 바로 우리 가게 주문서를 열어요.</div>
            <div className="qrbox card"><QR text={link} size={170} /></div>
            <div className="card pad small" style={{ width: '100%', wordBreak: 'break-all' }}>{link}</div>
            <div className="btns" style={{ width: '100%' }}>
              <button className="btn line" onClick={async () => toast((await copyText(link)) ? '링크를 복사했어요' : '복사 실패')}><Icon n="copy" size="sm" />복사</button>
              <button className="btn pri" onClick={async () => { const r = await shareText({ title: shop.name, text: `${shop.name} 케이크 주문은 여기서 해 주세요!`, url: link }); if (r === 'copied') toast('링크를 복사했어요'); }}><Icon n="share" size="sm" />공유하기</button>
            </div>
            <div className="note">지금은 프로토타입이라 주문서가 같은 기기 안에 저장돼요. 손님이 다른 폰에서 보낸 주문서는 ‘주문서 링크’로 받아서 열면 주문함에 넣을 수 있어요.</div>
          </div>
        )}
      </div>
      <div className="stickybar" style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
        <button className="btn pri grow" onClick={() => { toast('저장했어요'); nav('/o/shop', { replace: true }); }}>완료</button>
      </div>
    </div>
  );
}
