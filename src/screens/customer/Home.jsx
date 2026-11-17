import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import MapView, { loadKakao } from '../../components/MapView.jsx';
import { CustomerTabBar } from '../../components/TabBar.jsx';
import { Sheet, CakeView, toast, PhotoPick, Loading, Toggle } from '../../components/ui.jsx';
import { NotiBell } from '../../components/Noti.jsx';
import { useApp, setState, getState } from '../../lib/state.js';
import { nav, navAfterSheet } from '../../lib/router.js';
import { getStores, rankStores, FILTERS, GUS, BUDGETS, findCount, parseFindText, fmtKm, headlinePrice, pinPrice, canOrderInApp, nextOpenDay } from '../../lib/stores.js';
import { storeLook, cakeSVG } from '../../lib/cake.js';
import { range } from '../../lib/util.js';
import { estimate } from '../../lib/price.js';
import { PLACES, STYLES, DESIGNS, CREAMS, SHAPES, styleName, optName, creamOf } from '../../data/catalog.js';
import { getGPS, searchPlace, reverseLabel, findNearbyOSM } from '../../lib/geo.js';
import { loadImage, toDataURL, analyzeImage } from '../../lib/image.js';
import { aiAnalyzePhoto, aiParseFind } from '../../lib/ai.js';
import { enrich, googleFind, onPlaces } from '../../lib/gplaces.js';

const lookOf = (s) => s.hero || s.portfolio?.[0]?.design || storeLook(s);
export function StoreThumb({ s }) {
  const photo = s.g?.photos?.[0]?.src || s.portfolio?.find((p) => p.src)?.src;
  if (photo) return <img src={photo} alt="" referrerPolicy="no-referrer" />;
  return <CakeView o={lookOf(s)} />;
}
// 구글 장소 정보가 바뀌면 다시 그리기
export function usePlaces() { const [n, set] = useState(0); useEffect(() => onPlaces(() => set((x) => x + 1)), []); return n; }

export function StoreCard({ r, sel, onClick, fav, onFav, picked }) {
  const { s, d, match } = r;
  const hp = headlinePrice(s);
  const open = canOrderInApp(s) ? nextOpenDay(s, getState().orders) : null;
  const rv = getState().orders.filter((o) => o.storeId === s.id && o.review);
  const avg = rv.length ? rv.reduce((a, o) => a + o.review.stars, 0) / rv.length : null;
  return (
    <button className={`scard ${sel ? 'sel' : ''}`} onClick={onClick} id={`card-${s.id}`}>
      <div className="th"><StoreThumb s={s} />{canOrderInApp(s) && <span className="m">⚡ 앱 주문</span>}</div>
      <div className="grow">
        <div className="nm"><span>{s.name}</span>{match != null && <span className="match">{match}%</span>}</div>
        <div className="meta">
          {s.g?.rating ? <span style={{ color: '#E0A400', fontWeight: 800 }}>★ {s.g.rating.toFixed(1)} <span className="muted">({s.g.n})</span> · </span> : avg != null ? <span style={{ color: '#E0A400', fontWeight: 800 }}>★ {avg.toFixed(1)} <span className="muted">({rv.length})</span> · </span> : null}
          {[s.dong || s.gu, d != null ? fmtKm(d) : null, s.geo === 'area' ? '위치 대략' : null].filter(Boolean).join(' · ')}
        </div>
        <div className="tags">
          {(s.styles || []).slice(0, 3).map((x) => <span key={x} className="tag">{styleName(x)}</span>)}
          {s.sameDay && <span className="tag warn">당일 가능</span>}
          {s.kind === 'public' && (s.verified ? <span className="tag ok">영업 확인</span> : !s.price && <span className="tag mute">확인 필요</span>)}
          {s.kind !== 'public' && s.kind !== 'partner' && <span className="tag blue">지도 검색</span>}
        </div>
        <div className="pr">
          {hp ? <>{hp.label} {range(hp.lo, hp.hi, true)}{!hp.exact && <small> {hp.bench ? '· 평균 추정' : '· 공개가'}</small>}</> : <small>가격 정보 없음</small>}
          {open && <small> · {open.diff === 0 ? '오늘' : open.diff === 1 ? '내일' : `${open.diff}일 뒤`}부터 픽업</small>}
        </div>
      </div>
      {picked != null ? <span className={`fav ${picked ? 'on' : ''}`} aria-label="비교 선택"><Icon n={picked ? 'check' : 'plus'} style={{ width: 26, height: 26, padding: 4, borderRadius: 9, background: picked ? 'var(--p500)' : '#f3e9ed', color: picked ? '#fff' : '#b09aa4' }} /></span>
        : onFav && <span className={`fav ${fav ? 'on' : ''}`} onClick={(e) => { e.stopPropagation(); onFav(); }} role="button" aria-label="찜"><Icon n="heart" fill={fav} style={fav ? { fill: 'currentColor' } : undefined} /></span>}
    </button>
  );
}

// 가게 2~3곳 나란히 비교
export function CompareSheet({ open, onClose, rows }) {
  const st = useApp();
  if (!open) return null;
  const est = (s, size) => { if (s.menu && s.menu.sizes?.[size] == null) return '-'; const e = estimate(s, { size, design: 'simple', shape: 'round', cream: 'white', flavor: 'vanilla', text: 'a' }); return range(e.lo, e.hi, true) + (e.basis === 'menu' ? '' : ' *'); };
  const line = (label, fn) => <tr><th>{label}</th>{rows.map((r) => <td key={r.s.id}>{fn(r)}</td>)}</tr>;
  return (
    <Sheet open={open} onClose={onClose} title={`가게 ${rows.length}곳 비교`}>
      <div style={{ overflowX: 'auto' }}>
        <table className="cmp">
          <thead><tr><th />{rows.map((r) => <td key={r.s.id}><div className="cth"><StoreThumb s={r.s} /></div><b>{r.s.name}</b></td>)}</tr></thead>
          <tbody>
            {line('거리', (r) => fmtKm(r.d))}
            {line('주문 방법', (r) => (canOrderInApp(r.s) ? <span className="tag dark">⚡ 앱 주문</span> : r.s.kakao ? '카톡' : r.s.insta ? '인스타' : r.s.naver ? '네이버 예약' : '가게 문의'))}
            {line('미니', (r) => est(r.s, 'mini'))}
            {line('1호', (r) => <b className="pink">{est(r.s, 'h1')}</b>)}
            {line('2호', (r) => est(r.s, 'h2'))}
            {line('스타일', (r) => (r.s.styles || []).map(styleName).join(', ') || '-')}
            {line('가장 빠른 픽업', (r) => { const n = nextOpenDay(r.s, st.orders); return n ? (n.diff === 0 ? '오늘' : n.diff === 1 ? '내일' : `${n.diff}일 뒤`) : '-'; })}
            {line('당일 주문', (r) => (r.s.sameDay ? '가능' : r.s.sameDay === false ? '불가' : '확인 필요'))}
            {line('휴무', (r) => r.s.closed || (r.s.ops ? (r.s.ops.closedDays.length ? r.s.ops.closedDays.map((d) => '일월화수목금토'[d]).join('·') + '요일' : '없음') : '-'))}
            {line('', (r) => <button className="btn xs pri" onClick={() => { onClose(); navAfterSheet(`/store/${r.s.id}`, {}); }}>자세히</button>)}
          </tbody>
        </table>
      </div>
      <div className="xs muted" style={{ marginTop: 8 }}>* 표시는 공개 가격·지역 평균으로 계산한 추정이에요. 사장님이 등록한 가게는 정확한 가격이에요.</div>
    </Sheet>
  );
}

const SNAP = { mini: 0.2, half: 0.48, full: 0.9 };

export default function CustomerHome() {
  const st = useApp();
  const pv = usePlaces();
  const [sel, setSel] = useState(null);
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('rec');
  const [snap, setSnap] = useState('half');
  const [drag, setDrag] = useState(null);
  const [locOpen, setLocOpen] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [fit, setFit] = useState(null);
  const [finding, setFinding] = useState(false);
  const [mapBad, setMapBad] = useState('');
  const [cmpMode, setCmpMode] = useState(false);
  const [cmp, setCmp] = useState([]);
  const [cmpOpen, setCmpOpen] = useState(false);
  const wrap = useRef(null);
  const [H, setH] = useState(600);
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setH(e.contentRect.height));
    ro.observe(wrap.current);
    return () => ro.disconnect();
  }, []);
  const gKey = mapBad === 'google' ? '' : st.settings.googleKey;
  const kKey = mapBad === 'kakao' ? '' : st.settings.kakaoKey;

  const stores = getStores(st);
  const find = st.find;
  const ranked = useMemo(() => rankStores(stores, { loc: st.loc, radius: st.radius, find, filter, sort }), [stores.length, st.loc, st.radius, find, filter, sort, st.partners, st.shop, pv]); // eslint-disable-line react-hooks/exhaustive-deps
  const pins = useMemo(() => ranked.map((r) => ({
    s: r.s, name: r.s.name.length > 10 ? r.s.name.slice(0, 9) + '…' : r.s.name, price: pinPrice(r.s), match: find && findCount(find) && r.match != null ? r.match : null,
    img: r.s.g?.photos?.[0]?.src || r.s.portfolio?.find((p) => p.src)?.src || null, color: creamOf(lookOf(r.s).cream).hex,
  })), [ranked, find]);
  useEffect(() => { if (find?.at) setFit(ranked.slice(0, 8).map((r) => r.s).concat(find.gu ? [] : [st.loc])); }, [find?.at]); // eslint-disable-line react-hooks/exhaustive-deps
  // 구글 키가 있으면 위쪽 가게들의 실제 사진·별점을 받아 온다 (사용량 아끼려고 앞의 5곳만)
  useEffect(() => { if (gKey) ranked.slice(0, 5).forEach((r) => enrich(gKey, r.s)); }, [gKey, ranked.slice(0, 5).map((r) => r.s.id).join()]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (gKey && sel) { const r = ranked.find((x) => x.s.id === sel); if (r) enrich(gKey, r.s); } }, [gKey, sel]); // eslint-disable-line react-hooks/exhaustive-deps

  const avail = H - 62;
  const height = drag?.h ?? Math.round(avail * SNAP[snap]);
  const startDrag = (e) => { e.currentTarget.setPointerCapture?.(e.pointerId); setDrag({ y: e.clientY, h0: height, h: height }); };
  const moveDrag = (e) => { if (drag) setDrag({ ...drag, h: Math.max(90, Math.min(avail * 0.94, drag.h0 - (e.clientY - drag.y))) }); };
  const endDrag = () => {
    if (!drag) return;
    const r = drag.h / avail;
    const moved = Math.abs(drag.h - drag.h0) > 6;
    if (!moved) setSnap(snap === 'full' ? 'half' : snap === 'half' ? 'full' : 'half');
    else setSnap(r < 0.33 ? 'mini' : r < 0.7 ? 'half' : 'full');
    setDrag(null);
  };
  const select = (id) => {
    setSel(id);
    if (snap === 'mini') setSnap('half');
    setTimeout(() => document.getElementById(`card-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60);
  };
  const toggleFav = (id) => setState((s) => ({ ...s, favs: s.favs.includes(id) ? s.favs.filter((x) => x !== id) : [...s.favs, id] }));
  const selRow = sel ? ranked.find((r) => r.s.id === sel) : null;
  const rows = selRow ? [selRow, ...ranked.filter((r) => r !== selRow)] : ranked;
  const exactN = ranked.filter((r) => !r.partial).length;
  const firstPartial = rows.find((r) => r.partial && r !== selRow);
  const nFind = findCount(find);
  const clearFind = (patch) => { const next = patch ? { ...find, ...patch, at: Date.now() } : null; setState({ find: next && findCount(next) ? next : null }); if (!patch) setFit(null); };

  const findMore = async () => {
    setFinding(true);
    try {
      let found = [];
      if (gKey) { try { found = await googleFind(gKey, st.loc, Math.min(st.radius, 10)); } catch (e) { console.warn(e); } }
      if (!found.length && kKey) { try { found = await kakaoFind(kKey, st.loc, st.radius); } catch (e) { console.warn(e); } }
      if (!found.length) found = await findNearbyOSM(st.loc, Math.min(st.radius, 6));
      const ids = new Set(stores.map((s) => s.id));
      const names = new Set(stores.map((s) => s.name.replace(/\s/g, '')));
      const fresh = found.filter((x) => !ids.has(x.id) && !names.has(x.name.replace(/\s/g, '')));
      setState((s) => ({ ...s, found: [...(s.found || []), ...fresh].slice(-120) }));
      toast(fresh.length ? `주변 케이크 가게 ${fresh.length}곳을 더 찾았어요` : '새로 찾은 가게가 없어요. 범위를 넓혀 보세요');
    } catch (e) { toast(e.message || '가게를 더 찾지 못했어요'); }
    setFinding(false);
  };

  return (
    <div className="screen fade" ref={wrap}>
      <div className="maphome">
        <MapView center={st.loc} zoom={st.radius > 6 ? 12 : 14} pins={pins} selected={sel} onSelect={select} me={st.loc} radiusKm={find?.gu ? 0 : st.radius} fit={fit} padBottom={Math.min(Math.round(avail * 0.5), Math.round(avail * SNAP[snap]))}
          googleKey={gKey} kakaoKey={kKey} onMapFail={(w) => { setMapBad(w); toast(`${w === 'google' ? '구글' : '카카오'} 지도 키를 확인해 주세요. 기본 지도로 보여 드려요`, 3500); }} />
        <div className="maptop">
          <div className="bar">
            <button className="locbtn" onClick={() => setLocOpen(true)}><Icon n="pin" /><span>{find?.gu ? `수원 ${find.gu}` : st.loc.label}</span><Icon n="down" size="sm" /></button>
            <NotiBell role="c" />
          </div>
          <button className={`findbar ${nFind ? 'on' : ''}`} onClick={() => setFindOpen(true)}>
            {find?.photo?.thumb ? <img src={find.photo.thumb} alt="" /> : <span className="fi"><Icon n="sparkle" /></span>}
            <span className="grow">{nFind ? <><b>조건 {nFind}개로 찾는 중</b><small>{[find.text, ...(find.styles || []).map(styleName), find.budget && BUDGETS.find((b) => b.r[0] === find.budget[0] && b.r[1] === find.budget[1])?.name, find.sameDay && '당일'].filter(Boolean).slice(0, 3).join(' · ') || '눌러서 조건 바꾸기'}</small></> : <><b>어떤 케이크를 찾으세요?</b><small>사진을 올리거나 말로 찾아보세요</small></>}</span>
            {nFind ? <span className="fx" role="button" aria-label="조건 지우기" onClick={(e) => { e.stopPropagation(); clearFind(); toast('찾기 조건을 지웠어요'); }}><Icon n="close" size="sm" /></span> : <span className="fc"><Icon n="camera" /></span>}
          </button>
          <div className="chips">
            {FILTERS.map((f) => <button key={f.id} className={`chip sm ${filter === f.id ? 'on' : ''}`} onClick={() => setFilter(f.id)}>{f.name}</button>)}
          </div>
        </div>
        <button className="fab" style={{ bottom: `calc(var(--tab) + var(--sb) + ${height + 12}px)` }} onClick={async () => {
          try { toast('현재 위치를 찾는 중…', 1500); const p = await getGPS(); const label = (await reverseLabel(p.lat, p.lng)) || '현재 위치'; setState((s) => ({ ...s, loc: { lat: p.lat, lng: p.lng, label, src: 'gps' }, find: s.find?.gu ? { ...s.find, gu: null } : s.find })); } catch (e) { toast(e.message); }
        }} aria-label="현재 위치"><Icon n="gps" /></button>
        <div className="legend" style={{ bottom: `calc(var(--tab) + var(--sb) + ${height + 8}px)` }}><i className="l1" />앱 주문<i className="l2" />가격 공개<i className="l3" />확인 필요</div>

        <div className={`bsheet ${drag ? 'dragging' : ''}`} style={{ height }}>
          <div className="grab" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}><i /></div>
          <div className="bh" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag}>
            <h3>{nFind ? '조건에 맞는 가게' : '내 주변 커스텀 케이크'} <span className="pink">{nFind ? exactN : ranked.length}</span></h3>
            <button className={`btn xs ${cmpMode ? 'dark' : 'ghost'}`} onPointerDown={(e) => e.stopPropagation()} onClick={() => { setCmpMode(!cmpMode); setCmp([]); if (!cmpMode) toast('비교할 가게를 2~3곳 눌러 주세요'); }}>{cmpMode ? '비교 취소' : '비교'}</button>
            <select className="sortsel" value={sort} onChange={(e) => setSort(e.target.value)} onPointerDown={(e) => e.stopPropagation()} aria-label="정렬">
              <option value="rec">추천순</option><option value="near">가까운순</option><option value="price">가격순</option>
            </select>
          </div>
          <div className="bl">
            {rows.length === 0 && (
              <div className="empty"><div className="big">🔎</div>이 조건에 맞는 가게가 없어요.<br />조건을 줄이거나 범위를 넓혀 보세요.
                <div className="row" style={{ marginTop: 12, justifyContent: 'center' }}>{nFind > 0 && <button className="btn sec sm" onClick={() => clearFind()}>조건 지우기</button>}<button className="btn line sm" onClick={() => setLocOpen(true)}>범위 넓히기</button></div></div>
            )}
            {rows.map((r) => (<div key={r.s.id}>
              {r === firstPartial && <div className="sec-t" style={{ margin: '14px 4px 8px' }}><h3 style={{ fontSize: 14 }}>{exactN ? '조건과 조금 다른 가게' : '딱 맞는 곳은 없어요 · 비슷한 가게'}</h3><span className="more">{ranked.length - exactN}곳</span></div>}
              <StoreCard r={r} sel={sel === r.s.id} fav={st.favs.includes(r.s.id)} onFav={() => toggleFav(r.s.id)}
                picked={cmpMode ? cmp.includes(r.s.id) : undefined}
                onClick={() => {
                  if (cmpMode) { setCmp((a) => (a.includes(r.s.id) ? a.filter((x) => x !== r.s.id) : a.length >= 3 ? (toast('최대 3곳까지 비교할 수 있어요'), a) : [...a, r.s.id])); return; }
                  nav(`/store/${r.s.id}`);
                }} />
            </div>))}
            <div className="card pad" style={{ marginTop: 6 }}>
              <div className="b">다른 지역도 찾을 수 있어요</div>
              <div className="small muted" style={{ margin: '4px 0 10px' }}>수원은 직접 조사한 실제 가게 {stores.filter((s) => s.kind === 'public' || s.kind === 'partner').length}곳이 들어 있어요. 다른 지역은 {gKey ? '구글 지도 검색' : kKey ? '카카오 장소 검색' : '공개 지도 데이터'}로 주변 케이크 가게를 찾아요.</div>
              <button className="btn line block sm" onClick={findMore} disabled={finding}>{finding ? '찾는 중…' : <><Icon n="search" size="sm" /> 이 근처 케이크 가게 더 찾기</>}</button>
            </div>
          </div>
        </div>
      </div>
      {cmpMode && cmp.length > 0 && (
        <div style={{ position: 'absolute', left: 12, right: 12, bottom: 'calc(var(--tab) + var(--sb) + 10px)', zIndex: 25 }}>
          <button className="btn pri block" disabled={cmp.length < 2} onClick={() => setCmpOpen(true)}>{cmp.length < 2 ? '한 곳 더 골라 주세요' : `${cmp.length}곳 나란히 비교하기`}</button>
        </div>
      )}
      <CustomerTabBar current="/c" />
      <CompareSheet open={cmpOpen} onClose={() => setCmpOpen(false)} rows={cmp.map((id) => ranked.find((r) => r.s.id === id)).filter(Boolean)} />
      <LocationSheet open={locOpen} onClose={() => setLocOpen(false)} />
      <FindSheet open={findOpen} onClose={() => setFindOpen(false)} stores={stores} />
    </div>
  );
}

async function kakaoFind(key, loc, radiusKm) {
  const k = await loadKakao(key);
  const ps = new k.maps.services.Places();
  const out = [];
  for (const q of ['레터링케이크', '주문제작케이크', '커스텀케이크']) {
    const res = await new Promise((resolve) => ps.keywordSearch(q, (data, status) => resolve(status === k.maps.services.Status.OK ? data : []), { location: new k.maps.LatLng(loc.lat, loc.lng), radius: Math.min(20000, radiusKm * 1000), sort: k.maps.services.SortBy.DISTANCE }));
    for (const p of res) {
      if (out.some((x) => x.id === 'kakao-' + p.id)) continue;
      out.push({ id: 'kakao-' + p.id, kind: 'kakao', level: 'kakao', name: p.place_name, lat: +p.y, lng: +p.x, geo: 'exact', addr: p.road_address_name || p.address_name, dong: (p.address_name || '').split(' ').slice(-2, -1)[0] || '', gu: '', styles: ['lettering'], note: `카카오 장소 검색 “${q}” 결과예요.`, src: [p.place_url] });
    }
  }
  return out;
}

export function LocationSheet({ open, onClose }) {
  const st = useApp();
  const [q, setQ] = useState('');
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const pick = (p) => { setState((s) => ({ ...s, loc: { lat: p.lat, lng: p.lng, label: p.label, src: 'pick' }, find: s.find?.gu ? { ...s.find, gu: null, at: Date.now() } : s.find })); toast(`${p.label} 기준으로 찾을게요`); onClose(); };
  const search = async () => {
    if (!q.trim()) return;
    setBusy(true);
    try {
      let list = [];
      if (st.settings.kakaoKey) {
        try {
          const k = await loadKakao(st.settings.kakaoKey);
          const ps = new k.maps.services.Places();
          list = await new Promise((r) => ps.keywordSearch(q, (d, s) => r(s === k.maps.services.Status.OK ? d.slice(0, 8).map((p) => ({ lat: +p.y, lng: +p.x, label: p.place_name, full: p.road_address_name || p.address_name })) : [])));
        } catch { /* 기본 검색으로 */ }
      }
      if (!list.length) list = await searchPlace(q);
      setRes(list);
    } catch (e) { toast(e.message); }
    setBusy(false);
  };
  return (
    <Sheet open={open} onClose={onClose} title="어디 근처에서 찾을까요?">
      <button className="btn sec block" onClick={async () => {
        setBusy(true);
        try { const p = await getGPS(); const label = (await reverseLabel(p.lat, p.lng)) || '현재 위치'; pick({ ...p, label }); } catch (e) { toast(e.message); }
        setBusy(false);
      }}><Icon n="gps" /> 지금 내 위치로 찾기</button>
      <div className="row" style={{ marginTop: 12 }}>
        <input className="inp grow" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} placeholder="동네·역·주소 검색 (예: 광교중앙역)" />
        <button className="btn dark" style={{ minHeight: 48 }} onClick={search}>검색</button>
      </div>
      {busy && <Loading text="찾는 중…" />}
      {res && !busy && (
        <div style={{ marginTop: 8 }}>
          {res.length === 0 && <div className="small muted" style={{ padding: 10 }}>검색 결과가 없어요. 다른 이름으로 찾아보세요.</div>}
          {res.map((p, i) => <button key={i} className="list-row" onClick={() => pick(p)}><Icon n="pin" /><div className="grow"><div className="t">{p.label}</div>{p.full && <div className="s">{p.full}</div>}</div></button>)}
        </div>
      )}
      <div className="lbl" style={{ marginTop: 18 }}>수원 자주 찾는 곳</div>
      <div className="chips wrap">{PLACES.map((p) => <button key={p.label} className={`chip ${st.loc.label === p.label ? 'on' : ''}`} onClick={() => pick(p)}>{p.label}</button>)}</div>
      <div className="lbl" style={{ marginTop: 18 }}>찾는 범위 <span className="pink">{st.radius}km</span></div>
      <div className="seg">{[1, 3, 5, 10, 20].map((r) => <button key={r} className={st.radius === r ? 'on' : ''} onClick={() => setState({ radius: r })}>{r}km</button>)}</div>
    </Sheet>
  );
}

const SAMPLES = [
  { label: '하트 빈티지', o: { shape: 'heart', size: 'h1', design: 'vintage', cream: 'pink', text: '사랑해', font: 'pen', textColor: 'berry', toppings: ['pearl'] } },
  { label: '곰돌이 그림', o: { shape: 'round', size: 'h1', design: 'character', cream: 'sky', text: '생일 축하해', font: 'gaegu', textColor: 'choco', toppings: ['sprinkle'] } },
  { label: '라벤더 꽃', o: { shape: 'round', size: 'h2', design: 'flower', cream: 'lavender', text: '감사합니다', font: 'gowun', textColor: 'navy', toppings: ['freshflower'] } },
];
const EXAMPLES = ['영통 근처 4만원대 캐릭터 케이크', '인계동 당일 가능한 레터링', '5만원 이하 꽃 케이크', '팔달구 사진 케이크'];
const designStyles = (d) => (d === 'character' ? ['character'] : d === 'flower' ? ['flower'] : d === 'photo' ? ['photo'] : ['lettering']);

// 찾기: 사진 · 말 · 조건으로 원하는 케이크를 만드는 가게 찾기
export function FindSheet({ open, onClose, stores }) {
  const st = useApp();
  const [f, setF] = useState({ text: '', styles: [], budget: null, gu: null, sameDay: false, appOnly: false, photo: null });
  const [place, setPlace] = useState(null);
  const [busy, setBusy] = useState('');
  const [aiNote, setAiNote] = useState('');
  useEffect(() => { if (open) { setF({ text: '', styles: [], budget: null, gu: null, sameDay: false, appOnly: false, photo: null, ...(st.find || {}) }); setPlace(null); setAiNote(''); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (p) => setF((x) => ({ ...x, ...p }));
  const toggleStyle = (id) => set({ styles: f.styles.includes(id) ? f.styles.filter((x) => x !== id) : [...f.styles, id] });
  const loc = place || st.loc;
  const [count, near] = useMemo(() => { const r = rankStores(stores, { loc, radius: place ? 3 : st.radius, find: f }); return [r.filter((x) => !x.partial).length, r.length]; }, [stores.length, f, loc.lat, loc.lng, st.radius]); // eslint-disable-line react-hooks/exhaustive-deps

  // 글을 쓰면 바로 조건으로 바꿔 보여 준다
  const onText = (text) => {
    const p = parseFindText(text);
    set({ text, ...(p.styles.length ? { styles: p.styles } : {}), ...(p.budget ? { budget: p.budget } : {}), ...(p.gu ? { gu: p.gu } : {}), ...(p.sameDay ? { sameDay: true } : {}) });
    setPlace(p.place);
  };
  const askAI = async () => {
    if (!f.text.trim()) { toast('찾고 싶은 케이크를 적어 주세요'); return; }
    setBusy('ai');
    try {
      const r = await aiParseFind(st.settings.claudeKey, f.text);
      const patch = {};
      if (r.styles?.length) patch.styles = r.styles;
      if (r.budget_max > 0) patch.budget = [r.budget_min || 0, r.budget_max];
      if (GUS.includes(r.gu)) patch.gu = r.gu;
      if (r.same_day) patch.sameDay = true;
      set(patch);
      if (r.place && !patch.gu) { const p = parseFindText(r.place).place; if (p) setPlace(p); }
      setAiNote(r.summary_ko || 'AI가 조건을 채웠어요');
    } catch (e) { toast(e.message); }
    setBusy('');
  };
  const runPhoto = async (el, smp) => {
    setBusy('photo');
    try {
      const thumb = toDataURL(el, 360, 0.8, true);
      const an = analyzeImage(el);
      let photo = { thumb, design: smp?.o.design || an.design, shape: smp?.o.shape || 'round', cream: smp?.o.cream || an.cream, palette: an.palette };
      let styles = smp ? designStyles(smp.o.design) : an.styles.filter((x) => x !== 'lettering').length ? an.styles.filter((x) => x !== 'lettering') : ['lettering'];
      if (st.settings.claudeKey && !smp) {
        try {
          const r = await aiAnalyzePhoto(st.settings.claudeKey, toDataURL(el, 900, 0.85));
          if (r.is_cake) { photo = { ...photo, ai: r, design: r.design || photo.design, shape: r.shape !== 'unknown' ? r.shape : photo.shape, cream: r.cream_colors?.[0] || photo.cream }; if (r.styles?.length) styles = r.styles.filter((x) => STYLES.some((s) => s.id === x)); setAiNote(r.summary_ko || ''); }
          else setAiNote('케이크 사진이 아닌 것 같아요. 색만 참고했어요.');
        } catch (e) { toast(e.message); }
      }
      set({ photo, styles: styles.length ? styles : ['lettering'] });
    } catch (e) { toast(e.message || '사진을 읽지 못했어요'); }
    setBusy('');
  };
  const onPick = async (file) => { try { await runPhoto(await loadImage(file)); } catch (e) { toast(e.message || '사진을 읽지 못했어요'); setBusy(''); } };
  const trySample = async (smp) => {
    const svg = cakeSVG(smp.o, { uid: 'smp' }).replace('<svg ', '<svg width="600" height="500" ');
    const el = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); });
    await runPhoto(el, smp);
  };
  const apply = () => {
    const next = { ...f, text: f.text.trim(), at: Date.now() };
    setState((s) => ({ ...s, find: findCount(next) || next.text ? next : null, ...(place ? { loc: { ...place, src: 'find' }, radius: Math.min(s.radius, 3) } : {}) }));
    onClose();
    toast(count ? `조건에 맞는 가게 ${count}곳을 찾았어요` : near ? `딱 맞는 곳은 없지만 비슷한 가게 ${near}곳을 보여 드려요` : '맞는 가게가 없어요. 조건을 줄여 보세요');
  };
  const reset = () => { setF({ text: '', styles: [], budget: null, gu: null, sameDay: false, appOnly: false, photo: null }); setPlace(null); setAiNote(''); };
  const ph = f.photo;
  return (
    <Sheet open={open} onClose={onClose} title="케이크 가게 찾기" height="92%"
      footer={<div className="btns"><button className="btn line" style={{ flex: 0.6 }} onClick={reset}>초기화</button><button className="btn pri" style={{ flex: 2 }} onClick={apply}>{count ? `가게 ${count}곳 보기` : near ? `비슷한 가게 ${near}곳 보기` : '맞는 가게가 없어요'}</button></div>}>
      <div className="lbl">말로 찾기 {st.settings.claudeKey ? <span className="tag dark">AI</span> : <span className="tag mute">자동 해석</span>}</div>
      <div className="row" style={{ alignItems: 'stretch' }}>
        <input className="inp grow" value={f.text} onChange={(e) => onText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (st.settings.claudeKey ? askAI() : apply())} placeholder="예) 영통 근처 4만원대 캐릭터 케이크" />
        {st.settings.claudeKey && <button className="btn dark sm" style={{ minHeight: 48 }} onClick={askAI} disabled={busy === 'ai'}>{busy === 'ai' ? '…' : 'AI 해석'}</button>}
      </div>
      <div className="chips" style={{ marginTop: 8 }}>{EXAMPLES.map((e) => <button key={e} className="chip sm" onClick={() => onText(e)}>{e}</button>)}</div>
      {(place || aiNote) && <div className="note pink" style={{ marginTop: 8 }}>{place && <>📍 <b>{place.label}</b> 근처 3km에서 찾을게요. </>}{aiNote}</div>}

      <div className="lbl" style={{ marginTop: 18 }}>사진으로 찾기</div>
      {busy === 'photo' ? <Loading text={st.settings.claudeKey ? 'AI가 사진을 보고 있어요…' : '사진의 색과 스타일을 분석하는 중…'} /> : ph ? (
        <div className="photo-q">
          <img src={ph.thumb} alt="" />
          <div className="grow">
            <div className="b small">{ph.ai ? '✨ AI가 분석했어요' : '사진을 분석했어요'} <span className="xs muted">아래 조건이 채워졌어요</span></div>
            <div className="row" style={{ marginTop: 4, gap: 4 }}>{(ph.palette || []).slice(0, 4).map((p, i) => <i key={i} title={p.name} style={{ width: 18, height: 18, borderRadius: 6, background: p.hex, border: '1px solid #0001' }} />)}<span className="xs muted">{optName(DESIGNS, ph.design)} · {optName(SHAPES, ph.shape)}</span></div>
          </div>
          <button className="btn xs ghost" onClick={() => set({ photo: null })}>빼기</button>
        </div>
      ) : (
        <>
          <div className="btns"><PhotoPick onPick={onPick} className="btn sec"><Icon n="image" size="sm" /> 앨범에서 고르기</PhotoPick><PhotoPick onPick={onPick} capture className="btn line"><Icon n="camera" size="sm" /> 사진 찍기</PhotoPick></div>
          <div className="xs muted" style={{ margin: '10px 0 6px' }}>사진이 없으면 예시로 해 보세요</div>
          <div className="opts c3">{SAMPLES.map((s) => <button key={s.label} className="opt" onClick={() => trySample(s)}><div className="thumb"><CakeView o={s.o} /></div><small>{s.label}</small></button>)}</div>
        </>
      )}

      <div className="lbl" style={{ marginTop: 18 }}>케이크 종류 <span className="xs muted">여러 개 가능</span></div>
      <div className="chips wrap">{STYLES.filter((s) => s.id !== 'custom').map((s) => <button key={s.id} className={`chip ${f.styles.includes(s.id) ? 'on' : ''}`} onClick={() => toggleStyle(s.id)}>{s.emoji} {s.name}</button>)}</div>
      <div className="lbl" style={{ marginTop: 16 }}>예산 <span className="xs muted">1호(2~4인) 기준</span></div>
      <div className="chips wrap">{BUDGETS.map((b) => { const on = f.budget && f.budget[0] === b.r[0] && f.budget[1] === b.r[1]; return <button key={b.id} className={`chip ${on ? 'on' : ''}`} onClick={() => set({ budget: on ? null : b.r })}>{b.name}</button>; })}
        {f.budget && !BUDGETS.some((b) => b.r[0] === f.budget[0] && b.r[1] === f.budget[1]) && <button className="chip on" onClick={() => set({ budget: null })}>{range(f.budget[0] || 0, f.budget[1] > 900000 ? null : f.budget[1], true)} ✕</button>}</div>
      <div className="lbl" style={{ marginTop: 16 }}>지역</div>
      <div className="chips wrap"><button className={`chip ${!f.gu ? 'on' : ''}`} onClick={() => set({ gu: null })}>내 주변 ({(place || st.loc).label})</button>{GUS.map((g) => <button key={g} className={`chip ${f.gu === g ? 'on' : ''}`} onClick={() => { set({ gu: g }); setPlace(null); }}>{g}</button>)}</div>
      <div className="card" style={{ padding: '0 14px', marginTop: 16 }}>
        <div className="list-row"><div className="grow"><div className="t">당일 주문 되는 곳만</div></div><Toggle on={f.sameDay} onChange={(v) => set({ sameDay: v })} label="당일" /></div>
        <div className="list-row"><div className="grow"><div className="t">앱으로 바로 주문되는 곳만</div><div className="s">디어 케이크 입점 가게</div></div><Toggle on={f.appOnly} onChange={(v) => set({ appOnly: v })} label="앱 주문" /></div>
      </div>
    </Sheet>
  );
}
