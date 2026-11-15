// 사장님 첫 등록 (3~4단계). 공개 정보가 있는 가게는 '우리 가게 찾기'로 미리 채워진다.
import { useMemo, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import { CakeView, toast } from '../../components/ui.jsx';
import { LogoBadge } from '../../components/Logo.jsx';
import { useApp, setState } from '../../lib/state.js';
import { nav } from '../../lib/router.js';
import { SEED_STORES } from '../../lib/stores.js';
import { loadDemoShop } from '../../lib/orders.js';
import { parseClosed, parseHours } from '../../lib/util.js';
import { NEW_SHOP } from '../../data/demo.js';
import { styleName } from '../../data/catalog.js';
import { InfoEditor, StylesEditor, MenuEditor, OpsEditor, LookEditor } from './Editors.jsx';
import { heroBg } from '../customer/Store.jsx';

export function fromSeed(s) {
  const shop = NEW_SHOP({
    id: s.id, claimed: true, name: s.name, gu: s.gu, dong: s.dong, addr: s.addr, lat: s.lat, lng: s.lng, geo: s.geo,
    insta: s.insta || '', kakao: s.kakao || '', styles: (s.styles || []).filter((x) => x !== 'custom').length ? s.styles.filter((x) => x !== 'custom') : ['lettering'], src: s.src,
  });
  if (s.price) for (const [k, v] of Object.entries(s.price)) if (k in shop.menu.sizes && v?.[0]) shop.menu.sizes[k] = v[0];
  if (s.addon) shop.menu.shapes = { ...shop.menu.shapes, ...s.addon };
  shop.ops.closedDays = parseClosed(s.closed);
  shop.ops.sameDay = !!s.sameDay;
  const h = parseHours(s.hours);
  if (h) { shop.ops.pickupStart = h.start; shop.ops.pickupEnd = h.end; }
  shop.hero = { ...shop.hero, design: s.styles?.includes('flower') ? 'flower' : 'vintage', cream: 'pink', text: '축하해' };
  return shop;
}

const STEPS = ['기본 정보', '가격표', '운영·마감', '꾸미기'];

export default function Setup() {
  const st = useApp();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(null);
  const [q, setQ] = useState('');
  const set = (p) => setDraft((d) => ({ ...d, ...(typeof p === 'function' ? p(d) : p) }));
  const found = useMemo(() => (q.trim().length >= 1 ? SEED_STORES.filter((s) => (s.name + s.dong + s.gu).replace(/\s/g, '').includes(q.replace(/\s/g, ''))).slice(0, 8) : []), [q]);
  const finish = () => {
    setState((s) => ({ ...s, role: 'owner', shop: { ...draft, updatedAt: new Date().toISOString() } }));
    toast('가게 등록 완료! 손님 지도에 바로 보여요');
    nav('/o', { replace: true });
  };
  if (step === 0 || !draft) {
    return (
      <div className="screen fade">
        <div className="scroll pad">
          <div className="row" style={{ marginTop: 'calc(10px + var(--st))' }}><LogoBadge size={34} /><b style={{ fontFamily: 'Fredoka', fontSize: 20, color: 'var(--p600)' }}>Dear Cake</b><span className="tag dark">사장님</span></div>
          <h2 style={{ fontSize: 24, margin: '22px 0 6px', letterSpacing: -0.5 }}>3분이면 가게 등록 끝!</h2>
          <p className="muted" style={{ margin: '0 0 18px' }}>가격표만 한 번 넣으면 손님은 가격을 먼저 보고 주문하고, 사장님은 <b>승인</b>만 누르면 돼요.</p>

          <div className="card pad">
            <div className="row"><span className="setrow" style={{ all: 'unset' }}><Icon n="search" /></span><b className="grow">우리 가게 찾아서 시작</b><span className="tag ok">추천</span></div>
            <div className="small muted" style={{ margin: '4px 0 10px' }}>수원 가게 {SEED_STORES.length}곳의 공개 정보(주소·가격·휴무)로 미리 채워 드려요. 틀린 부분만 고치면 돼요.</div>
            <input className="inp" value={q} onChange={(e) => setQ(e.target.value)} placeholder="가게 이름 검색 (예: 미도리, 홀리데이)" />
            {found.map((s) => (
              <button key={s.id} className="list-row" onClick={() => { setDraft(fromSeed(s)); setStep(1); toast('공개 정보로 미리 채웠어요. 확인해 주세요'); }}>
                <Icon n="store" /><div className="grow"><div className="t">{s.name}</div><div className="s">{s.gu} {s.dong} · {(s.styles || []).map(styleName).join(', ')}</div></div><Icon n="right" size="sm" />
              </button>
            ))}
            {q && !found.length && <div className="small muted" style={{ padding: '10px 2px' }}>목록에 없어요. 아래 ‘새로 등록하기’로 시작해 주세요.</div>}
          </div>
          <button className="setrow" style={{ marginTop: 10 }} onClick={() => { setDraft(NEW_SHOP({ lat: st.loc.lat, lng: st.loc.lng })); setStep(1); }}>
            <span className="ic"><Icon n="plus" /></span><div className="grow"><div className="t">새로 등록하기</div><div className="s">가게 이름·주소부터 차근차근</div></div><Icon n="right" size="sm" />
          </button>
          <button className="setrow" onClick={() => { loadDemoShop(); toast('체험용 가게예요. 예시 주문이 들어 있어요'); nav('/o', { replace: true }); }}>
            <span className="ic" style={{ background: '#2F2A33', color: '#fff' }}><Icon n="eye" /></span><div className="grow"><div className="t">체험용 가게로 둘러보기</div><div className="s">예시 주문·정산이 채워진 가게로 바로 보기</div></div><Icon n="right" size="sm" />
          </button>
          <div className="note" style={{ marginTop: 14 }}>
            <b>똑톡과 다른 점</b><br />· 주문서를 여러 개 만들 필요 없이 가격표 하나로 끝<br />· 규칙 안 주문은 자동 확정, 나머지는 ‘승인 / 수정 요청’ 두 버튼<br />· 손님은 지도·사진 추천으로 우리 가게를 찾아와요
          </div>
          <button className="btn ghost block" style={{ marginTop: 14 }} onClick={() => { setState({ role: 'customer' }); nav(st.seenGuide ? '/c' : '/guide', { replace: true }); }}>고객 모드로 돌아가기</button>
        </div>
      </div>
    );
  }
  const canNext = step !== 1 || draft.name.trim().length > 0;
  return (
    <div className="screen">
      <div className="hdr">
        <button className="ib" onClick={() => (step === 1 ? setStep(0) : setStep(step - 1))} aria-label="이전"><Icon n="back" /></button>
        <h1>가게 등록 {step}/4 · {STEPS[step - 1]}</h1>
      </div>
      <div className="wiz-steps" style={{ paddingTop: 10, background: '#fff' }}>{STEPS.map((_, i) => <i key={i} className={i < step ? 'on' : ''} />)}</div>
      <div className="scroll pad" style={{ paddingBottom: 100 }}>
        {step === 1 && (<>
          {draft.claimed && <div className="note ok" style={{ marginBottom: 12 }}>공개 정보로 미리 채웠어요. 사장님이 저장하면 손님 지도에 <b>⚡ 앱 주문 가능</b> 가게로 바뀌어요.</div>}
          <InfoEditor shop={draft} set={set} />
          <div className="lbl">우리 가게가 만드는 케이크</div>
          <StylesEditor shop={draft} set={set} />
        </>)}
        {step === 2 && (<>
          <MenuEditor shop={draft} set={set} compact />
          <div className="note" style={{ marginTop: 12 }}>모양·디자인·맛·토핑 추가금은 지역 평균값으로 미리 넣어 뒀어요. 등록 후 <b>내 가게 › 가격표</b>에서 언제든 바꿀 수 있어요.</div>
        </>)}
        {step === 3 && <OpsEditor shop={draft} set={set} />}
        {step === 4 && (<>
          <LookEditor shop={draft} set={set} />
          <div className="lbl">손님에게 이렇게 보여요</div>
          <div className="pv">
            <div style={{ ...heroBg(draft), height: 150, position: 'relative' }}><CakeView o={draft.hero} bg={false} fancy style={{ position: 'absolute', left: '50%', bottom: -4, width: 230, transform: 'translateX(-50%)' }} /></div>
            <div className="pad"><span className="tag dark">⚡ 디어 케이크 입점 · 앱 주문</span><div className="b" style={{ fontSize: 19, marginTop: 6 }}>{draft.name || '가게 이름'}</div><div className="small muted">{draft.gu} {draft.dong}</div><div className="small" style={{ marginTop: 6 }}>{draft.intro || '소개글을 써 주세요'}</div></div>
          </div>
        </>)}
      </div>
      <div className="stickybar" style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
        {step > 1 && <button className="btn line" onClick={() => setStep(step - 1)}>이전</button>}
        {step < 4 ? <button className="btn pri grow" disabled={!canNext} onClick={() => setStep(step + 1)}>{canNext ? '다음' : '가게 이름을 적어 주세요'}</button>
          : <button className="btn pri grow" onClick={finish}><Icon n="check" size="sm" /> 등록 완료</button>}
      </div>
    </div>
  );
}
