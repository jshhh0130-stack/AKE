import Icon from './Icon.jsx';
import { nav } from '../lib/router.js';
import { useApp } from '../lib/state.js';
import { unreadTotal } from '../lib/orders.js';

export default function TabBar({ tabs, current }) {
  return (
    <nav className="tabbar">
      {tabs.map((t) => {
        const on = current === t.path;
        return (
          <button key={t.path} className={on ? 'on' : ''} data-coach={t.coach} onClick={() => !on && nav(t.path, { replace: true })} aria-label={t.label}>
            <Icon n={t.icon} fill={on && t.fillOn !== false} />
            {t.label}
            {t.badge ? <span className="badge">{t.badge}</span> : null}
          </button>
        );
      })}
    </nav>
  );
}
export const CUSTOMER_TABS = [
  { path: '/c', icon: 'map', label: '지도', fillOn: false },
  { path: '/c/orders', icon: 'chat', label: '주문·대화' },
  { path: '/c/saved', icon: 'heart', label: '관심', coach: 'tab-saved' },
  { path: '/c/my', icon: 'user', label: '마이' },
];
export const OWNER_TABS = [
  { path: '/o', icon: 'home', label: '오늘' },
  { path: '/o/orders', icon: 'chat', label: '주문·대화' },
  { path: '/o/sales', icon: 'chart', label: '매출·장부', fillOn: false },
  { path: '/o/shop', icon: 'store', label: '내 가게', fillOn: false },
];
// 탭바 (새 소식이 있는 주문 수를 숫자로 표시)
export function CustomerTabBar({ current }) {
  const st = useApp();
  const n = unreadTotal(st, 'c');
  return <TabBar tabs={CUSTOMER_TABS.map((t) => (t.path === '/c/orders' ? { ...t, badge: n } : t))} current={current} />;
}
export function OwnerTabBar({ current }) {
  const st = useApp();
  const n = unreadTotal(st, 'o');
  return <TabBar tabs={OWNER_TABS.map((t) => (t.path === '/o/orders' ? { ...t, badge: n } : t))} current={current} />;
}
