// 관심: 가게 사진(팀이 모은 수원 가게 실제 케이크 사진, 가게별로) + 케이크 사진 둘러보기(핀터레스트처럼) + 찜한 가게
// 사진은 공개 AI 모델(FLUX.1 schnell)로 만든 '예시 사진'이다 — 실제 가게 작품이 아니라서 화면에 항상 표시한다.
// 입점 가게 사장님이 올린 작품 사진은 '가게 작품'으로 함께 보여 준다.
import { useEffect, useMemo, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import { CustomerTabBar } from '../../components/TabBar.jsx';
import { Empty, toast, PhotoPick, Header, Loading, Portal, useBackClose } from '../../components/ui.jsx';
import AIStudio from '../../components/AIStudio.jsx';
import Sketch from '../../components/Sketch.jsx';
import { removePic, saveEdited } from '../../lib/imagegen.js';
import { useApp, setState } from '../../lib/state.js';
import { nav, back, queryOf, navAfterSheet } from '../../lib/router.js';
import { getStores, rankStores, distKm, fmtKm } from '../../lib/stores.js';
import { SHOP_PHOTO_GROUPS, photoName } from '../../lib/shopPhotos.js';
import { PICKS } from '../../data/picks.js';
import { loadImage, toDataURL, analyzeImage, loadDataURL } from '../../lib/image.js';
import { shareText, ago, hash } from '../../lib/util.js';
import { SHAPES, creamOf, optName, sizeOf, designOf } from '../../data/catalog.js';
import { StoreCard, usePlaces } from './Home.jsx';
import G from '../../data/gallery.json';

const BASE = import.meta.env.BASE_URL;
export const GALLERY = G.items || [];
export const imgS = (id) => `${BASE}gallery/s/${id}.webp`;
export const imgL = (id) => `${BASE}gallery/${id}.webp`;

// 비슷한 말 묶음 (검색어 → 태그)
const SYN = [
  ['생일', '생신', '버스데이', 'birthday', '파티'], ['연인', '커플', '남친', '여친', '남자친구', '여자친구', '사랑', '기념일', '주년', '100일', '발렌타인'],
  ['어버이날', '부모님', '엄마', '아빠', '효도', '환갑', '칠순', '카네이션'], ['핑크', '분홍', '베이비핑크', '진핑크'], ['하늘색', '하늘', '블루', '파랑', '스카이'],
  ['노랑', '노란', '옐로', '버터'], ['보라', '라벤더', '퍼플'], ['민트', '초록', '그린'], ['화이트', '흰', '하얀', '흰색'], ['초코', '초콜릿', '브라운', '코코아', '갈색'],
  ['빨강', '빨간', '레드'], ['곰돌이', '곰', '테디'], ['강아지', '댕댕이', '반려견', '멍멍이'], ['고양이', '냥이', '반려묘'], ['토끼', '토깽이'],
  ['플라워', '꽃', '장미', '수국', '데이지', '카네이션', '앙금', '생화'], ['레터링', '문구', '글씨', '글자'], ['캐릭터', '그림', '도안', '귀여운', '낙서'],
  ['빈티지', '프릴', '램버스', '레트로'], ['미니', '작은', '1인', '소형'], ['떡케이크', '떡', '설기', '전통'], ['하트', '러블리'], ['합격', '졸업', '입학', '축하', '승진', '취업'],
  ['감사', '스승의날', '선생님', '고마워'], ['돌', '첫돌', '아기', '백일'], ['응원', '퇴사', '고생', '위로', '수고'], ['드립', '초코드립'], ['딸기', '생딸기'], ['웨딩', '결혼', '2단'],
];
const norm = (t) => String(t || '').toLowerCase().replace(/\s+/g, '');
const groupOf = (w) => SYN.find((g) => g.some((x) => norm(x) === w || (w.length >= 2 && norm(x).includes(w))));
const COLOR_WORD = { 핑크: ['pink', 'hotpink'], 하늘색: ['sky'], 노랑: ['butter'], 보라: ['lavender'], 민트: ['mint'], 화이트: ['white'], 초코: ['cocoa'], 빨강: ['hotpink'] };
function textScore(it, q) {
  const words = q.split(/\s+/).map(norm).filter(Boolean);
  if (!words.length) return 0;
  const hay = norm(it.t + ' ' + it.tags.join(' '));
  let sc = 0;
  for (const w of words) {
    let hit = hay.includes(w) ? 2 : 0;
    const g = groupOf(w);
    if (!hit && g && g.some((x) => hay.includes(norm(x)))) hit = 1.5;
    if (g && COLOR_WORD[g[0]]?.includes(it.cr)) hit += 1;
    if (!hit) return 0; // 모든 낱말이 맞아야
    sc += hit;
  }
  return sc;
}
function photoScore(it, an) {
  let s = 0;
  if (it.d === an.design) s += 3;
  if (it.cr === an.cream) s += 2.5;
  if ((an.palette || []).some((p) => p.cream === it.cr)) s += 1;
  if ((an.styles || []).some((x) => it.st.includes(x) && x !== 'lettering')) s += 1.5;
  return s;
}
const simScore = (a, b) => (a.d === b.d ? 3 : 0) + (a.cr === b.cr ? 2 : 0) + (a.sh === b.sh ? 1 : 0) + a.tags.filter((t) => b.tags.includes(t)).length * 0.8 + (a.st.some((x) => b.st.includes(x) && x !== 'lettering') ? 1 : 0);
const CATS = [
  { id: 'all', name: '전체' }, { id: 'liked', name: '저장한 케이크' }, { id: 'mine', name: '내가 만든 사진' },
  { id: '레터링', name: '레터링' }, { id: '빈티지', name: '빈티지' }, { id: '캐릭터', name: '그림·캐릭터' }, { id: '플라워', name: '플라워' },
  { id: '하트', name: '하트' }, { id: '미니', name: '미니' }, { id: '떡케이크', name: '떡케이크' }, { id: '초코', name: '초코' },
];
const inCat = (it, c) => it.tags.includes(c) || (c === '플라워' && it.st.includes('flower')) || (c === '캐릭터' && it.st.includes('character')) || (c === '하트' && it.sh === 'heart') || (c === '미니' && it.sz === 'mini');

const useLike = () => {
  const st = useApp();
  const likes = st.likes || [];
  const toggle = (id) => {
    const on = likes.includes(id);
    setState((s) => ({ ...s, likes: on ? (s.likes || []).filter((x) => x !== id) : [id, ...(s.likes || [])] }));
    if (!on) toast('관심 케이크에 담았어요');
  };
  return [likes, toggle];
};

function Tile({ it, liked, onLike, sc, maker }) {
  return (
    <div className="mi" role="button" tabIndex={0} onClick={() => nav(`/c/cake/${it.id}`)}>
      <div className="im" style={{ aspectRatio: `${it.w} / ${it.h}`, background: it.c || 'var(--cream2)' }}>
        <img src={imgS(it.id)} alt={it.t} loading="lazy" decoding="async" />
        <span className="ai">예시</span>
        {sc != null && <span className="sc">{sc}%</span>}
        <button className={`heart ${liked ? 'on' : ''}`} onClick={(e) => { e.stopPropagation(); onLike(); }} aria-label={liked ? '관심 빼기' : '관심 담기'}><Icon n="heart" /></button>
      </div>
      <div className="t">{it.t}</div>
      {maker && <button className="mk" onClick={(e) => { e.stopPropagation(); nav(`/store/${maker.id}`); }}>{maker.name} ›</button>}
    </div>
  );
}
// 사진마다 '이런 케이크 만드는 가게' 한 곳: 같은 스타일을 만드는 가까운 가게 중에서 골고루
function useMakers(st) {
  return useMemo(() => {
    const near = getStores(st).filter((s) => !s.hidden && s.lat != null).sort((a, b) => distKm(st.loc, a) - distKm(st.loc, b));
    const out = {};
    for (const it of GALLERY) {
      const want = (it.st || []).filter((x) => x !== 'lettering');
      const cand = near.filter((s) => (want.length ? want.some((w) => s.styles?.includes(w)) : s.styles?.includes('lettering'))).slice(0, 6);
      if (cand.length) out[it.id] = cand[hash(it.id) % cand.length];
    }
    return out;
  }, [st.loc.lat, st.loc.lng, st.shop, st.partners]); // eslint-disable-line react-hooks/exhaustive-deps
}
function WorkTile({ w }) {
  return (
    <div className="mi" role="button" tabIndex={0} onClick={() => nav(`/store/${w.store.id}`)}>
      <div className="im" style={{ aspectRatio: w.h || '1' }}><img src={w.src} alt={w.t} loading="lazy" /><span className="own">{w.sample ? '예시 사진' : '가게 작품'}</span></div>
      <div className="t">{w.t}</div>
      <button className="mk" onClick={(e) => { e.stopPropagation(); nav(`/store/${w.store.id}`); }}>{w.store.name} ›</button>
    </div>
  );
}

export function Interest({ path }) {
  const st = useApp();
  const q0 = queryOf(path).get('q') || '';
  const cat0 = queryOf(path).get('cat') || 'all';
  const [tab, setTab] = useState(() => { const qq = queryOf(path); return qq.get('tab') === 'store' ? 'store' : qq.get('q') || qq.get('cat') || qq.get('tab') === 'cake' ? 'cake' : 'shop'; });
  const n = st.favs.length;
  return (
    <div className="screen fade">
      <div className="apphdr"><h1>관심</h1></div>
      <div className="utabs">
        <button className={tab === 'shop' ? 'on' : ''} onClick={() => setTab('shop')}>가게 사진</button>
        <button className={tab === 'cake' ? 'on' : ''} onClick={() => setTab('cake')}>케이크 둘러보기</button>
        <button className={tab === 'store' ? 'on' : ''} onClick={() => setTab('store')}>찜한 가게{n > 0 && <small>{n}</small>}</button>
      </div>
      {tab === 'shop' ? <ShopFeed /> : tab === 'cake' ? <CakeFeed q0={q0} cat0={cat0} /> : <SavedStores />}
      <CustomerTabBar current="/c/saved" />
    </div>
  );
}

function CakeFeed({ q0, cat0 = 'all' }) {
  const st = useApp();
  const [likes, toggleLike] = useLike();
  const [q, setQ] = useState(q0);
  const [cat, setCat] = useState(cat0);
  const [studio, setStudio] = useState(false);
  const [photo, setPhoto] = useState(null); // { thumb, an }
  const [busy, setBusy] = useState(false);
  const qq = q.trim();
  usePlaces(); // 카카오 가게 목록이 도착하면 가게 이름도 다시
  const makers = useMakers(st);
  // 입점 가게 사장님이 올린 작품 사진 (진짜 사진)
  const works = useMemo(() => getStores(st).filter((s) => s.kind === 'partner').flatMap((s) => (s.portfolio || []).filter((p) => p.src).map((p, k) => ({ id: `${s.id}-${k}`, src: p.src, t: p.caption || `${s.name} 작품`, store: s, sample: !!p.sample, h: ['1 / 1.2', '1 / 1.3', '1 / 1', '1 / 1.05'][k % 4] }))), [st.shop, st.partners]);
  const list = useMemo(() => {
    let arr = GALLERY.map((it) => ({ it, sc: 0 }));
    if (cat === 'liked') arr = arr.filter((x) => likes.includes(x.it.id)).sort((a, b) => likes.indexOf(a.it.id) - likes.indexOf(b.it.id));
    else if (cat !== 'all') arr = arr.filter((x) => inCat(x.it, cat));
    if (photo) { arr = arr.map((x) => ({ ...x, sc: photoScore(x.it, photo.an) })).sort((a, b) => b.sc - a.sc); }
    else if (qq) arr = arr.map((x) => ({ ...x, sc: textScore(x.it, qq) })).filter((x) => x.sc > 0).sort((a, b) => b.sc - a.sc);
    return arr;
  }, [qq, cat, photo, likes.join()]); // eslint-disable-line react-hooks/exhaustive-deps
  const max = Math.max(1, ...list.map((x) => x.sc));
  // 관련 검색어: 위쪽 결과에 많이 나오는 태그
  const related = useMemo(() => {
    if (!qq && !photo) return [];
    const cnt = {};
    list.slice(0, 12).forEach(({ it }) => it.tags.forEach((t) => { if (!norm(qq).includes(norm(t))) cnt[t] = (cnt[t] || 0) + 1; }));
    return Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t]) => (qq ? `${qq} ${t}` : t));
  }, [list, qq, photo]);
  const onPhoto = async (file) => {
    setBusy(true);
    try { const el = await loadImage(file); setPhoto({ thumb: toDataURL(el, 240, 0.8, true), an: analyzeImage(el) }); setQ(''); setCat('all'); }
    catch (e) { toast(e.message || '사진을 읽지 못했어요'); }
    setBusy(false);
  };
  const showWorks = !qq && !photo && (cat === 'all') && works.length > 0;
  return (
    <div className="scroll with-tab">
      <div className="feedtop">
        <div className="qbox">
          <Icon n="search" size="sm" />
          <input value={q} onChange={(e) => { setQ(e.target.value); setPhoto(null); }} placeholder="곰돌이, 하트, 어버이날, 핑크…" enterKeyHint="search" aria-label="케이크 검색" />
          {q && <button className="x" onClick={() => setQ('')} aria-label="지우기"><Icon n="close" size="sm" /></button>}
          <PhotoPick onPick={onPhoto} className="cam"><Icon n="camera" /></PhotoPick>
        </div>
        <div className="chips">{CATS.map((c) => <button key={c.id} className={`chip sm ${cat === c.id ? 'on' : ''}`} onClick={() => setCat(cat === c.id && c.id !== 'all' ? 'all' : c.id)}>{c.name}{c.id === 'liked' && likes.length > 0 ? ` ${likes.length}` : ''}{c.id === 'mine' && (st.aiPics || []).length + (st.aiJobs || []).length > 0 ? ` ${(st.aiPics || []).length + (st.aiJobs || []).length}` : ''}</button>)}</div>
      </div>
      {cat === 'mine' ? <MyPics onNew={() => setStudio(true)} /> : (<>
      {busy && <Loading text="사진을 보는 중…" />}
      {photo && (
        <div className="photo-q" style={{ margin: '0 16px 12px' }}>
          <img src={photo.thumb} alt="" />
          <div className="grow"><div className="b small">내 사진과 비슷한 케이크</div><div className="xs muted">색 · 장식이 가까운 순서예요</div></div>
          <button className="btn xs ghost" onClick={() => setPhoto(null)}>빼기</button>
        </div>
      )}
      {related.length > 0 && <div className="related">{related.map((t) => <button key={t} onClick={() => { setQ(t); setPhoto(null); }}><Icon n="search" />{t}</button>)}</div>}
      <div className="feedinfo note2">{showWorks ? <>입점된 가게들의 포트폴리오 사진이에요! 사진을 누르면 가게 페이지로 갈 수 있어요. 그 아래 ‘예시’ 사진은 AI로 만든 사진이에요.</> : <><Icon n="info" />AI로 만든 예시 사진이에요. 사진 아래 가게 이름을 누르면 이런 케이크를 만드는 가게로 가요.</>}</div>
      {showWorks && (<>
        <div className="sec-t" style={{ margin: '4px 16px 10px' }}><h3 style={{ fontSize: 15 }}>입점 가게 작품</h3></div>
        <div className="masonry">{works.map((w) => <WorkTile key={w.id} w={w} />)}</div>
      </>)}
      {list.length === 0 ? (
        <Empty icon={cat === 'liked' ? 'heart' : 'search'}>{cat === 'liked' ? <>아직 저장한 케이크가 없어요.<br />마음에 드는 사진의 하트를 눌러 보세요.</> : <>‘{qq}’와 비슷한 사진이 없어요.<br />다른 말로 찾아보세요.</>}</Empty>
      ) : (
        <div className="masonry">{list.map(({ it, sc }) => <Tile key={it.id} it={it} liked={likes.includes(it.id)} onLike={() => toggleLike(it.id)} sc={photo ? Math.round(45 + 55 * sc / max) : null} maker={makers[it.id]} />)}</div>
      )}
      <div className="sec-t" style={{ margin: '12px 16px 10px' }}><h3 style={{ fontSize: 15 }}>더 많은 사진 보기</h3></div>
      <div className="outlinks">
        <a href={`https://www.pinterest.co.kr/search/pins/?q=${encodeURIComponent(`${qq || '레터링'} 케이크`)}`} target="_blank" rel="noreferrer"><Icon n="ext" size="sm" />핀터레스트</a>
        <a href={`https://www.instagram.com/explore/tags/${encodeURIComponent(`${(qq || '레터링').replace(/\s/g, '')}케이크`)}/`} target="_blank" rel="noreferrer"><Icon n="insta" size="sm" />인스타그램</a>
      </div>
      <div className="xs muted" style={{ padding: '8px 16px 0' }}>바깥 사이트는 링크로만 열어요. 다른 사람 사진을 앱에 옮겨 오지 않아요.</div>
      </>)}
      <AIStudio open={studio} onClose={() => setStudio(false)} onUse={(src) => findWithPhoto(src, {})} useLabel="이 사진으로 가게 찾기" />
    </div>
  );
}

// ── 가게 사진: 가게마다 묶어서 핀터레스트처럼 (가까운 가게부터) ──
const GU4 = ['전체', '영통구', '팔달구', '권선구', '장안구'];
function ShopFeed() {
  const st = useApp();
  usePlaces(); // 카카오에서 가게 위치가 오면 거리순으로 다시
  const [q, setQ] = useState('');
  const [gu, setGu] = useState('전체');
  const [n, setN] = useState(8);
  const [view, setView] = useState(null); // { g, i }
  const stores = getStores(st);
  const groups = useMemo(() => {
    const byNo = new Map(stores.filter((s) => s.no != null && !s.hidden).map((s) => [s.no, s]));
    const qq = norm(q);
    return SHOP_PHOTO_GROUPS.map((g) => {
      const s = byNo.get(g.no) || null;
      return { ...g, s, gu: s?.gu || PICKS.find((p) => p.no === g.no)?.gu || '', d: s?.lat != null ? distKm(st.loc, s) : 999 };
    }).filter((g) => (gu === '전체' || g.gu === gu) && (!qq || norm(g.name).includes(qq))).sort((a, b) => a.d - b.d);
  }, [stores.length, gu, q, st.loc.lat, st.loc.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = groups.reduce((a, g) => a + g.photos.length, 0);
  return (
    <div className="scroll with-tab">
      <div className="feedtop">
        <div className="qbox">
          <Icon n="search" size="sm" />
          <input value={q} onChange={(e) => { setQ(e.target.value); setN(8); }} placeholder="가게 이름으로 찾기" aria-label="가게 이름으로 찾기" />
          {q && <button className="x" onClick={() => setQ('')} aria-label="지우기"><Icon n="close" size="sm" /></button>}
        </div>
        <div className="chips">{GU4.map((g) => <button key={g} className={`chip sm ${gu === g ? 'on' : ''}`} onClick={() => { setGu(g); setN(8); }}>{g}</button>)}</div>
      </div>
      <div className="feedinfo note2"><Icon n="info" />수원 가게 {groups.length}곳의 실제 케이크 사진 {total}장이에요. 가까운 가게부터 보여 주고, 사진을 누르면 크게 보고 바로 주문서를 쓸 수 있어요.</div>
      {groups.length === 0 && <Empty icon="search">찾는 가게 사진이 없어요.</Empty>}
      {groups.slice(0, n).map((g) => (
        <div key={g.no} className="shopgrp">
          <div className="sg-h">
            <div className="grow" style={{ minWidth: 0 }}><b>{g.name}</b><small>{[g.gu, g.d < 999 ? fmtKm(g.d) : null, `사진 ${g.photos.length}장`].filter(Boolean).join(' · ')}</small></div>
            {g.s && <button className="btn xs line" onClick={() => nav(`/store/${g.s.id}`)}>가게 보기 ›</button>}
          </div>
          <div className="masonry">
            {g.photos.map((p, i) => (
              <div key={p.n} className="mi" role="button" tabIndex={0} onClick={() => setView({ g, i })}>
                <div className="im" style={{ aspectRatio: `${p.w} / ${p.h}` }}><img src={p.thumb} alt={`${g.name} ${photoName(p)}`} loading="lazy" decoding="async" />{p.main && <span className="own">대표</span>}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {groups.length > n && <div style={{ padding: '4px 16px 20px' }}><button className="btn line block" onClick={() => setN(n + 8)}>가게 더 보기 · {groups.length - n}곳 남음</button></div>}
      <div className="xs muted" style={{ padding: '0 16px 16px' }}>사진은 카카오맵 · 네이버 블로그에 올라온 사진이에요. 크게 보기에서 출처로 갈 수 있어요.</div>
      {view && <ShopPhotoViewer group={view.g} index={view.i} onClose={() => setView(null)} />}
    </div>
  );
}
// 가게 사진 크게 보기: 옆으로 넘기기 · 출처 · 가게 보기 · 이 케이크로 주문서 쓰기
function ShopPhotoViewer({ group, index, onClose }) {
  const [i, setI] = useState(index);
  const close = useBackClose(onClose);
  const x0 = useMemo(() => ({ v: null }), []);
  const len = group.photos.length;
  const p = group.photos[i];
  const go = (path) => { navAfterSheet(path, {}); close(); }; // 창을 닫는 '뒤로가기'가 끝난 뒤 이동
  return (
    <Portal>
      <div className="spv" role="dialog" aria-label={`${group.name} 사진`}>
        <div className="spv-top"><button onClick={close} aria-label="닫기"><Icon n="close" /></button><b className="grow">{group.name}</b><span>{i + 1} / {len}</span></div>
        <div className="spv-img" onPointerDown={(e) => { x0.v = e.clientX; }} onPointerUp={(e) => { if (x0.v == null) return; const dx = e.clientX - x0.v; x0.v = null; if (dx < -40 && i < len - 1) setI(i + 1); if (dx > 40 && i > 0) setI(i - 1); }}>
          <img src={p.url} alt={photoName(p)} draggable={false} />
          {i > 0 && <button className="nav l" onClick={() => setI(i - 1)} aria-label="이전 사진">‹</button>}
          {i < len - 1 && <button className="nav r" onClick={() => setI(i + 1)} aria-label="다음 사진">›</button>}
        </div>
        <div className="spv-info"><b>{photoName(p)}</b><a href={p.src} target="_blank" rel="noreferrer">사진 출처: {p.credit} ›</a></div>
        <div className="spv-btns">
          {group.s ? (<>
            <button className="btn line" onClick={() => go(`/store/${group.s.id}`)}>가게 보기</button>
            <button className="btn pri" style={{ flex: 2 }} onClick={() => go(`/order/${group.s.id}?pick=sp${p.n}`)}>이 케이크로 주문서 쓰기</button>
          </>) : <div className="xs muted center" style={{ width: '100%' }}>이 가게는 지도에서 아직 찾지 못했어요.</div>}
        </div>
      </div>
    </Portal>
  );
}

// 내가 만든 사진 (AI 실사 · 그림판) — 만드는 중인 것도 함께
function MyPics({ onNew }) {
  const st = useApp();
  const pics = st.aiPics || [], jobs = st.aiJobs || [];
  return (<>
    <div className="feedinfo"><Icon n="info" />AI 실사·그림판으로 만든 사진이에요. 이 기기에만 저장돼요(최근 8장).</div>
    <div style={{ padding: '0 16px 14px' }}><button className="btn sec block sm" onClick={onNew}><Icon n="sparkle" size="sm" />새 AI 실사 사진 만들기</button></div>
    {pics.length + jobs.length === 0 ? <Empty icon="image">아직 만든 사진이 없어요.<br />지도의 ‘AI로 케이크 가게 찾기’에서 사진을 넣거나<br />위 버튼으로 만들어 보세요.</Empty> : (
      <div className="masonry">
        {jobs.map((j) => <div key={j.id} className="mi"><div className="im mwait"><div className="loader" /><span>만드는 중<br />{j.queue != null ? `앞에 ${j.queue}명 · 약 ${Math.max(1, Math.round((j.wait || 60) / 60))}분` : '줄 서는 중'}</span></div><div className="t">AI 실사 사진</div></div>)}
        {pics.map((p) => <div key={p.id} className="mi" role="button" tabIndex={0} onClick={() => nav(`/c/cake/${p.id}`)}><div className="im"><img src={p.src} alt="" /><span className="ai">{p.edited ? '그림판' : 'AI'}</span></div><div className="t">{p.edited ? '그림판으로 고친 사진' : 'AI 실사 사진'}</div><div className="s">{ago(new Date(p.at).toISOString())}</div></div>)}
      </div>
    )}
  </>);
}

// 사진 한 장으로 가게 찾기: '사진으로 찾기' 조건으로 넣고 지도로 (가게를 고르면 주문서에도 미리 채워져요)
export async function findWithPhoto(src, o = {}) {
  try {
    const el = await loadDataURL(src);
    const an = analyzeImage(el);
    const design = o.design || an.design;
    const styles = (o.styles?.length ? o.styles : design === 'character' ? ['character'] : design === 'flower' ? ['flower'] : design === 'photo' ? ['photo'] : ['lettering']).filter((x) => x !== 'custom');
    setState((s) => ({ ...s, find: { text: '', q: '', styles, budget: null, gu: null, sameDay: false, appOnly: false, src: 'ai', photo: { thumb: toDataURL(el, 360, 0.8, true), design, shape: o.shape || 'round', cream: o.cream || an.cream, palette: an.palette, made: true }, at: Date.now() } }));
    navAfterSheet('/c', {});
    toast('이 사진과 비슷한 케이크를 만드는 가게를 찾았어요');
  } catch { toast('사진을 읽지 못했어요'); }
}

function SavedStores() {
  const st = useApp();
  const stores = getStores(st);
  const rows = rankStores(stores.filter((s) => st.favs.includes(s.id)), { loc: st.loc, radius: 9999, sort: 'near' });
  return (
    <div className="scroll pad with-tab" style={{ paddingTop: 4 }}>
      {rows.length === 0 && <Empty icon="heart">찜한 가게가 없어요.<br />가게 카드의 하트를 눌러 모아 보세요.<div style={{ marginTop: 14 }}><button className="btn sec sm" onClick={() => nav('/c', { replace: true })}>지도에서 가게 찾기</button></div></Empty>}
      {rows.map((r) => <StoreCard key={r.s.id} r={r} fav onFav={() => setState((x) => ({ ...x, favs: x.favs.filter((i) => i !== r.s.id) }))} onClick={() => nav(`/store/${r.s.id}`)} />)}
    </div>
  );
}

// 케이크 사진 자세히: 큰 사진 · 그림판으로 고치기 · AI로 바꿔 보기 · 비슷한 케이크 · 이 케이크를 만드는 가게
// 관심 탭 예시 사진(id)과 내가 만든 사진(my-…) 둘 다 연다.
export function CakeDetail({ params }) {
  const st = useApp();
  const [likes, toggleLike] = useLike();
  const [going, setGoing] = useState(false);
  const [studio, setStudio] = useState(false);
  const [sketch, setSketch] = useState(false);
  const mine = params.id.startsWith('my-') ? (st.aiPics || []).find((p) => p.id === params.id) : null;
  const it = mine ? null : GALLERY.find((x) => x.id === params.id);
  useEffect(() => { document.querySelector('.cdet .scroll')?.scrollTo(0, 0); }, [params.id]);
  if (!it && !mine) return <div className="screen"><Header title="케이크" fallback="/c/saved" /><Empty icon="image">사진을 찾을 수 없어요.<br />내가 만든 사진은 최근 8장만 이 기기에 남아요.</Empty></div>;
  // 내가 만든 사진은 옵션(모양·색·디자인)으로 예시 사진 정보처럼 맞춘다
  const o = mine ? { d: mine.opts?.design || 'simple', sh: mine.opts?.shape || 'round', cr: mine.opts?.cream || 'white', st: mine.opts?.styles || [], tags: [], sz: mine.opts?.size || 'h1' } : it;
  const src = mine ? mine.src : imgL(it.id);
  const liked = it && likes.includes(it.id);
  const similar = GALLERY.filter((x) => x.id !== it?.id).map((x) => ({ it: x, sc: simScore({ ...o, tags: o.tags || [] }, x) })).sort((a, b) => b.sc - a.sc).slice(0, 14);
  const styles = (o.st || []).filter((x) => x !== 'custom');
  const ranked = rankStores(getStores(st), { loc: st.loc, radius: st.radius, find: styles.length ? { styles } : null });
  const near = (ranked.filter((r) => !r.partial).length ? ranked.filter((r) => !r.partial) : ranked).slice(0, 3);
  const cream = creamOf(o.cr);
  const optsFor = { design: o.d, shape: o.sh, cream: o.cr, size: o.sz, styles };
  // 이 사진을 '사진으로 찾기' 조건으로 넣는다 → 가게를 고르면 주문서에 모양·색·장식이 미리 채워짐
  const findStores = async () => { setGoing(true); await findWithPhoto(mine ? mine.src : imgS(it.id), optsFor); setGoing(false); };
  const share = async () => { if (mine) { toast('내가 만든 사진은 이 기기에만 있어요'); return; } const r = await shareText({ title: it.t, text: `${it.t} — 에이크 관심 케이크`, url: `${location.href.split('#')[0]}#/c/cake/${it.id}` }); if (r === 'copied') toast('링크를 복사했어요'); };
  const del = () => { if (confirm('이 사진을 지울까요?')) { removePic(mine.id); back('/c/saved?cat=mine'); toast('사진을 지웠어요'); } };
  const label = mine ? (mine.edited ? '그림판으로 고친 사진' : `AI 실사 사진 · ${{ gemini: '구글 제미나이', flux: '무료 AI (FLUX)', horde: '무료 대기열 AI' }[mine.engine] || 'AI'}`) : 'AI 예시 사진 · 실제 가게 작품이 아니에요';
  return (
    <div className="screen cdet">
      <div className="scroll">
        <div className="cimg" style={it ? { aspectRatio: `${it.w} / ${it.h}`, background: it.c } : undefined}>
          <img src={src} alt={it ? it.t : '내가 만든 사진'} />
          <span className="ai">{label}</span>
          <div className="floatbar">
            <button onClick={() => back(mine ? '/c/saved?cat=mine' : '/c/saved')} aria-label="뒤로"><Icon n="back" /></button>
            <div className="row">
              {mine ? <button onClick={del} aria-label="지우기"><Icon n="trash" /></button> : <button onClick={share} aria-label="공유"><Icon n="share" /></button>}
              {it && <button className={liked ? 'on' : ''} onClick={() => toggleLike(it.id)} aria-label="관심"><Icon n="heart" fill={liked} /></button>}
            </div>
          </div>
        </div>
        <div className="chead">
          <h2>{it ? it.t : mine.edited ? '그림판으로 고친 사진' : 'AI 실사 사진'}</h2>
          <div className="spec"><span><i style={{ background: cream.hex }} />{cream.name}</span><span>{optName(SHAPES, o.sh)}</span><span>{designOf(o.d).name}</span>{it && <span>{sizeOf(it.sz).name} 크기</span>}{mine && <span>{ago(new Date(mine.at).toISOString())}</span>}</div>
          {it && <div className="hashes">{it.tags.slice(0, 6).map((t) => <button key={t} onClick={() => nav(`/c/saved?q=${encodeURIComponent(t)}`)}>#{t}</button>)}</div>}
        </div>
        <div className="pad" style={{ paddingTop: 16 }}>
          <button className="btn pri block" onClick={findStores} disabled={going}><Icon n="map" size="sm" />이 케이크 만드는 가게 찾기</button>
          <div className="btns" style={{ marginTop: 8 }}>
            <button className="btn line sm" onClick={() => setSketch(true)}><Icon n="pen" size="sm" />그림판으로 고치기</button>
            <button className="btn line sm" onClick={() => setStudio(true)}><Icon n="sparkle" size="sm" />AI로 바꿔 보기</button>
          </div>
          <div className="xs muted center" style={{ marginTop: 8 }}>가게를 고르면 주문서에 이 디자인이 미리 채워져요. ‘AI로 바꿔 보기’에서 “체리 많이”처럼 바꿀 점을 적어 보세요.</div>
          {near.length > 0 && (<>
            <div className="sec-t"><h3>가까운 가게</h3><span className="more">{styles.length ? '이 스타일을 만드는 곳' : '내 주변'}</span></div>
            <div className="mini-stores">{near.map((r) => <StoreCard key={r.s.id} r={r} fav={st.favs.includes(r.s.id)} onFav={() => setState((x) => ({ ...x, favs: x.favs.includes(r.s.id) ? x.favs.filter((i) => i !== r.s.id) : [...x.favs, r.s.id] }))} onClick={() => nav(`/store/${r.s.id}`)} />)}</div>
          </>)}
          <div className="sec-t"><h3>비슷한 케이크</h3></div>
        </div>
        <div className="masonry">{similar.map(({ it: x }) => <Tile key={x.id} it={x} liked={likes.includes(x.id)} onLike={() => toggleLike(x.id)} />)}</div>
        <div style={{ height: 28 }} />
      </div>
      <AIStudio open={studio} onClose={() => setStudio(false)} input={mine ? mine.src : imgL(it.id)} opts={optsFor} onUse={(s2, p) => (p?.id?.startsWith('my-') ? navAfterSheet(`/c/cake/${p.id}`, {}) : findWithPhoto(s2, optsFor))} useLabel="이 사진 자세히 보기" />
      {sketch && <Portal><Sketch src={src} onClose={() => setSketch(false)} onSave={(out) => { const p = saveEdited(out, { opts: optsFor, from: mine?.id || it?.id }); toast('고친 사진을 저장했어요'); navAfterSheet(`/c/cake/${p.id}`, {}); }} /></Portal>}
    </div>
  );
}