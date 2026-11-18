// 핸드폰 홈 화면에 앱처럼 설치하기 안내 (안드로이드: 설치 버튼 / 아이폰: 공유 → 홈 화면에 추가)
import { useEffect, useState } from 'react';
import Icon from './Icon.jsx';
import { LogoBadge } from './Logo.jsx';

let deferred = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; window.dispatchEvent(new Event('dc-install-ready')); });

const standalone = () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isMobile = () => /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export default function InstallBanner() {
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);
  const [canPrompt, setCanPrompt] = useState(!!deferred);
  const [help, setHelp] = useState(false);
  useEffect(() => {
    if (standalone() || !isMobile()) return;
    if (localStorage.getItem('dearcake:install-hide') && Date.now() - +localStorage.getItem('dearcake:install-hide') < 3 * 864e5) return;
    setIos(isIOS());
    const t = setTimeout(() => setShow(true), 4500);
    const on = () => setCanPrompt(true);
    window.addEventListener('dc-install-ready', on);
    return () => { clearTimeout(t); window.removeEventListener('dc-install-ready', on); };
  }, []);
  if (!show) return null;
  const hide = () => { localStorage.setItem('dearcake:install-hide', String(Date.now())); setShow(false); };
  const install = async () => {
    if (deferred) { deferred.prompt(); const r = await deferred.userChoice.catch(() => null); deferred = null; if (r?.outcome === 'accepted') hide(); }
    else setHelp(true);
  };
  return (
    <div style={{ position: 'absolute', left: 10, right: 10, top: 'calc(10px + var(--st))', zIndex: 80, background: '#fff', borderRadius: 18, boxShadow: '0 12px 34px rgba(61,42,42,.16)', padding: 12, border: '1px solid #efe1cf' }} className="fadeup">
      <div className="row">
        <LogoBadge size={40} />
        <div className="grow"><div className="b small">에이크를 앱처럼 설치하세요</div><div className="xs muted">홈 화면에서 바로 열리고 전체 화면으로 보여요</div></div>
        <button className="ib" onClick={hide} aria-label="닫기" style={{ width: 32, height: 32, display: 'grid', placeItems: 'center', color: 'var(--faint)' }}><Icon n="close" size="sm" /></button>
      </div>
      {!help && !ios && <button className="btn pri block sm" style={{ marginTop: 10 }} onClick={install}>{canPrompt ? '홈 화면에 설치' : '설치 방법 보기'}</button>}
      {(help || ios) && (
        <div className="note" style={{ marginTop: 10 }}>
          {ios ? <>사파리 아래쪽 <b>공유 버튼(□↑)</b> → <b>홈 화면에 추가</b> → 오른쪽 위 <b>추가</b>를 누르세요.</> : <>크롬 오른쪽 위 <b>⋮ 메뉴</b> → <b>앱 설치</b>(또는 <b>홈 화면에 추가</b>)를 누르세요.</>}
        </div>
      )}
    </div>
  );
}
