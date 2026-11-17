// 구글 지도·장소 연결 (설정에 Google Maps API 키를 넣으면 켜진다)
// - 지도: Maps JavaScript API
// - 가게 실제 사진·별점·영업 여부·정확한 위치: Places API (New) — 가게를 열어 볼 때만 불러와 사용량을 아낀다
import { setGoogleOverlay } from './stores.js';

let loading = null;
let authFailed = false;
export const googleFailed = () => authFailed;
export function loadGoogle(key) {
  if (window.google?.maps?.Map) return Promise.resolve(window.google);
  if (loading) return loading;
  loading = new Promise((res, rej) => {
    window.gm_authFailure = () => { authFailed = true; window.dispatchEvent(new Event('dc-google-fail')); };
    window.__dcGoogleReady = () => res(window.google);
    const s = document.createElement('script');
    const k = key && key !== 'dev' ? `key=${encodeURIComponent(key)}&` : '';
    s.src = `https://maps.googleapis.com/maps/api/js?${k}v=weekly&libraries=places&language=ko&region=KR&loading=async&callback=__dcGoogleReady`;
    s.async = true;
    s.onerror = () => rej(new Error('구글 지도를 불러오지 못했어요'));
    document.head.appendChild(s);
    setTimeout(() => rej(new Error('구글 지도 응답이 없어요')), 12000);
  }).catch((e) => { loading = null; throw e; });
  return loading;
}

// 가게별 구글 장소 정보 (이번 접속 동안만 기억. 장소 ID는 기기에 저장)
const cache = {}; // storeId → { placeId, lat, lng, rating, n, photos[], url, open, hours[] } | null(못 찾음)
const subs = new Set();
export const onPlaces = (f) => { subs.add(f); return () => subs.delete(f); };
const emit = () => { setGoogleOverlay({ ...cache }); subs.forEach((f) => f()); };
const idKey = 'dearcake:gplace-ids';
const savedIds = () => { try { return JSON.parse(localStorage.getItem(idKey) || '{}'); } catch { return {}; } };
const km = (a, b) => { const t = Math.PI / 180, dLat = (b.lat - a.lat) * t, dLng = (b.lng - a.lng) * t; const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * t) * Math.cos(b.lat * t) * Math.sin(dLng / 2) ** 2; return 12742 * Math.asin(Math.sqrt(x)); };
const FIELDS = ['id', 'displayName', 'location', 'rating', 'userRatingCount', 'photos', 'googleMapsURI', 'businessStatus', 'regularOpeningHours'];
const pending = new Set();

function toInfo(place) {
  const loc = place.location;
  return {
    placeId: place.id, name: place.displayName,
    lat: loc?.lat?.() ?? null, lng: loc?.lng?.() ?? null,
    rating: place.rating ?? null, n: place.userRatingCount ?? 0,
    photos: (place.photos || []).slice(0, 6).map((p) => { try { return { src: p.getURI({ maxWidth: 640, maxHeight: 640 }), by: p.authorAttributions?.[0]?.displayName || '' }; } catch { return null; } }).filter(Boolean),
    url: place.googleMapsURI || null,
    closed: place.businessStatus === 'CLOSED_PERMANENTLY',
    hours: place.regularOpeningHours?.weekdayDescriptions || null,
  };
}
export async function enrich(key, store) {
  if (!key || authFailed || !store || store.id in cache || pending.has(store.id) || store.kind === 'google') return cache[store.id] || null;
  pending.add(store.id);
  try {
    const g = await loadGoogle(key);
    const { Place } = await g.maps.importLibrary('places');
    const ids = savedIds();
    let place = null;
    if (ids[store.id]) {
      place = new Place({ id: ids[store.id], requestedLanguage: 'ko' });
      await place.fetchFields({ fields: FIELDS });
    } else {
      const { places } = await Place.searchByText({ textQuery: `${store.name} 수원 ${store.dong || ''}`, fields: FIELDS, locationBias: { lat: store.lat, lng: store.lng }, maxResultCount: 3, language: 'ko', region: 'kr' });
      // 우리가 가진 위치에서 2.5km 안에 있고 이름이 비슷한 곳만 같은 가게로 본다
      const nm = (x) => String(x || '').replace(/\s|케이크|케익|cake|수원점|본점/gi, '').toLowerCase();
      place = (places || []).find((p) => { const l = p.location; if (!l) return false; const d = km(store, { lat: l.lat(), lng: l.lng() }); const a = nm(p.displayName), b = nm(store.name); return d < 2.5 && (a.includes(b.slice(0, 3)) || b.includes(a.slice(0, 3))); }) || null;
      if (place) { ids[store.id] = place.id; try { localStorage.setItem(idKey, JSON.stringify(ids)); } catch { /* 무시 */ } }
    }
    cache[store.id] = place ? toInfo(place) : null;
  } catch (e) { console.warn('places', e); cache[store.id] = null; }
  pending.delete(store.id);
  emit();
  return cache[store.id];
}
// 전국 어디서든: 구글 장소 검색으로 주변 커스텀 케이크 가게 찾기
export async function googleFind(key, loc, radiusKm) {
  const g = await loadGoogle(key);
  const { Place } = await g.maps.importLibrary('places');
  const out = [];
  for (const q of ['레터링 케이크', '주문제작 케이크']) {
    const { places } = await Place.searchByText({ textQuery: q, fields: ['id', 'displayName', 'location', 'formattedAddress', 'rating', 'userRatingCount', 'googleMapsURI', 'photos'], locationBias: { center: { lat: loc.lat, lng: loc.lng }, radius: Math.min(50000, radiusKm * 1000) }, maxResultCount: 15, language: 'ko', region: 'kr' });
    for (const p of places || []) {
      if (out.some((x) => x.id === 'g-' + p.id) || !p.location) continue;
      const lat = p.location.lat(), lng = p.location.lng();
      if (km(loc, { lat, lng }) > radiusKm * 1.5) continue;
      const info = toInfo(p);
      cache['g-' + p.id] = info;
      out.push({ id: 'g-' + p.id, kind: 'google', level: 'google', name: p.displayName, lat, lng, geo: 'exact', addr: p.formattedAddress || '', gu: (p.formattedAddress || '').match(/(\S+구)\s/)?.[1] || '', dong: (p.formattedAddress || '').match(/(\S+동)\b/)?.[1] || '', styles: q.includes('레터링') ? ['lettering'] : ['lettering'], note: `구글 지도 “${q}” 검색 결과예요.`, src: [p.googleMapsURI].filter(Boolean) });
    }
  }
  emit();
  return out;
}
