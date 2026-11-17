import { lazy, Suspense, useEffect, useState } from 'react';
import { usePath, match, nav } from './lib/router.js';
import { useApp, setState, resetAll } from './lib/state.js';
import { startLive } from './lib/live.js';
import { Toasts, QR, Loading, toast } from './components/ui.jsx';
import { LogoBadge } from './components/Logo.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import InstallBanner from './components/InstallBanner.jsx';
import { Splash, RoleSelect, Guide } from './screens/Start.jsx';
import CustomerHome from './screens/customer/Home.jsx';
import StoreDetail from './screens/customer/Store.jsx';
import OrderForm from './screens/customer/Order.jsx';
import { OrderDone, MyOrders, Saved, My } from './screens/customer/Mine.jsx';
import { CustomerOrder } from './screens/OrderRoom.jsx';

// 사장님·설정·데이터 화면은 필요할 때 불러와서 첫 화면을 빠르게
const owner = () => import('./screens/owner/Owner.jsx');
const shop = () => import('./screens/owner/Shop.jsx');
const settings = () => import('./screens/Settings.jsx');
const pick = (load, name) => lazy(() => load().then((m) => ({ default: m[name] })));
const OwnerHome = pick(owner, 'OwnerHome');
const OwnerOrders = pick(owner, 'OwnerOrders');
const OwnerOrderDetail = lazy(() => import('./screens/OrderRoom.jsx').then((m) => ({ default: m.OwnerOrderDetail })));
const Sales = pick(owner, 'Sales');
const OwnerShop = pick(shop, 'OwnerShop');
const ShopEdit = pick(shop, 'ShopEdit');
const Setup = lazy(() => import('./screens/owner/Setup.jsx'));
const Settings = pick(settings, 'Settings');
const About = pick(settings, 'About');
const SharedOrder = pick(settings, 'SharedOrder');
const GiftView = pick(settings, 'GiftView');
const JoinShop = pick(settings, 'JoinShop');
const Insight = lazy(() => import('./screens/Insight.jsx'));

const ROUTES = [
  ['/role', RoleSelect], ['/guide', Guide],
  ['/c', CustomerHome], ['/c/saved', Saved], ['/c/orders', MyOrders], ['/c/order/:id', CustomerOrder], ['/c/my', My],
  ['/store/:id', StoreDetail], ['/order/:id', OrderForm], ['/done/:id', OrderDone],
  ['/o', OwnerHome], ['/o/orders', OwnerOrders], ['/o/order/:id', OwnerOrderDetail], ['/o/shop', OwnerShop], ['/o/shop/:sec', ShopEdit], ['/o/sales', Sales], ['/o/setup', Setup],
  ['/settings', Settings], ['/about', About], ['/s/:code', SharedOrder], ['/g/:code', GiftView], ['/j/:code', JoinShop], ['/insight', Insight],
];

function Router() {
  const path = usePath();
  const st = useApp();
  const clean = path.split('?')[0];
  useEffect(() => {
    if (clean === '/' || clean === '') {
      const to = !st.role ? '/role' : st.role === 'owner' ? (st.shop ? '/o' : '/o/setup') : st.seenGuide ? '/c' : '/guide';
      nav(to, { replace: true });
    }
  }, [clean]); // eslint-disable-line react-hooks/exhaustive-deps
  for (const [pat, C] of ROUTES) {
    const p = match(clean, pat);
    if (p) {
      return (
        <ErrorBoundary resetKey={clean}>
          <Suspense fallback={<div className="screen"><Loading /></div>}><C key={clean} params={p} path={path} /></Suspense>
        </ErrorBoundary>
      );
    }
  }
  return null;
}

function DemoSteps() {
  const go = (fn) => () => { fn(); };
  return (
    <details className="card pad" style={{ fontSize: 13.5 }}>
      <summary style={{ cursor: 'pointer', fontWeight: 800 }}>🎬 발표 시연 순서 (클릭)</summary>
      <ol style={{ margin: '10px 0 8px', paddingLeft: 18, lineHeight: 1.7, color: 'var(--ink2)' }}>
        <li>고객 → 지도 → <b>찾기</b>(사진·말·조건)로 가게 고르기</li>
        <li>가게 선택 → 주문서 → <b>한 줄로 채우기</b> → 시안 3가지</li>
        <li>문구 한 글자씩 확인 → <b>사장님께 보내기</b> (규칙 안이면 자동 확정)</li>
        <li><b>(체험) 사장님 화면에서 받아 보기</b> → 승인·대화·시안 → 매출·장부</li>
        <li>📊 시장 데이터로 근거 보여 주기</li>
      </ol>
      <div className="row wrap">
        <button className="btn xs sec" onClick={go(() => { setState({ role: 'customer', seenGuide: true }); nav('/c'); })}>고객 지도</button>
        <button className="btn xs sec" onClick={go(() => { setState({ role: 'customer', seenGuide: true }); nav('/order/holiday-cake'); })}>주문서 예시</button>
        <button className="btn xs sec" onClick={go(() => { setState({ role: 'owner' }); nav('/'); })}>사장님 화면</button>
        <button className="btn xs ghost" onClick={go(() => { resetAll(); nav('/role', { replace: true }); toast('처음 상태로 돌렸어요'); })}>처음부터</button>
      </div>
    </details>
  );
}

export default function App() {
  const [splash, setSplash] = useState(true);
  const [gone, setGone] = useState(false);
  useEffect(() => {
    const a = setTimeout(() => setSplash(false), 1600);
    const b = setTimeout(() => setGone(true), 2200);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, []);
  useEffect(() => { startLive(); }, []);
  const appUrl = location.href.split('#')[0];
  return (
    <div className="desk">
      <aside className="desk-info">
        <div className="row"><LogoBadge size={46} /><h1>Dear Cake</h1></div>
        <p className="sub">보고 고르고, 본 그대로 받는 커스텀 케이크.<br />손님과 사장님이 한 앱에서 끝내요.</p>
        <div className="qr">
          <QR text={appUrl} size={112} />
          <div className="small"><b>핸드폰으로 열어 보세요</b><br /><span className="muted">카메라로 QR을 찍으면 앱이 열려요. 홈 화면에 추가하면 앱처럼 설치돼요.</span></div>
        </div>
        <ul>
          <li><span className="dot">1</span><span><b>사진·말로 찾기</b> — 사진을 올리거나 “영통 4만원대 캐릭터 케이크”라고 말하면 맞는 가게를 골라 줘요</span></li>
          <li><span className="dot">2</span><span><b>가격 먼저</b> — 옵션을 고를 때마다 예상 가격이 바로 보여요</span></li>
          <li><span className="dot">3</span><span><b>시안 미리보기</b> — 고른 그대로 케이크 시안이 그려져요</span></li>
          <li><span className="dot">4</span><span><b>실시간 주문·대화</b> — 주문이 사장님 폰에 바로 도착하고, 대화방에서 시안을 확인해요</span></li>
        </ul>
        <DemoSteps />
        <div className="row">
          <button className="btn sec sm" onClick={() => nav('/insight')}>📊 시장 데이터 보기</button>
          <a className="btn line sm" href="https://github.com/jshhh0130-stack/dear-cake" target="_blank" rel="noreferrer">GitHub</a>
        </div>
      </aside>
      <div className="phone">
        <Router />
        <Toasts />
        {gone && <InstallBanner />}
        {!gone && <Splash out={!splash} />}
      </div>
    </div>
  );
}
