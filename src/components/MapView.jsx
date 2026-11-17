// 지도: 구글 지도(키가 있으면) → 카카오 지도(키가 있으면) → OpenStreetMap(기본, 키 필요 없음)
// 핀은 세 지도 모두 같은 모양: [대표 사진/색] [가격] (선택하면 가게 이름까지)
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { esc } from '../lib/util.js';
import { loadGoogle } from '../lib/gplaces.js';

// pin: { s, price, name, color, img, match }
export const pinHTML = (p, sel) => {
  const s = p.s;
  const cls = s.kind === 'partner' ? 'app' : s.kind === 'public' ? (s.verified || s.price ? 'pub' : 'pub dimmed') : 'ext';
  const thumb = p.img ? `<img src="${esc(p.img)}" alt="" referrerpolicy="no-referrer"/>` : `<i style="background:${esc(p.color || '#FBC8D8')}">${s.kind === 'partner' ? '⚡' : '🎂'}</i>`;
  const tag = p.match != null ? `<em>${p.match}%</em>` : p.price ? `<b>${esc(p.price)}</b>` : '';
  return `<div class="pin2 ${cls}${sel ? ' sel' : ''}"><div class="pb">${thumb}${tag}<span class="pn">${esc(p.name)}</span></div><div class="tip"></div></div>`;
};

function LeafletMap({ center, zoom = 14, pins = [], selected, onSelect, me, radiusKm, fit, interactive = true, padBottom = 0 }) {
  const pad = useRef(padBottom); pad.current = padBottom;
  const el = useRef(null), map = useRef(null), layer = useRef(null), meL = useRef(null);
  const sel = useRef(onSelect); sel.current = onSelect;
  useEffect(() => {
    const m = L.map(el.current, { zoomControl: false, attributionControl: true, dragging: interactive, scrollWheelZoom: interactive, touchZoom: interactive, doubleClickZoom: interactive, boxZoom: false, keyboard: false })
      .setView([center.lat, center.lng], zoom);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap', className: 'osm-tiles' }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    meL.current = L.layerGroup().addTo(m);
    map.current = m;
    const setFar = () => el.current?.classList.toggle('far', m.getZoom() < 14);
    setFar();
    m.on('zoomend', setFar);
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
      mk.on('click', () => sel.current?.(p.s.id));
      mk.addTo(g);
    });
  }, [pins, selected]);
  useEffect(() => {
    const g = meL.current; if (!g || !me) return;
    g.clearLayers();
    if (radiusKm) L.circle([me.lat, me.lng], { radius: radiusKm * 1000, color: '#F75C8D', weight: 1.5, opacity: 0.5, fillColor: '#F75C8D', fillOpacity: 0.04, interactive: false }).addTo(g);
    L.marker([me.lat, me.lng], { icon: L.divIcon({ className: '', html: '<div class="me-dot"></div>', iconSize: [0, 0] }), interactive: false, zIndexOffset: -100 }).addTo(g);
  }, [me?.lat, me?.lng, radiusKm]); // eslint-disable-line react-hooks/exhaustive-deps
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

function GoogleMap({ googleKey, center, zoom = 14, pins = [], selected, onSelect, me, radiusKm, fit, interactive = true, onFail, padBottom = 0 }) {
  const pad = useRef(padBottom); pad.current = padBottom;
  const el = useRef(null), map = useRef(null), ovs = useRef([]), meOv = useRef([]), PinCls = useRef(null);
  const [ready, setReady] = useState(false);
  const sel = useRef(onSelect); sel.current = onSelect;
  useEffect(() => {
    let dead = false;
    const fail = () => onFail?.(new Error('auth'));
    window.addEventListener('dc-google-fail', fail);
    loadGoogle(googleKey).then((g) => {
      if (dead) return;
      const m = new g.maps.Map(el.current, { center: { lat: center.lat, lng: center.lng }, zoom, disableDefaultUI: true, clickableIcons: false, gestureHandling: interactive ? 'greedy' : 'none', keyboardShortcuts: false, minZoom: 6 });
      map.current = m;
      PinCls.current = class extends g.maps.OverlayView {
        constructor(pos, html, z, onClick) { super(); this.pos = pos; this.div = document.createElement('div'); this.div.style.position = 'absolute'; this.div.style.zIndex = z; this.div.innerHTML = html; if (onClick) this.div.addEventListener('click', (e) => { e.stopPropagation(); onClick(); }); }
        onAdd() { this.getPanes().overlayMouseTarget.appendChild(this.div); }
        draw() { const pt = this.getProjection()?.fromLatLngToDivPixel(this.pos); if (pt) { this.div.style.left = pt.x + 'px'; this.div.style.top = pt.y + 'px'; } }
        onRemove() { this.div.remove(); }
      };
      const setFar = () => el.current?.classList.toggle('far', (m.getZoom() || 14) < 14);
      m.addListener('zoom_changed', setFar); setFar();
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
    const arr = [new PinCls.current(new g.maps.LatLng(me.lat, me.lng), '<div class="me-dot"></div>', 0)];
    if (radiusKm) arr.push(new g.maps.Circle({ center: { lat: me.lat, lng: me.lng }, radius: radiusKm * 1000, strokeColor: '#F75C8D', strokeOpacity: 0.5, strokeWeight: 1.5, fillColor: '#F75C8D', fillOpacity: 0.04, clickable: false }));
    arr.forEach((o) => o.setMap(map.current));
    meOv.current = arr;
  }, [ready, me?.lat, me?.lng, radiusKm]); // eslint-disable-line react-hooks/exhaustive-deps
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

let kakaoP = null;
export function loadKakao(key) {
  if (window.kakao?.maps?.Map) return Promise.resolve(window.kakao);
  if (kakaoP) return kakaoP;
  kakaoP = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&libraries=services&autoload=false`;
    s.onload = () => { try { window.kakao.maps.load(() => res(window.kakao)); } catch (e) { rej(e); } };
    s.onerror = () => rej(new Error('카카오 지도를 불러오지 못했어요'));
    document.head.appendChild(s);
    setTimeout(() => rej(new Error('카카오 지도 응답이 없어요')), 9000);
  }).catch((e) => { kakaoP = null; throw e; });
  return kakaoP;
}

function KakaoMap({ kakaoKey, center, zoom = 14, pins = [], selected, onSelect, me, radiusKm, fit, interactive = true, onFail }) {
  const el = useRef(null), map = useRef(null), ovs = useRef([]), meOv = useRef([]);
  const [ready, setReady] = useState(false);
  const sel = useRef(onSelect); sel.current = onSelect;
  const level = Math.max(1, Math.min(14, 19 - zoom));
  useEffect(() => {
    let dead = false;
    loadKakao(kakaoKey).then((k) => {
      if (dead) return;
      const m = new k.maps.Map(el.current, { center: new k.maps.LatLng(center.lat, center.lng), level, draggable: interactive, scrollwheel: interactive, disableDoubleClickZoom: !interactive });
      map.current = m;
      k.maps.event.addListener(m, 'idle', () => el.current?.classList.toggle('far', m.getLevel() > 5));
      setReady(true);
    }).catch((e) => onFail?.(e));
    return () => { dead = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (ready) map.current.setCenter(new window.kakao.maps.LatLng(center.lat, center.lng)); }, [ready, center.lat, center.lng]);
  useEffect(() => {
    if (!ready) return;
    const k = window.kakao;
    ovs.current.forEach((o) => o.setMap(null));
    ovs.current = pins.map((p) => {
      const div = document.createElement('div');
      div.innerHTML = pinHTML(p, selected === p.s.id);
      div.onclick = () => sel.current?.(p.s.id);
      const ov = new k.maps.CustomOverlay({ position: new k.maps.LatLng(p.s.lat, p.s.lng), content: div, yAnchor: 0, xAnchor: 0, zIndex: selected === p.s.id ? 10 : 1, clickable: true });
      ov.setMap(map.current);
      return ov;
    });
  }, [ready, pins, selected]);
  useEffect(() => {
    if (!ready || !me) return;
    const k = window.kakao;
    meOv.current.forEach((o) => o.setMap(null));
    const dot = document.createElement('div'); dot.innerHTML = '<div class="me-dot"></div>';
    const arr = [new k.maps.CustomOverlay({ position: new k.maps.LatLng(me.lat, me.lng), content: dot, yAnchor: 0, xAnchor: 0 })];
    if (radiusKm) arr.push(new k.maps.Circle({ center: new k.maps.LatLng(me.lat, me.lng), radius: radiusKm * 1000, strokeWeight: 1.5, strokeColor: '#F75C8D', strokeOpacity: 0.5, fillColor: '#F75C8D', fillOpacity: 0.04 }));
    arr.forEach((o) => o.setMap(map.current));
    meOv.current = arr;
  }, [ready, me?.lat, me?.lng, radiusKm]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!ready || !fit?.length) return;
    const k = window.kakao, b = new k.maps.LatLngBounds();
    fit.forEach((p) => b.extend(new k.maps.LatLng(p.lat, p.lng)));
    map.current.setBounds(b, 120, 40, 160, 40);
  }, [ready, fit]);
  useEffect(() => {
    if (!ready || !selected) return;
    const p = pins.find((x) => x.s.id === selected);
    if (p) map.current.panTo(new window.kakao.maps.LatLng(p.s.lat, p.s.lng));
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div ref={el} className="mapbox" />;
}

export default function MapView(props) {
  const [gFail, setGFail] = useState(false);
  const [kFail, setKFail] = useState(false);
  if (props.googleKey && !gFail) return <GoogleMap {...props} onFail={(e) => { console.warn(e); setGFail(true); props.onMapFail?.('google'); }} />;
  if (props.kakaoKey && !kFail) return <KakaoMap {...props} onFail={(e) => { console.warn(e); setKFail(true); props.onMapFail?.('kakao'); }} />;
  return <LeafletMap {...props} />;
}
