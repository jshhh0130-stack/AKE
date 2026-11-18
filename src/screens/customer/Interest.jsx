// 관심: 케이크 사진 둘러보기(핀터레스트처럼) + 찜한 가게
// 사진은 공개 AI 모델(FLUX.1 schnell)로 만든 '예시 사진'이다 — 실제 가게 작품이 아니라서 화면에 항상 표시한다.
// 입점 가게 사장님이 올린 작품 사진은 '가게 작품'으로 함께 보여 준다.
import { useEffect, useMemo, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import { CustomerTabBar } from '../../components/TabBar.jsx';
import { Empty, toast, PhotoPick, Header, Loading } from '../../components/ui.jsx';
import { useApp, setState } from '../../lib/state.js';
import { nav, back, queryOf } from '../../lib/router.js';
import { getStores, rankStores } from '../../lib/stores.js';
import { loadImage, toDataURL, analyzeImage, loadDataURL } from '../../lib/image.js';
import { shareText } from '../../lib/util.js';
import { SHAPES, creamOf, optName, sizeOf, designOf } from '../../data/catalog.js';
import { StoreCard } from './Home.jsx';
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
  { id: 'all', name: '전체' }, { id: 'liked', name: '저장한 케이크' },
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

function Tile({ it, liked, onLike, sc }) {
  return (
    <div className="mi" role="button" tabIndex={0} onClick={() => nav(`/c/cake/${it.id}`)}>
      <div className="im" style={{ aspectRatio: `${it.w} / ${it.h}`, background: it.c || 'var(--cream2)' }}>
        <img src={imgS(it.id)} alt={it.t} loading="lazy" decoding="async" />
        <span className="ai">예시</span>
        {sc != null && <span className="sc">{sc}%</span>}
        <button className={`heart ${liked ? 'on' : ''}`} onClick={(e) => { e.stopPropagation(); onLike(); }} aria-label={liked ? '관심 빼기' : '관심 담기'}><Icon n="heart" /></button>
      </div>
      <div className="t">{it.t}</div>
    </div>
  );
}
function WorkTile({ w }) {
  return (
    <div className="mi" role="button" tabIndex={0} onClick={() => nav(`/store/${w.store.id}`)}>
      <div className="im" style={{ aspectRatio: '1' }}><img src={w.src} alt={w.t} loading="lazy" /><span className="own">가게 작품</span></div>
      <div className="t">{w.t}</div>
      <div className="s">{w.store.name}</div>
    </div>
  );
}

export function Interest({ path }) {
  const st = useApp();
  const q0 = queryOf(path).get('q') || '';
  const [tab, setTab] = useState(queryOf(path).get('tab') === 'store' ? 'store' : 'cake');
  const n = st.favs.length;
  return (
    <div className="screen fade">
      <div className="apphdr"><h1>관심</h1></div>
      <div className="utabs">
        <button className={tab === 'cake' ? 'on' : ''} onClick={() => setTab('cake')}>케이크 둘러보기</button>
        <button className={tab === 'store' ? 'on' : ''} onClick={() => setTab('store')}>찜한 가게{n > 0 && <small>{n}</small>}</button>
      </div>
      {tab === 'cake' ? <CakeFeed q0={q0} /> : <SavedStores />}
      <CustomerTabBar current="/c/saved" />
    </div>
  );
}

function CakeFeed({ q0 }) {
  const st = useApp();
  const [likes, toggleLike] = useLike();
  const [q, setQ] = useState(q0);
  const [cat, setCat] = useState('all');
  const [photo, setPhoto] = useState(null); // { thumb, an }
  const [busy, setBusy] = useState(false);
  const qq = q.trim();
  // 입점 가게 사장님이 올린 작품 사진 (진짜 사진)
  const works = useMemo(() => getStores(st).filter((s) => s.kind === 'partner').flatMap((s) => (s.portfolio || []).filter((p) => p.src).map((p, k) => ({ id: `${s.id}-${k}`, src: p.src, t: p.caption || `${s.name} 작품`, store: s }))), [st.shop, st.partners]);
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
        <div className="chips">{CATS.map((c) => <button key={c.id} className={`chip sm ${cat === c.id ? 'on' : ''}`} onClick={() => setCat(cat === c.id && c.id !== 'all' ? 'all' : c.id)}>{c.name}{c.id === 'liked' && likes.length > 0 ? ` ${likes.length}` : ''}</button>)}</div>
      </div>
      {busy && <Loading text="사진을 보는 중…" />}
      {photo && (
        <div className="photo-q" style={{ margin: '0 16px 12px' }}>
          <img src={photo.thumb} alt="" />
          <div className="grow"><div className="b small">내 사진과 비슷한 케이크</div><div className="xs muted">색 · 장식이 가까운 순서예요</div></div>
          <button className="btn xs ghost" onClick={() => setPhoto(null)}>빼기</button>
        </div>
      )}
      {related.length > 0 && <div className="related">{related.map((t) => <button key={t} onClick={() => { setQ(t); setPhoto(null); }}><Icon n="search" />{t}</button>)}</div>}
      <div className="feedinfo"><Icon n="info" />AI로 만든 예시 사진이에요. 실제 작품은 가게 페이지에서 확인해요.</div>
      {showWorks && (<>
        <div className="sec-t" style={{ margin: '4px 16px 10px' }}><h3 style={{ fontSize: 15 }}>입점 가게 작품</h3></div>
        <div className="masonry">{works.map((w) => <WorkTile key={w.id} w={w} />)}</div>
      </>)}
      {list.length === 0 ? (
        <Empty icon={cat === 'liked' ? 'heart' : 'search'}>{cat === 'liked' ? <>아직 저장한 케이크가 없어요.<br />마음에 드는 사진의 하트를 눌러 보세요.</> : <>‘{qq}’와 비슷한 사진이 없어요.<br />다른 말로 찾아보세요.</>}</Empty>
      ) : (
        <div className="masonry">{list.map(({ it, sc }) => <Tile key={it.id} it={it} liked={likes.includes(it.id)} onLike={() => toggleLike(it.id)} sc={photo ? Math.round(45 + 55 * sc / max) : null} />)}</div>
      )}
      <div className="sec-t" style={{ margin: '12px 16px 10px' }}><h3 style={{ fontSize: 15 }}>더 많은 사진 보기</h3></div>
      <div className="outlinks">
        <a href={`https://www.pinterest.co.kr/search/pins/?q=${encodeURIComponent(`${qq || '레터링'} 케이크`)}`} target="_blank" rel="noreferrer"><Icon n="ext" size="sm" />핀터레스트</a>
        <a href={`https://www.instagram.com/explore/tags/${encodeURIComponent(`${(qq || '레터링').replace(/\s/g, '')}케이크`)}/`} target="_blank" rel="noreferrer"><Icon n="insta" size="sm" />인스타그램</a>
      </div>
      <div className="xs muted" style={{ padding: '8px 16px 0' }}>바깥 사이트는 링크로만 열어요. 다른 사람 사진을 앱에 옮겨 오지 않아요.</div>
    </div>
  );
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

// 케이크 사진 자세히: 큰 사진 · 비슷한 케이크 · 이 케이크를 만드는 가게
export function CakeDetail({ params }) {
  const st = useApp();
  const [likes, toggleLike] = useLike();
  const [going, setGoing] = useState(false);
  const it = GALLERY.find((x) => x.id === params.id);
  useEffect(() => { document.querySelector('.cdet .scroll')?.scrollTo(0, 0); }, [params.id]);
  if (!it) return <div className="screen"><Header title="케이크" fallback="/c/saved" /><Empty icon="image">사진을 찾을 수 없어요.</Empty></div>;
  const liked = likes.includes(it.id);
  const similar = GALLERY.filter((x) => x.id !== it.id).map((x) => ({ it: x, sc: simScore(it, x) })).sort((a, b) => b.sc - a.sc).slice(0, 14);
  const styles = it.st.filter((x) => x !== 'custom');
  const ranked = rankStores(getStores(st), { loc: st.loc, radius: st.radius, find: styles.length ? { styles } : null });
  const near = (ranked.filter((r) => !r.partial).length ? ranked.filter((r) => !r.partial) : ranked).slice(0, 3);
  const cream = creamOf(it.cr);
  // 이 사진을 '사진으로 찾기' 조건으로 넣는다 → 가게를 고르면 주문서에 모양·색·장식이 미리 채워짐
  const findStores = async () => {
    setGoing(true);
    let thumb = null;
    try { thumb = toDataURL(await loadDataURL(imgS(it.id)), 360, 0.8, true); } catch { /* 사진 없이 조건만 */ }
    setState((s) => ({ ...s, find: { text: '', q: '', styles, budget: null, gu: null, sameDay: false, appOnly: false, photo: { thumb, design: it.d, shape: it.sh, cream: it.cr, palette: [{ hex: cream.hex, cream: it.cr, name: cream.name, pct: 60 }], gallery: it.id }, at: Date.now() } }));
    nav('/c');
    toast('이 디자인을 만드는 가게를 찾았어요');
  };
  const share = async () => { const r = await shareText({ title: it.t, text: `${it.t} — 에이크 관심 케이크`, url: `${location.href.split('#')[0]}#/c/cake/${it.id}` }); if (r === 'copied') toast('링크를 복사했어요'); };
  return (
    <div className="screen cdet">
      <div className="scroll">
        <div className="cimg" style={{ aspectRatio: `${it.w} / ${it.h}`, background: it.c }}>
          <img src={imgL(it.id)} alt={it.t} />
          <span className="ai">AI 예시 사진 · 실제 가게 작품이 아니에요</span>
          <div className="floatbar">
            <button onClick={() => back('/c/saved')} aria-label="뒤로"><Icon n="back" /></button>
            <div className="row"><button onClick={share} aria-label="공유"><Icon n="share" /></button><button className={liked ? 'on' : ''} onClick={() => toggleLike(it.id)} aria-label="관심"><Icon n="heart" fill={liked} /></button></div>
          </div>
        </div>
        <div className="chead">
          <h2>{it.t}</h2>
          <div className="spec"><span><i style={{ background: cream.hex }} />{cream.name}</span><span>{optName(SHAPES, it.sh)}</span><span>{designOf(it.d).name}</span><span>{sizeOf(it.sz).name} 크기</span></div>
          <div className="hashes">{it.tags.slice(0, 6).map((t) => <button key={t} onClick={() => nav(`/c/saved?q=${encodeURIComponent(t)}`)}>#{t}</button>)}</div>
        </div>
        <div className="pad" style={{ paddingTop: 16 }}>
          <button className="btn pri block" onClick={findStores} disabled={going}><Icon n="map" size="sm" />이 케이크 만드는 가게 찾기</button>
          <div className="xs muted center" style={{ marginTop: 8 }}>가게를 고르면 주문서에 이 디자인이 미리 채워져요.</div>
          {near.length > 0 && (<>
            <div className="sec-t"><h3>가까운 가게</h3><span className="more">{styles.length ? '이 스타일을 만드는 곳' : '내 주변'}</span></div>
            <div className="mini-stores">{near.map((r) => <StoreCard key={r.s.id} r={r} fav={st.favs.includes(r.s.id)} onFav={() => setState((x) => ({ ...x, favs: x.favs.includes(r.s.id) ? x.favs.filter((i) => i !== r.s.id) : [...x.favs, r.s.id] }))} onClick={() => nav(`/store/${r.s.id}`)} />)}</div>
          </>)}
          <div className="sec-t"><h3>비슷한 케이크</h3></div>
        </div>
        <div className="masonry">{similar.map(({ it: x }) => <Tile key={x.id} it={x} liked={likes.includes(x.id)} onLike={() => toggleLike(x.id)} />)}</div>
        <div style={{ height: 28 }} />
      </div>
    </div>
  );
}
