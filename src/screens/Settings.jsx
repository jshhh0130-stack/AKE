import { useEffect, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { CakeView, Header, toast, Loading, Empty } from '../components/ui.jsx';
import { LogoBadge, Wordmark } from '../components/Logo.jsx';
import { useApp, setState, resetAll, getState } from '../lib/state.js';
import { nav } from '../lib/router.js';
import { askClaude } from '../lib/ai.js';
import { loadKakao } from '../components/MapView.jsx';
import { decodeOrder } from '../lib/share.js';
import { getStores, SEED_STORES, SEED_UPDATED } from '../lib/stores.js';
import { loadDemoShop } from '../lib/orders.js';
import { range, fmtDate, won, uid } from '../lib/util.js';
import { BENCH, BENCH_NOTE, SIZES, SHAPES, FLAVORS, RICE_FLAVORS, TOPPINGS, EXTRAS, sizeOf, designOf, creamOf, optName } from '../data/catalog.js';

export function Settings() {
  const st = useApp();
  const [key, setKey] = useState(st.settings.claudeKey);
  const [kk, setKk] = useState(st.settings.kakaoKey);
  const [busy, setBusy] = useState('');
  const save = (patch) => setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  return (
    <div className="screen">
      <Header title="AI · 지도 연결" fallback={st.role === 'owner' ? '/o/shop' : '/c/my'} />
      <div className="scroll pad">
        <div className="card pad">
          <div className="row"><Icon n="sparkle" /><b className="grow">Claude AI 연결 (선택)</b>{st.settings.claudeKey ? <span className="tag ok">연결됨</span> : <span className="tag mute">꺼짐</span>}</div>
          <div className="small muted" style={{ margin: '6px 0 10px' }}>키를 넣으면 진짜 AI가 동작해요: 케이크 사진 분석(문구·장식까지), 한 줄 주문 채우기, 가격표 사진 읽기, 가게 소개글 쓰기. 키가 없으면 기기 안의 기본 분석으로 동작해요.</div>
          <input className="inp" type="password" value={key} onChange={(e) => setKey(e.target.value.trim())} placeholder="sk-ant-… (Anthropic 콘솔에서 발급)" autoComplete="off" />
          <div className="btns" style={{ marginTop: 8 }}>
            <button className="btn line sm" onClick={() => { setKey(''); save({ claudeKey: '' }); toast('AI 키를 지웠어요'); }}>지우기</button>
            <button className="btn dark sm" disabled={!key || busy === 'ai'} onClick={async () => {
              setBusy('ai');
              try { const r = await askClaude({ key, system: '한 단어로만 답해.', content: [{ type: 'text', text: '케이크를 한국어 한 단어로' }] }); save({ claudeKey: key }); toast(`연결 성공! (AI 답: ${String(r).slice(0, 12)})`); } catch (e) { toast(e.message, 4000); }
              setBusy('');
            }}>{busy === 'ai' ? '확인 중…' : '저장하고 연결 확인'}</button>
          </div>
          <div className="xs muted" style={{ marginTop: 8 }}>· 키는 이 기기(브라우저) 안에만 저장되고 깃허브·다른 곳에 올라가지 않아요.<br />· 사용료는 키 주인 계정에 청구돼요(사진 분석 1번에 수십 원 수준). 발표·시연용 기기에만 넣어 주세요.<br />· 모델: Claude Opus 5.5</div>
        </div>
        <div className="card pad" style={{ marginTop: 12 }}>
          <div className="row"><Icon n="map" /><b className="grow">카카오 지도 (선택)</b>{st.settings.kakaoKey ? <span className="tag ok">사용 중</span> : <span className="tag mute">기본 지도</span>}</div>
          <div className="small muted" style={{ margin: '6px 0 10px' }}>카카오 개발자 사이트에서 받은 <b>JavaScript 키</b>를 넣으면 카카오 지도와 카카오 장소 검색(전국 케이크 가게 찾기)을 써요. 사이트 도메인에 이 앱 주소를 등록해야 해요.</div>
          <input className="inp" value={kk} onChange={(e) => setKk(e.target.value.trim())} placeholder="카카오 JavaScript 키" autoComplete="off" />
          <div className="btns" style={{ marginTop: 8 }}>
            <button className="btn line sm" onClick={() => { setKk(''); save({ kakaoKey: '' }); toast('기본 지도로 바꿨어요'); }}>지우기</button>
            <button className="btn dark sm" disabled={!kk || busy === 'kk'} onClick={async () => { setBusy('kk'); try { await loadKakao(kk); save({ kakaoKey: kk }); toast('카카오 지도 연결 성공!'); } catch (e) { toast('연결 실패: 키와 등록한 도메인을 확인해 주세요', 4000); } setBusy(''); }}>{busy === 'kk' ? '확인 중…' : '저장하고 확인'}</button>
          </div>
        </div>
        <div className="card" style={{ padding: '0 14px', marginTop: 12 }}>
          <button className="list-row" onClick={() => { loadDemoShop(); toast('체험용 가게와 예시 주문을 다시 넣었어요'); nav('/o', { replace: true }); }}><Icon n="refresh" /><div className="grow"><div className="t">체험용 가게·예시 주문 다시 넣기</div><div className="s">사장님 화면 시연용</div></div></button>
          <button className="list-row" onClick={() => { if (confirm('이 기기에 저장된 모든 데이터(주문·가게·설정)를 지울까요?')) { resetAll(); nav('/role', { replace: true }); toast('처음 상태로 돌아갔어요'); } }}><Icon n="trash" /><div className="grow"><div className="t" style={{ color: 'var(--danger)' }}>모든 데이터 지우기</div></div></button>
        </div>
      </div>
    </div>
  );
}

export function About() {
  const detail = SEED_STORES.filter((s) => s.level === 'detail').length;
  return (
    <div className="screen">
      <Header title="앱 정보 · 데이터 출처" fallback="/c/my" />
      <div className="scroll pad">
        <div className="card pad row" style={{ gap: 12 }}><LogoBadge size={48} /><div><Wordmark size={22} sub /><div className="xs muted" style={{ marginTop: 6 }}>버전 0.1 · 비즈니스 데이터 시각화 프로젝트 프로토타입</div></div></div>
        <div className="sec-t"><h3>가게 정보는 어디서 왔나요?</h3></div>
        <div className="card pad small">
          수원시 커스텀·레터링 케이크 가게 <b>{SEED_STORES.length}곳</b>을 {SEED_UPDATED} 기준으로 공개 자료(다이닝코드·당근 비즈프로필·지역 목록 사이트·가게 SNS, 팀 직접 조사)에서 모았어요.
          <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
            <li>가격·운영 정보까지 확인: {detail}곳</li>
            <li>이름·주소만 확인(영업 여부 확인 필요): {SEED_STORES.length - detail}곳</li>
            <li>지도 위치는 주소를 OpenStreetMap으로 바꾼 값이라 일부는 대략이에요</li>
            <li>전화번호는 일부러 넣지 않았어요</li>
          </ul>
          다른 지역은 “이 근처 케이크 가게 더 찾기”로 공개 지도 데이터(또는 카카오 장소 검색)에서 찾아요.
        </div>
        <div className="sec-t"><h3>예상 가격은 어떻게 계산하나요?</h3></div>
        <div className="card pad small">
          <div className="kv"><span>사장님이 등록한 가게</span><b>가격표 그대로 (정확)</b></div>
          <div className="kv"><span>공개 가격이 있는 가게</span><b>공개 기본가 + 평균 추가금</b></div>
          <div className="kv"><span>정보가 없는 가게</span><b>수원 평균 범위</b></div>
          <div className="hr" />
          {SIZES.map((z) => <div key={z.id} className="kv"><span>{z.name} ({z.cm}cm) 평균</span><b>{range(BENCH[z.id][0], BENCH[z.id][1])}</b></div>)}
          <div className="xs muted" style={{ marginTop: 8 }}>{BENCH_NOTE} 추가금(하트 +1,000~3,000 · 포토 +5,000 · 스프링클 +1,000 · 그림 +5,000~ 등)은 공개 가격표·후기를 참고했어요. 실제 금액은 가게가 확정해요.</div>
        </div>
        <div className="sec-t"><h3>내 정보는 어디에 저장되나요?</h3></div>
        <div className="card pad small">지금은 서버가 없는 프로토타입이라 주문·가게 정보는 <b>이 기기 안에만</b> 저장돼요. 다른 폰으로는 ‘주문서 링크’로 전달해요. 실제 서비스로 만들 때는 회원가입·서버(DB)를 붙이면 돼요.</div>
        <div className="sec-t"><h3>사용한 공개 서비스</h3></div>
        <div className="card pad xs muted">지도: © OpenStreetMap 기여자, © CARTO · 주소 검색: Nominatim · 주변 가게 찾기: Overpass API · 글꼴: Pretendard, Google Fonts · AI(선택): Claude API, pollinations.ai(실사 이미지 베타)</div>
        <div style={{ height: 24 }} />
      </div>
    </div>
  );
}

// 다른 폰에서 보낸 주문서 링크 열기
export function SharedOrder({ params }) {
  const st = useApp();
  const [o, setO] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { decodeOrder(params.code).then(setO).catch(() => setErr('주문서 링크가 올바르지 않아요.')); }, [params.code]);
  if (err) return <div className="screen"><Header title="주문서" fallback="/" /><Empty icon="⚠️">{err}</Empty></div>;
  if (!o) return <div className="screen"><Header title="주문서" fallback="/" /><Loading /></div>;
  const x = o.o;
  const mineShop = st.shop && (st.shop.id === o.storeId || st.role === 'owner');
  const exists = st.orders.some((r) => r.id === o.id && r.storeId === (st.shop?.id || o.storeId));
  const importIt = () => {
    const now = new Date().toISOString();
    const order = { id: exists ? o.id + '-' + uid().slice(-3) : o.id, storeId: st.shop.id, storeName: st.shop.name, storeKind: 'partner', createdAt: o.createdAt || now, status: 'requested', o: x, refThumb: null, customer: o.customer, est: o.est || { lo: 0, hi: 0 }, checks: [], finalPrice: null, history: [{ at: now, by: 'customer', type: 'request', msg: '주문서 링크로 받은 요청이에요' }] };
    setState((s) => ({ ...s, orders: [order, ...s.orders] }));
    toast('주문함에 넣었어요');
    nav(`/o/order/${order.id}`, { replace: true });
  };
  const deco = [...(x.toppings || []).map((t) => optName(TOPPINGS, t)), ...(x.extras || []).map((t) => optName(EXTRAS, t))];
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
            <div className="kv"><span>맛·크림</span><b>{optName([...FLAVORS, ...RICE_FLAVORS], x.flavor)} · {creamOf(x.cream).name}</b></div>
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
          <div className="note" style={{ marginTop: 14 }}>사장님이라면 Dear Cake 사장님 모드에서 이 링크를 열면 주문함에 바로 넣을 수 있어요.
            <button className="btn sec block sm" style={{ marginTop: 8 }} onClick={() => { setState({ role: 'owner' }); if (!getState().shop) nav('/o/setup'); }}>사장님 모드로 열기</button>
          </div>
        )}
      </div>
    </div>
  );
}
