// 지도: 구글 지도(키가 있으면) → 카카오 지도(키가 있으면) → 기본 지도(OpenStreetMap 데이터, 키 필요 없음)
// 고객 화면은 prefer="kakao" 로 카카오 지도를 먼저 쓴다
// 핀은 세 지도 모두 같은 모양: [케이크 아이콘·사진] [1호 가격] (선택하면 가게 이름까지)
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { esc } from '../lib/util.js';
import { loadGoogle } from '../lib/gplaces.js';
import { loadKakao } from '../lib/kakao.js';

const CAKE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16M5.5 20v-6a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v6M5.5 15.6c1.4.9 2.8.9 4.2 0s2.8-.9 4.2 0 2.8.9 4.1 0M12 12V8.6"/><path d="M12 3.6c1 1.1 1 2.2 0 2.8-1-.6-1-1.7 0-2.8z" fill="currentColor"/></svg>';

// pin: { s, price, name, color, img, match }
export const pinHTML = (p, sel) => {
  const s = p.s;
  const cls = s.kind === 'partner' ? 'app' : s.kind === 'public' ? (s.verified || s.price ? 'pub' : 'pub dimmed') : 'ext';
  const thumb = p.img ? `<img src="${esc(p.img)}" alt="" referrerpolicy="no-referrer"/>` : `<i>${CAKE}</i>`;
  const dim = cls.includes('dimmed') && !sel;
  const tag = p.match != null ? `<em>${p.match}%</em>` : p.price && !dim ? `<b>${esc(p.price)}</b>` : '';
  return `<div class="pin2 ${cls}${sel ? ' sel' : ''}" title="${esc(s.name)}"><div class="pb">${thumb}${tag}<span class="pn">${esc(p.name)}</span></div><div class="tip"></div></div>`;
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
    const setFar = () => el.current?.classList.toggle('far', m.getZoom() < 14);
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
    pins.forEach((p) => {
      const isSel = selected === p.s.id;
      const mk = L.marker([p.s.lat, p.s.lng], { icon: L.divIcon({ className: '', html: pinHTML(p, isSel), iconSize: [0, 0] }), zIndexOffset: isSel ? 1000 : p.s.kind === 'partner' ? 300 : p.s.price ? 100 : 0, keyboard: false });
      mk.on('click', (e) => { L.DomEvent.stopPropagation(e); sel.current?.(p.s.id); });
      mk.addTo(g);
    });
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
    ovs.current = pins.map((p) => {
      const isSel = selected === p.s.id;
      const ov = new PinCls.current(new g.maps.LatLng(p.s.lat, p.s.lng), pinHTML(p, isSel), isSel ? 1000 : p.s.kind === 'partner' ? 300 : p.s.price ? 100 : 1, () => sel.current?.(p.s.id));
      ov.setMap(map.current);
      return ov;
    });
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
      k.maps.event.addListener(m, 'idle', () => el.current?.classList.toggle('far', m.getLevel() > 5));
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
    ovs.current = pins.map((p) => {
      const div = document.createElement('div');
      div.innerHTML = pinHTML(p, selected === p.s.id);
      div.onclick = (e) => { e.stopPropagation(); sel.current?.(p.s.id); };
      const ov = new k.maps.CustomOverlay({ position: new k.maps.LatLng(p.s.lat, p.s.lng), content: div, yAnchor: 0, xAnchor: 0, zIndex: selected === p.s.id ? 10 : 1, clickable: true });
      ov.setMap(map.current);
      return ov;
    });
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
