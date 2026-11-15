import { useRef, useState } from 'react';
import { LogoMark, LogoBadge, Wordmark } from '../components/Logo.jsx';
import Icon from '../components/Icon.jsx';
import { nav } from '../lib/router.js';
import { setState, useApp } from '../lib/state.js';
import { cakeSVG } from '../lib/cake.js';

export function Splash({ out }) {
  return (
    <div className={`splash ${out ? 'out' : ''}`} aria-hidden={out}>
      <div className="mark"><LogoMark size={84} /></div>
      <h1>Dear Cake</h1>
      <div className="ko">디어 케이크</div>
      <div className="tl">보고 고르고, 본 그대로 받는 커스텀 케이크</div>
    </div>
  );
}

const nest = (svg, x, y, w, h) => svg.replace('<svg ', `<svg x="${x}" y="${y}" width="${w}" height="${h}" `);
const storeArt = `<svg viewBox="0 0 160 130" xmlns="http://www.w3.org/2000/svg">
  <rect x="18" y="40" width="124" height="80" rx="8" fill="#fff" opacity=".95"/>
  <path d="M12 40h136l-8-22H20z" fill="#FF8FB3"/>
  <path d="M12 40h17v6a8.5 8.5 0 0 1-17 0zM29 40h17v6a8.5 8.5 0 0 1-17 0zM46 40h17v6a8.5 8.5 0 0 1-17 0zM63 40h17v6a8.5 8.5 0 0 1-17 0zM80 40h17v6a8.5 8.5 0 0 1-17 0zM97 40h17v6a8.5 8.5 0 0 1-17 0zM114 40h17v6a8.5 8.5 0 0 1-17 0zM131 40h17v6a8.5 8.5 0 0 1-17 0z" fill="#fff" opacity=".9"/>
  <rect x="30" y="62" width="52" height="40" rx="6" fill="#FFE7EF"/>
  <rect x="94" y="62" width="34" height="58" rx="5" fill="#4a3a44" opacity=".85"/>
  <circle cx="122" cy="92" r="2.4" fill="#FFD36E"/>
  <rect x="64" y="12" width="32" height="12" rx="6" fill="#fff"/>
  <text x="80" y="21" text-anchor="middle" font-size="7.5" font-weight="700" fill="#E04479" font-family="Fredoka,sans-serif">OPEN</text>
</svg>`;

export function RoleSelect() {
  const st = useApp();
  const choose = (role) => {
    setState({ role });
    if (role === 'owner') nav(st.shop ? '/o' : '/o/setup', { replace: true });
    else nav(st.seenGuide ? '/c' : '/guide', { replace: true });
  };
  const cake = cakeSVG({ shape: 'heart', size: 'h1', design: 'vintage', cream: 'white', text: 'Dear', font: 'script', textColor: 'berry', toppings: ['cherry'] }, { bg: false, uid: 'role' });
  return (
    <div className="role screen fade">
      <div className="top"><LogoBadge size={36} /><Wordmark size={22} /></div>
      <h2>어떻게 사용하실 건가요?</h2>
      <p className="lead">사장님과 고객이 한 앱에서 주문을 끝내요.</p>
      <div className="split">
        <button className="pick owner" onClick={() => choose('owner')}>
          <span className="go"><Icon n="right" /></span>
          <span className="lbl">FOR OWNER</span>
          <h3>사장님용</h3>
          <p>가게 등록하고<br />주문 받기</p>
          <ul><li>✓ 3분이면 가게 등록</li><li>✓ 가격표 한 번만 입력</li><li>✓ 주문은 승인만 누르면 끝</li></ul>
          <div className="art" dangerouslySetInnerHTML={{ __html: storeArt }} />
        </button>
        <button className="pick cust" onClick={() => choose('customer')}>
          <span className="go"><Icon n="right" /></span>
          <span className="lbl">FOR CUSTOMER</span>
          <h3>고객용</h3>
          <p>내 주변 케이크<br />찾고 주문하기</p>
          <ul><li>✓ 사진 한 장으로 추천</li><li>✓ 가격 먼저 확인</li><li>✓ 시안 미리보기</li></ul>
          <div className="art" dangerouslySetInnerHTML={{ __html: cake }} />
        </button>
      </div>
      <div className="foot">나중에 마이 › 모드 바꾸기에서 언제든 바꿀 수 있어요</div>
    </div>
  );
}

// ── 가이드 그림 ──
function art1() {
  const pins = [[70, 92, '🎂'], [190, 70, '⚡'], [215, 160, '🎂'], [95, 190, '🎂'], [160, 210, '🎂']];
  return `<svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg"><rect width="300" height="300" fill="#F6F0EA"/>
  <path d="M-10 120 C80 100 200 150 310 110" stroke="#fff" stroke-width="18" fill="none"/><path d="M120 -10 C140 100 100 200 150 310" stroke="#fff" stroke-width="14" fill="none"/>
  <path d="M-10 230 L310 200" stroke="#fff" stroke-width="10" fill="none"/><rect x="200" y="215" width="70" height="50" rx="14" fill="#DCEFD5"/><path d="M-20 40 C90 80 180 10 330 50" stroke="#CFE3F3" stroke-width="26" fill="none"/>
  <circle cx="150" cy="150" r="95" fill="#F75C8D" opacity=".07" stroke="#F75C8D" stroke-opacity=".4" stroke-dasharray="5 5"/>
  ${pins.map(([x, y, e], i) => `<g transform="translate(${x} ${y})"><path d="M0 0 C-14 -16 -18 -24 -18 -32 A18 18 0 0 1 18 -32 C18 -24 14 -16 0 0Z" fill="${i === 1 ? '#F75C8D' : '#fff'}" stroke="#F75C8D" stroke-width="2.5"/><text x="0" y="-26" text-anchor="middle" font-size="15">${e}</text></g>`).join('')}
  <circle cx="150" cy="150" r="11" fill="#3B82F6" stroke="#fff" stroke-width="4"/><circle cx="150" cy="150" r="24" fill="#3B82F6" opacity=".15"/></svg>`;
}
function art2() {
  const c = cakeSVG({ shape: 'heart', size: 'h1', design: 'vintage', cream: 'pink', text: '사랑해', font: 'pen', textColor: 'berry', toppings: ['pearl'] }, { bg: false, uid: 'ga' });
  const s = (o, i) => cakeSVG(o, { uid: 'gs' + i });
  return `<svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg"><rect width="300" height="300" fill="#FFF3F7"/>
  <rect x="30" y="40" width="120" height="200" rx="20" fill="#2A2126"/><rect x="37" y="52" width="106" height="176" rx="14" fill="#fff"/>
  ${nest(c, 34, 80, 112, 94)}<rect x="52" y="190" width="76" height="22" rx="11" fill="#F75C8D"/><text x="90" y="205" text-anchor="middle" font-size="10" font-weight="800" fill="#fff">사진으로 찾기</text>
  <path d="M158 140 h18" stroke="#F75C8D" stroke-width="4" stroke-linecap="round"/><path d="M172 132 l8 8 -8 8" stroke="#F75C8D" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  ${[0, 1, 2].map((i) => `<g transform="translate(188 ${54 + i * 66})"><rect width="96" height="58" rx="12" fill="#fff" stroke="#F3D3DF"/>${nest(s({ shape: ['heart', 'round', 'heart'][i], size: 'h1', design: ['vintage', 'heartdots', 'simple'][i], cream: ['pink', 'lavender', 'white'][i], text: '♥', textColor: 'berry' }, i), 4, 6, 50, 46)}<text x="58" y="26" font-size="12" font-weight="800" fill="#E04479">${[96, 88, 81][i]}%</text><text x="58" y="42" font-size="9" fill="#8D8288">${['0.8km', '1.2km', '2.1km'][i]}</text></g>`).join('')}</svg>`;
}
function art3() {
  const rows = [['홀리데이케이크', '행궁동 · 0.9km', '1호 4.5~5.5만원', 'pink', 'heart'], ['미도리케이크', '세류동 · 1.4km', '1호 5만원~', 'mint', 'round'], ['체험 공방', '원천동 · 0.5km', '1호 42,000원', 'lavender', 'square']];
  return `<svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg"><rect width="300" height="300" fill="#FFF7FA"/>
  ${rows.map(([n, m, p, cr, sh], i) => `<g transform="translate(26 ${36 + i * 80})"><rect width="248" height="68" rx="16" fill="#fff" stroke="${i === 2 ? '#F75C8D' : '#F1E3E9'}" stroke-width="${i === 2 ? 2.5 : 1.5}"/>${nest(cakeSVG({ shape: sh, size: 'h1', design: 'simple', cream: cr, text: '♥', textColor: 'berry' }, { uid: 'g3' + i }), 8, 8, 62, 52)}<text x="80" y="25" font-size="13" font-weight="800" fill="#2A2126">${n}</text><text x="80" y="41" font-size="10" fill="#8D8288">${m}</text><text x="80" y="57" font-size="11" font-weight="800" fill="#E04479">${p}</text></g>`).join('')}</svg>`;
}
function art4() {
  const c = cakeSVG({ shape: 'round', size: 'h1', design: 'simple', cream: 'butter', text: '생일 축하해', font: 'jua', textColor: 'berry', toppings: ['cherry'], extras: ['candle'] }, { bg: false, uid: 'g4', fancy: true });
  return `<svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg"><rect width="300" height="300" fill="#FFF3F7"/>${nest(c, 20, 30, 260, 216)}
  ${['1호', '버터옐로', '체리', '파티 초'].map((t, i) => `<g transform="translate(${18 + i * 68} 18)"><rect width="${t.length * 11 + 18}" height="24" rx="12" fill="${i === 2 ? '#F75C8D' : '#fff'}" stroke="#F3C6D6"/><text x="${(t.length * 11 + 18) / 2}" y="16" text-anchor="middle" font-size="11" font-weight="800" fill="${i === 2 ? '#fff' : '#5B4F56'}">${t}</text></g>`).join('')}
  <g transform="translate(80 248)"><rect width="140" height="38" rx="19" fill="#2A2126"/><text x="70" y="24" text-anchor="middle" font-size="13" font-weight="800" fill="#fff">예상 45,000원</text></g></svg>`;
}
function art5() {
  return `<svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg"><rect width="300" height="300" fill="#F3FBF7"/>
  <g transform="translate(40 50)"><rect width="220" height="150" rx="20" fill="#fff" stroke="#DDEFE5" stroke-width="2"/>
  <circle cx="34" cy="36" r="18" fill="#2F2A33"/><text x="34" y="41" text-anchor="middle" font-size="15">🏪</text>
  <text x="62" y="32" font-size="12" font-weight="800" fill="#2A2126">사장님</text><text x="62" y="48" font-size="10" fill="#8D8288">방금</text>
  <rect x="20" y="66" width="180" height="34" rx="12" fill="#E9F8F0"/><text x="32" y="88" font-size="12" font-weight="700" fill="#17744F">주문 확정! 45,000원으로 만들게요 :)</text>
  <rect x="20" y="110" width="86" height="28" rx="10" fill="#1E9E6A"/><text x="63" y="128" text-anchor="middle" font-size="11.5" font-weight="800" fill="#fff">승인</text>
  <rect x="114" y="110" width="86" height="28" rx="10" fill="#fff" stroke="#E8D9E0"/><text x="157" y="128" text-anchor="middle" font-size="11.5" font-weight="800" fill="#5B4F56">수정 요청</text></g>
  <circle cx="150" cy="240" r="30" fill="#1E9E6A"/><path d="M136 240 l10 10 20 -20" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
const SLIDES = [
  { art: art1, t: '내 위치를 정해요', d: '지금 위치나 동네를 고르면 주변 커스텀·레터링 케이크 가게가 지도에 떠요.' },
  { art: art2, t: '원하는 케이크 사진을 올려요', d: '사진 속 색·모양·스타일을 분석해서 비슷한 케이크를 만드는 가게를 골라 드려요.' },
  { art: art3, t: '가게를 한눈에 비교해요', d: '거리, 할 수 있는 스타일, 예상 가격, 예시 디자인을 카드 하나로 비교해요.' },
  { art: art4, t: '고르면 시안과 가격이 바로', d: '크기·맛·문구·장식을 고를 때마다 케이크 시안이 그려지고 예상 가격이 바뀌어요.' },
  { art: art5, t: '사장님이 확인하면 끝', d: '주문서를 보내면 사장님은 승인만 누르면 돼요. 가게 규칙 안이면 바로 확정!' },
];

export function Guide() {
  const [i, setI] = useState(0);
  const [dx, setDx] = useState(0);
  const sx = useRef(null);
  const done = () => { setState({ seenGuide: true }); nav('/c', { replace: true }); };
  const go = (n) => setI(Math.max(0, Math.min(SLIDES.length - 1, n)));
  return (
    <div className="guide screen fade">
      <button className="skip" onClick={done}>건너뛰기</button>
      <div className="track" style={{ transform: `translateX(calc(${-i * 100}% + ${dx}px))`, transition: sx.current != null ? 'none' : undefined }}
        onPointerDown={(e) => { sx.current = e.clientX; e.currentTarget.setPointerCapture?.(e.pointerId); }}
        onPointerMove={(e) => { if (sx.current != null) setDx(e.clientX - sx.current); }}
        onPointerUp={() => { if (dx < -50) go(i + 1); else if (dx > 50) go(i - 1); sx.current = null; setDx(0); }}
        onPointerCancel={() => { sx.current = null; setDx(0); }}>
        {SLIDES.map((s, k) => (
          <div className="slide" key={k}>
            <div className="art" dangerouslySetInnerHTML={{ __html: s.art() }} />
            <span className="step">STEP {k + 1} / 5</span>
            <h2>{s.t}</h2>
            <p>{s.d}</p>
          </div>
        ))}
      </div>
      <div className="foot">
        <div className="dots">{SLIDES.map((_, k) => <i key={k} className={k === i ? 'on' : ''} onClick={() => go(k)} />)}</div>
        <button className="btn pri block" onClick={() => (i < SLIDES.length - 1 ? go(i + 1) : done())}>{i < SLIDES.length - 1 ? '다음' : '내 주변 케이크 찾기'}</button>
      </div>
    </div>
  );
}
