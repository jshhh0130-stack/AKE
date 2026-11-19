import { useEffect, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { CakeView, Header, toast, Loading, Empty } from '../components/ui.jsx';
import { LogoBadge, Logo } from '../components/Logo.jsx';
import { useApp, setState, resetAll, getState } from '../lib/state.js';
import { nav } from '../lib/router.js';
import { askClaude } from '../lib/ai.js';
import { loadKakao, KAKAO_BUILTIN } from '../lib/kakao.js';
import { loadGoogle, googleFailed } from '../lib/gplaces.js';
import { decodeOrder, decodeGift } from '../lib/share.js';
import { joinPartner, refreshPartner, refresh as liveRefresh } from '../lib/live.js';
import { getStores, SEED_STORES, SEED_UPDATED, shopToStore } from '../lib/stores.js';
import { applyEvent, mkEvent } from '../lib/orders.js';
import { estimate, ruleCheck } from '../lib/price.js';
import { range, fmtDate, uid } from '../lib/util.js';
import { decoList, flavorName } from '../lib/ordertext.js';
import { BENCH, BENCH_NOTE, SIZES, SHAPES, sizeOf, designOf, creamOf, optName } from '../data/catalog.js';

export function Settings() {
  const st = useApp();
  const [gk, setGk] = useState(st.settings.googleKey);
  const [key, setKey] = useState(st.settings.claudeKey);
  const [kk, setKk] = useState(st.settings.kakaoKey);
  const [busy, setBusy] = useState('');
  const save = (patch) => setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  return (
    <div className="screen">
      <Header title="지도 · AI 연결" fallback={st.role === 'owner' ? '/o/shop' : '/c/my'} />
      <div className="scroll pad">
        <div className="card pad">
          <div className="row"><Icon n="map" /><b className="grow">구글 지도 연결</b>{st.settings.googleKey ? <span className="tag ok">사용 중</span> : <span className="tag mute">기본 지도</span>}</div>
          <div className="small muted" style={{ margin: '6px 0 10px' }}>Google Maps API 키를 넣으면 <b>구글 지도</b>로 바뀌고, 가게의 <b>실제 사진·별점·영업시간·정확한 위치</b>를 구글에서 받아 와요. 전국 케이크 가게 검색도 구글로 해요.</div>
          <input className="inp" value={gk} onChange={(e) => setGk(e.target.value.trim())} placeholder="Google Maps API 키 (AIza…)" autoComplete="off" />
          <div className="btns" style={{ marginTop: 8 }}>
            <button className="btn line sm" onClick={() => { setGk(''); save({ googleKey: '' }); toast('기본 지도로 바꿨어요'); }}>지우기</button>
            <button className="btn dark sm" disabled={!gk || busy === 'g'} onClick={async () => {
              setBusy('g');
              try { await loadGoogle(gk); await new Promise((r) => setTimeout(r, 1500)); if (googleFailed()) throw new Error('auth'); save({ googleKey: gk }); toast('구글 지도 연결 성공! 지도 화면에서 확인해 보세요'); } catch { toast('연결 실패: 키, 사용 설정한 API, 허용 주소를 확인해 주세요', 4500); }
              setBusy('');
            }}>{busy === 'g' ? '확인 중…' : '저장하고 확인'}</button>
          </div>
          <details className="xs muted" style={{ marginTop: 10, lineHeight: 1.7 }}>
            <summary style={{ cursor: 'pointer', fontWeight: 700 }}>키 받는 방법 (5분)</summary>
            1. console.cloud.google.com 에 구글 계정으로 로그인 → 프로젝트 만들기<br />
            2. 결제 계정 등록(카드 필요 · 매달 무료 사용량 안에서는 청구되지 않아요)<br />
            3. ‘API 및 서비스 › 라이브러리’에서 <b>Maps JavaScript API</b>와 <b>Places API (New)</b> 사용 설정<br />
            4. ‘사용자 인증 정보 › API 키 만들기’ → 키 복사<br />
            5. 키 제한: 웹사이트에 <b>https://jshhh0130-stack.github.io/*</b> 추가 (다른 사람이 못 쓰게)<br />
            6. 여기에 붙여 넣고 ‘저장하고 확인’
          </details>
        </div>
        <div className="card pad" style={{ marginTop: 12 }}>
          <div className="row"><Icon n="sparkle" /><b className="grow">Claude AI 연결 (선택)</b>{st.settings.claudeKey ? <span className="tag ok">연결됨</span> : <span className="tag mute">꺼짐</span>}</div>
          <div className="small muted" style={{ margin: '6px 0 10px' }}>키를 넣으면 진짜 AI가 동작해요: 말로 찾기 해석, 케이크 사진 분석(문구·장식까지), 한 줄 주문 채우기, 가격표 사진 읽기, 소개글 쓰기. 키가 없으면 기기 안의 기본 분석으로 동작해요.</div>
          <input className="inp" type="password" value={key} onChange={(e) => setKey(e.target.value.trim())} placeholder="sk-ant-… (Anthropic 콘솔에서 발급)" autoComplete="off" />
          <div className="btns" style={{ marginTop: 8 }}>
            <button className="btn line sm" onClick={() => { setKey(''); save({ claudeKey: '' }); toast('AI 키를 지웠어요'); }}>지우기</button>
            <button className="btn dark sm" disabled={!key || busy === 'ai'} onClick={async () => {
              setBusy('ai');
              try { const r = await askClaude({ key, system: '한 단어로만 답해.', content: [{ type: 'text', text: '케이크를 한국어 한 단어로' }] }); save({ claudeKey: key }); toast(`연결 성공! (AI 답: ${String(r).slice(0, 12)})`); } catch (e) { toast(e.message, 4000); }
              setBusy('');
            }}>{busy === 'ai' ? '확인 중…' : '저장하고 연결 확인'}</button>
          </div>
          <div className="xs muted" style={{ marginTop: 8 }}>키는 이 기기 안에만 저장돼요. 사용료는 키 주인 계정에 청구돼요. 모델: Claude Opus 5.5</div>
        </div>
        <ImageAICard save={save} />
        <div className="card pad" style={{ marginTop: 12 }}>
          <div className="row"><Icon n="map" /><b className="grow">카카오 지도</b>{st.settings.kakaoKey ? <span className="tag ok">내 키 사용 중</span> : KAKAO_BUILTIN ? <span className="tag ok">기본 키 사용 중</span> : <span className="tag mute">꺼짐</span>}</div>
          <div className="small muted" style={{ margin: '6px 0 10px' }}>고객 지도는 카카오 지도를 먼저 써요. 수원 케이크 가게 정보도 카카오맵에서 받아 와요. 다른 카카오 <b>JavaScript 키</b>를 쓰려면 여기에 넣어 주세요.</div>
          <input className="inp" value={kk} onChange={(e) => setKk(e.target.value.trim())} placeholder="카카오 JavaScript 키" autoComplete="off" />
          <div className="btns" style={{ marginTop: 8 }}>
            <button className="btn line sm" onClick={() => { setKk(''); save({ kakaoKey: '' }); toast('카카오 키를 지웠어요'); }}>지우기</button>
            <button className="btn dark sm" disabled={!kk || busy === 'kk'} onClick={async () => { setBusy('kk'); try { await loadKakao(kk); save({ kakaoKey: kk }); toast('카카오 지도 연결 성공!'); } catch { toast('연결 실패: 키와 등록한 도메인을 확인해 주세요', 4000); } setBusy(''); }}>{busy === 'kk' ? '확인 중…' : '저장하고 확인'}</button>
          </div>
        </div>
        <div className="card" style={{ padding: '0 14px', marginTop: 12 }}>
          <button className="list-row" onClick={() => { if (confirm('이 기기에 저장된 모든 데이터(주문·가게·설정)를 지울까요?')) { resetAll(); nav('/role', { replace: true }); toast('처음 상태로 돌아갔어요'); } }}><Icon n="trash" /><div className="grow"><div className="t" style={{ color: 'var(--danger)' }}>모든 데이터 지우기</div><div className="s">주문·가게·설정을 이 기기에서 지워요</div></div></button>
        </div>
      </div>
    </div>
  );
}

// AI 실사 사진(이미지 AI) 연결: 없어도 무료로 동작하고, 키·토큰을 넣으면 더 빠르고 정확해져요
function ImageAICard({ save }) {
  const st = useApp();
  const [gk, setGk] = useState(st.settings.geminiKey || '');
  const [ht, setHt] = useState(st.settings.hfToken || '');
  const [busy, setBusy] = useState('');
  const testGemini = async () => {
    setBusy('gm');
    try {
      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=50', { headers: { 'x-goog-api-key': gk } });
      if (!r.ok) throw new Error(r.status === 400 || r.status === 403 ? '키가 맞지 않아요' : `확인 실패 (${r.status})`);
      save({ geminiKey: gk }); toast('제미나이 연결 성공! AI 실사 사진을 제미나이가 만들어요');
    } catch (e) { toast(`연결 실패: ${e.message}`, 4000); }
    setBusy('');
  };
  const testHF = async () => {
    setBusy('hf');
    try {
      const r = await fetch('https://huggingface.co/api/whoami-v2', { headers: { Authorization: `Bearer ${ht}` } });
      if (r.status === 401) throw new Error('토큰이 맞지 않아요');
      const j = await r.json().catch(() => ({}));
      save({ hfToken: ht }); toast(`허깅페이스 연결 성공${j.name ? ` (${j.name})` : ''}! 무료 사용량이 늘어요`);
    } catch (e) { if (/토큰/.test(e.message)) toast(`연결 실패: ${e.message}`, 4000); else { save({ hfToken: ht }); toast('토큰을 저장했어요'); } }
    setBusy('');
  };
  return (
    <div className="card pad" style={{ marginTop: 12 }}>
      <div className="row"><Icon n="image" /><b className="grow">AI 실사 사진 (선택)</b>{st.settings.geminiKey ? <span className="tag ok">제미나이</span> : st.settings.hfToken ? <span className="tag ok">허깅페이스</span> : <span className="tag mute">무료로 사용 중</span>}</div>
      <div className="small muted" style={{ margin: '6px 0 10px' }}>넣은 사진을 실사 케이크 사진으로 바꾸는 AI예요. <b>키가 없어도 무료 AI(FLUX)로 동작</b>해요. 무료는 인터넷 주소마다 하루 몇 번이라, 다 쓰면 무료 대기열(10~20분)로 만들어요.</div>
      <div className="lbl" style={{ marginTop: 4 }}>구글 제미나이 키 <span className="xs muted">가장 정확 · 유료(1장 약 50~100원)</span></div>
      <input className="inp" type="password" value={gk} onChange={(e) => setGk(e.target.value.trim())} placeholder="AIza… (Google AI Studio에서 발급)" autoComplete="off" />
      <div className="btns" style={{ marginTop: 8 }}>
        <button className="btn line sm" onClick={() => { setGk(''); save({ geminiKey: '' }); toast('제미나이 키를 지웠어요'); }}>지우기</button>
        <button className="btn dark sm" disabled={!gk || busy === 'gm'} onClick={testGemini}>{busy === 'gm' ? '확인 중…' : '저장하고 확인'}</button>
      </div>
      <div className="lbl" style={{ marginTop: 16 }}>허깅페이스 토큰 <span className="xs muted">무료 계정 · 하루 사용량이 늘어요</span></div>
      <input className="inp" type="password" value={ht} onChange={(e) => setHt(e.target.value.trim())} placeholder="hf_… (huggingface.co › Settings › Access Tokens)" autoComplete="off" />
      <div className="btns" style={{ marginTop: 8 }}>
        <button className="btn line sm" onClick={() => { setHt(''); save({ hfToken: '' }); toast('토큰을 지웠어요'); }}>지우기</button>
        <button className="btn dark sm" disabled={!ht || busy === 'hf'} onClick={testHF}>{busy === 'hf' ? '확인 중…' : '저장하고 확인'}</button>
      </div>
      <details className="xs muted" style={{ marginTop: 10, lineHeight: 1.7 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 700 }}>받는 방법</summary>
        <b>제미나이</b>: aistudio.google.com 에 구글 계정으로 로그인 → ‘Get API key’ → 키 만들기 → 결제 설정(이미지 모델은 무료 사용량이 없어요)<br />
        <b>허깅페이스</b>: huggingface.co 무료 가입 → Settings › Access Tokens › ‘Create new token’(Read 권한이면 돼요)<br />
        키·토큰은 이 기기 안에만 저장되고, 사진을 만들 때만 그 회사로 보내요.
      </details>
    </div>
  );
}

export function About() {
  const verified = SEED_STORES.filter((s) => s.verified).length, priced = SEED_STORES.filter((s) => s.price).length;
  return (
    <div className="screen">
      <Header title="앱 정보 · 데이터 출처" fallback="/c/my" />
      <div className="scroll pad">
        <div className="card cream pad row" style={{ gap: 12 }}><LogoBadge size={48} /><div><Logo h={28} /><div className="xs muted" style={{ marginTop: 6 }}>버전 0.3 · 비즈니스 데이터 시각화 프로젝트</div></div></div>
        <div className="sec-t"><h3>가게 정보는 어디서 왔나요?</h3></div>
        <div className="card pad small">
          수원시에 <b>실제로 있는</b> 커스텀 케이크 전문점 <b>{SEED_STORES.length}곳</b>을 {SEED_UPDATED} 기준 공개 자료(다이닝코드·당근 비즈프로필·지역 목록·가게 SNS, 팀 직접 조사)에서 모았어요. 만든(가상) 가게는 없어요.
          <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
            <li>2025~2026 영업 흔적까지 확인: {verified}곳</li>
            <li>공개 가격 확인: {priced}곳</li>
            <li>나머지는 이름·주소만 확인된 곳이라 ‘확인 필요’로 표시해요</li>
            <li>일반 빵집·프랜차이즈·폐업 의심 가게는 뺐어요. 전화번호는 넣지 않았어요</li>
          </ul>
          구글 지도 키를 연결하면 가게의 실제 사진·별점·영업 여부를 구글에서 바로 받아 와요.
        </div>
        <div className="sec-t"><h3>예상 가격은 어떻게 계산하나요?</h3></div>
        <div className="card pad small">
          <div className="kv"><span>입점 가게</span><b>사장님 가격표 그대로 (정확)</b></div>
          <div className="kv"><span>공개 가격이 있는 가게</span><b>공개 기본가 + 평균 추가금</b></div>
          <div className="kv"><span>정보가 없는 가게</span><b>수원 평균 범위</b></div>
          <div className="hr" />
          {SIZES.map((z) => <div key={z.id} className="kv"><span>{z.name} ({z.cm}cm) 평균</span><b>{range(BENCH[z.id][0], BENCH[z.id][1])}</b></div>)}
          <div className="xs muted" style={{ marginTop: 8 }}>{BENCH_NOTE} 실제 금액은 가게가 확정해요.</div>
        </div>
        <div className="sec-t"><h3>주문·대화는 어떻게 전달되나요?</h3></div>
        <div className="card pad small">입점 가게로 보낸 주문과 대화는 <b>기기에서 암호화</b>한 뒤 공개 중계 서비스(ntfy.sh)를 거쳐 사장님 폰으로 전달돼요. 중계 서버는 내용을 읽을 수 없고 12시간만 보관해요. 주문 기록은 각자 기기에 저장돼요. 정식 서비스에서는 자체 서버·로그인으로 바꾸면 돼요.</div>
        <div className="sec-t"><h3>사용한 공개 서비스</h3></div>
        <div className="card pad xs muted">지도: Google Maps(키 연결 시) · Kakao Maps(키 연결 시) · © OpenStreetMap 기여자 · 주소 검색: Nominatim · 글꼴: Pretendard, Google Fonts · 메시지 중계: ntfy.sh · AI(선택): Claude API · AI 실사 사진: FLUX.1 공개 모델(허깅페이스 데모 · AI Horde 무료 대기열), 구글 제미나이(키 연결 시) · 관심 탭 예시 사진: FLUX.1 [schnell]</div>
        <div style={{ height: 24 }} />
      </div>
    </div>
  );
}

// 가게 주문 링크·QR을 열었을 때: 입점 가게로 저장하고 가게 화면으로
export function JoinShop({ params }) {
  const [err, setErr] = useState('');
  useEffect(() => {
    (async () => {
      const p = await joinPartner(params.code);
      let ok = !!(p.menu && p.ops);
      if (!ok) ok = !!(await refreshPartner(p.id)); // QR(짧은 링크)은 최신 가게 정보를 중계에서 받아 온다
      if (!ok && !SEED_STORES.some((s) => s.id === p.id)) { setErr(`${p.name || '가게'} 정보를 아직 받지 못했어요. 사장님이 앱을 한 번 열어 두면 바로 받아 올 수 있어요. 잠시 뒤 다시 열어 주세요.`); return; }
      setState((s) => ({ ...s, role: 'customer', seenGuide: true }));
      toast(`${p.name} 주문 페이지예요`);
      nav(`/store/${p.id}`, { replace: true });
    })().catch(() => setErr('주문 링크가 올바르지 않아요. 가게에 다시 확인해 주세요.'));
  }, [params.code]);
  return <div className="screen"><Header title="가게 주문 페이지" fallback="/" />{err ? <Empty icon="alert">{err}</Empty> : <Loading text="가게 정보를 불러오는 중…" />}</div>;
}

// 선물 카드 (받는 분이 여는 링크)
export function GiftView({ params }) {
  const st = useApp();
  const [g, setG] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { decodeGift(params.code).then(setG).catch(() => setErr('선물 카드 링크가 올바르지 않아요.')); }, [params.code]);
  if (err) return <div className="screen"><Header title="선물" fallback="/" /><Empty icon="alert">{err}</Empty></div>;
  if (!g) return <div className="screen"><Header title="선물" fallback="/" /><Loading /></div>;
  const store = getStores(st).find((s) => s.id === g.storeId);
  const x = g.o;
  return (
    <div className="screen fade" style={{ background: 'var(--cream)' }}>
      <div className="scroll pad" style={{ paddingTop: 'calc(24px + var(--st))' }}>
        <div className="empty" style={{ padding: '4px 0 0' }}><div className="big"><Icon n="gift" /></div></div>
        <h2 className="center" style={{ margin: '6px 0 4px', fontSize: 23, letterSpacing: -0.4 }}>{g.gift.to ? `${g.gift.to}님,` : ''} 케이크 선물이 도착했어요!</h2>
        <p className="center muted small" style={{ margin: 0 }}>{g.gift.from ? `${g.gift.from}님이` : '친구가'} 에이크로 보낸 선물이에요</p>
        <div className="ticket" style={{ marginTop: 16 }}>
          <div className="stage" style={{ height: 230 }}><CakeView o={{ ...x, text: x.noText ? '' : x.text }} fancy /></div>
          <div className="tb">
            {g.gift.msg && <div className="bub" style={{ maxWidth: '100%' }}><small className="who">{g.gift.from || '보낸 분'}의 메시지</small><div className="tx">{g.gift.msg}</div></div>}
            <div className="kv" style={{ marginTop: 8 }}><span>받는 곳</span><b>{g.storeName}</b></div>
            <div className="kv"><span>받는 날</span><b className="pink">{fmtDate(x.date)} {x.time}</b></div>
            {store?.addr && <div className="kv"><span>주소</span><b>{store.addr}</b></div>}
            <div className="kv"><span>케이크</span><b>{sizeOf(x.size).name} · {designOf(x.design).name}</b></div>
          </div>
        </div>
        {store && (
          <div className="linkrow">
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${store.lat},${store.lng}`} target="_blank" rel="noreferrer"><Icon n="nav" />길찾기</a>
            <a href={`https://map.kakao.com/?q=${encodeURIComponent(store.name)}`} target="_blank" rel="noreferrer"><Icon n="map" />카카오맵</a>
            <a href={`https://map.naver.com/p/search/${encodeURIComponent(store.name)}`} target="_blank" rel="noreferrer"><Icon n="search" />네이버지도</a>
          </div>
        )}
        <div className="note" style={{ marginTop: 12 }}>가게에서 받는 분 이름을 말하면 케이크를 받을 수 있어요. 그림은 참고용 시안이에요.</div>
        <button className="btn pri block" style={{ marginTop: 14 }} onClick={() => { setState({ role: 'customer' }); nav(st.seenGuide ? '/c' : '/guide', { replace: true }); }}>나도 케이크 선물하기</button>
      </div>
    </div>
  );
}

// 입점 전 가게에 보낸 주문서 링크를 사장님이 열었을 때
export function SharedOrder({ params }) {
  const st = useApp();
  const [o, setO] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { decodeOrder(params.code).then(setO).catch(() => setErr('주문서 링크가 올바르지 않아요.')); }, [params.code]);
  if (err) return <div className="screen"><Header title="주문서" fallback="/" /><Empty icon="alert">{err}</Empty></div>;
  if (!o) return <div className="screen"><Header title="주문서" fallback="/" /><Loading /></div>;
  const x = o.o;
  const importIt = () => {
    const shop = getState().shop;
    const store = shopToStore(shop, 'partner');
    const exists = getState().orders.some((r) => r.id === o.id);
    let order = { id: exists ? o.id + '-' + uid().slice(-3) : o.id, storeId: shop.id, storeName: shop.name, createdAt: o.createdAt || new Date().toISOString(), status: 'requested', o: x, customer: o.customer, est: estimate(store, x), checks: ruleCheck(store, { ...x, date: null }, {}), finalPrice: null, ev: [], imgs: {}, seen: { o: 0 } };
    order = applyEvent(order, mkEvent('request', 'c'));
    setState((s) => ({ ...s, orders: [order, ...s.orders] }));
    liveRefresh();
    toast('주문함에 넣었어요');
    nav(`/o/order/${order.id}`, { replace: true });
  };
  const deco = decoList(x);
  return (
    <div className="screen">
      <Header title="받은 주문서" fallback="/" />
      <div className="scroll pad">
        <div className="ticket">
          <div className="stage"><CakeView o={{ ...x, text: x.noText ? '' : x.text }} fancy /></div>
          <div className="tb">
            <div className="row"><b className="grow">{o.storeName}</b><span className="tag">{o.id}</span></div>
            <div className="hr" />
            <div className="kv"><span>주문자</span><b>{o.customer?.name || '-'} {o.customer?.phone || ''}</b></div>
            <div className="kv"><span>픽업</span><b>{fmtDate(x.date)} {x.time}</b></div>
            <div className="kv"><span>케이크</span><b>{sizeOf(x.size).name} · {optName(SHAPES, x.shape)} · {designOf(x.design).name}</b></div>
            <div className="kv"><span>맛·크림</span><b>{flavorName(x)} · {creamOf(x.cream).name}</b></div>
            <div className="kv"><span>문구</span><b>{x.noText ? '없음' : `“${x.text}”`}</b></div>
            {deco.length > 0 && <div className="kv"><span>장식·추가</span><b>{deco.join(', ')}</b></div>}
            {x.request && <div className="kv"><span>요청</span><b>{x.request}</b></div>}
            {x.allergy && <div className="kv"><span>알레르기</span><b>{x.allergy}</b></div>}
            {o.est && <div className="kv"><span>앱 예상 금액</span><b className="pink">{range(o.est.lo, o.est.hi)}</b></div>}
          </div>
        </div>
        {st.shop && st.role === 'owner' ? (
          <button className="btn pri block" style={{ marginTop: 14 }} onClick={importIt}><Icon n="plus" size="sm" /> 내 가게 주문함에 넣기</button>
        ) : (
          <div className="note" style={{ marginTop: 14 }}>사장님이라면 에이크에 가게를 등록하고 이 링크를 다시 열면 주문함에 바로 넣을 수 있어요. 등록하면 다음부터는 주문이 실시간으로 와요.
            <button className="btn sec block sm" style={{ marginTop: 8 }} onClick={() => { setState({ role: 'owner' }); if (!getState().shop) nav('/o/setup'); }}>사장님 모드로 열기</button>
          </div>
        )}
      </div>
    </div>
  );
}
