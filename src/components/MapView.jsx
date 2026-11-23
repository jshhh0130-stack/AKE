// 지도: 구글 지도(키가 있으면) → 카카오 지도(키가 있으면) → 기본 지도(OpenStreetMap 데이터, 키 필요 없음)
// 고객 화면은 prefer="kakao" 로 카카오 지도를 먼저 쓴다
// 핀은 세 지도 모두 같은 모양: [케이크 아이콘·사진] [1호 가격] (선택하면 가게 이름까지)
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { esc } from '../lib/util.js';
import { loadGoogle } from '../lib/gplaces.js';
import { loadKakao } from '../lib/kakao.js';


// pin: { s, price, name, color, img, match }
// 모양: [분홍 케이크 동그라미 + 가격] 말풍선 → 아래 뾰족 꼬리 → 그 밑에 가게 이름(카카오맵 글씨처럼 흰 테두리)
// 앱 주문 가게는 분홍으로 꽉 채우고, 정보가 적은 가게는 회색. 멀리 보면 이름·가격을 숨기고 동그라미만.
// 겹치는 가게 이름 숨기기: 고른 가게 → 추천 순위(r) 순으로 이름을 놓고, 앞에 놓인 이름·다른 핀과 겹치면 숨긴다
const overlap = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
export function declutter(root) {
  if (!root) return;
  const pins = [...root.querySelectorAll('.pin2')];
  pins.forEach((p) => p.classList.remove('nolabel'));
  if (root.classList.contains('far')) return;
  const boxes = pins.map((p) => ({ p, r: p.querySelector('.pb')?.getBoundingClientRect() })).filter((x) => x.r);
  pins.sort((a, b) => (b.classList.contains('sel') - a.classList.contains('sel')) || (+a.dataset.r || 0) - (+b.dataset.r || 0));
  const kept = [];
  for (const p of pins) {
    const n = p.querySelector('.pn'); if (!n) continue;
    const r = n.getBoundingClientRect();
    if (kept.some((k) => overlap(r, k)) || boxes.some((b) => b.p !== p && overlap(r, b.r))) p.classList.add('nolabel');
    else kept.push(r);
  }
}
const declutterSoon = (el) => requestAnimationFrame(() => requestAnimationFrame(() => declutter(el)));

// iAKE v2 핀: 흰 알약 [● 3.8만~] + 아래 꼬리. 앱 주문 가게는 분홍 점, 나머지는 회색 테두리 점. 고르면 분홍 바탕.
export const pinHTML = (p, sel, r = 0) => {
  const s = p.s;
  const cls = s.kind === 'partner' ? 'app' : s.kind === 'public' && !s.verified && !s.price && !s.k ? 'dimmed' : 'pub';
  const tag = p.match != null ? `<em>${p.match}%</em>` : p.price ?`<b>${esc(p.price)}</b>` : '';
  return `<div class="pin2 v2 ${cls}${tag ? '' : ' solo'}${sel ? ' sel' : ''}" data-r="${r}" title="${esc(s.name)}"><div class="pb"><i></i>${tag}</div><div class="tip"></div><span class="pn">${esc(p.name)}</span></div>`;
};
const meHTML = (kind) => `<div class="me-dot ${kind === 'gps' ? '' : 'place'}"></div>`;

function LeafletMap({ center, zoom = 14, pins = [], selected, onSelect, me, meKind, radiusKm, fit, interactive = true, padBottom = 0, onMapClick, onUserMove }) {
  const pad = useRef(padBottom); pad.current = padBottom;
  const el = useRef(null), map = useRef(null), layer = useRef(null), meL = useRef(null);
  const sel = useRef(onSelect); sel.current = onSelect;
  const cb = useRef({}); cb.current = { onMapClick, onUserMove };
  useEffect(() => {
    const m = L.map(el.current, { zoomControl: false, attributionControl: true, dragging: interactive, scrollWheelZoom: interactive, touchZoom: interactive, doubleClickZoom: interactive, boxZoom: false, keyboard: false })
      .setView([center.lat, center.lng], zoom);
    // 기본 지도(OpenStreetMap). 색은 CSS로 부드럽게 눌러서 핀이 잘 보이게 (styles.css .soft-tiles)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap', className: 'soft-tiles' }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    meL.current = L.layerGroup().addTo(m);
    map.current = m;
    const setFar = () => { el.current?.classList.toggle('far', m.getZoom() < 14); declutterSoon(el.current); };
    setFar();
    m.on('zoomend', setFar);
    m.on('click', () => cb.current.onMapClick?.());
    m.on('dragend', () => { const c = m.getCenter(); cb.current.onUserMove?.({ lat: c.lat, lng: c.lng }); });
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(el.current);
    return () => { ro.disconnect(); m.remove(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const m = map.current; if (!m) return; m.setView([center.lat, center.lng], m.getZoom(), { animate: false }); if (pad.current) m.panBy([0, pad.current / 2], { animate: false }); }, [center.lat, center.lng]);
  useEffect(() => {
    const g = layer.current; if (!g) return;
    g.clearLayers();
    pins.forEach((p, i) => {
      const isSel = selected === p.s.id;
      const mk = L.marker([p.s.lat, p.s.lng], { icon: L.divIcon({ className: '', html: pinHTML(p, isSel, i), iconSize: [0, 0] }), zIndexOffset: isSel ? 1000 : p.s.kind === 'partner' ? 300 : p.s.price ? 100 : 0, keyboard: false });
      mk.on('click', (e) => { L.DomEvent.stopPropagation(e); sel.current?.(p.s.id); });
      mk.addTo(g);
    });
    declutterSoon(el.current);
  }, [pins, selected]);
  useEffect(() => {
    const g = meL.current; if (!g || !me) return;
    g.clearLayers();
    if (radiusKm) L.circle([me.lat, me.lng], { radius: radiusKm * 1000, color: '#B8485A', weight: 1.2, opacity: 0.45, fillColor: '#F4A2A8', fillOpacity: 0.06, interactive: false }).addTo(g);
    L.marker([me.lat, me.lng], { icon: L.divIcon({ className: '', html: meHTML(meKind), iconSize: [0, 0] }), interactive: false, zIndexOffset: -100 }).addTo(g);
  }, [me?.lat, me?.lng, radiusKm, meKind]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const m = map.current; if (!m || !selected) return;
    const p = pins.find((x) => x.s.id === selected);
    if (!p) return;
    const pt = m.latLngToContainerPoint([p.s.lat, p.s.lng]), size = m.getSize();
    const top = 150, bottom = size.y - pad.current - 20;
    if (pt.x < 50 || pt.x > size.x - 50 || pt.y < top || pt.y > bottom) m.panTo(m.containerPointToLatLng([pt.x, pt.y + pad.current / 2 - 30]));
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const m = map.current; if (!m || !fit?.length) return;
    m.fitBounds(L.latLngBounds(fit.map((p) => [p.lat, p.lng])).pad(0.12), { maxZoom: 15, paddingBottomRight: [30, (pad.current || 140) + 10], paddingTopLeft: [30, 150] });
  }, [fit]);
  return <div ref={el} className="mapbox" />;
}

function GoogleMap({ googleKey, center, zoom = 14, pins = [], selected, onSelect, me, meKind, radiusKm, fit, interactive = true, onFail, padBottom = 0, onMapClick, onUserMove }) {
  const pad = useRef(padBottom); pad.current = padBottom;
  const el = useRef(null), map = useRef(null), ovs = useRef([]), meOv = useRef([]), PinCls = useRef(null);
  const [ready, setReady] = useState(false);
  const sel = useRef(onSelect); sel.current = onSelect;
  const cb = useRef({}); cb.current = { onMapClick, onUserMove };
  useEffect(() => {
    let dead = false;
    const fail = () => onFail?.(new Error('auth'));
    window.addEventListener('dc-google-fail', fail);
    loadGoogle(googleKey).then((g) => {
      if (dead) return;
      const m = new g.maps.Map(el.current, { center: { lat: center.lat, lng: center.lng }, zoom, disableDefaultUI: true, clickableIcons: false, gestureHandling: interactive ? 'greedy' : 'none', keyboardShortcuts: false, minZoom: 6 });
      map.current = m;
      PinCls.current = class extends g.maps.OverlayView {
        constructor(pos, html, z, onClick) {
          super(); this.pos = pos; this.div = document.createElement('div'); this.div.style.position = 'absolute'; this.div.style.zIndex = z; this.div.innerHTML = html;
          if (onClick) { this.div.addEventListener('click', (e) => { e.stopPropagation(); onClick(); }); g.maps.OverlayView.preventMapHitsAndGesturesFrom?.(this.div); }
        }
        onAdd() { this.getPanes().overlayMouseTarget.appendChild(this.div); }
        draw() { const pt = this.getProjection()?.fromLatLngToDivPixel(this.pos); if (pt) { this.div.style.left = pt.x + 'px'; this.div.style.top = pt.y + 'px'; } }
        onRemove() { this.div.remove(); }
      };
      const setFar = () => el.current?.classList.toggle('far', (m.getZoom() || 14) < 14);
      m.addListener('zoom_changed', setFar); setFar();
      m.addListener('idle', () => declutter(el.current));
      m.addListener('click', () => cb.current.onMapClick?.());
      m.addListener('dragend', () => { const c = m.getCenter(); cb.current.onUserMove?.({ lat: c.lat(), lng: c.lng() }); });
      setReady(true);
    }).catch((e) => onFail?.(e));
    return () => { dead = true; window.removeEventListener('dc-google-fail', fail); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (ready) { map.current.setCenter({ lat: center.lat, lng: center.lng }); if (pad.current) map.current.panBy(0, pad.current / 2); } }, [ready, center.lat, center.lng]);
  useEffect(() => {
    if (!ready) return;
    const g = window.google;
    ovs.current.forEach((o) => o.setMap(null));
    ovs.current = pins.map((p, i) => {
      const isSel = selected === p.s.id;
      const ov = new PinCls.current(new g.maps.LatLng(p.s.lat, p.s.lng), pinHTML(p, isSel, i), isSel ? 1000 : p.s.kind === 'partner' ? 300 : p.s.price ? 100 : 1, () => sel.current?.(p.s.id));
      ov.setMap(map.current);
      return ov;
    });
    setTimeout(() => declutter(el.current), 120);
  }, [ready, pins, selected]);
  useEffect(() => {
    if (!ready || !me) return;
    const g = window.google;
    meOv.current.forEach((o) => o.setMap(null));
    const arr = [new PinCls.current(new g.maps.LatLng(me.lat, me.lng), meHTML(meKind), 0)];
    if (radiusKm) arr.push(new g.maps.Circle({ center: { lat: me.lat, lng: me.lng }, radius: radiusKm * 1000, strokeColor: '#B8485A', strokeOpacity: 0.45, strokeWeight: 1.2, fillColor: '#F4A2A8', fillOpacity: 0.06, clickable: false }));
    arr.forEach((o) => o.setMap(map.current));
    meOv.current = arr;
  }, [ready, me?.lat, me?.lng, radiusKm, meKind]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!ready || !fit?.length) return;
    const b = new window.google.maps.LatLngBounds();
    fit.forEach((p) => b.extend({ lat: p.lat, lng: p.lng }));
    map.current.fitBounds(b, { top: 150, bottom: (pad.current || 140) + 20, left: 40, right: 40 });
  }, [ready, fit]);
  useEffect(() => {
    if (!ready || !selected) return;
    const p = pins.find((x) => x.s.id === selected);
    if (p) { map.current.panTo({ lat: p.s.lat, lng: p.s.lng }); if (pad.current) map.current.panBy(0, pad.current / 2 - 30); }
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div ref={el} className="mapbox gmap" />;
}

export { loadKakao };

function KakaoMap({ kakaoKey, center, zoom = 14, pins = [], selected, onSelect, me, meKind, radiusKm, fit, interactive = true, onFail, padBottom = 0, onMapClick, onUserMove }) {
  const pad = useRef(padBottom); pad.current = padBottom;
  const el = useRef(null), map = useRef(null), ovs = useRef([]), meOv = useRef([]);
  const [ready, setReady] = useState(false);
  const sel = useRef(onSelect); sel.current = onSelect;
  const cb = useRef({}); cb.current = { onMapClick, onUserMove };
  const level = Math.max(1, Math.min(14, 19 - zoom));
  useEffect(() => {
    let dead = false, ro = null;
    loadKakao(kakaoKey).then((k) => {
      if (dead) return;
      const m = new k.maps.Map(el.current, { center: new k.maps.LatLng(center.lat, center.lng), level, draggable: interactive, scrollwheel: interactive, disableDoubleClickZoom: !interactive });
      map.current = m;
      k.maps.event.addListener(m, 'idle', () => { el.current?.classList.toggle('far', m.getLevel() > 5); declutter(el.current); });
      k.maps.event.addListener(m, 'click', () => cb.current.onMapClick?.());
      k.maps.event.addListener(m, 'dragend', () => { const c = m.getCenter(); cb.current.onUserMove?.({ lat: c.getLat(), lng: c.getLng() }); });
      // 화면 크기가 바뀌면 카카오 지도는 relayout을 불러야 빈칸 없이 다시 그려진다
      ro = new ResizeObserver(() => m.relayout());
      ro.observe(el.current);
      setReady(true);
    }).catch((e) => onFail?.(e));
    return () => { dead = true; ro?.disconnect(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (ready) { map.current.setCenter(new window.kakao.maps.LatLng(center.lat, center.lng)); if (pad.current) map.current.panBy(0, Math.round(pad.current / 2)); } }, [ready, center.lat, center.lng]);
  useEffect(() => {
    if (!ready) return;
    const k = window.kakao;
    ovs.current.forEach((o) => o.setMap(null));
    ovs.current = pins.map((p, i) => {
      const div = document.createElement('div');
      div.innerHTML = pinHTML(p, selected === p.s.id, i);
      div.onclick = (e) => { e.stopPropagation(); sel.current?.(p.s.id); };
      const ov = new k.maps.CustomOverlay({ position: new k.maps.LatLng(p.s.lat, p.s.lng), content: div, yAnchor: 0, xAnchor: 0, zIndex: selected === p.s.id ? 10 : 1, clickable: true });
      ov.setMap(map.current);
      return ov;
    });
    declutterSoon(el.current);
  }, [ready, pins, selected]);
  useEffect(() => {
    if (!ready || !me) return;
    const k = window.kakao;
    meOv.current.forEach((o) => o.setMap(null));
    const dot = document.createElement('div'); dot.innerHTML = meHTML(meKind);
    const arr = [new k.maps.CustomOverlay({ position: new k.maps.LatLng(me.lat, me.lng), content: dot, yAnchor: 0, xAnchor: 0 })];
    if (radiusKm) arr.push(new k.maps.Circle({ center: new k.maps.LatLng(me.lat, me.lng), radius: radiusKm * 1000, strokeWeight: 1.2, strokeColor: '#B8485A', strokeOpacity: 0.45, fillColor: '#F4A2A8', fillOpacity: 0.06 }));
    arr.forEach((o) => o.setMap(map.current));
    meOv.current = arr;
  }, [ready, me?.lat, me?.lng, radiusKm, meKind]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!ready || !fit?.length) return;
    const k = window.kakao, b = new k.maps.LatLngBounds();
    fit.forEach((p) => b.extend(new k.maps.LatLng(p.lat, p.lng)));
    map.current.setBounds(b, 150, 40, (pad.current || 140) + 20, 40);
  }, [ready, fit]);
  useEffect(() => {
    if (!ready || !selected) return;
    const p = pins.find((x) => x.s.id === selected);
    if (!p) return;
    const m = map.current, k = window.kakao;
    // 핀이 아래 카드에 가리지 않게: 화면 밖(또는 카드 뒤)일 때만 옮긴다
    const proj = m.getProjection(), pt = proj.containerPointFromCoords(new k.maps.LatLng(p.s.lat, p.s.lng));
    const w = el.current.clientWidth, h = el.current.clientHeight;
    if (pt.x < 50 || pt.x > w - 50 || pt.y < 150 || pt.y > h - pad.current - 20) {
      m.panTo(proj.coordsFromContainerPoint(new k.maps.Point(pt.x, pt.y + pad.current / 2 - 30)));
    }
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div ref={el} className="mapbox kmap" />;
}

// prefer="kakao" : 카카오 키가 있으면 구글보다 카카오 지도를 먼저 (고객 화면)
export default function MapView(props) {
  const [gFail, setGFail] = useState(false);
  const [kFail, setKFail] = useState(false);
  const kakao = props.kakaoKey && !kFail ? <KakaoMap {...props} onFail={(e) => { console.warn(e); setKFail(true); props.onMapFail?.('kakao'); }} /> : null;
  if (props.prefer === 'kakao' && kakao) return kakao;
  if (props.googleKey && !gFail) return <GoogleMap {...props} onFail={(e) => { console.warn(e); setGFail(true); props.onMapFail?.('google'); }} />;
  if (kakao) return kakao;
  return <LeafletMap {...props} />;
}
