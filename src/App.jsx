import { lazy, Suspense, useEffect, useState } from 'react';
import { usePath, match, nav } from './lib/router.js';
import { setState, getState, resetAll } from './lib/state.js';
import { startLive } from './lib/live.js';
import { resumeAIJobs } from './lib/imagegen.js';
import { Toasts, QR, Loading, toast } from './components/ui.jsx';
import { Logo } from './components/Logo.jsx';
import Icon from './components/Icon.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import InstallBanner from './components/InstallBanner.jsx';
import Tour from './components/Tour.jsx';
import { Splash, SPLASH_MS, RoleSelect, Guide } from './screens/Start.jsx';
import CustomerHome from './screens/customer/Home.jsx';
import StoreDetail from './screens/customer/Store.jsx';
import OrderForm from './screens/customer/Order.jsx';
import { OrderDone, MyOrders, My } from './screens/customer/Mine.jsx';
import { Interest, CakeDetail } from './screens/customer/Interest.jsx';
import { MakeHome, MakeForm, MakeResult, MakeShops } from './screens/customer/Make.jsx';
import { CustomerOrder, PayScreen } from './screens/OrderRoom.jsx';
import { AskAI, AskRoomC, AskRoomO } from './screens/Ask.jsx';

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
  ['/c', CustomerHome], ['/c/saved', Interest], ['/c/cake/:id', CakeDetail], ['/c/orders', MyOrders], ['/c/order/:id', CustomerOrder], ['/c/pay/:id', PayScreen],['/c/my', My],
  ['/c/make', MakeHome], ['/c/make/result', MakeResult], ['/c/make/shops', MakeShops], ['/c/make/:cat', MakeForm],
  ['/c/ai/:id', AskAI], ['/c/ask/:id', AskRoomC], ['/o/ask/:id', AskRoomO],
  ['/store/:id', StoreDetail], ['/order/:id', OrderForm], ['/done/:id', OrderDone],
  ['/o', OwnerHome], ['/o/orders', OwnerOrders], ['/o/order/:id', OwnerOrderDetail], ['/o/shop', OwnerShop], ['/o/shop/:sec', ShopEdit], ['/o/sales', Sales], ['/o/setup', Setup],
  ['/settings', Settings], ['/about', About], ['/s/:code', SharedOrder], ['/g/:code', GiftView], ['/j/:code', JoinShop], ['/insight', Insight],
];

// 앱을 열 때마다 '사장님용 / 고객용' 고르기부터 보여 준다.
// 가게 주문 링크·QR(#/j), 주문서·선물 링크, 알림으로 여는 주문 화면처럼 특정 화면으로 바로 가는 주소는 그대로 연다.
const START_PAGES = ['/', '', '/c', '/o', '/role', '/guide', '/c/saved', '/c/orders', '/c/my', '/o/orders', '/o/sales', '/o/shop'];
const BOOT_PATH = (location.hash.replace(/^#/, '') || '/').split('?')[0];
let booted = false;

function Router() {
  const path = usePath();
  const clean = path.split('?')[0];
  useEffect(() => {
    if (!booted) { booted = true; if (START_PAGES.includes(BOOT_PATH) && clean !== '/role') { nav('/role', { replace: true }); return; } }
    if (clean === '/' || clean === '') nav('/role', { replace: true });
  }, [clean]);
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
      <summary style={{ cursor: 'pointer', fontWeight: 700 }}>발표 시연 순서 (클릭)</summary>
      <ol style={{ margin: '10px 0 8px', paddingLeft: 18, lineHeight: 1.7, color: 'var(--ink2)' }}>
        <li>고객 → 지도 → <b>검색</b>(가게 이름·말·사진)으로 가게 고르기</li>
        <li><b>관심</b>에서 케이크 사진 둘러보기 → 비슷한 케이크 · 만드는 가게</li>
        <li>가게 → 주문서 → <b>한 줄로 채우기</b> → 시안 → <b>사장님께 보내기</b></li>
        <li><b>(체험) 사장님 화면에서 받아 보기</b> → 승인·대화·시안 → 매출·장부</li>
        <li>시장 데이터로 근거 보여 주기</li>
      </ol>
      <div className="row wrap">
        <button className="btn xs sec" onClick={go(() => { setState({ role: 'customer', seenGuide: true }); nav('/c'); })}>고객 지도</button>
        <button className="btn xs sec" onClick={go(() => { setState({ role: 'customer', seenGuide: true }); nav('/c/saved'); })}>관심 케이크</button>
        <button className="btn xs sec" onClick={go(() => { setState({ role: 'customer', seenGuide: true }); nav('/order/holiday-cake'); })}>주문서 예시</button>
        <button className="btn xs sec" onClick={go(() => { setState({ role: 'owner' }); nav(getState().shop ? '/o' : '/o/setup'); })}>사장님 화면</button>
        <button className="btn xs ghost" onClick={go(() => { resetAll(); nav('/role', { replace: true }); toast('처음 상태로 돌렸어요'); })}>처음부터</button>
      </div>
    </details>
  );
}

// 대표 색: 사장님 화면(/o…)은 초록, 고객 화면은 분홍. 설정처럼 같이 쓰는 화면은 마지막으로 고른 역할을 따른다.
const SHARED = ['/settings', '/about', '/insight'];
function themeOf(path) {
  const p = path.split('?')[0];
  if (p === '/o' || p.startsWith('/o/')) return 'th-o'; // '/order/…'(손님 주문서)는 고객 색
  if (SHARED.includes(p) && getState().role === 'owner') return 'th-o';
  return 'th-c';
}

export default function App() {
  const path = usePath();
  const [splash, setSplash] = useState(true);
  const [gone, setGone] = useState(false);
  useEffect(() => {
    const a = setTimeout(() => setSplash(false), SPLASH_MS);
    const b = setTimeout(() => setGone(true), SPLASH_MS + 500);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, []);
  const skipSplash = () => { setSplash(false); setTimeout(() => setGone(true), 500); };
  useEffect(() => { startLive(); resumeAIJobs(); }, []); // 실시간 주문 연결 + 무료 대기열에서 만들던 AI 사진 이어서 기다리기
  const appUrl = location.href.split('#')[0];
  return (
    <div className="desk">
      <aside className="desk-info">
        <Logo h={64} />
        <p className="sub">손님과 사장님이 한 앱에서 찾기부터 주문까지 끝내요.</p>
        <div className="qr">
          <QR text={appUrl} size={112} />
          <div className="small"><b>핸드폰으로 열어 보세요</b><br /><span className="muted">카메라로 QR을 찍으면 앱이 열려요. 홈 화면에 추가하면 앱처럼 설치돼요.</span></div>
        </div>
        <ul>
          <li><span className="dot">1</span><span><b>지도에서 바로 찾기</b> — 가게 이름·동네·“영통 4만원대 캐릭터”처럼 말로 검색해요</span></li>
          <li><span className="dot">2</span><span><b>관심</b> — 케이크 사진을 둘러보고 비슷한 케이크와 만드는 가게를 찾아요</span></li>
          <li><span className="dot">3</span><span><b>가격·시안 먼저</b> — 고를 때마다 예상 가격과 시안이 바로 보여요</span></li>
          <li><span className="dot">4</span><span><b>실시간 주문·대화</b> — 주문이 사장님 폰에 바로 도착하고, 대화방에서 시안을 확인해요</span></li>
        </ul>
        <DemoSteps />
        <div className="row">
          <button className="btn line sm" onClick={() => nav('/insight')}><Icon n="chart" size="sm" />시장 데이터 보기</button>
          <a className="btn line sm" href="https://github.com/jshhh0130-stack/AKE" target="_blank" rel="noreferrer">GitHub</a>
        </div>
      </aside>
      <div className={`phone ${themeOf(path)}`}>
        <Router />
        <Tour />
        <Toasts />
        {gone && <InstallBanner />}
        {!gone && <Splash out={!splash} onSkip={skipSplash} />}
      </div>
    </div>
  );
}
