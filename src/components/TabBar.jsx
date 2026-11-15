import Icon from './Icon.jsx';
import { nav } from '../lib/router.js';
import { useApp } from '../lib/state.js';
import { unseenCount } from '../lib/orders.js';

// 고객 탭바 (주문내역에 새 소식 숫자 표시)
export function CustomerTabBar({ current }) {
  const st = useApp();
  const n = unseenCount(st);
  return <TabBar tabs={CUSTOMER_TABS.map((t) => (t.path === '/c/orders' ? { ...t, badge: n } : t))} current={current} />;
}

export default function TabBar({ tabs, current }) {
  return (
    <nav className="tabbar">
      {tabs.map((t) => (
        <button key={t.path} className={current === t.path ? 'on' : ''} onClick={() => current !== t.path && nav(t.path, { replace: true })} aria-label={t.label}>
          <Icon n={t.icon} />
          {t.label}
          {t.badge ? <span className="badge">{t.badge}</span> : null}
        </button>
      ))}
    </nav>
  );
}
export const CUSTOMER_TABS = [
  { path: '/c', icon: 'map', label: '지도' },
  { path: '/c/saved', icon: 'heart', label: '찜' },
  { path: '/c/orders', icon: 'receipt', label: '주문내역' },
  { path: '/c/my', icon: 'user', label: '마이' },
];
export const OWNER_TABS = [
  { path: '/o', icon: 'home', label: '오늘' },
  { path: '/o/orders', icon: 'calendar', label: '주문' },
  { path: '/o/shop', icon: 'store', label: '내 가게' },
  { path: '/o/sales', icon: 'won', label: '정산' },
];
