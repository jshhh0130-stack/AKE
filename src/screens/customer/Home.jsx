import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import MapView from '../../components/MapView.jsx';
import { loadKakao, kakaoKeyOf, sweepSuwon, onKakao, kakaoStatus, kakaoFind } from '../../lib/kakao.js';
import Coach from '../../components/Coach.jsx';
import { LocShareSheet, myLocation } from '../../components/Share.jsx';
import { CustomerTabBar } from '../../components/TabBar.jsx';
import { Sheet, CakeView, toast, PhotoPick, Loading, Toggle, useBackClose, Portal } from '../../components/ui.jsx';
import AIStudio from '../../components/AIStudio.jsx';
import Sketch from '../../components/Sketch.jsx';
import { saveEdited } from '../../lib/imagegen.js';
import { NotiBell } from '../../components/Noti.jsx';
import { useApp, setState, getState } from '../../lib/state.js';
import { nav, navAfterSheet } from '../../lib/router.js';
import { getStores, rankStores, FILTERS, GUS, BUDGETS, findCount, parseFindText, fmtKm, headlinePrice, pinPrice, canOrderInApp, nextOpenDay, searchStores, strengths } from '../../lib/stores.js';
import { storeLook, cakeSVG } from '../../lib/cake.js';
import { range } from '../../lib/util.js';
import { estimate } from '../../lib/price.js';
import { PLACES, STYLES, DESIGNS, SHAPES, styleName, optName, creamOf } from '../../data/catalog.js';
import { getGPS, searchPlace, reverseLabel, findNearbyOSM } from '../../lib/geo.js';
import { loadImage, loadDataURL, toDataURL, analyzeImage } from '../../lib/image.js';
import { aiAnalyzePhoto, aiParseFind } from '../../lib/ai.js';
import { enrich, googleFind, onPlaces } from '../../lib/gplaces.js';

const lookOf = (s) => s.hero || s.portfolio?.[0]?.design || storeLook(s);
export function StoreThumb({ s }) {
  const photo = s.g?.photos?.[0]?.src || s.portfolio?.find((p) => p.src)?.src;
  if (photo) return <img src={photo} alt="" referrerPolicy="no-referrer" />;
  return <CakeView o={lookOf(s)} />;
}
// 구글·카카오 장소 정보가 바뀌면 다시 그리기
export function usePlaces() {
  const [n, set] = useState(0);
  useEffect(() => { const up = () => set((x) => x + 1); const a = onPlaces(up), b = onKakao(up); return () => { a(); b(); }; }, []);
  return n;
}

const budgetName = (b) => BUDGETS.find((x) => x.r[0] === b[0] && x.r[1] === b[1])?.name || range(b[0] || 0, b[1] > 900000 ? null : b[1], true);

// 가게 카드: [사진] 이름 · 별점·동네·거리 · 1호 가격 · 칩 2개
export function StoreCard({ r, sel, onClick, fav, onFav, picked, className = '' }) {
  const { s, d, match } = r;
  const hp = headlinePrice(s);
  const inApp = canOrderInApp(s);
  const open = inApp ? nextOpenDay(s, getState().orders) : null;
  const rv = getState().orders.filter((o) => o.storeId === s.id && o.review);
  const rating = s.g?.rating ? [s.g.rating, s.g.n] : rv.length ? [rv.reduce((a, o) => a + o.review.stars, 0) / rv.length, rv.length] : null;
  const unsure = s.kind === 'public' && !s.verified && !s.price;
  const chips = [...strengths(s).map((t) => <span key={t} className="tag">{t}</span>)];
  if (s.sameDay) chips.splice(1, 1, <span key="sd" className="tag warn">당일 픽업</span>);
  if (unsure) chips.splice(1, 1, <span key="un" className="tag mute">확인 필요</span>);
  if (s.kind !== 'public' && !inApp) chips.splice(1, 1, <span key="ext" className="tag blue">{s.kind === 'kakao' ? '카카오맵' : '지도 검색'}</span>);
  return (
    <button className={`scard ${sel ? 'sel' : ''} ${className}`} onClick={onClick} id={className ? undefined : `card-${s.id}`}>
      <div className="th"><StoreThumb s={s} />{inApp && <span className="m">앱 주문</span>}</div>
      <div className="grow">
        <div className="nm"><span>{s.name}</span>{match != null && <span className="match">{match}%</span>}</div>
        <div className="meta">
          {rating && <><span className="star"><Icon n="star" fill />{rating[0].toFixed(1)}</span><span>({rating[1]}) ·</span></>}
          <span>{[s.dong || s.gu, d != null ? fmtKm(d) : null, s.geo === 'area' ? '위치 대략' : null].filter(Boolean).join(' · ')}</span>
        </div>
        <div className="pr">
          {hp ? <>{hp.label} {range(hp.lo, hp.hi, true)}{!hp.exact && <small> {hp.bench ? '평균 추정' : '공개가'}</small>}</> : <small>가격 정보 없음</small>}
          {open && <small> · {open.diff === 0 ? '오늘' : open.diff === 1 ? '내일' : `${open.diff}일 뒤`} 픽업</small>}
        </div>
        {chips.length > 0 && <div className="tags">{chips.slice(0, 2)}</div>}
      </div>
      {picked != null ? <span className={`fav ${picked ? 'on' : ''}`} aria-label="비교 선택"><Icon n={picked ? 'check' : 'plus'} style={{ width: 26, height: 26, padding: 4, borderRadius: 9, background: picked ? 'var(--rose)' : 'var(--bg2)', color: picked ? '#fff' : 'var(--faint)' }} /></span>
        : onFav && <span className={`fav ${fav ? 'on' : ''}`} onClick={(e) => { e.stopPropagation(); onFav(); }} role="button" aria-label="찜"><Icon n="heart" fill={fav} /></span>}
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
            {line('주문 방법', (r) => (canOrderInApp(r.s) ? <span className="tag pink">앱 주문</span> : r.s.kakao ? '카톡' : r.s.insta ? '인스타' : r.s.naver ? '네이버 예약' : '가게 문의'))}
            {line('미니', (r) => est(r.s, 'mini'))}
            {line('1호', (r) => <b>{est(r.s, 'h1')}</b>)}
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

const SNAP = { mini: 0.12, half: 0.44, full: 0.92 };
const TOUR = [
  { sel: '[data-coach="find"]', title: 'AI로 케이크 가게를 찾아요', body: '원하는 케이크 사진을 넣거나 “영통 4만원대 캐릭터”처럼 말로 쓰면 맞는 가게를 찾아요. 사진을 AI 실사 사진으로 만들고 그림판으로 고칠 수도 있어요.', pad: 4 },
  { sel: '[data-coach="chips"]', title: '조건을 눌러 바로 골라요', body: '위 검색창에는 가게 이름을 써요. 아래 칩으로 동네 · 앱 주문 · 당일 픽업 가게만 골라 봐요.', pad: 2, radius: 20 },
  { sel: '.bsheet .bl .scard', title: '가게마다 1호 가격이 먼저 보여요', body: '지도 핀에도 가격이 보여요. 분홍 핀은 앱으로 바로 주문되는 가게예요. 핀이나 카드를 누르면 가게를 자세히 봐요.', pad: 4, radius: 16 },
  { sel: '[data-coach="fabs"]', title: '내 위치 · 위치 공유', body: '내 주변 가게를 찾고, 가게 위치를 친구에게 카톡·문자로 보낼 수 있어요.', pad: 6, radius: 28 },
  { sel: '[data-coach="tab-saved"]', title: '관심에서 케이크를 모아 봐요', body: '케이크 사진을 둘러보고 하트를 눌러 모아요. 비슷한 케이크와 만드는 가게도 찾아 줘요.', pad: 2, radius: 14 },
];

export default function CustomerHome() {
  const st = useApp();
  const pv = usePlaces();
  const [sel, setSel] = useState(null);
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('rec');
  const [snap, setSnap] = useState('half');
  const [drag, setDrag] = useState(null);
  const [locOpen, setLocOpen] = useState(false);
  const [findOpen, setFindOpen] = useState(false); // false | 'all' | 'photo'
  const [searchOpen, setSearchOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [permOpen, setPermOpen] = useState(false);
  const [fit, setFit] = useState(null);
  const [finding, setFinding] = useState(false);
  const [mapBad, setMapBad] = useState('');
  const [cmpMode, setCmpMode] = useState(false);
  const [cmp, setCmp] = useState([]);
  const [cmpOpen, setCmpOpen] = useState(false);
  const [moved, setMoved] = useState(null); // 지도를 끌어 옮긴 곳(가운데)
  const [tour, setTour] = useState(false);
  const wrap = useRef(null);
  const cards = useRef(null);
  const fromScroll = useRef(false);
  const scrollT = useRef(null);
  const [H, setH] = useState(600);
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setH(e.contentRect.height));
    ro.observe(wrap.current);
    return () => ro.disconnect();
  }, []);
  // 처음 들어오면 화면 위에서 짧게 사용법 안내
  useEffect(() => { if (!getState().seenTour) { const t = setTimeout(() => setTour(true), 900); return () => clearTimeout(t); } }, []);
  const gKey = mapBad === 'google' ? '' : st.settings.googleKey;
  const kKey = mapBad === 'kakao' ? '' : kakaoKeyOf(st.settings);
  // 카카오맵에서 수원 커스텀 케이크 가게 모으기 (3일에 한 번, 이 기기에 저장)
  const kAny = kakaoKeyOf(st.settings); // 지도가 실패해도 가게 모으기 상태는 보여 준다
  useEffect(() => { if (kAny) sweepSuwon(kAny); }, [kAny]);
  const ks = kakaoStatus();

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
  // 선택한 가게가 목록에서 빠지면 카드도 닫기
  useEffect(() => { if (sel && !ranked.some((r) => r.s.id === sel)) setSel(null); }, [ranked]); // eslint-disable-line react-hooks/exhaustive-deps

  const avail = H - 60;
  const cardMode = !!sel && !cmpMode;
  const height = drag?.h ?? Math.round(avail * SNAP[snap]);
  const startDrag = (e) => { e.currentTarget.setPointerCapture?.(e.pointerId); setDrag({ y: e.clientY, h0: height, h: height }); };
  const moveDrag = (e) => { if (drag) setDrag({ ...drag, h: Math.max(74, Math.min(avail * 0.94, drag.h0 - (e.clientY - drag.y))) }); };
  const endDrag = () => {
    if (!drag) return;
    const r = drag.h / avail;
    const movedY = Math.abs(drag.h - drag.h0) > 6;
    if (!movedY) setSnap(snap === 'full' ? 'half' : snap === 'half' ? 'full' : 'half');
    else setSnap(r < 0.26 ? 'mini' : r < 0.7 ? 'half' : 'full');
    setDrag(null);
  };
  const lower = cardMode ? 190 : height; // 지도 아래를 가리는 높이 (카드 모드: 목록 버튼 + 카드)
  // 핀을 누르면 카드, 카드를 옆으로 넘기면 핀이 따라간다
  const select = (id) => { setSel(id); if (cmpMode) setCmpMode(false); };
  useEffect(() => {
    if (!sel || !cards.current) return;
    if (fromScroll.current) { fromScroll.current = false; return; }
    const i = ranked.findIndex((r) => r.s.id === sel);
    const el = cards.current.children[i];
    if (el) cards.current.scrollTo({ left: el.offsetLeft - 24, behavior: 'smooth' });
  }, [sel]); // eslint-disable-line react-hooks/exhaustive-deps
  const onCardsScroll = () => {
    clearTimeout(scrollT.current);
    scrollT.current = setTimeout(() => {
      const box = cards.current; if (!box) return;
      const mid = box.scrollLeft + box.clientWidth / 2;
      let best = 0, bd = 1e9;
      [...box.children].forEach((c, k) => { const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid); if (d < bd) { bd = d; best = k; } });
      const id = ranked[best]?.s.id;
      if (id && id !== sel) { fromScroll.current = true; setSel(id); }
    }, 120);
  };
  const toggleFav = (id) => setState((s) => ({ ...s, favs: s.favs.includes(id) ? s.favs.filter((x) => x !== id) : [...s.favs, id] }));
  const exactN = ranked.filter((r) => !r.partial).length;
  const firstPartial = ranked.find((r) => r.partial);
  const nFind = findCount(find);
  const bySearch = !!find && find.src === 'search' && !!find.text; // 위 검색창으로 찾은 것
  const byAI = !!find && !bySearch && (nFind > 0 || !!find.text); // AI 찾기(사진·말·조건)로 찾은 것
  const clearFind = () => { setState({ find: null }); setFit(null); };
  const locLabel = find?.gu ? `수원 ${find.gu}` : st.loc.label;
  const selStore = sel ? ranked.find((r) => r.s.id === sel)?.s : null;

  const doLocate = async () => {
    try {
      toast('현재 위치를 찾는 중…', 1500);
      const p = await myLocation();
      const label = (await reverseLabel(p.lat, p.lng)) || '현재 위치';
      setState((s) => ({ ...s, loc: { lat: p.lat, lng: p.lng, label, src: 'gps' }, find: s.find?.gu ? { ...s.find, gu: null } : s.find }));
      setMoved(null);
      toast('내 위치로 옮겼어요');
    } catch (e) { toast(e.message); }
  };
  const locate = () => (st.locOk ? doLocate() : setPermOpen(true));
  const searchHere = async () => {
    const c = moved; if (!c) return;
    setMoved(null);
    setState((s) => ({ ...s, loc: { lat: c.lat, lng: c.lng, label: '지도에서 고른 곳', src: 'map' }, find: s.find?.gu ? { ...s.find, gu: null } : s.find }));
    const label = await reverseLabel(c.lat, c.lng);
    if (label) setState((s) => (s.loc.lat === c.lat ? { ...s, loc: { ...s.loc, label } } : s));
    toast('이 지역 기준으로 다시 찾았어요');
  };

  const findMore = async () => {
    setFinding(true);
    try {
      let found = [];
      if (kKey) { try { found = await kakaoFind(kKey, st.loc, st.radius); } catch (e) { console.warn(e); } }
      if (!found.length && gKey) { try { found = await googleFind(gKey, st.loc, Math.min(st.radius, 10)); } catch (e) { console.warn(e); } }
      if (!found.length) found = await findNearbyOSM(st.loc, Math.min(st.radius, 6));
      const ids = new Set(stores.map((s) => s.id));
      const names = new Set(stores.map((s) => s.name.replace(/\s/g, '')));
      const fresh = found.filter((x) => !ids.has(x.id) && !names.has(x.name.replace(/\s/g, '')));
      setState((s) => ({ ...s, found: [...(s.found || []), ...fresh].slice(-120) }));
      toast(fresh.length ? `주변 케이크 가게 ${fresh.length}곳을 더 찾았어요` : '새로 찾은 가게가 없어요. 범위를 넓혀 보세요');
    } catch (e) { toast(e.message || '가게를 더 찾지 못했어요'); }
    setFinding(false);
  };

  const card = (r, extra) => (
    <StoreCard r={r} sel={sel === r.s.id} fav={st.favs.includes(r.s.id)} onFav={() => toggleFav(r.s.id)} {...extra}
      onClick={() => {
        if (cmpMode) { setCmp((a) => (a.includes(r.s.id) ? a.filter((x) => x !== r.s.id) : a.length >= 3 ? (toast('최대 3곳까지 비교할 수 있어요'), a) : [...a, r.s.id])); return; }
        nav(`/store/${r.s.id}`);
      }} />
  );

  return (
    <div className="screen fade" ref={wrap}>
      <div className="maphome">
        <MapView center={st.loc} zoom={st.radius > 6 ? 12 : 14} pins={pins} selected={sel} onSelect={select} me={st.loc} meKind={st.loc.src === 'gps' ? 'gps' : 'place'} radiusKm={find?.gu ? 0 : st.radius} fit={fit}
          padBottom={Math.min(Math.round(avail * 0.5), lower)} onMapClick={() => setSel(null)} onUserMove={(c) => setMoved(c)}
          googleKey={gKey} kakaoKey={kKey} prefer="kakao" onMapFail={(w) => { setMapBad(w); toast(`${w === 'google' ? '구글' : '카카오'} 지도 키를 확인해 주세요. 기본 지도로 보여 드려요`, 3500); }} />

        <div className="mtop">
          <div className="mbar">
            <button className={`msearch ${bySearch ? 'on' : ''}`} data-coach="search" onClick={() => setSearchOpen(true)}>
              <Icon n="search" />
              <span className="q">{bySearch ? find.text : '가게 이름, 동네로 검색'}</span>
              {bySearch && <span className="x" role="button" aria-label="검색 지우기" onClick={(e) => { e.stopPropagation(); clearFind(); toast('검색을 지웠어요'); }}><Icon n="close" size="sm" /></span>}
            </button>
            <NotiBell role="c" />
          </div>
          {/* AI로 케이크 가게 찾기: 사진을 넣거나 말로 (예전 '찾기' 그대로) */}
          <button className={`findbar ${byAI ? 'on' : ''}`} data-coach="find" onClick={() => setFindOpen('all')}>
            {byAI && find.photo?.thumb ? <img src={find.photo.thumb} alt="" /> : <span className="fi"><Icon n="sparkle" /></span>}
            <span className="grow">{byAI ? <><b>조건 {nFind}개로 찾는 중</b><small>{[find.text, find.photo && '내 사진과 비슷한', ...(find.styles || []).map(styleName), find.budget && budgetName(find.budget), find.sameDay && '당일'].filter(Boolean).slice(0, 3).join(' · ') || '눌러서 조건 바꾸기'}</small></> : <><b>AI로 케이크 가게 찾기</b><small>사진을 넣거나 말로 찾아보세요 · AI 실사 사진도 만들어요</small></>}</span>
            {byAI ? <span className="fx" role="button" aria-label="조건 지우기" onClick={(e) => { e.stopPropagation(); clearFind(); toast('찾기 조건을 지웠어요'); }}><Icon n="close" size="sm" /></span> : <span className="fc" role="button" aria-label="사진으로 찾기" onClick={(e) => { e.stopPropagation(); setFindOpen('photo'); }}><Icon n="camera" /></span>}
          </button>
          <div className="mchips" data-coach="chips">
            <button className="mchip loc" onClick={() => setLocOpen(true)}><Icon n="pin" /><span>{locLabel}</span><Icon n="down" /></button>
            {FILTERS.filter((f) => f.id !== 'all').map((f) => <button key={f.id} className={`mchip ${filter === f.id ? 'on' : ''}`} onClick={() => { setFilter(filter === f.id ? 'all' : f.id); setSel(null); }}>{f.name}</button>)}
          </div>
        </div>
        {moved && <button className="mre" onClick={searchHere}><Icon n="refresh" size="sm" />이 지역에서 다시 찾기</button>}
        <div className="mfabs" data-coach="fabs" style={{ bottom: `calc(var(--tab) + var(--sb) + ${lower + 12}px)` }}>
          <button className={`mfab ${st.loc.src === 'gps' ? 'on' : ''}`} onClick={locate} aria-label="내 위치"><Icon n="gps" /></button>
          <button className="mfab" onClick={() => setShareOpen(true)} aria-label="위치 공유"><Icon n="share" /></button>
        </div>

        {cardMode ? (
          <div className="mcardwrap">
            <button className="mlistbtn" onClick={() => setSel(null)}><Icon n="list" />목록 보기</button>
            <div className="mcards" ref={cards} onScroll={onCardsScroll}>
              {ranked.map((r) => <div className="mslide" key={r.s.id}>{card(r, { className: 'mcard' })}</div>)}
            </div>
          </div>
        ) : (
          <div className={`bsheet ${drag ? 'dragging' : ''}`} style={{ height }}>
            <div className="grab" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}><i /></div>
            <div className="bh" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag}>
              <h3>{nFind || find?.text ? '찾은 가게' : '이 근처 커스텀 케이크'} <b>{nFind ? exactN : ranked.length}</b></h3>
              <select className="sortsel" value={sort} onChange={(e) => setSort(e.target.value)} onPointerDown={(e) => e.stopPropagation()} aria-label="정렬">
                <option value="rec">추천순</option><option value="near">가까운순</option><option value="price">가격순</option>
              </select>
              <button className={`btn xs ${cmpMode ? 'dark' : 'ghost'}`} onPointerDown={(e) => e.stopPropagation()} onClick={() => { setCmpMode(!cmpMode); setCmp([]); if (!cmpMode) toast('비교할 가게를 2~3곳 눌러 주세요'); }}>{cmpMode ? '비교 취소' : '비교'}</button>
            </div>
            <div className="legendrow"><span><i className="l1" />앱 주문</span><span><i className="l2" />케이크 가게</span><span><i className="l3" />정보 확인 필요</span>{!gKey && !kKey && <a className="osm" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">지도 © OpenStreetMap</a>}</div>
            <div className="bl">
              {ranked.length === 0 && (
                <div className="empty">이 조건에 맞는 가게가 없어요.<br />조건을 줄이거나 범위를 넓혀 보세요.
                  <div className="row" style={{ marginTop: 12, justifyContent: 'center' }}>{(nFind > 0 || find?.text) && <button className="btn sec sm" onClick={clearFind}>조건 지우기</button>}<button className="btn line sm" onClick={() => setLocOpen(true)}>범위 넓히기</button></div></div>
              )}
              {ranked.map((r) => (<div key={r.s.id}>
                {r === firstPartial && <div className="sec-t" style={{ margin: '16px 0 4px' }}><h3 style={{ fontSize: 15 }}>{exactN ? '조건과 조금 다른 가게' : '딱 맞는 곳은 없어요 · 비슷한 가게'}</h3><span className="more">{ranked.length - exactN}곳</span></div>}
                {card(r, { picked: cmpMode ? cmp.includes(r.s.id) : undefined })}
              </div>))}
              {kAny && (
                <div className="kstat">
                  <span className="ki">K</span>
                  <span className="grow">{ks.state === 'loading' ? <b>카카오맵에서 수원 케이크 가게 77곳을 찾는 중…</b>
                    : ks.state === 'error' ? <><b>카카오맵 가게 정보를 못 불러왔어요</b><small>{ks.msg}</small></>
                    : <><b>수원 케이크 가게 {stores.filter((s) => !s.hidden && (s.kind === 'public' || s.pick)).length}곳 · 카카오맵 정보 {stores.filter((s) => s.k && !s.hidden).length}곳</b><small>{ks.missing?.length ? `카카오맵에서 못 찾은 곳: ${ks.missing.join(', ')}` : '고른 가게를 모두 카카오맵에서 찾았어요'}</small></>}</span>
                  {ks.state !== 'loading' && <button className="btn xs ghost" onClick={() => sweepSuwon(kAny, { force: true })}><Icon n="refresh" size="sm" />새로</button>}
                </div>
              )}
              <div className="card cream pad" style={{ marginTop: 12 }}>
                <div className="b">다른 지역도 찾을 수 있어요</div>
                <div className="small muted" style={{ margin: '4px 0 12px' }}>수원은 팀이 고른 커스텀 케이크 가게 {stores.filter((s) => !s.hidden && (s.kind === 'public' || s.kind === 'partner' || s.pick)).length}곳이 들어 있어요. 다른 지역은 {kKey ? '카카오 장소 검색' : gKey ? '구글 지도 검색' : '공개 지도 데이터'}로 찾아요.</div>
                <button className="btn line block sm" onClick={findMore} disabled={finding}>{finding ? '찾는 중…' : <><Icon n="search" size="sm" /> 이 근처 케이크 가게 더 찾기</>}</button>
              </div>
            </div>
          </div>
        )}
        {!cardMode && snap === 'full' && !drag && !cmpMode && <button className="mapbtn" onClick={() => setSnap('half')}><Icon n="map" />지도 보기</button>}
      </div>
      {cmpMode && cmp.length > 0 && (
        <div style={{ position: 'absolute', left: 12, right: 12, bottom: 'calc(var(--tab) + var(--sb) + 10px)', zIndex: 25 }}>
          <button className="btn pri block" disabled={cmp.length < 2} onClick={() => setCmpOpen(true)}>{cmp.length < 2 ? '한 곳 더 골라 주세요' : `${cmp.length}곳 나란히 비교하기`}</button>
        </div>
      )}
      <CustomerTabBar current="/c" />
      <CompareSheet open={cmpOpen} onClose={() => setCmpOpen(false)} rows={cmp.map((id) => ranked.find((r) => r.s.id === id)).filter(Boolean)} />
      <LocationSheet open={locOpen} onClose={() => setLocOpen(false)} />
      <FindSheet open={!!findOpen} focus={findOpen} onClose={() => setFindOpen(false)} stores={stores} />
      <LocShareSheet open={shareOpen} onClose={() => setShareOpen(false)} store={selStore} center={moved ? { ...moved, label: '지도에서 보는 곳' } : st.loc} />
      <LocPermSheet open={permOpen} onClose={() => setPermOpen(false)} onOk={() => { setState({ locOk: true }); setPermOpen(false); setTimeout(doLocate, 350); }} />
      {searchOpen && <SearchView stores={stores} onClose={() => setSearchOpen(false)} openPhoto={() => setTimeout(() => setFindOpen('photo'), 380)} />}
      {tour && <Coach steps={TOUR} onDone={() => { setTour(false); setState({ seenTour: true, seenGuide: true }); }} />}
    </div>
  );
}

// 위치를 쓰기 전에 왜 필요한지 먼저 알려 주기 (그다음 휴대폰 허용 창)
function LocPermSheet({ open, onClose, onOk }) {
  return (
    <Sheet open={open} onClose={onClose}>
      <div className="center" style={{ padding: '8px 4px 4px' }}>
        <div className="empty" style={{ padding: '6px 0 0' }}><div className="big"><Icon n="gps" /></div></div>
        <h3 style={{ margin: '0 0 6px', fontSize: 19, letterSpacing: -0.5 }}>내 위치를 사용할까요?</h3>
        <p className="small muted" style={{ margin: '0 0 18px', lineHeight: 1.6 }}>가까운 케이크 가게부터 보여 드리고, 원하면 위치를 친구에게 보낼 수 있어요.<br />위치는 이 기기 안에서만 써요.</p>
        <div className="btns"><button className="btn line" onClick={onClose}>나중에</button><button className="btn pri" style={{ flex: 2 }} onClick={onOk}>허용하기</button></div>
      </div>
    </Sheet>
  );
}

export function LocationSheet({ open, onClose }) {
  const st = useApp();
  const [q, setQ] = useState('');
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const pick = (p) => { setState((s) => ({ ...s, loc: { lat: p.lat, lng: p.lng, label: p.label, src: p.src || 'pick' }, find: s.find?.gu ? { ...s.find, gu: null, at: Date.now() } : s.find })); toast(`${p.label} 기준으로 찾을게요`); onClose(); };
  const search = async () => {
    if (!q.trim()) return;
    setBusy(true);
    try {
      let list = [];
      if (kakaoKeyOf(st.settings)) {
        try {
          const k = await loadKakao(kakaoKeyOf(st.settings));
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
        try { const p = await myLocation(); const label = (await reverseLabel(p.lat, p.lng)) || '현재 위치'; pick({ ...p, label, src: 'gps' }); } catch (e) { toast(e.message); }
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
      <div className="lbl" style={{ marginTop: 20 }}>수원 자주 찾는 곳</div>
      <div className="chips wrap">{PLACES.map((p) => <button key={p.label} className={`chip ${st.loc.label === p.label ? 'on' : ''}`} onClick={() => pick(p)}>{p.label}</button>)}</div>
      <div className="lbl" style={{ marginTop: 20 }}>찾는 범위 <span className="pink">{st.radius}km</span></div>
      <div className="seg">{[1, 3, 5, 10, 20].map((r) => <button key={r} className={st.radius === r ? 'on' : ''} onClick={() => setState({ radius: r })}>{r}km</button>)}</div>
    </Sheet>
  );
}

// ── 검색 화면: 가게 이름(초성·줄임말) · 말로 조건 · 동네 ──
const SUGGEST = ['레터링 케이크', '캐릭터 케이크', '하트 케이크', '당일 픽업', '3만원대', '꽃 케이크', '떡케이크', '영통 4만원대 캐릭터'];
function hl(name, q) {
  const i = name.toLowerCase().indexOf(q.toLowerCase().trim());
  if (i < 0 || !q.trim()) return name;
  return <>{name.slice(0, i)}<mark>{name.slice(i, i + q.trim().length)}</mark>{name.slice(i + q.trim().length)}</>;
}
function SearchView({ stores, onClose, openPhoto }) {
  const st = useApp();
  const close = useBackClose(onClose);
  const [q, setQ] = useState('');
  const [places, setPlaces] = useState(null);
  const [busy, setBusy] = useState(false);
  const inp = useRef(null);
  useEffect(() => { const t = setTimeout(() => inp.current?.focus(), 80); return () => clearTimeout(t); }, []);
  useEffect(() => { setPlaces(null); }, [q]);
  const qq = q.trim();
  const sres = useMemo(() => (qq ? searchStores(stores, qq, st.loc).slice(0, 8) : []), [qq, stores.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const parsed = useMemo(() => parseFindText(qq), [qq]);
  const hasCond = !!(parsed.styles.length || parsed.budget || parsed.gu || parsed.place || parsed.sameDay);
  const condText = [parsed.place?.label || parsed.gu, ...parsed.styles.map(styleName), parsed.budget && budgetName(parsed.budget), parsed.sameDay && '당일 픽업'].filter(Boolean).join(' · ');
  const placeHits = qq ? PLACES.filter((p) => p.label.replace(/\s/g, '').includes(qq.replace(/\s/g, ''))).slice(0, 4) : [];
  const recent = st.recentQ || [];
  const remember = (t) => setState((s) => ({ ...s, recentQ: [t, ...(s.recentQ || []).filter((x) => x !== t)].slice(0, 8) }));
  const go = (path) => { close(); navAfterSheet(path, {}); };
  const applyText = (text) => {
    const p = parseFindText(text);
    const cond = !!(p.styles.length || p.budget || p.gu || p.place || p.sameDay);
    const next = { text, styles: p.styles, budget: p.budget, gu: p.gu, sameDay: p.sameDay, q: cond ? '' : text, at: Date.now(), src: 'search' };
    setState((s) => ({ ...s, find: next, ...(p.place ? { loc: { ...p.place, src: 'find' }, radius: Math.min(s.radius, 3) } : {}) }));
    remember(text);
    close();
    toast(cond ? `‘${text}’ 조건으로 찾았어요` : `‘${text}’ 검색 결과예요`);
  };
  const pickPlace = (p) => { setState((s) => ({ ...s, loc: { lat: p.lat, lng: p.lng, label: p.label, src: 'pick' }, find: null })); remember(p.label); close(); toast(`${p.label} 근처로 옮겼어요`); };
  const findPlaces = async () => { setBusy(true); try { setPlaces(await searchPlace(qq)); } catch (e) { toast(e.message); } setBusy(false); };
  const enter = () => {
    if (!qq) return;
    if (sres.length && (sres.length === 1 || sres[0].score >= 3)) { remember(qq); go(`/store/${sres[0].s.id}`); return; }
    applyText(qq);
  };
  return (
    <div className="srch" role="dialog" aria-label="검색">
      <div className="sbar">
        <button className="ib" onClick={close} aria-label="닫기"><Icon n="back" /></button>
        <div className="qbox grow">
          <Icon n="search" size="sm" />
          <input ref={inp} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && enter()} placeholder="가게 이름, 동네, 원하는 케이크" enterKeyHint="search" />
          {q && <button className="x" onClick={() => setQ('')} aria-label="지우기"><Icon n="close" size="sm" /></button>}
        </div>
      </div>
      <div className="sbody">
        {!qq ? (<>
          {recent.length > 0 && (<>
            <h5>최근 검색<button onClick={() => setState({ recentQ: [] })}>모두 지우기</button></h5>
            <div className="chips wrap">{recent.map((t) => <span key={t} className="rq"><span role="button" onClick={() => setQ(t)}>{t}</span><button onClick={() => setState((s) => ({ ...s, recentQ: s.recentQ.filter((x) => x !== t) }))} aria-label="지우기"><Icon n="close" size="sm" /></button></span>)}</div>
          </>)}
          <h5>이렇게 찾아보세요</h5>
          <div className="chips wrap">{SUGGEST.map((t) => <button key={t} className="chip" onClick={() => setQ(t)}>{t}</button>)}</div>
          <button className="findcta" onClick={() => { close(); openPhoto(); }}>
            <span className="ic"><Icon n="camera" /></span>
            <span className="grow"><b>사진으로 찾기</b><small>원하는 케이크 사진으로 비슷하게 만드는 가게를 찾아요</small></span>
            <Icon n="right" size="sm" />
          </button>
          <h5>자주 찾는 동네</h5>
          <div className="chips wrap">{PLACES.map((p) => <button key={p.label} className="chip" onClick={() => pickPlace(p)}>{p.label}</button>)}</div>
        </>) : (<>
          {sres.length > 0 && (<>
            <h5>가게 <span className="muted" style={{ fontWeight: 500 }}>{sres.length}곳</span></h5>
            {sres.map(({ s, d }) => { const hp = headlinePrice(s); return (
              <button key={s.id} className="srow" onClick={() => { remember(qq); go(`/store/${s.id}`); }}>
                <span className="th"><StoreThumb s={s} /></span>
                <span className="grow"><div className="t">{hl(s.name, qq)}</div><div className="s">{[s.dong || s.gu, fmtKm(d), hp && `${hp.label} ${range(hp.lo, hp.hi, true)}`].filter(Boolean).join(' · ')}</div></span>
                <Icon n="right" size="sm" />
              </button>); })}
          </>)}
          <h5>조건으로 찾기</h5>
          <button className="srow" onClick={() => applyText(qq)}>
            <span className="ic pink"><Icon n="search" /></span>
            <span className="grow"><div className="t">‘{qq}’ {hasCond ? '조건으로 찾기' : '지도에서 찾기'}</div><div className="s">{hasCond ? condText : '이름·동네·소개에 이 말이 들어간 가게'}</div></span>
            <Icon n="right" size="sm" />
          </button>
          <h5>동네·위치</h5>
          {placeHits.map((p) => <button key={p.label} className="srow" onClick={() => pickPlace(p)}><span className="ic"><Icon n="pin" /></span><span className="grow"><div className="t">{hl(p.label, qq)}</div><div className="s">이 근처 가게 보기</div></span></button>)}
          {!places && <button className="srow" onClick={findPlaces}><span className="ic"><Icon n="map" /></span><span className="grow"><div className="t">‘{qq}’ 위치 찾기</div><div className="s">동네·역·주소로 지도를 옮겨요</div></span><Icon n="right" size="sm" /></button>}
          {busy && <Loading text="위치를 찾는 중…" />}
          {places && !busy && (places.length ? places.map((p, i) => <button key={i} className="srow" onClick={() => pickPlace(p)}><span className="ic"><Icon n="pin" /></span><span className="grow"><div className="t">{p.label}</div><div className="s">{p.full}</div></span></button>) : <div className="small muted" style={{ padding: '6px 0' }}>찾은 위치가 없어요.</div>)}
        </>)}
      </div>
    </div>
  );
}

const SAMPLES = [
  { label: '하트 빈티지', o: { shape: 'heart', size: 'h1', design: 'vintage', cream: 'pink', text: '사랑해', font: 'pen', textColor: 'berry', toppings: ['pearl'] } },
  { label: '곰돌이 그림', o: { shape: 'round', size: 'h1', design: 'character', cream: 'sky', text: '생일 축하해', font: 'gaegu', textColor: 'choco', toppings: ['sprinkle'] } },
  { label: '라벤더 꽃', o: { shape: 'round', size: 'h2', design: 'flower', cream: 'lavender', text: '감사합니다', font: 'gowun', textColor: 'navy', toppings: ['freshflower'] } },
];
const EXAMPLES = ['영통 근처 4만원대 캐릭터 케이크', '인계동 당일 가능한 레터링', '5만원 이하 꽃 케이크', '팔달구 사진 케이크'];
const designStyles = (d) => (d === 'character' ? ['character'] : d === 'flower' ? ['flower'] : d === 'photo' ? ['photo'] : ['lettering']);

// AI로 케이크 가게 찾기: 말로 · 사진으로 · 조건으로 (예전 '찾기' 그대로)
// 넣은 사진은 'AI 실사 사진'으로 만들거나 그림판으로 고친 뒤 그 사진으로 찾을 수 있어요.
const EMPTY_FIND = { text: '', styles: [], budget: null, gu: null, sameDay: false, appOnly: false, photo: null };
export function FindSheet({ open, onClose, stores, focus }) {
  const st = useApp();
  const [f, setF] = useState(EMPTY_FIND);
  const [place, setPlace] = useState(null);
  const [busy, setBusy] = useState('');
  const [aiNote, setAiNote] = useState('');
  const [big, setBig] = useState(null); // 넣은 사진 원본(크게) — AI·그림판용, 저장하지 않음
  const [studio, setStudio] = useState(false);
  const [sketch, setSketch] = useState(false);
  const photoRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    setF({ ...EMPTY_FIND, ...(st.find && st.find.src !== 'search' ? st.find : {}) }); setPlace(null); setAiNote(''); setBig(null);
    if (focus === 'photo') setTimeout(() => photoRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 380);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
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
      setBig(toDataURL(el, 1024, 0.9));
      const an = analyzeImage(el);
      let photo = { thumb, design: smp?.o.design || an.design, shape: smp?.o.shape || 'round', cream: smp?.o.cream || an.cream, palette: an.palette };
      let styles = smp ? designStyles(smp.o.design) : an.styles.filter((x) => x !== 'lettering').length ? an.styles.filter((x) => x !== 'lettering') : ['lettering'];
      if (st.settings.claudeKey && !smp) {
        try {
          const r = await aiAnalyzePhoto(st.settings.claudeKey, toDataURL(el, 900, 0.85));
          if (r.is_cake) { photo = { ...photo, ai: r, design: r.design || photo.design, shape: r.shape !== 'unknown' ? r.shape : photo.shape, cream: r.cream_colors?.[0] || photo.cream }; if (r.styles?.length) styles = r.styles.filter((x) => STYLES.some((s) => s.id === x)); setAiNote(r.summary_ko || ''); }
          else setAiNote('케이크 사진이 아닌 것 같아요. 색만 참고했어요. AI 실사 사진으로 케이크처럼 바꿔 볼 수 있어요.');
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
  // AI 실사 · 그림판으로 바꾼 사진으로 찾기
  const usePhoto = async (src) => {
    try {
      const el = await loadDataURL(src);
      const an = analyzeImage(el);
      setF((x) => ({ ...x, photo: { ...(x.photo || { shape: 'round' }), thumb: toDataURL(el, 360, 0.8, true), palette: an.palette, design: x.photo?.design || an.design, cream: x.photo?.cream || an.cream, made: true }, styles: x.styles?.length ? x.styles : ['lettering'] }));
      setBig(toDataURL(el, 1024, 0.9));
      toast('이 사진으로 찾을게요. 아래 버튼을 누르면 가게가 나와요');
    } catch { toast('사진을 읽지 못했어요'); }
  };
  const apply = () => {
    const next = { ...f, text: f.text.trim(), q: '', at: Date.now(), src: 'ai' };
    setState((s) => ({ ...s, find: findCount(next) || next.text ? next : null, ...(place ? { loc: { ...place, src: 'find' }, radius: Math.min(s.radius, 3) } : {}) }));
    onClose();
    toast(count ? `조건에 맞는 가게 ${count}곳을 찾았어요` : near ? `딱 맞는 곳은 없지만 비슷한 가게 ${near}곳을 보여 드려요` : '맞는 가게가 없어요. 조건을 줄여 보세요');
  };
  const reset = () => { setF(EMPTY_FIND); setPlace(null); setAiNote(''); setBig(null); };
  const ph = f.photo;
  const studioOpts = { design: ph?.design || (f.styles.includes('character') ? 'character' : f.styles.includes('flower') ? 'flower' : 'simple'), shape: ph?.shape || 'round', cream: ph?.cream || 'white' };
  return (
    <Sheet open={open} onClose={onClose} title="케이크 가게 찾기" height="92%"
      footer={<div className="btns"><button className="btn line" style={{ flex: 0.6 }} onClick={reset}>초기화</button><button className="btn pri" style={{ flex: 2 }} onClick={apply}>{count ? `가게 ${count}곳 보기` : near ? `비슷한 가게 ${near}곳 보기` : '맞는 가게가 없어요'}</button></div>}>
      <div className="lbl">말로 찾기 {st.settings.claudeKey ? <span className="tag dark">AI</span> : <span className="tag mute">자동 해석</span>}</div>
      <div className="row" style={{ alignItems: 'stretch' }}>
        <input className="inp grow" value={f.text} onChange={(e) => onText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (st.settings.claudeKey ? askAI() : apply())} placeholder="예) 영통 근처 4만원대 캐릭터 케이크" />
        {st.settings.claudeKey && <button className="btn dark sm" style={{ minHeight: 48 }} onClick={askAI} disabled={busy === 'ai'}>{busy === 'ai' ? '…' : 'AI 해석'}</button>}
      </div>
      <div className="chips" style={{ marginTop: 8 }}>{EXAMPLES.map((e) => <button key={e} className="chip sm" onClick={() => onText(e)}>{e}</button>)}</div>
      {(place || aiNote) && <div className="note pink" style={{ marginTop: 8 }}>{place && <><b>{place.label}</b> 근처 3km에서 찾을게요. </>}{aiNote}</div>}

      <div className="lbl" style={{ marginTop: 22 }} ref={photoRef}>사진으로 찾기 <span className="xs muted">AI 실사 사진 · 그림판</span></div>
      {busy === 'photo' ? <Loading text={st.settings.claudeKey ? 'AI가 사진을 보고 있어요…' : '사진의 색과 스타일을 보는 중…'} /> : ph ? (<>
        <div className="photo-q">
          <img src={ph.thumb} alt="" />
          <div className="grow">
            <div className="b small">{ph.made ? 'AI·그림판 사진으로 찾아요' : ph.ai ? 'AI가 사진을 분석했어요' : '사진을 분석했어요'} <span className="xs muted">아래 조건이 채워졌어요</span></div>
            <div className="row" style={{ marginTop: 4, gap: 4 }}>{(ph.palette || []).slice(0, 4).map((p, i) => <i key={i} title={p.name} style={{ width: 18, height: 18, borderRadius: 6, background: p.hex, border: '1px solid #0001' }} />)}<span className="xs muted">{optName(DESIGNS, ph.design)} · {optName(SHAPES, ph.shape)}</span></div>
          </div>
          <button className="btn xs ghost" onClick={() => { set({ photo: null }); setBig(null); }}>빼기</button>
        </div>
        <div className="ai-pick">
          <button className="btn sec sm" onClick={() => setStudio(true)}><Icon n="sparkle" size="sm" />AI 실사 사진 만들기</button>
          <button className="btn line sm" onClick={() => setSketch(true)}><Icon n="pen" size="sm" />그림판으로 고치기</button>
        </div>
      </>) : (
        <>
          <div className="btns"><PhotoPick onPick={onPick} className="btn sec"><Icon n="image" size="sm" /> 앨범에서 고르기</PhotoPick><PhotoPick onPick={onPick} capture className="btn line"><Icon n="camera" size="sm" /> 사진 찍기</PhotoPick></div>
          <div className="xs muted" style={{ margin: '10px 0 6px' }}>사진이 없으면 예시로 해 보세요</div>
          <div className="opts c3">{SAMPLES.map((s) => <button key={s.label} className="opt" onClick={() => trySample(s)}><div className="thumb"><CakeView o={s.o} /></div><small>{s.label}</small></button>)}</div>
          <button className="btn ghost block sm" style={{ marginTop: 8 }} onClick={() => setStudio(true)}><Icon n="sparkle" size="sm" />사진 없이 AI 실사 사진 만들기</button>
        </>
      )}

      <div className="lbl" style={{ marginTop: 22 }}>케이크 종류 <span className="xs muted">여러 개 가능</span></div>
      <div className="chips wrap">{STYLES.filter((s) => s.id !== 'custom').map((s) => <button key={s.id} className={`chip ${f.styles.includes(s.id) ? 'on' : ''}`} onClick={() => toggleStyle(s.id)}>{s.name}</button>)}</div>
      <div className="lbl" style={{ marginTop: 20 }}>예산 <span className="xs muted">1호(2~4인) 기준</span></div>
      <div className="chips wrap">{BUDGETS.map((b) => { const on = f.budget && f.budget[0] === b.r[0] && f.budget[1] === b.r[1]; return <button key={b.id} className={`chip ${on ? 'on' : ''}`} onClick={() => set({ budget: on ? null : b.r })}>{b.name}</button>; })}
        {f.budget && !BUDGETS.some((b) => b.r[0] === f.budget[0] && b.r[1] === f.budget[1]) && <button className="chip on" onClick={() => set({ budget: null })}>{budgetName(f.budget)} <Icon n="close" /></button>}</div>
      <div className="lbl" style={{ marginTop: 20 }}>지역</div>
      <div className="chips wrap"><button className={`chip ${!f.gu ? 'on' : ''}`} onClick={() => set({ gu: null })}>내 주변 ({(place || st.loc).label})</button>{GUS.map((g) => <button key={g} className={`chip ${f.gu === g ? 'on' : ''}`} onClick={() => { set({ gu: g }); setPlace(null); }}>{g}</button>)}</div>
      <div className="card" style={{ padding: '0 14px', marginTop: 20 }}>
        <div className="list-row"><div className="grow"><div className="t">당일 주문 되는 곳만</div></div><Toggle on={f.sameDay} onChange={(v) => set({ sameDay: v })} label="당일" /></div>
        <div className="list-row"><div className="grow"><div className="t">앱으로 바로 주문되는 곳만</div><div className="s">에이크 입점 가게</div></div><Toggle on={f.appOnly} onChange={(v) => set({ appOnly: v })} label="앱 주문" /></div>
      </div>
      <AIStudio open={studio} onClose={() => setStudio(false)} input={big || ph?.thumb || null} opts={studioOpts} onUse={usePhoto} useLabel="이 사진으로 가게 찾기" />
      {sketch && (big || ph?.thumb) && <Portal><Sketch src={big || ph.thumb} onClose={() => setSketch(false)} onSave={(out) => { saveEdited(out, { opts: studioOpts }); usePhoto(out); }} /></Portal>}
    </Sheet>
  );
}