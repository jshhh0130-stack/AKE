import { useEffect, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import MapView from '../../components/MapView.jsx';
import { LocShareSheet } from '../../components/Share.jsx';
import { CakeView, Header, Stars, toast, Empty } from '../../components/ui.jsx';
import { useApp, setState } from '../../lib/state.js';
import { nav, back, queryOf } from '../../lib/router.js';
import { getStores, distKm, fmtKm, kindLabel, canOrderInApp, mapLinks, keywordsOf, hoursOf, SEED_UPDATED } from '../../lib/stores.js';
import { estimate, basisText } from '../../lib/price.js';
import { storeLook } from '../../lib/cake.js';
import { range, hash, shade } from '../../lib/util.js';
import { SIZES } from '../../data/catalog.js';
import { AskCard } from '../Ask.jsx';
import { usePlaces } from './Home.jsx';
import { enrich } from '../../lib/gplaces.js';
import { refreshPartner } from '../../lib/live.js';
import { kakaoKeyOf, kakaoLinks } from '../../lib/kakao.js';
import { storeDesigns, manwon } from '../../lib/designs.js';

// 카카오맵 정보 카드: 카카오에 등록된 정보를 그대로(분류·주소·전화), 사진·후기는 카카오맵 화면으로 바로 이어 준다
function KakaoCard({ s }) {
  const k = s.k, L = kakaoLinks(k);
  return (
    <div className="kcard">
      <div className="kh"><span className="ki">K</span><b className="grow">카카오맵 정보</b><a className="xs" href={L.place} target="_blank" rel="noreferrer">카카오맵에서 열기 <Icon n="right" size="sm" /></a></div>
      {k.cat && <div className="kr"><Icon n="cake" size="sm" /><span>{k.cat}</span></div>}
      <div className="kr"><Icon n="pin" size="sm" /><span>{k.road || k.addr}{k.road && k.addr && <small>지번 {k.addr.replace(/^경기\s*/, '')}</small>}</span></div>
      {k.phone && <div className="kr"><Icon n="chat" size="sm" /><a href={`tel:${k.phone.replace(/[^\d]/g, '')}`}>{k.phone}</a></div>}
      <div className="kbtns">
        <a href={L.photos} target="_blank" rel="noreferrer"><Icon n="image" />사진 보기</a>
        <a href={L.reviews} target="_blank" rel="noreferrer"><Icon n="star" />후기 보기</a>
        {k.phone ? <a href={`tel:${k.phone.replace(/[^\d]/g, '')}`}><Icon n="chat" />전화</a> : <a href={L.route} target="_blank" rel="noreferrer"><Icon n="nav" />길찾기</a>}
      </div>
      <div className="xs muted" style={{ marginTop: 8 }}>사진과 후기는 작성한 분들의 것이라 카카오맵에서 바로 볼 수 있게 이어 드려요.</div>
    </div>
  );
}

// 가게 대표 배경: 테마 색을 크림에 섞은 단색 (그라데이션 없이)
export function heroBg(s) {
  const c = s.theme?.color || ['#F4A2A8', '#F6B98A', '#C7B2EE', '#9FD4BF', '#A9C8F0', '#F3B7C9'][hash(s.id) % 6];
  return { background: shade(c, 0.8) };
}

export default function StoreDetail({ params, path }) {
  const st = useApp();
  const ai = queryOf(path).get('ai') && st.aiDraft ? st.aiDraft : null; // AI로 만든 케이크를 들고 온 경우
  usePlaces();
  const stores = getStores(st);
  const s = stores.find((x) => x.id === params.id);
  const [galIdx, setGalIdx] = useState(null);
  const [gPhoto, setGPhoto] = useState(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [pi, setPi] = useState(0);
  // 구글 키가 있으면 실제 사진·별점을 받아 오고, 입점 가게면 최신 가격표를 받아 온다
  useEffect(() => { if (s && st.settings.googleKey) enrich(st.settings.googleKey, s); if (s?.remote) refreshPartner(s.id); }, [params.id, st.settings.googleKey]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!s) return <div className="screen"><Header title="가게" fallback="/c" /><Empty icon="search">가게 정보를 찾을 수 없어요.</Empty></div>;
  const d = distKm(st.loc, s);
  const fav = st.favs.includes(s.id);
  const inApp = canOrderInApp(s);
  const links = mapLinks(s);
  const reviews = st.orders.filter((o) => o.storeId === s.id && o.review);
  const realPhotos = [...(s.g?.photos || []).map((p) => ({ src: p.src, by: p.by, g: true })), ...(s.portfolio || []).filter((p) => p.src).map((p) => ({ src: p.src, cap: p.caption, sample: !!p.sample }))];
  // 대표 디자인 (주문서 1단계와 같은 목록) · 위쪽 큰 사진은 가게 사진들을, 없으면 대표 디자인들을 옆으로 넘겨 본다
  const gallery = storeDesigns(s).map((g) => ({ ...g, caption: g.name }));
  const slides = realPhotos.length ? realPhotos : gallery.filter((g) => g.design).map((g) => ({ design: g.design, cap: g.name }));
  const rows = SIZES.map((z) => ({ z, e: estimate(s, { size: z.id, design: 'simple', shape: 'round', cream: 'white', flavor: 'vanilla', text: '축하해' }) }))
    .filter(({ z }) => !s.menu || s.menu.sizes?.[z.id] != null);
  const hp = rows.find((r) => r.z.id === 'h1') || rows[0];
  const hero = s.hero || gallery[0]?.design || storeLook(s);
  const toggleFav = () => { setState((x) => ({ ...x, favs: fav ? x.favs.filter((i) => i !== s.id) : [...x.favs, s.id] })); if (!fav) toast('찜한 가게에 담았어요'); };
  const unsure = s.kind === 'public' && !s.verified;
  const kindTag = inApp ? <span className="tag pink">앱 주문</span> : s.verified ? <span className="tag ok"><Icon n="check" />영업 확인</span> : s.kind === 'public' ? <span className="tag mute">영업 확인 필요</span> : <span className="tag blue">{s.kind === 'kakao' ? '카카오맵 등록 가게' : '지도 검색 결과'}</span>;
  const kKey = kakaoKeyOf(st.settings);
  const kl = s.k ? kakaoLinks(s.k) : null;
  const hrs = hoursOf(s);
  return (
    <div className="screen storepage">
      {/* 내려도 위에 계속 보이는 뒤로가기 · 공유 · 찜 */}
      <div className="hb fixed">
        <button onClick={() => back('/c')} aria-label="뒤로"><Icon n="back" /></button>
        <div className="row">
          <button onClick={() => setShareOpen(true)} aria-label="공유"><Icon n="share" /></button>
          <button className={fav ? 'on' : ''} onClick={toggleFav} aria-label="찜"><Icon n="heart" fill={fav} /></button>
        </div>
      </div>
      <div className="scroll">
        <div className="hero" style={realPhotos.length ? undefined : { background: 'var(--yel)' }}>
          {slides.length ? (<>
            <div className="photos" onScroll={(e) => setPi(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
              {slides.map((p, i) => (p.src ? <img key={i} src={p.src} alt="" referrerPolicy="no-referrer" onClick={() => p.g && setGPhoto(p)} />
                : <div key={i} className="slide"><div className="cake"><CakeView o={p.design} bg={false} fancy /></div></div>))}
            </div>
            {slides.length > 1 && <span className="cnt">{Math.min(pi, slides.length - 1) + 1} / {slides.length}</span>}
            {slides[pi]?.g ? <span className="hcap">사진: 구글 지도</span> : slides[pi]?.sample ? <span className="hcap">예시 사진</span> : !realPhotos.length && <span className="hcap">스타일 예시 그림</span>}
          </>) : (<>
            <div className="cake"><CakeView o={hero} bg={false} fancy /></div>
            <span className="hcap">스타일 예시 그림</span>
          </>)}
        </div>

        <div className="shead">
          <div className="row" style={{ gap: 6 }}>{kindTag}{s.sameDay && <span className="tag pink">당일 픽업</span>}</div>
          <h2>{s.name}</h2>
          {/* 가게마다 같은 틀: 1호 기본 가격 / [거리] [키워드] [영업시간 · 휴무] */}
          <div className="pricehead">
            <b>{hp ? manwon(hp.e.lo) : '가격 정보 없음'}</b>
            {hp && <span>{hp.z.name} {s.menu || s.price ? '예상가' : '평균 추정'}</span>}
          </div>
          <div className="factchips">
            <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="6.5" /><path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4" /></svg>{fmtKm(d)}{s.geo === 'area' ? ' (대략)' : ''}</span>
            {keywordsOf(s, 1).map((k) => <span key={k}>{k}</span>)}
            <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>{hrs.time || '영업시간 확인 필요'}{hrs.off && <small> · {hrs.off}</small>}</span>
          </div>
          {(s.k?.road || s.addr) && <div className="saddr"><Icon n="pin" size="sm" /><span>{s.k?.road || s.addr}</span></div>}
          {s.g?.closed && <div className="note warn" style={{ marginTop: 10 }}>구글 지도에는 ‘폐업’으로 표시돼 있어요. 방문 전에 꼭 확인해 주세요.</div>}
          {!inApp && <div className="note" style={{ marginTop: 10 }}>아직 에이크 입점 전인 가게예요. 주문서를 완성하면 <b>가게 카톡·인스타로 그대로 보낼 수 있게</b> 정리해 드려요.{unsure && s.kind === 'public' ? <><br /><span className="xs">공개 목록 기준 정보예요. 방문 전에 영업 여부를 확인해 주세요.</span></> : null}</div>}
        </div>
        <div className="band" />

        <div className="pad" style={{ paddingTop: 4 }}>
          <div className="sec-t"><h3>이런 케이크를 만들어요</h3><span className="more">{gallery[0]?.gen ? '스타일 예시 그림' : '대표 디자인'}</span></div>
          {s.intro && <p className="small muted" style={{ margin: '-4px 0 10px' }}>{s.intro}</p>}
          <div className="gal big">
            {gallery.map((g, i) => (
              <button key={g.id} className="gi" onClick={() => setGalIdx(i)}>
                <div className="im">{g.src ? <img src={g.src} alt={g.caption} /> : <CakeView o={g.design} />}</div>
                <div className="gt"><b>{g.caption}</b><small>{manwon(g.price)}~</small></div>
              </button>
            ))}
          </div>
          {!s.portfolio?.some((p) => p.src) && !s.g?.photos?.length && (
            <div className="card cream pad row" style={{ marginTop: 12 }}>
              <span className="grow small"><b>실제 케이크 사진 보기</b><div className="xs muted">{kl ? '카카오맵에 올라온 가게 사진을 볼 수 있어요' : s.insta ? '가게 인스타그램에서 작품 사진을 볼 수 있어요' : '구글 지도에서 가게 사진과 리뷰를 볼 수 있어요'}</div></span>
              {kl && <a className="btn sm line" href={kl.photos} target="_blank" rel="noreferrer">카카오맵 사진</a>}
              {(!kl || s.insta) && <a className="btn sm line" href={s.insta ? links.insta : links.google} target="_blank" rel="noreferrer">{s.insta ? '인스타' : '구글 지도'}</a>}
            </div>
          )}
          {s.k && <KakaoCard s={s} />}
          {s.g?.hours && <details className="small" style={{ marginTop: 10 }}><summary className="muted" style={{ cursor: 'pointer' }}>구글에 등록된 영업시간 보기</summary>{s.g.hours.map((h) => <div key={h} className="xs muted">{h}</div>)}</details>}
        </div>
        <div className="band" />

        <div className="pad" style={{ paddingTop: 4 }}>
          <div className="sec-t"><h3>예상 가격</h3><span className="more">기본 레터링 기준 · 최종 금액은 사장님이 정해요</span></div>
          <table className="ptable"><tbody>
            {rows.map(({ z, e }) => <tr key={z.id}><td>{z.name} <span className="xs muted">· {z.cm}cm · {z.serves}</span></td><td>{range(e.lo, e.hi)}</td></tr>)}
          </tbody></table>
          <div className="xs muted" style={{ marginTop: 8 }}>{basisText(rows[0]?.e.basis)}</div>
          {s.priceNote && <div className="note" style={{ marginTop: 10 }}><b>가게 공개 정보</b> · {s.priceNote}</div>}

          {(s.notices?.length > 0 || s.lead || s.kakao || s.insta || s.naver) && (<>
            <div className="sec-t"><h3>{s.notices?.length ? '주문 전 안내' : '주문 방법'}</h3></div>
            {s.notices?.map((n, i) => <div key={i} className="row" style={{ alignItems: 'flex-start', padding: '6px 0' }}><span className="tag" style={{ flex: 'none' }}>{i + 1}</span><span className="small">{n}</span></div>)}
            {!s.notices?.length && (
              <div className="col small">
                {s.kakao && <div className="row"><Icon n="chat" size="sm" />카카오톡 채널 <b>{s.kakao}</b></div>}
                {s.insta && <div className="row"><Icon n="insta" size="sm" />인스타그램 <b>@{s.insta}</b></div>}
                {s.naver && <div className="row"><Icon n="calendar" size="sm" />네이버 예약·톡톡 사용</div>}
                {s.lead && <div className="row"><Icon n="clock" size="sm" />{s.lead}</div>}
              </div>
            )}
          </>)}

          {s.faq?.length > 0 && (<>
            <div className="sec-t"><h3>자주 묻는 질문</h3></div>
            {s.faq.map((f, i) => <div key={i} style={{ padding: '6px 0' }}><div className="b small">Q. {f.q}</div><div className="small muted">A. {f.a}</div></div>)}
          </>)}
        </div>
        <div className="band" />

        <div className="pad" style={{ paddingTop: 6 }}>
          <AskCard s={s} />
        </div>
        <div className="band" />

        <div className="pad" style={{ paddingTop: 4 }}>
          <div className="sec-t"><h3>위치</h3><span className="more">{s.geo === 'exact' ? '' : '지도 위치는 대략이에요'}</span></div>
          <div className="minimap"><MapView center={s} zoom={16} pins={[{ s, name: s.name, price: '' }]} selected={s.id} interactive={false} googleKey={st.settings.googleKey} kakaoKey={kKey} prefer="kakao" /></div>
          <div className="small" style={{ marginTop: 10 }}>{s.k?.road || s.addr}</div>
          <div className="linkrow">
            <a href={kl ? kl.route : links.route} target="_blank" rel="noreferrer"><Icon n="nav" />길찾기</a>
            <button onClick={() => setShareOpen(true)}><Icon n="send" />위치 공유</button>
            {links.insta ? <a href={links.insta} target="_blank" rel="noreferrer"><Icon n="insta" />인스타</a> : <a href={links.kakao} target="_blank" rel="noreferrer"><Icon n="map" />카카오맵</a>}
          </div>

          <div className="sec-t"><h3>에이크 후기 {reviews.length > 0 && <span className="pink">{reviews.length}</span>}</h3></div>
          {reviews.length === 0 ? <div className="small muted">아직 앱 주문 후기가 없어요. 후기는 앱으로 주문하고 픽업한 손님만 쓸 수 있어요.</div> : (
            reviews.slice(0, 5).map((o) => <div key={o.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}><Stars n={o.review.stars} /> <span className="xs muted">{o.o.size && SIZES.find((x) => x.id === o.o.size)?.name}</span><div className="small">{o.review.text}</div></div>)
          )}
          {kl && (
            <a className="kreview" href={kl.reviews} target="_blank" rel="noreferrer">
              <span className="ki">K</span>
              <span className="grow"><b>카카오맵 후기도 함께 보기</b><small>방문한 분들의 별점·후기·사진을 카카오맵에서 봐요</small></span>
              <Icon n="right" size="sm" />
            </a>
          )}

          {s.src?.length > 0 && (
            <div className="xs muted" style={{ marginTop: 20, lineHeight: 1.6 }}>
              {kindLabel(s)} · 정보 출처 ({SEED_UPDATED} 조사): {s.src.map((u, i) => /^https?:/.test(u) ? <a key={i} href={u} target="_blank" rel="noreferrer" style={{ marginRight: 6 }}>[{i + 1}]</a> : <span key={i}>{u} </span>)}
              <br />정보가 바뀌었을 수 있어요. 사장님이라면 사장님 모드에서 “우리 가게 찾기”로 직접 고칠 수 있어요.
            </div>
          )}
          <div style={{ height: 16 }} />
        </div>
      </div>
      {ai && <div className="aibar"><img src={ai.src} alt="" /><span className="grow"><b>만든 케이크로 주문해요</b><small>주문서 쓰기를 누르면 이 이미지가 주문서에 들어가요</small></span></div>}
      <div className="stickybar">
        <button className={`favbtn ${fav ? 'on' : ''}`} onClick={toggleFav} aria-label="찜"><Icon n="heart" />찜</button>
        <button className="btn line" style={{ flex: 1 }} onClick={() => nav(`/c/ai/${s.id}`)}>물어보기</button>
        <button className="btn pri" style={{ flex: 1.6 }} onClick={() => nav(`/order/${s.id}${ai ? '?ai=1' : ''}`)}>주문서 쓰기</button>
      </div>
      <LocShareSheet open={shareOpen} onClose={() => setShareOpen(false)} store={s} />
      {gPhoto && (
        <div className="backdrop" style={{ display: 'grid', placeItems: 'center', padding: 16 }} onClick={() => setGPhoto(null)}>
          <div style={{ width: '100%' }}><img src={gPhoto.src} alt="" referrerPolicy="no-referrer" style={{ width: '100%', borderRadius: 16, maxHeight: '70vh', objectFit: 'contain' }} /><div className="xs center" style={{ color: '#fff', marginTop: 8 }}>사진: 구글 지도{gPhoto.by ? ` · ${gPhoto.by}` : ''}</div></div>
        </div>
      )}
      {galIdx != null && (
        <div className="backdrop" style={{ display: 'grid', placeItems: 'center', padding: 20 }} onClick={() => setGalIdx(null)}>
          <div className="card" style={{ width: '100%', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ background: 'var(--cream)' }}>{gallery[galIdx].src ? <img src={gallery[galIdx].src} alt="" style={{ width: '100%' }} /> : <CakeView o={gallery[galIdx].design} fancy style={{ aspectRatio: '6/5' }} />}</div>
            <div className="pad">
              <div className="b">{gallery[galIdx].caption}</div>
              <div className="btns" style={{ marginTop: 12 }}>
                <button className="btn line" onClick={() => setGalIdx(null)}>닫기</button>
                <button className="btn pri" style={{ flex: 2 }} onClick={() => { const id = gallery[galIdx].id; setGalIdx(null); nav(`/order/${s.id}?pick=${encodeURIComponent(id)}`); }}>이 디자인으로 주문</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
