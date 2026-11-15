// Dear Cake 로고: 하트를 올린 케이크 (편지 'Dear'의 마음을 담은 케이크)
export function LogoMark({ size = 64, color = '#fff', cream = '#FFD3E0', dot = '#F75C8D', style }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} style={style} aria-label="Dear Cake 로고">
      <path d="M9 52.5h46" stroke={color} strokeWidth="3.4" strokeLinecap="round" />
      <rect x="13.5" y="31" width="37" height="19" rx="5.5" fill={color} />
      <path d="M13.5 36.6c0-3.4 2.7-6.1 6.1-6.1h24.8c3.4 0 6.1 2.7 6.1 6.1v1.6c0 1.6-1.3 2.6-2.7 2.6-1.7 0-2.4-1.7-3.7-1.7s-2 3.2-4 3.2-2.4-3.2-4-3.2-2.3 2.2-4 2.2-2.3-2.2-4-2.2-2.1 3.2-4 3.2-2.6-3.2-4-3.2-2.1 1.7-3.7 1.7c-1.5 0-2.9-1-2.9-2.6z" fill={cream} />
      <circle cx="21" cy="45.5" r="1.6" fill={dot} opacity=".55" />
      <circle cx="32" cy="46.5" r="1.6" fill={dot} opacity=".55" />
      <circle cx="43" cy="45.5" r="1.6" fill={dot} opacity=".55" />
      <path d="M32 27.6c-4.6-2.9-7.6-5.6-7.6-8.9 0-2.2 1.7-3.9 3.9-3.9 1.6 0 3 .9 3.7 2.2.7-1.3 2.1-2.2 3.7-2.2 2.2 0 3.9 1.7 3.9 3.9 0 3.3-3 6-7.6 8.9z" fill={color} />
    </svg>
  );
}

export function Wordmark({ size = 22, color = '#E04479', sub = false }) {
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', lineHeight: 1 }}>
      <span style={{ fontFamily: 'Fredoka, sans-serif', fontWeight: 700, fontSize: size, color, letterSpacing: -0.3 }}>Dear Cake</span>
      {sub && <span style={{ fontSize: size * 0.42, fontWeight: 700, color, opacity: 0.8, letterSpacing: 3, marginTop: 3 }}>디어 케이크</span>}
    </span>
  );
}

export function LogoBadge({ size = 34 }) {
  return (
    <span style={{ width: size, height: size, borderRadius: size * 0.32, background: 'linear-gradient(135deg,#FF8FB3,#F75C8D)', display: 'inline-grid', placeItems: 'center', flex: 'none', boxShadow: '0 4px 12px rgba(247,92,141,.3)' }}>
      <LogoMark size={size * 0.74} />
    </span>
  );
}
