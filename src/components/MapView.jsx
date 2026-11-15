// 지도: 기본은 OpenStreetMap(키 필요 없음). 설정에 카카오 JavaScript 키를 넣으면 카카오 지도로 바뀐다.
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { esc } from '../lib/util.js';

const pinHTML = (s, label, sel, dim) => {
  const cls = s.kind === 'public' ? 'pub' : s.kind === 'osm' || s.kind === 'kakao' ? 'osm' : 'app';
  const icon = s.kind === 'demo' || s.kind === 'partner' ? '⚡' : s.kind === 'osm' || s.kind === 'kakao' ? '?' : '🎂';
  return `<div class="pin ${cls}${sel ? ' sel' : ''}${dim ? ' dim' : ''}"><div class="bub"><i>${icon}</i><span class="nm">${esc(label)}</span></div><div class="tip"></div></div>`;
};

function LeafletMap({ center, zoom = 14, pins = [], selected, onSelect, me, radiusKm, fit, interactive = true, onMove }) {
  const el = useRef(null), map = useRef(null), layer = useRef(null), meL = useRef(null);
  const sel = useRef(onSelect); sel.current = onSelect;
  const mv = useRef(onMove); mv.current = onMove;
  useEffect(() => {
    const m = L.map(el.current, { zoomControl: false, attributionControl: true, dragging: interactive, scrollWheelZoom: interactive, touchZoom: interactive, doubleClickZoom: interactive, boxZoom: false, keyboard: false })
      .setView([center.lat, center.lng], zoom);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap', className: 'osm-tiles' }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    meL.current = L.layerGroup().addTo(m);
    map.current = m;
    const setFar = () => el.current?.classList.toggle('far', m.getZoom() < 15);
    setFar();
    m.on('zoomend', setFar);
    m.on('moveend', () => mv.current?.(m.getCenter(), m.getZoom()));
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(el.current);
    return () => { ro.disconnect(); m.remove(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { map.current?.setView([center.lat, center.lng], map.current.getZoom()); }, [center.lat, center.lng]);
  useEffect(() => {
    const g = layer.current; if (!g) return;
    g.clearLayers();
    pins.forEach(({ s, label, dim }) => {
      const isSel = selected === s.id;
      const mk = L.marker([s.lat, s.lng], { icon: L.divIcon({ className: '', html: pinHTML(s, label, isSel, dim), iconSize: [0, 0] }), zIndexOffset: isSel ? 1000 : s.kind === 'public' ? 0 : 200, keyboard: false });
      mk.on('click', () => sel.current?.(s.id));
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
    if (p && !m.getBounds().pad(-0.15).contains([p.s.lat, p.s.lng])) m.panTo([p.s.lat, p.s.lng]);
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const m = map.current; if (!m || !fit?.length) return;
    m.fitBounds(L.latLngBounds(fit.map((p) => [p.lat, p.lng])).pad(0.25), { maxZoom: 15, paddingBottomRight: [0, 120] });
  }, [fit]);
  return <div ref={el} className="mapbox" />;
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

function KakaoMap({ kakaoKey, center, zoom = 14, pins = [], selected, onSelect, me, radiusKm, fit, interactive = true, onFail, onMove }) {
  const el = useRef(null), map = useRef(null), ovs = useRef([]), meOv = useRef([]);
  const [ready, setReady] = useState(false);
  const sel = useRef(onSelect); sel.current = onSelect;
  const mv = useRef(onMove); mv.current = onMove;
  const level = Math.max(1, Math.min(14, 19 - zoom));
  useEffect(() => {
    let dead = false;
    loadKakao(kakaoKey).then((k) => {
      if (dead) return;
      const m = new k.maps.Map(el.current, { center: new k.maps.LatLng(center.lat, center.lng), level, draggable: interactive, scrollwheel: interactive, disableDoubleClickZoom: !interactive });
      map.current = m;
      k.maps.event.addListener(m, 'idle', () => { const c = m.getCenter(); mv.current?.({ lat: c.getLat(), lng: c.getLng() }, 19 - m.getLevel()); el.current?.classList.toggle('far', m.getLevel() > 4); });
      setReady(true);
    }).catch((e) => onFail?.(e));
    return () => { dead = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (ready) map.current.setCenter(new window.kakao.maps.LatLng(center.lat, center.lng)); }, [ready, center.lat, center.lng]);
  useEffect(() => {
    if (!ready) return;
    const k = window.kakao;
    ovs.current.forEach((o) => o.setMap(null));
    ovs.current = pins.map(({ s, label, dim }) => {
      const div = document.createElement('div');
      div.innerHTML = pinHTML(s, label, selected === s.id, dim);
      div.style.transform = 'translateY(0)';
      div.firstChild.style.transform = 'none';
      div.onclick = () => sel.current?.(s.id);
      const ov = new k.maps.CustomOverlay({ position: new k.maps.LatLng(s.lat, s.lng), content: div, yAnchor: 1, zIndex: selected === s.id ? 10 : 1, clickable: true });
      ov.setMap(map.current);
      return ov;
    });
  }, [ready, pins, selected]);
  useEffect(() => {
    if (!ready || !me) return;
    const k = window.kakao;
    meOv.current.forEach((o) => o.setMap(null));
    const dot = document.createElement('div'); dot.innerHTML = '<div class="me-dot" style="transform:none"></div>';
    const arr = [new k.maps.CustomOverlay({ position: new k.maps.LatLng(me.lat, me.lng), content: dot, yAnchor: 0.5, xAnchor: 0.5 })];
    if (radiusKm) arr.push(new k.maps.Circle({ center: new k.maps.LatLng(me.lat, me.lng), radius: radiusKm * 1000, strokeWeight: 1.5, strokeColor: '#F75C8D', strokeOpacity: 0.5, fillColor: '#F75C8D', fillOpacity: 0.04 }));
    arr.forEach((o) => o.setMap(map.current));
    meOv.current = arr;
  }, [ready, me?.lat, me?.lng, radiusKm]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!ready || !fit?.length) return;
    const k = window.kakao, b = new k.maps.LatLngBounds();
    fit.forEach((p) => b.extend(new k.maps.LatLng(p.lat, p.lng)));
    map.current.setBounds(b, 60, 40, 160, 40);
  }, [ready, fit]);
  useEffect(() => {
    if (!ready || !selected) return;
    const p = pins.find((x) => x.s.id === selected);
    if (p) map.current.panTo(new window.kakao.maps.LatLng(p.s.lat, p.s.lng));
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div ref={el} className="mapbox" />;
}

export default function MapView(props) {
  const [failed, setFailed] = useState(false);
  if (props.kakaoKey && !failed) return <KakaoMap {...props} onFail={(e) => { console.warn(e); setFailed(true); props.onKakaoFail?.(e); }} />;
  return <LeafletMap {...props} />;
}
