// 위치 공유: 가게 위치 · 가게 페이지 · 내 위치 · 지금 지도에서 보는 곳 → 휴대폰 공유창(카톡·문자) 또는 링크 복사
import { useState } from 'react';
import Icon from './Icon.jsx';
import { Sheet, toast } from './ui.jsx';
import { shareText } from '../lib/util.js';
import { getGPS, reverseLabel } from '../lib/geo.js';
import { getState, setState } from '../lib/state.js';

export const kakaoMapLink = (name, lat, lng) => `https://map.kakao.com/link/map/${encodeURIComponent(name)},${(+lat).toFixed(6)},${(+lng).toFixed(6)}`;
export const googleMapLink = (lat, lng) => `https://www.google.com/maps/search/?api=1&query=${(+lat).toFixed(6)},${(+lng).toFixed(6)}`;
const appBase = () => location.href.split('#')[0];
const done = (r) => { if (r === 'copied') toast('링크를 복사했어요. 카톡·문자에 붙여 넣으세요'); else if (r === 'fail') toast('공유하지 못했어요'); };

export async function shareStoreLocation(s) {
  const text = `${s.name}\n${s.addr || ''}\n카카오맵: ${kakaoMapLink(s.name, s.lat, s.lng)}`;
  done(await shareText({ title: `${s.name} 위치`, text, url: googleMapLink(s.lat, s.lng) }));
}
export async function shareStorePage(s) {
  done(await shareText({ title: s.name, text: `${s.name} — 에이크에서 가격·주문서 보기`, url: `${appBase()}#/store/${s.id}` }));
}
export async function sharePoint(label, lat, lng) {
  done(await shareText({ title: label, text: `${label}\n카카오맵: ${kakaoMapLink(label, lat, lng)}`, url: googleMapLink(lat, lng) }));
}
// 위치 권한을 쓰기 전에 왜 필요한지 한 번 알려 준다 (브라우저 허용 창은 그다음)
export async function myLocation() {
  const p = await getGPS();
  if (!getState().locOk) setState({ locOk: true });
  return p;
}

export function LocShareSheet({ open, onClose, store, center }) {
  const [busy, setBusy] = useState('');
  const run = (k, fn) => async () => { setBusy(k); try { await fn(); onClose(); } catch (e) { toast(e.message || '위치를 찾지 못했어요'); } setBusy(''); };
  const Row = ({ k, icon, t, s, onClick, pink }) => (
    <button className="srow" onClick={onClick} disabled={!!busy}>
      <span className={`ic ${pink ? 'pink' : ''}`}><Icon n={icon} /></span>
      <span className="grow"><div className="t">{busy === k ? '잠시만요…' : t}</div><div className="s">{s}</div></span>
      <Icon n="right" size="sm" />
    </button>
  );
  return (
    <Sheet open={open} onClose={onClose} title="위치 공유">
      {store && (<>
        <Row k="sloc" pink icon="pin" t={`${store.name} 위치 보내기`} s="주소와 카카오맵·구글 지도 링크" onClick={run('sloc', () => shareStoreLocation(store))} />
        <Row k="spage" icon="link" t="가게 페이지 보내기" s="가격과 주문서를 바로 볼 수 있는 링크" onClick={run('spage', () => shareStorePage(store))} />
      </>)}
      <Row k="me" icon="gps" t="내 위치 보내기" s="지금 있는 곳을 지도 링크로 보내요" onClick={run('me', async () => { const p = await myLocation(); const label = (await reverseLabel(p.lat, p.lng)) || '내 위치'; await sharePoint(`내 위치 (${label})`, p.lat, p.lng); })} />
      {center && <Row k="here" icon="map" t="지금 보는 곳 보내기" s={center.label || '지도 가운데'} onClick={run('here', () => sharePoint(center.label || '여기', center.lat, center.lng))} />}
      <div className="xs muted" style={{ marginTop: 10 }}>휴대폰 공유창(카카오톡·문자)이 열려요. 공유창이 없으면 링크를 복사해 드려요.</div>
    </Sheet>
  );
}
