import { useEffect, useState } from 'react';
import { usePath, match, nav } from './lib/router.js';
import { useApp } from './lib/state.js';
import { Toasts, QR } from './components/ui.jsx';
import { LogoBadge } from './components/Logo.jsx';
import { Splash, RoleSelect, Guide } from './screens/Start.jsx';
import CustomerHome from './screens/customer/Home.jsx';
import StoreDetail from './screens/customer/Store.jsx';
import OrderForm from './screens/customer/Order.jsx';
import { OrderDone, MyOrders, CustomerOrder, Saved, My } from './screens/customer/Mine.jsx';
import { OwnerHome, OwnerOrders, OwnerOrderDetail, Sales } from './screens/owner/Owner.jsx';
import { OwnerShop, ShopEdit } from './screens/owner/Shop.jsx';
import Setup from './screens/owner/Setup.jsx';
import { Settings, About, SharedOrder } from './screens/Settings.jsx';

const ROUTES = [
  ['/role', RoleSelect], ['/guide', Guide],
  ['/c', CustomerHome], ['/c/saved', Saved], ['/c/orders', MyOrders], ['/c/order/:id', CustomerOrder], ['/c/my', My],
  ['/store/:id', StoreDetail], ['/order/:id', OrderForm], ['/done/:id', OrderDone],
  ['/o', OwnerHome], ['/o/orders', OwnerOrders], ['/o/order/:id', OwnerOrderDetail], ['/o/shop', OwnerShop], ['/o/shop/:sec', ShopEdit], ['/o/sales', Sales], ['/o/setup', Setup],
  ['/settings', Settings], ['/about', About], ['/s/:code', SharedOrder],
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
    if (p) return <C key={clean} params={p} path={path} />;
  }
  return null;
}

export default function App() {
  const [splash, setSplash] = useState(true);
  const [gone, setGone] = useState(false);
  useEffect(() => {
    const a = setTimeout(() => setSplash(false), 1600);
    const b = setTimeout(() => setGone(true), 2200);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, []);
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
          <li><span className="dot">1</span><span><b>사진 한 장으로 추천</b> — 원하는 케이크 사진을 올리면 비슷한 걸 만드는 주변 가게를 골라 줘요</span></li>
          <li><span className="dot">2</span><span><b>가격 먼저</b> — 옵션을 고를 때마다 예상 가격이 바로 보여요</span></li>
          <li><span className="dot">3</span><span><b>시안 미리보기</b> — 고른 그대로 케이크 시안이 그려져요</span></li>
          <li><span className="dot">4</span><span><b>사장님은 승인만</b> — 규칙 안의 주문은 자동 확정돼요</span></li>
        </ul>
      </aside>
      <div className="phone">
        <Router />
        <Toasts />
        {!gone && <Splash out={!splash} />}
      </div>
    </div>
  );
}
