import { useMemo, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import MapView from '../../components/MapView.jsx';
import { CakeView, Header, Stars, toast, Empty } from '../../components/ui.jsx';
import { useApp, setState } from '../../lib/state.js';
import { nav, back } from '../../lib/router.js';
import { getStores, distKm, fmtKm, kindLabel, canOrderInApp, closedDaysOf, leadDaysOf, nextOpenDay, mapLinks, SEED_UPDATED } from '../../lib/stores.js';
import { estimate, basisText } from '../../lib/price.js';
import { storeLook } from '../../lib/cake.js';
import { range, DOW, shareText, hash, rng } from '../../lib/util.js';
import { SIZES, styleName } from '../../data/catalog.js';
import { StoreThumb } from './Home.jsx';

export function heroBg(s) {
  const c = s.theme?.color || ['#FF8FB3', '#FFB38A', '#B79CF0', '#7FCBB0', '#8EB8F0', '#F7A8C2'][hash(s.id) % 6];
  const pat = s.theme?.banner || ['dots', 'stripe', 'plain'][hash(s.id) % 3];
  const bg = pat === 'stripe'
    ? `repeating-linear-gradient(135deg, ${c}22 0 14px, ${c}10 14px 28px), linear-gradient(180deg, ${c}55, #fff9fb)`
    : pat === 'dots' ? `radial-gradient(${c}55 2px, transparent 2.5px) 0 0/18px 18px, linear-gradient(180deg, ${c}66, #fff9fb)`
    : `linear-gradient(180deg, ${c}77, #fff9fb)`;
  return { background: bg };
}

export default function StoreDetail({ params }) {
  const st = useApp();
  const stores = useMemo(() => getStores(st), [st.shop, st.found]); // eslint-disable-line react-hooks/exhaustive-deps
  const s = stores.find((x) => x.id === params.id);
  const [galIdx, setGalIdx] = useState(null);
  if (!s) return <div className="screen"><Header title="가게" fallback="/c" /><Empty icon="🔎">가게 정보를 찾을 수 없어요.</Empty></div>;
  const d = distKm(st.loc, s);
  const fav = st.favs.includes(s.id);
  const inApp = canOrderInApp(s);
  const open = nextOpenDay(s, st.orders);
  const closed = closedDaysOf(s);
  const links = mapLinks(s);
  const reviews = st.orders.filter((o) => o.storeId === s.id && o.review);
  const gallery = s.portfolio?.length ? s.portfolio : Array.from({ length: 5 }, (_, k) => ({ id: 'g' + k, design: storeLook(s, k), caption: '스타일 예시', gen: true }));
  const rows = SIZES.map((z) => ({ z, e: estimate(s, { size: z.id, design: 'simple', shape: 'round', cream: 'white', flavor: 'vanilla', text: '축하해' }) }))
    .filter(({ z }) => !s.menu || s.menu.sizes?.[z.id] != null);
  const hp = rows.find((r) => r.z.id === 'h1') || rows[0];
  const hero = s.hero || gallery[0]?.design || storeLook(s);
  const toggleFav = () => setState((x) => ({ ...x, favs: fav ? x.favs.filter((i) => i !== s.id) : [...x.favs, s.id] }));
  const share = async () => {
    const r = await shareText({ title: s.name, text: `${s.name} — Dear Cake에서 보기`, url: `${location.href.split('#')[0]}#/store/${s.id}` });
    if (r === 'copied') toast('가게 링크를 복사했어요');
  };
  return (
    <div className="screen">
      <div className="scroll">
        <div className="hero" style={heroBg(s)}>
          <div className="cake"><CakeView o={hero} bg={false} fancy /></div>
          <div className="hb">
            <button onClick={() => back('/c')} aria-label="뒤로"><Icon n="back" /></button>
            <div className="row">
              <button onClick={share} aria-label="공유"><Icon n="share" /></button>
              <button className={fav ? 'on' : ''} onClick={toggleFav} aria-label="찜"><Icon n="heart" style={fav ? { fill: 'currentColor' } : undefined} /></button>
            </div>
          </div>
        </div>
        <div className="shead">
          <span className={`tag ${inApp ? 'dark' : s.level === 'detail' ? '' : 'mute'}`}>{inApp ? '⚡ ' : ''}{kindLabel(s)}</span>
          <h2>{s.name}</h2>
          <div className="small muted">{[s.gu, s.dong].filter(Boolean).join(' ')} · 여기서 {fmtKm(d)}{s.geo === 'area' ? ' (위치 대략)' : ''}</div>
          <div className="tags" style={{ marginTop: 8 }}>
            {(s.styles || []).map((x) => <span key={x} className="tag">{styleName(x)}</span>)}
            {s.sameDay && <span className="tag warn">당일 가능</span>}
          </div>
          {s.intro && <p style={{ margin: '12px 0 0', fontSize: 14.5 }}>{s.intro}</p>}
          {s.note && !s.intro && <p className="small muted" style={{ margin: '10px 0 0' }}>{s.note}</p>}
          <div className="info4">
            <div>예상 가격 ({hp?.z.name})<b>{hp ? range(hp.e.lo, hp.e.hi, true) : '-'}</b></div>
            <div>주문 마감<b>{s.ops ? (s.ops.sameDay ? `당일 ${s.ops.cutoff}까지` : `픽업 ${s.ops.leadDays}일 전`) : s.lead || '가게에 확인'}</b></div>
            <div>{s.ops ? '픽업 시간' : '영업 시간'}<b>{s.ops ? `${s.ops.pickupStart}~${s.ops.pickupEnd}` : s.hours || '확인 필요'}</b></div>
            <div>휴무<b>{closed.length ? closed.map((x) => DOW[x]).join('·') + '요일' : s.closed || (s.ops ? '없음' : '확인 필요')}</b></div>
          </div>
          {inApp && open && <div className="note ok" style={{ marginTop: 8 }}>가장 빠른 픽업: <b>{open.diff === 0 ? '오늘' : open.diff === 1 ? '내일' : `${open.diff}일 뒤`}</b> · 앱에서 바로 주문하면 사장님이 확인 후 확정해요</div>}
          {!inApp && <div className="note" style={{ marginTop: 8 }}>아직 디어 케이크 입점 전인 가게예요. 주문서를 완성하면 <b>가게 카톡·인스타로 그대로 보낼 수 있게</b> 정리해 드려요.</div>}
        </div>

        <div className="pad" style={{ paddingTop: 4 }}>
          <div className="sec-t"><h3>{s.portfolio?.some((p) => p.src) ? '이 가게 작품' : '이런 케이크를 만들어요'}</h3><span className="more">{gallery[0]?.gen ? '스타일 예시 그림' : `${gallery.length}개`}</span></div>
          <div className="gal">
            {gallery.map((g, i) => (
              <button key={g.id} className="gi" onClick={() => setGalIdx(i)}>
                <div className="im">{g.src ? <img src={g.src} alt={g.caption} /> : <CakeView o={g.design} />}</div>
                <div>{g.caption}</div>
              </button>
            ))}
          </div>
          {gallery[0]?.gen && <div className="xs muted" style={{ marginTop: 6 }}>가게 스타일을 바탕으로 그린 예시예요. 실제 작품 사진은 {s.insta ? '가게 인스타그램' : '가게 SNS'}에서 확인해 주세요.</div>}

          <div className="sec-t"><h3>가격 {s.menu ? '' : '(예상)'}</h3><span className="more">기본 레터링 기준</span></div>
          <div className="card pad">
            <table className="ptable"><tbody>
              {rows.map(({ z, e }) => <tr key={z.id}><td>{z.name} <span className="xs muted">· {z.cm}cm · {z.serves}</span></td><td>{range(e.lo, e.hi)}</td></tr>)}
            </tbody></table>
            <div className="xs muted" style={{ marginTop: 8 }}>{basisText(rows[0]?.e.basis)}</div>
            {s.priceNote && <div className="note" style={{ marginTop: 8 }}><b>가게 공개 정보</b> · {s.priceNote}</div>}
          </div>

          {(s.notices?.length > 0 || s.lead || s.kakao || s.insta || s.naver) && (
            <>
              <div className="sec-t"><h3>{s.notices?.length ? '주문 전 안내' : '주문 방법'}</h3></div>
              <div className="card pad">
                {s.notices?.map((n, i) => <div key={i} className="row" style={{ alignItems: 'flex-start', padding: '5px 0' }}><span className="tag" style={{ flex: 'none' }}>{i + 1}</span><span className="small">{n}</span></div>)}
                {!s.notices?.length && (
                  <div className="col small">
                    {s.kakao && <div>💬 카카오톡: <b>{s.kakao}</b></div>}
                    {s.insta && <div>📷 인스타그램: <b>@{s.insta}</b></div>}
                    {s.naver && <div>🟢 네이버 예약·톡톡 사용</div>}
                    {s.lead && <div>⏰ {s.lead}</div>}
                  </div>
                )}
              </div>
            </>
          )}

          {s.faq?.length > 0 && (
            <>
              <div className="sec-t"><h3>자주 묻는 질문</h3></div>
              <div className="card pad">{s.faq.map((f, i) => <div key={i} style={{ padding: '6px 0' }}><div className="b small">Q. {f.q}</div><div className="small muted">A. {f.a}</div></div>)}</div>
            </>
          )}

          <div className="sec-t"><h3>위치</h3><span className="more">{s.geo === 'exact' ? '' : '지도 위치는 대략이에요'}</span></div>
          <div className="minimap"><MapView center={s} zoom={15} pins={[{ s, label: s.name }]} selected={s.id} interactive={false} kakaoKey={st.settings.kakaoKey} /></div>
          <div className="small" style={{ marginTop: 8 }}>{s.addr}</div>
          <div className="linkrow">
            <a href={links.route} target="_blank" rel="noreferrer"><Icon n="map" />길찾기</a>
            <a href={links.kakao} target="_blank" rel="noreferrer"><Icon n="search" />카카오맵</a>
            {links.insta ? <a href={links.insta} target="_blank" rel="noreferrer"><Icon n="insta" />인스타</a> : <a href={links.naver} target="_blank" rel="noreferrer"><Icon n="search" />네이버지도</a>}
          </div>

          <div className="sec-t"><h3>디어 케이크 후기 {reviews.length > 0 && <span className="pink">{reviews.length}</span>}</h3></div>
          {reviews.length === 0 ? <div className="card pad small muted">아직 앱 주문 후기가 없어요. 첫 후기를 남겨 주세요!<br /><span className="xs">후기는 앱으로 주문하고 픽업한 손님만 쓸 수 있어요.</span></div> : (
            <div className="card pad">{reviews.slice(0, 5).map((o) => <div key={o.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--line)' }}><Stars n={o.review.stars} /> <span className="xs muted">{o.o.size && SIZES.find((x) => x.id === o.o.size)?.name}</span><div className="small">{o.review.text}</div></div>)}</div>
          )}

          {s.src?.length > 0 && (
            <div className="xs muted" style={{ marginTop: 16, lineHeight: 1.6 }}>
              정보 출처 ({SEED_UPDATED} 조사): {s.src.map((u, i) => /^https?:/.test(u) ? <a key={i} href={u} target="_blank" rel="noreferrer" style={{ marginRight: 6 }}>[{i + 1}]</a> : <span key={i}>{u} </span>)}
              <br />정보가 바뀌었을 수 있어요. 사장님이라면 사장님 모드에서 “우리 가게 찾기”로 직접 고칠 수 있어요.
            </div>
          )}
          <div style={{ height: 20 }} />
        </div>
      </div>
      <div className="stickybar">
        <div className="pp">{hp?.z.name} 기본<b>{hp ? range(hp.e.lo, hp.e.hi, true) : '-'}</b></div>
        <button className="btn pri grow" onClick={() => nav(`/order/${s.id}`)}><Icon n="edit" size="sm" /> 주문서 작성하기</button>
      </div>
      {galIdx != null && (
        <div className="backdrop" style={{ display: 'grid', placeItems: 'center', padding: 20 }} onClick={() => setGalIdx(null)}>
          <div className="card" style={{ width: '100%', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ background: 'var(--p50)' }}>{gallery[galIdx].src ? <img src={gallery[galIdx].src} alt="" style={{ width: '100%' }} /> : <CakeView o={gallery[galIdx].design} fancy style={{ aspectRatio: '6/5' }} />}</div>
            <div className="pad">
              <div className="b">{gallery[galIdx].caption}</div>
              <div className="btns" style={{ marginTop: 12 }}>
                <button className="btn line" onClick={() => setGalIdx(null)}>닫기</button>
                {gallery[galIdx].design && <button className="btn pri" style={{ flex: 2 }} onClick={() => { const dsg = gallery[galIdx].design; setGalIdx(null); nav(`/order/${s.id}?from=${encodeURIComponent(JSON.stringify(dsg))}`); }}>이 디자인으로 주문</button>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
