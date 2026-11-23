import { useEffect } from 'react';
import { Logo } from '../components/Logo.jsx';
import Icon from '../components/Icon.jsx';
import { nav } from '../lib/router.js';
import { setState, useApp } from '../lib/state.js';

// 처음 열 때: 크림 바탕에 에이크 로고
export function Splash({ out }) {
  return (
    <div className={`splash ${out ? 'out' : ''}`} aria-hidden={out}>
      <Logo h={120} />
      <div className="tl">C는 비워 뒀어요. 당신이 채우는 순간, CAKE가 됩니다.</div>
    </div>
  );
}

// 손그림 느낌 일러스트 (갈색 굵은 선 · 둥근 끝 · 파스텔 채움)
const L = 'stroke="#4A3B39" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"';
const star = (x, y, s, c) => `<path d="M${x} ${y - s}l${s * 0.3} ${s * 0.68} ${s * 0.72} ${s * 0.06}-${s * 0.55} ${s * 0.46} ${s * 0.18} ${s * 0.72}-${s * 0.65}-${s * 0.4}-${s * 0.65} ${s * 0.4} ${s * 0.18}-${s * 0.72}-${s * 0.55}-${s * 0.46} ${s * 0.72}-${s * 0.06}z" fill="${c}" stroke="#4A3B39" stroke-width="1.3" stroke-linejoin="round"/>`;

// 고객: 딸기 생크림 케이크 + 초 하나 + 별
const cakeArt = `<svg viewBox="0 0 160 150" xmlns="http://www.w3.org/2000/svg">
  ${star(26, 30, 7, '#F6B85C')}${star(134, 22, 6, '#E58A95')}${star(140, 92, 5, '#8FA3D6')}${star(18, 96, 4.5, '#B9CF97')}
  <path d="M118 40h6M121 37v6" ${L} stroke-width="1.6"/>
  <ellipse cx="80" cy="132" rx="64" ry="9" fill="#fff" ${L}/>
  <path d="M30 86v36q0 8 10 8h80q10 0 10-8V86" fill="#FFF6EA" ${L}/>
  <path d="M30 86q0-14 50-14t50 14v4q-4 9-9 2-5 10-11 1-5 11-12 1-6 10-12 0-6 10-12 0-6 11-12 0-6 9-11-1-5 9-10 0-5 8-9 0-4 6-4-3z" fill="#F8C9D0" ${L}/>
  <path d="M38 108h3M56 114h3M78 110h3M100 115h3M118 107h3" stroke="#E58A95" stroke-width="2" stroke-linecap="round"/>
  <path d="M48 117h2M90 120h2M66 121h2" stroke="#8FA3D6" stroke-width="2" stroke-linecap="round"/>
  <g fill="#E85D6A" ${L} stroke-width="1.8"><path d="M46 70q-7 0-6 7t6 6q5-1 6-6t-6-7z"/><path d="M64 66q-7 0-6 7t6 6q5-1 6-6t-6-7z"/><path d="M98 66q-7 0-6 7t6 6q5-1 6-6t-6-7z"/><path d="M116 70q-7 0-6 7t6 6q5-1 6-6t-6-7z"/></g>
  <path d="M43 69l3-3 3 3M61 65l3-3 3 3M95 65l3-3 3 3M113 69l3-3 3 3" stroke="#6E9A4A" stroke-width="1.8" fill="none" stroke-linecap="round"/>
  <rect x="75" y="36" width="10" height="34" rx="2" fill="#fff" ${L}/>
  <path d="M75 44l10-5M75 53l10-5M75 62l10-5" stroke="#F4A2A8" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M80 36v-5" ${L}/>
  <path d="M80 16q-7 8-5 13t5 4q5-1 5-5t-5-12z" fill="#F6B85C" ${L} stroke-width="1.8"/>
  <path d="M80 24q-2 4 0 6" stroke="#FFF2C7" stroke-width="2" fill="none" stroke-linecap="round"/>
</svg>`;

// 사장님: CAKE 간판 가게 + 줄무늬 차양 + 창문 케이크 + OPEN 문 + 화분
const storeArt = `<svg viewBox="0 0 160 150" xmlns="http://www.w3.org/2000/svg">
  ${star(16, 26, 6, '#F6B85C')}${star(146, 18, 5.5, '#E58A95')}${star(150, 70, 4.5, '#8FA3D6')}
  <rect x="50" y="6" width="60" height="18" rx="3" fill="#fff" ${L}/>
  <text x="80" y="19.5" text-anchor="middle" font-size="11" font-weight="800" letter-spacing="3" fill="#5A79B8" font-family="Pretendard Variable,sans-serif">CAKE</text>
  <path d="M64 24v6M96 24v6" ${L}/>
  <rect x="24" y="50" width="112" height="84" fill="#FFF8EE" ${L}/>
  <path d="M16 30h128l-6 22H22z" fill="#fff" ${L}/>
  <path d="M27 30l-3 22h12l2-22zM49 30l-1 22h12v-22zM71 30v22h12l1-22zM93 30l1 22h12l-1-22zM115 30l3 22h12l-4-22z" fill="#F4A2A8"/>
  <path d="M16 30h128l-6 22H22z" fill="none" ${L}/>
  <path d="M22 52q6 8 12 0 6 8 12 0 6 8 12 0 6 8 12 0 6 8 12 0 6 8 12 0 6 8 12 0 6 8 12 0 6 8 12 0" fill="#fff" ${L} stroke-width="1.8"/>
  <rect x="32" y="70" width="50" height="40" rx="2" fill="#FDE8EA" ${L}/>
  <path d="M42 104h30M45 104v-9h24v9" fill="#fff" ${L} stroke-width="1.8"/>
  <path d="M45 95q12-6 24 0" fill="#F8C9D0" ${L} stroke-width="1.6"/>
  <circle cx="57" cy="90" r="2.6" fill="#E85D6A" ${L} stroke-width="1.2"/>
  <rect x="94" y="68" width="32" height="66" rx="2" fill="#A9705A" ${L}/>
  <rect x="100" y="84" width="20" height="9" rx="1.5" fill="#fff" ${L} stroke-width="1.4"/>
  <text x="110" y="91" text-anchor="middle" font-size="5.5" font-weight="800" fill="#B8485A" font-family="Pretendard Variable,sans-serif">OPEN</text>
  <circle cx="121" cy="104" r="1.8" fill="#F6B85C"/>
  <path d="M8 134h144" ${L}/>
  <path d="M14 134l-2-12h14l-2 12z" fill="#D98B5F" ${L} stroke-width="1.8"/>
  <path d="M19 122q-6-8-2-12M19 122q6-9 2-13M19 122v-12" fill="none" stroke="#6E9A4A" stroke-width="1.8" stroke-linecap="round"/>
</svg>`;

export function RoleSelect() {
  const st = useApp();
  const choose = (role) => {
    setState({ role });
    if (role === 'owner') nav(st.shop ? '/o' : '/o/setup', { replace: true });
    else nav('/c', { replace: true }); // 고객은 바로 지도로 (사용법은 지도 위에서 짧게 안내)
  };
  const Li = ({ children }) => <li><Icon n="check" />{children}</li>;
  return (
    <div className="role screen fade">
      <div className="top"><Logo h={30} /></div>
      <h2>어떻게 사용하실 건가요?</h2>
      <p className="lead">사장님과 고객이 한 앱에서 주문을 끝내요.</p>
      <div className="split">
        <button className="pick cust" onClick={() => choose('customer')}>
          <span className="go"><Icon n="right" /></span>
          <span className="lbl">고객{st.role === 'customer' && <em className="last">지난번 선택</em>}</span>
          <h3>고객용</h3>
          <p>내 주변 케이크<br />찾고 주문하기</p>
          <ul><Li>지도에서 바로 찾기</Li><Li>가격 먼저 확인</Li><Li>사장님과 바로 대화</Li></ul>
          <div className="art" dangerouslySetInnerHTML={{ __html: cakeArt }} />
        </button>
        <button className="pick owner" onClick={() => choose('owner')}>
          <span className="go"><Icon n="right" /></span>
          <span className="lbl">사장님{st.role === 'owner' && <em className="last">지난번 선택</em>}</span>
          <h3>사장님용</h3>
          <p>가게 등록하고<br />주문 받기</p>
          <ul><Li>3분이면 가게 등록</Li><Li>주문이 실시간 도착</Li><Li>매출·장부·근무기록</Li></ul>
          <div className="art" dangerouslySetInnerHTML={{ __html: storeArt }} />
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
