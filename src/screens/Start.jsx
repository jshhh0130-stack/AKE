import { useEffect } from 'react';
import { Logo } from '../components/Logo.jsx';
import Icon from '../components/Icon.jsx';
import { nav } from '../lib/router.js';
import { setState, useApp } from '../lib/state.js';
import { cakeSVG } from '../lib/cake.js';

// 처음 열 때: 크림 바탕에 에이크 로고
export function Splash({ out }) {
  return (
    <div className={`splash ${out ? 'out' : ''}`} aria-hidden={out}>
      <Logo h={120} />
      <div className="tl">C는 비워 뒀어요. 당신이 채우는 순간, CAKE가 됩니다.</div>
    </div>
  );
}

const storeArt = `<svg viewBox="0 0 160 130" xmlns="http://www.w3.org/2000/svg">
  <rect x="18" y="40" width="124" height="80" rx="10" fill="#fff"/>
  <path d="M12 40h136l-8-22H20z" fill="#F4A2A8"/>
  <path d="M12 40h17v6a8.5 8.5 0 0 1-17 0zM46 40h17v6a8.5 8.5 0 0 1-17 0zM80 40h17v6a8.5 8.5 0 0 1-17 0zM114 40h17v6a8.5 8.5 0 0 1-17 0z" fill="#fff"/>
  <path d="M29 40h17v6a8.5 8.5 0 0 1-17 0zM63 40h17v6a8.5 8.5 0 0 1-17 0zM97 40h17v6a8.5 8.5 0 0 1-17 0zM131 40h17v6a8.5 8.5 0 0 1-17 0z" fill="#F4A2A8"/>
  <rect x="30" y="62" width="52" height="40" rx="8" fill="#FDE8EA"/>
  <path d="M40 92h32M44 92v-8a3 3 0 0 1 3-3h18a3 3 0 0 1 3 3v8" stroke="#B8485A" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  <path d="M56 81v-5" stroke="#B8485A" stroke-width="2.4" stroke-linecap="round"/><circle cx="56" cy="73" r="2.4" fill="#F6B85C"/>
  <rect x="94" y="62" width="34" height="58" rx="6" fill="#3D2A2A" opacity=".9"/>
  <circle cx="122" cy="92" r="2.4" fill="#F6B85C"/>
  <rect x="62" y="10" width="36" height="14" rx="7" fill="#fff" stroke="#EFE1CF"/>
  <text x="80" y="20.5" text-anchor="middle" font-size="8" font-weight="700" fill="#B8485A" font-family="Pretendard Variable,sans-serif">OPEN</text>
</svg>`;

export function RoleSelect() {
  const st = useApp();
  const choose = (role) => {
    setState({ role });
    if (role === 'owner') nav(st.shop ? '/o' : '/o/setup', { replace: true });
    else nav('/c', { replace: true }); // 고객은 바로 지도로 (사용법은 지도 위에서 짧게 안내)
  };
  const cake = cakeSVG({ shape: 'heart', size: 'h1', design: 'vintage', cream: 'pink', text: '♥', font: 'jua', textColor: 'berry', toppings: ['cherry'] }, { bg: false, uid: 'role' });
  const Li = ({ children }) => <li><Icon n="check" />{children}</li>;
  return (
    <div className="role screen fade">
      <div className="top"><Logo h={30} /></div>
      <h2>어떻게 사용하실 건가요?</h2>
      <p className="lead">사장님과 고객이 한 앱에서 주문을 끝내요.</p>
      <div className="split">
        <button className="pick owner" onClick={() => choose('owner')}>
          <span className="go"><Icon n="right" /></span>
          <span className="lbl">사장님{st.role === 'owner' && <em className="last">지난번 선택</em>}</span>
          <h3>사장님용</h3>
          <p>가게 등록하고<br />주문 받기</p>
          <ul><Li>3분이면 가게 등록</Li><Li>주문이 실시간 도착</Li><Li>매출·장부·근무기록</Li></ul>
          <div className="art" dangerouslySetInnerHTML={{ __html: storeArt }} />
        </button>
        <button className="pick cust" onClick={() => choose('customer')}>
          <span className="go"><Icon n="right" /></span>
          <span className="lbl">고객{st.role === 'customer' && <em className="last">지난번 선택</em>}</span>
          <h3>고객용</h3>
          <p>내 주변 케이크<br />찾고 주문하기</p>
          <ul><Li>지도에서 바로 찾기</Li><Li>가격 먼저 확인</Li><Li>사장님과 바로 대화</Li></ul>
          <div className="art" dangerouslySetInnerHTML={{ __html: cake }} />
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
