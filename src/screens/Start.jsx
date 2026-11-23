import { useEffect, useState } from 'react';
import { nav } from '../lib/router.js';
import { setState, useApp } from '../lib/state.js';
import { STATIC_A, CAKE, WEDGE, HANDS } from '../data/splashArt.js';

// 처음 열 때: 손그림 케이크 위로 뻗은 손들이 포크·숟가락을 하나씩 빼 가는 iAKE 오프닝 (디자인 핸드오프 iake-scene)
// 0~0.6초 가만히 → 0.6~2.8초 손이 차례로 빠짐 → 4초까지 멈춤. 누르면 바로 넘어간다.
export const SPLASH_MS = 4000;
const ORDER = [0, 3, 1, 5, 2, 4];
const SP_STARS = [
  { x: 52, y: 552, r: -12, c: '#f0a43a', s: 1 }, { x: 342, y: 556, r: 14, c: '#e98da0', s: 1 },
  { x: 360, y: 708, r: -8, c: '#86ad6e', s: 1 }, { x: 34, y: 714, r: 20, c: '#6f90d8', s: 1 },
  { x: 300, y: 728, r: 6, c: '#f0a43a', s: 0.7 },
];
const easeInBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; return c3 * t * t * t - c1 * t * t; };
const yank = (T, start) => { if (T <= start) return 0; if (T >= start + 0.55) return 600; return 600 * easeInBack((T - start) / 0.55); };
const LOADING = '로딩중입니다...'.split('');

export function Splash({ out, onSkip }) {
  const [T, setT] = useState(0);
  useEffect(() => {
    if (out) return undefined;
    let raf, t0;
    const step = (ts) => { if (t0 == null) t0 = ts; setT((ts - t0) / 1000); raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [out]);
  const ink = { fontFamily: 'Gaegu, sans-serif', fontWeight: 700, fontSize: 138, textAnchor: 'middle' };
  return (
    <div className={`splash ${out ? 'out' : ''}`} aria-hidden={out} onClick={onSkip} role="button" aria-label="건너뛰기">
      <svg viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice" className="sp-art">
        <g dangerouslySetInnerHTML={{ __html: STATIC_A }} />
        <g dangerouslySetInnerHTML={{ __html: CAKE + WEDGE }} />
        <g transform="rotate(-2 195 623)" style={ink}>
          <text x="195" y="660" fill="#6b5d54" letterSpacing="2">iAKE</text>
          <text x="195" y="660" filter="url(#sp-wob)" fill="none" stroke="#4a3d36" strokeWidth="2.6" strokeLinejoin="round" letterSpacing="2">iAKE</text>
        </g>
        <text x="195" y="818" textAnchor="middle" fill="#6b5d54" style={{ fontFamily: 'Gaegu, sans-serif', fontWeight: 700, fontSize: 20 }}>
          {LOADING.map((c, i) => <tspan key={i} dy={3.2 * (Math.sin(T * 6 - i * 0.7) - (i ? Math.sin(T * 6 - (i - 1) * 0.7) : 0))}>{c}</tspan>)}
        </text>
        <g filter="url(#sp-wob)" stroke="#3a2f2a" strokeWidth="1.4" strokeLinejoin="round">
          {SP_STARS.map((s, k) => <g key={k} transform={`translate(${s.x} ${s.y}) rotate(${s.r}) scale(${s.s})`}><use href="#sp-star" fill={s.c} /></g>)}
        </g>
        {HANDS.map((h, i) => (
          <g key={i} transform={h.t}><g filter="url(#sp-wob)">
            <g transform={`translate(0 ${yank(T, 0.7 + ORDER[i] * 0.3)})`} dangerouslySetInnerHTML={{ __html: h.h }} />
          </g></g>
        ))}
      </svg>
    </div>
  );
}

// 역할 고르기: 위는 깔끔한 흰 바탕(체크무늬 없음), 카드 두 장은 아주 연한 체크 + 아래쪽 손그림
const BASE = import.meta.env.BASE_URL;
export function RoleSelect() {
  const st = useApp();
  const choose = (role) => {
    setState({ role });
    if (role === 'owner') nav(st.shop ? '/o' : '/o/setup', { replace: true });
    else nav('/c', { replace: true }); // 고객은 바로 지도로 (사용법은 지도 위에서 짧게 안내)
  };
  const Li = ({ children }) => <li><i>✓</i>{children}</li>;
  return (
    <div className="role screen fade">
      <h2>어떻게 사용하실 건가요?</h2>
      <p className="lead">사장님과 고객이 한 앱에서 주문을 끝내요.</p>
      <div className="split">
        <button className="pick cust" onClick={() => choose('customer')}>
          <span className="go">›</span>
          <span className="lbl">고객{st.role === 'customer' && <em className="last">지난번 선택</em>}</span>
          <h3>고객용</h3>
          <p>내 주변 케이크<br />찾고 주문하기</p>
          <ul><Li>지도에서 바로 찾기</Li><Li>가격 먼저 확인</Li><Li>사장님과 바로 대화</Li></ul>
          <img className="art" src={`${BASE}brand/role-customer.png`} alt="" />
        </button>
        <button className="pick owner" onClick={() => choose('owner')}>
          <span className="go">›</span>
          <span className="lbl">사장님{st.role === 'owner' && <em className="last">지난번 선택</em>}</span>
          <h3>사장님용</h3>
          <p>가게 등록하고<br />주문 받기</p>
          <ul><Li>3분이면 가게 등록</Li><Li>주문이 실시간 도착</Li><Li>매출·장부·근무기록</Li></ul>
          <img className="art" src={`${BASE}brand/role-owner.png`} alt="" />
        </button>
      </div>
      <div className="foot">나중에 마이에서 언제든 바꿀 수 있어요</div>
    </div>
  );
}
// 예전 '사용 가이드' 주소로 오면: 지도 위 안내를 다시 켜고 지도로
export function Guide() {
  useEffect(() => { setState({ seenGuide: true, seenTour: false }); nav('/c', { replace: true }); }, []);
  return null;
}
