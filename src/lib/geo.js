// 위치: 현재 위치(GPS) · 주소 검색(OpenStreetMap) · 주변 케이크 가게 더 찾기(전국, 공개 지도 데이터)
export function getGPS() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('이 기기는 위치 기능을 지원하지 않아요'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }),
      (e) => reject(new Error(e.code === 1 ? '위치 권한이 꺼져 있어요. 브라우저·앱 설정에서 위치를 허용해 주세요.' : '현재 위치를 찾지 못했어요. 잠시 뒤 다시 해 주세요.')),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 },
    );
  });
}

const NOM = 'https://nominatim.openstreetmap.org';
export async function searchPlace(q) {
  const url = `${NOM}/search?format=jsonv2&limit=6&countrycodes=kr&accept-language=ko&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('검색 서버가 바빠요. 잠시 뒤 다시 해 주세요.');
  const j = await res.json();
  return j.map((r) => ({ lat: +r.lat, lng: +r.lon, label: shortLabel(r.display_name), full: r.display_name }));
}
export async function reverseLabel(lat, lng) {
  try {
    const res = await fetch(`${NOM}/reverse?format=jsonv2&zoom=16&accept-language=ko&lat=${lat}&lon=${lng}`);
    if (!res.ok) return null;
    const j = await res.json();
    const a = j.address || {};
    return [a.city || a.county, a.borough || a.city_district, a.quarter || a.suburb || a.neighbourhood].filter(Boolean).slice(-2).join(' ') || shortLabel(j.display_name);
  } catch { return null; }
}
function shortLabel(name = '') {
  const parts = name.split(',').map((s) => s.trim()).filter((s) => s && !/^\d{5}$/.test(s) && s !== '대한민국');
  return parts.slice(0, 3).join(' ');
}

// 전국 어디서든: 공개 지도 데이터(OpenStreetMap)에서 주변 케이크·디저트 가게 찾기 (커스텀 여부는 확인 필요)
const FRANCHISE = /파리바게|뚜레쥬르|던킨|배스킨|베스킨|투썸|스타벅스|이디야|메가|컴포즈|빽다방|할리스|엔제리너스|탐앤탐스|크리스피|성심당|폴바셋|커피빈|파스쿠찌|공차|설빙/;
const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
async function overpass(q) {
  for (const ep of OVERPASS) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 12000);
    try {
      const res = await fetch(ep, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, signal: ctl.signal });
      clearTimeout(t);
      if (res.ok) return await res.json();
    } catch { clearTimeout(t); /* 다음 서버로 */ }
  }
  throw new Error('공개 지도 서버가 지금 바빠요. 잠시 뒤 다시 하거나, 마이 › AI·지도 연결에 카카오 키를 넣으면 카카오 장소 검색으로 찾아요.');
}
export async function findNearbyOSM(loc, radiusKm = 3) {
  const r = Math.min(8000, Math.round(radiusKm * 1000));
  const q = `[out:json][timeout:15];(nwr["shop"~"bakery|confectionery|pastry|cake"](around:${r},${loc.lat},${loc.lng});nwr["name"~"케이크|케익|떡케"](around:${r},${loc.lat},${loc.lng}););out center 120;`;
  const j = await overpass(q);
  const out = [];
  for (const el of j.elements || []) {
    const t = el.tags || {};
    const name = t['name:ko'] || t.name;
    if (!name || FRANCHISE.test(name)) continue;
    const cakey = /케이크|케익|cake|떡/i.test(name) || ['pastry', 'confectionery', 'cake'].includes(t.shop);
    if (!cakey) continue;
    const lat = el.lat ?? el.center?.lat, lng = el.lon ?? el.center?.lon;
    if (lat == null) continue;
    out.push({
      id: `osm-${el.type}-${el.id}`, kind: 'osm', name, lat, lng, geo: 'exact', level: 'osm',
      gu: t['addr:district'] || '', dong: t['addr:suburb'] || t['addr:quarter'] || '',
      addr: [t['addr:city'], t['addr:district'], t['addr:street'], t['addr:housenumber']].filter(Boolean).join(' ') || '주소 정보 없음',
      styles: /떡/.test(name) ? ['rice', 'custom'] : ['custom'],
      hours: t.opening_hours || null, note: '공개 지도 데이터에서 찾은 가게예요. 커스텀 주문이 되는지는 가게에 확인해 주세요.',
      src: ['https://www.openstreetmap.org/' + el.type + '/' + el.id],
    });
  }
  return out;
}
