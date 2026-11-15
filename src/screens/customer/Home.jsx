import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import MapView, { loadKakao } from '../../components/MapView.jsx';
import { CustomerTabBar } from '../../components/TabBar.jsx';
import { Sheet, CakeView, toast, PhotoPick, Loading } from '../../components/ui.jsx';
import { useApp, setState, getState } from '../../lib/state.js';
import { nav } from '../../lib/router.js';
import { getStores, rankStores, FILTERS, fmtKm, headlinePrice, kindLabel, canOrderInApp, nextOpenDay } from '../../lib/stores.js';
import { storeLook } from '../../lib/cake.js';
import { range } from '../../lib/util.js';
import { estimate } from '../../lib/price.js';
import { PLACES, STYLES, DESIGNS, CREAMS, SHAPES, styleName, optName } from '../../data/catalog.js';
import { getGPS, searchPlace, reverseLabel, findNearbyOSM } from '../../lib/geo.js';
import { loadImage, toDataURL, analyzeImage } from '../../lib/image.js';
import { aiAnalyzePhoto } from '../../lib/ai.js';

export function StoreThumb({ s }) {
  const photo = s.portfolio?.find((p) => p.src)?.src;
  if (photo) return <img src={photo} alt="" />;
  const look = s.hero || s.portfolio?.[0]?.design || storeLook(s);
  return <CakeView o={look} />;
}

export function StoreCard({ r, sel, onClick, fav, onFav, picked }) {
  const { s, d, match } = r;
  const hp = headlinePrice(s);
  const open = canOrderInApp(s) ? nextOpenDay(s, getState().orders) : null;
  return (
    <button className={`scard ${sel ? 'sel' : ''}`} onClick={onClick} id={`card-${s.id}`}>
      <div className="th"><StoreThumb s={s} />{canOrderInApp(s) && <span className="m">⚡ 앱 주문</span>}</div>
      <div className="grow">
        <div className="nm"><span>{s.name}</span>{match != null && <span className="match">{match}%</span>}</div>
        <div className="meta">{[s.dong || s.gu, d != null ? fmtKm(d) : null, s.geo === 'area' ? '위치 대략' : null].filter(Boolean).join(' · ')}</div>
        <div className="tags">
          {(s.styles || []).filter((x) => x !== 'custom').slice(0, 3).map((x) => <span key={x} className="tag">{styleName(x)}</span>)}
          {s.sameDay && <span className="tag warn">당일 가능</span>}
          {s.kind === 'public' && s.level !== 'detail' && <span className="tag mute">확인 필요</span>}
          {(s.kind === 'osm' || s.kind === 'kakao') && <span className="tag blue">공개 지도</span>}
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

// 가게 2~3곳 나란히 비교 (팀 조사: "가격·옵션·추가금·픽업시간을 나란히")
export function CompareSheet({ open, onClose, rows }) {
  const st = useApp();
  if (!open) return null;
  const est = (s, size) => { const e = estimate(s, { size, design: 'simple', shape: 'round', cream: 'white', flavor: 'vanilla', text: 'a' }); return range(e.lo, e.hi, true) + (e.basis === 'menu' ? '' : ' *'); };
  const line = (label, fn) => <tr><th>{label}</th>{rows.map((r) => <td key={r.s.id}>{fn(r)}</td>)}</tr>;
  return (
    <Sheet open={open} onClose={onClose} title={`가게 ${rows.length}곳 비교`}>
      <div style={{ overflowX: 'auto' }}>
        <table className="cmp">
          <thead><tr><th />{rows.map((r) => <td key={r.s.id}><div className="cth"><StoreThumb s={r.s} /></div><b>{r.s.name}</b></td>)}</tr></thead>
          <tbody>
            {line('거리', (r) => fmtKm(r.d))}
            {line('주문 방법', (r) => (canOrderInApp(r.s) ? <span className="tag dark">⚡ 앱 주문</span> : r.s.kakao ? '카톡' : r.s.insta ? '인스타' : r.s.naver ? '네이버 예약' : '가게 문의'))}
            {line('도시락', (r) => est(r.s, 'dosirak'))}
            {line('1호', (r) => <b className="pink">{est(r.s, 'h1')}</b>)}
            {line('2호', (r) => est(r.s, 'h2'))}
            {line('스타일', (r) => (r.s.styles || []).filter((x) => x !== 'custom').map(styleName).join(', ') || '-')}
            {line('가장 빠른 픽업', (r) => { const n = nextOpenDay(r.s, st.orders); return n ? (n.diff === 0 ? '오늘' : n.diff === 1 ? '내일' : `${n.diff}일 뒤`) : '-'; })}
            {line('당일 주문', (r) => (r.s.sameDay ? '가능' : r.s.sameDay === false ? '불가' : '확인 필요'))}
            {line('휴무', (r) => r.s.closed || (r.s.ops ? (r.s.ops.closedDays.length ? r.s.ops.closedDays.map((d) => '일월화수목금토'[d]).join('·') + '요일' : '없음') : '-'))}
            {line('', (r) => <button className="btn xs pri" onClick={() => { onClose(); setTimeout(() => nav(`/store/${r.s.id}`), 30); }}>자세히</button>)}
          </tbody>
        </table>
      </div>
      <div className="xs muted" style={{ marginTop: 8 }}>* 표시는 공개 가격·지역 평균으로 계산한 추정이에요. 사장님이 등록한 가게는 정확한 가격이에요.</div>
    </Sheet>
  );
}

const SNAP = { mini: 0.2, half: 0.5, full: 0.9 };

export default function CustomerHome() {
  const st = useApp();
  const [sel, setSel] = useState(null);
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('rec');
  const [snap, setSnap] = useState('half');
  const [drag, setDrag] = useState(null);
  const [locOpen, setLocOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [fit, setFit] = useState(null);
  const [finding, setFinding] = useState(false);
  const [kakaoBad, setKakaoBad] = useState(false);
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

  const stores = useMemo(() => getStores(st), [st.shop, st.found]); // eslint-disable-line react-hooks/exhaustive-deps
  const want = st.photo?.styles || [];
  const ranked = useMemo(() => rankStores(stores, { loc: st.loc, radius: st.radius, want, filter, sort }), [stores, st.loc, st.radius, want.join(), filter, sort]); // eslint-disable-line react-hooks/exhaustive-deps
  const pins = useMemo(() => ranked.map((r) => ({ s: r.s, label: r.s.name.length > 9 ? r.s.name.slice(0, 8) + '…' : r.s.name })), [ranked]);
  useEffect(() => { if (st.photo?.at) setFit(ranked.slice(0, 6).map((r) => r.s).concat([st.loc])); }, [st.photo?.at]); // eslint-disable-line react-hooks/exhaustive-deps

  const avail = H - 62; // 탭바 빼고
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

  const findMore = async () => {
    setFinding(true);
    try {
      let found = [];
      if (st.settings.kakaoKey && !kakaoBad) {
        try { found = await kakaoFind(st.settings.kakaoKey, st.loc, st.radius); } catch (e) { console.warn(e); }
      }
      if (!found.length) found = await findNearbyOSM(st.loc, Math.min(st.radius, 6));
      const ids = new Set(stores.map((s) => s.id));
      const names = new Set(stores.map((s) => s.name.replace(/\s/g, '')));
      const fresh = found.filter((x) => !ids.has(x.id) && !names.has(x.name.replace(/\s/g, '')));
      setState((s) => ({ ...s, found: [...(s.found || []), ...fresh].slice(-120) }));
      toast(fresh.length ? `주변 케이크 가게 ${fresh.length}곳을 더 찾았어요` : '새로 찾은 가게가 없어요. 반경을 넓혀 보세요');
    } catch (e) { toast(e.message || '가게를 더 찾지 못했어요'); }
    setFinding(false);
  };

  return (
    <div className="screen fade" ref={wrap}>
      <div className="maphome">
        <MapView center={st.loc} zoom={st.radius > 6 ? 12 : 14} pins={pins} selected={sel} onSelect={select} me={st.loc} radiusKm={st.radius} fit={fit}
          kakaoKey={kakaoBad ? '' : st.settings.kakaoKey} onKakaoFail={() => { setKakaoBad(true); toast('카카오 지도 키를 확인해 주세요. 기본 지도로 보여 드려요'); }} />
        <div className="maptop">
          <div className="bar">
            <button className="locbtn" onClick={() => setLocOpen(true)}><Icon n="pin" /><span>{st.loc.label}</span><Icon n="down" size="sm" /></button>
            <button className={`photobtn ${st.photo ? 'has' : ''}`} onClick={() => setPhotoOpen(true)}>
              {st.photo?.thumb ? <img src={st.photo.thumb} alt="내 사진" /> : <Icon n="camera" />}
              {st.photo ? '사진 찾기' : '사진으로 찾기'}
            </button>
          </div>
          <div className="chips">
            {FILTERS.map((f) => <button key={f.id} className={`chip sm ${filter === f.id ? 'on' : ''}`} onClick={() => setFilter(f.id)}>{f.name}</button>)}
          </div>
        </div>
        <button className="fab" style={{ bottom: `calc(var(--tab) + var(--sb) + ${height + 12}px)` }} onClick={async () => {
          try { toast('현재 위치를 찾는 중…', 1500); const p = await getGPS(); const label = (await reverseLabel(p.lat, p.lng)) || '현재 위치'; setState({ loc: { lat: p.lat, lng: p.lng, label, src: 'gps' } }); } catch (e) { toast(e.message); }
        }} aria-label="현재 위치"><Icon n="gps" /></button>
        <div className="mapnote" style={{ bottom: `calc(var(--tab) + var(--sb) + ${height + 8}px)` }}>가게 정보는 공개 자료 기준 · 가격은 추정 포함</div>

        <div className={`bsheet ${drag ? 'dragging' : ''}`} style={{ height }}>
          <div className="grab" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}><i /></div>
          <div className="bh" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag}>
            <h3>{st.photo ? '내 사진과 비슷한 케이크 가게' : '내 주변 커스텀 케이크'} <span className="pink">{ranked.length}</span></h3>
            <button className={`btn xs ${cmpMode ? 'dark' : 'ghost'}`} onPointerDown={(e) => e.stopPropagation()} onClick={() => { setCmpMode(!cmpMode); setCmp([]); if (!cmpMode) toast('비교할 가게를 2~3곳 눌러 주세요'); }}>{cmpMode ? '비교 취소' : '비교'}</button>
            <select className="sortsel" value={sort} onChange={(e) => setSort(e.target.value)} onPointerDown={(e) => e.stopPropagation()}>
              <option value="rec">추천순</option><option value="near">가까운순</option><option value="price">가격순</option>
            </select>
          </div>
          <div className="bl">
            {st.photo && (
              <div className="photo-q">
                {st.photo.thumb && <img src={st.photo.thumb} alt="" />}
                <div className="grow">
                  <div className="b small">사진 분석 결과로 추천 중</div>
                  <div className="tags" style={{ marginTop: 4 }}>{(st.photo.styles || []).map((x) => <span key={x} className="tag">{styleName(x)}</span>)}{st.photo.cream && <span className="tag mute">{optName(CREAMS, st.photo.cream)}</span>}</div>
                </div>
                <button className="btn xs ghost" onClick={() => { setState({ photo: null }); setFit(null); }}>지우기</button>
              </div>
            )}
            {rows.length === 0 && (
              <div className="empty"><div className="big">🔎</div>이 조건에 맞는 가게가 없어요.<br />필터를 바꾸거나 반경을 넓혀 보세요.
                <div style={{ marginTop: 12 }}><button className="btn sec sm" onClick={() => setLocOpen(true)}>반경 넓히기</button></div></div>
            )}
            {rows.map((r) => (
              <StoreCard key={r.s.id} r={r} sel={sel === r.s.id} fav={st.favs.includes(r.s.id)} onFav={() => toggleFav(r.s.id)}
                picked={cmpMode ? cmp.includes(r.s.id) : undefined}
                onClick={() => {
                  if (cmpMode) { setCmp((a) => (a.includes(r.s.id) ? a.filter((x) => x !== r.s.id) : a.length >= 3 ? (toast('최대 3곳까지 비교할 수 있어요'), a) : [...a, r.s.id])); return; }
                  if (sel === r.s.id) nav(`/store/${r.s.id}`); else select(r.s.id);
                }} />
            ))}
            {sel && <div className="center xs muted" style={{ margin: '-2px 0 10px' }}>선택한 가게를 한 번 더 누르면 자세히 볼 수 있어요</div>}
            <div className="card pad" style={{ marginTop: 6 }}>
              <div className="b">다른 지역도 찾을 수 있어요</div>
              <div className="small muted" style={{ margin: '4px 0 10px' }}>수원 가게는 직접 조사한 정보가 들어 있어요. 다른 지역은 {st.settings.kakaoKey && !kakaoBad ? '카카오 장소 검색' : '공개 지도 데이터(OpenStreetMap)'}에서 주변 케이크 가게를 찾아요.</div>
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
      <PhotoSheet open={photoOpen} onClose={() => setPhotoOpen(false)} />
    </div>
  );
}

async function kakaoFind(key, loc, radiusKm) {
  const k = await loadKakao(key);
  const ps = new k.maps.services.Places();
  const kw = ['레터링케이크', '주문제작케이크', '커스텀케이크', '도시락케이크'];
  const out = [];
  for (const q of kw) {
    const res = await new Promise((resolve) => ps.keywordSearch(q, (data, status) => resolve(status === k.maps.services.Status.OK ? data : []), { location: new k.maps.LatLng(loc.lat, loc.lng), radius: Math.min(20000, radiusKm * 1000), sort: k.maps.services.SortBy.DISTANCE }));
    for (const p of res) {
      if (out.some((x) => x.id === 'kakao-' + p.id)) continue;
      out.push({
        id: 'kakao-' + p.id, kind: 'kakao', level: 'kakao', name: p.place_name, lat: +p.y, lng: +p.x, geo: 'exact',
        addr: p.road_address_name || p.address_name, dong: (p.address_name || '').split(' ').slice(-2, -1)[0] || '', gu: '',
        styles: q.includes('도시락') ? ['dosirak', 'lettering'] : q.includes('레터링') ? ['lettering'] : ['custom'],
        note: `카카오 장소 검색 "${q}" 결과예요. ${p.category_name || ''}`, src: [p.place_url],
      });
    }
  }
  return out;
}

export function LocationSheet({ open, onClose }) {
  const st = useApp();
  const [q, setQ] = useState('');
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const pick = (p) => { setState({ loc: { lat: p.lat, lng: p.lng, label: p.label, src: 'pick' } }); toast(`${p.label} 기준으로 찾을게요`); onClose(); };
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

export function PhotoSheet({ open, onClose, onUse }) {
  const st = useApp();
  const [img, setImg] = useState(null); // { thumb, an }
  const [busy, setBusy] = useState(false);
  const [ai, setAi] = useState(null);
  const [aiErr, setAiErr] = useState('');
  const [styles, setStyles] = useState([]);
  const [design, setDesign] = useState('simple');
  const [shape, setShape] = useState('round');
  const [cream, setCream] = useState('white');
  useEffect(() => {
    if (open && st.photo) {
      setImg({ thumb: st.photo.thumb }); setStyles(st.photo.styles || []); setDesign(st.photo.design || 'simple'); setShape(st.photo.shape || 'round'); setCream(st.photo.cream || 'white'); setAi(st.photo.ai || null);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const onPick = async (file) => {
    setBusy(true); setAi(null); setAiErr('');
    try {
      const el = await loadImage(file);
      const thumb = toDataURL(el, 360, 0.8, true);
      const an = analyzeImage(el);
      setImg({ thumb, an });
      setStyles(an.styles); setDesign(an.design); setCream(an.cream); setShape('round');
      if (st.settings.claudeKey) {
        try {
          const big = toDataURL(el, 900, 0.85);
          const r = await aiAnalyzePhoto(st.settings.claudeKey, big);
          setAi(r);
          if (r.is_cake) {
            if (r.styles?.length) setStyles(r.styles);
            if (r.design) setDesign(r.design);
            if (r.shape && r.shape !== 'unknown') setShape(r.shape);
            if (r.cream_colors?.[0]) setCream(r.cream_colors[0]);
          }
        } catch (e) { setAiErr(e.message); }
      }
    } catch (e) { toast(e.message || '사진을 읽지 못했어요'); }
    setBusy(false);
  };
  const toggle = (id) => setStyles((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));
  const apply = () => {
    const photo = { thumb: img.thumb, styles: styles.length ? styles : ['lettering'], design, shape, cream, ai, palette: img.an?.palette || st.photo?.palette, at: Date.now() };
    setState({ photo });
    onClose();
    onUse?.(photo);
    if (!onUse) toast('사진과 비슷한 케이크를 만드는 가게 순서로 보여 드려요');
  };
  const pal = img?.an?.palette || st.photo?.palette;
  return (
    <Sheet open={open} onClose={onClose} title="사진으로 비슷한 케이크 찾기"
      footer={img && !busy ? <div className="btns"><PhotoPick onPick={onPick} className="btn line">다른 사진</PhotoPick><button className="btn pri" style={{ flex: 2 }} onClick={apply}>비슷한 케이크 가게 보기</button></div> : null}>
      {!img && !busy && (
        <div className="col" style={{ alignItems: 'stretch', gap: 10 }}>
          <div className="note pink">원하는 케이크 사진(인스타 캡처도 좋아요)을 올리면 색·모양·스타일을 분석해서 비슷한 케이크를 만드는 주변 가게를 골라 드려요. 사진은 이 기기 안에서만 분석해요{st.settings.claudeKey ? ' (AI 연결 시 AI 분석에도 사용)' : ''}.</div>
          <PhotoPick onPick={onPick} className="btn pri block"><Icon n="image" /> 앨범에서 사진 고르기</PhotoPick>
          <PhotoPick onPick={onPick} capture className="btn line block"><Icon n="camera" /> 카메라로 찍기</PhotoPick>
        </div>
      )}
      {busy && <Loading text={st.settings.claudeKey ? 'AI가 사진을 보고 있어요…' : '사진의 색과 스타일을 분석하는 중…'} />}
      {img && !busy && (
        <div className="fadeup">
          <div className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
            <img src={img.thumb} alt="" style={{ width: 104, height: 104, borderRadius: 16, objectFit: 'cover', flex: 'none' }} />
            <div className="grow">
              <span className={`tag ${ai ? 'dark' : 'blue'}`}>{ai ? '✨ AI 분석' : '기기 안 자동 분석'}</span>
              {ai?.summary_ko && <div className="small" style={{ marginTop: 6 }}>{ai.summary_ko}</div>}
              {ai && !ai.is_cake && <div className="small" style={{ marginTop: 6, color: 'var(--warn)' }}>케이크 사진이 아닌 것 같아요. 색만 참고할게요.</div>}
              {!ai && <div className="xs muted" style={{ marginTop: 6 }}>색으로 스타일을 추측했어요. 맞지 않으면 아래에서 눌러 고쳐 주세요.{aiErr && <><br /><span style={{ color: 'var(--warn)' }}>AI 분석 실패: {aiErr}</span></>}</div>}
              {ai?.lettering_text && <div className="small" style={{ marginTop: 6 }}>읽은 문구: <b>“{ai.lettering_text}”</b></div>}
            </div>
          </div>
          {pal && <><div className="lbl">사진 속 색</div><div className="row">{pal.map((p, i) => <div key={i} className="col" style={{ alignItems: 'center', gap: 2, width: 64 }}><i style={{ width: 36, height: 36, borderRadius: 12, background: p.hex, border: '2px solid rgba(0,0,0,.06)' }} /><span className="xs muted">{p.name} {p.pct}%</span></div>)}</div></>}
          <div className="lbl">어떤 스타일인가요? <span className="xs muted">여러 개 골라도 돼요</span></div>
          <div className="chips wrap">{STYLES.filter((s) => s.id !== 'custom').map((s) => <button key={s.id} className={`chip ${styles.includes(s.id) ? 'on' : ''}`} onClick={() => toggle(s.id)}>{s.emoji} {s.name}</button>)}</div>
          <div className="lbl">비슷한 디자인</div>
          <div className="chips wrap">{DESIGNS.map((d) => <button key={d.id} className={`chip soft ${design === d.id ? 'on' : ''}`} onClick={() => setDesign(d.id)}>{d.name}</button>)}</div>
          <div className="lbl">모양 · 크림 색</div>
          <div className="chips wrap">{SHAPES.map((s) => <button key={s.id} className={`chip soft ${shape === s.id ? 'on' : ''}`} onClick={() => setShape(s.id)}>{s.name}</button>)}
            {CREAMS.slice(0, 8).map((c) => <button key={c.id} className={`chip soft ${cream === c.id ? 'on' : ''}`} onClick={() => setCream(c.id)}><i style={{ width: 12, height: 12, borderRadius: 6, background: c.hex, border: '1px solid #0001' }} />{c.name}</button>)}</div>
          <div className="lbl">이렇게 주문하면 이런 느낌이에요</div>
          <div style={{ borderRadius: 16, overflow: 'hidden', background: 'var(--p50)' }}><CakeView o={{ shape, size: 'h1', design, cream, text: ai?.lettering_text || '생일 축하해', font: 'jua', textColor: 'berry', toppings: ai?.toppings?.filter((x) => ['cherry', 'strawberry', 'sprinkle', 'pearl', 'ribbon', 'freshflower', 'macaron'].includes(x)) || [], photo: design === 'photo' ? img.thumb : undefined }} style={{ height: 170 }} /></div>
          {ai?.needs_owner_check?.length > 0 && <div className="note warn" style={{ marginTop: 10 }}>사장님 확인이 필요할 수 있어요: {ai.needs_owner_check.join(' · ')}</div>}
        </div>
      )}
    </Sheet>
  );
}
