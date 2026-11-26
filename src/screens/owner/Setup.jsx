// 사장님 첫 등록 (4단계). 공개 정보가 있는 가게는 '우리 가게 찾기'로 미리 채워진다.
import { useMemo, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import { CakeView, toast, Toggle } from '../../components/ui.jsx';
import { Logo } from '../../components/Logo.jsx';
import { useApp, setState } from '../../lib/state.js';
import { nav } from '../../lib/router.js';
import { SEED_STORES } from '../../lib/stores.js';
import { addSampleOrders } from '../../lib/orders.js';
import { fromSeed } from '../../lib/claim.js';
import { NEW_SHOP } from '../../data/demo.js';
import { styleName } from '../../data/catalog.js';
import { InfoEditor, StylesEditor, MenuEditor, OpsEditor, LookEditor } from './Editors.jsx';
import { heroBg } from '../customer/Store.jsx';

const STEPS = ['기본 정보', '가격표', '운영·마감']; // 11/26 '꾸미기' 단계는 없앴다

export default function Setup() {
  const st = useApp();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(null);
  const [q, setQ] = useState('');
  const [sample, setSample] = useState(false);
  const set = (p) => setDraft((d) => ({ ...d, ...(typeof p === 'function' ? p(d) : p) }));
  const found = useMemo(() => (q.trim().length >= 1 ? SEED_STORES.filter((s) => (s.name + s.dong + s.gu).replace(/\s/g, '').includes(q.replace(/\s/g, ''))).slice(0, 8) : []), [q]);
  const finish = () => {
    setState((s) => ({ ...s, role: 'owner', shop: { ...draft, updatedAt: new Date().toISOString() }, shopKeys: null }));
    if (sample) addSampleOrders();
    toast('가게 등록 완료! 주문 링크·QR을 손님에게 알려 주세요');
    nav('/o', { replace: true });
  };
  if (step === 0 || !draft) {
    return (
      <div className="screen fade">
        <div className="scroll pad">
          <div className="row" style={{ marginTop: 'calc(10px + var(--st))' }}><Logo h={26} /><span className="tag dark">사장님</span></div>
          <h2 style={{ fontSize: 24, margin: '22px 0 6px', letterSpacing: -0.5 }}>3분이면 가게 등록 끝!</h2>
          <p className="muted" style={{ margin: '0 0 18px' }}>가격표만 한 번 넣으면 손님은 가격을 먼저 보고 주문하고, 사장님은 <b>승인</b>만 누르면 돼요.</p>

          <div className="card pad">
            <div className="row"><Icon n="search" /><b className="grow">우리 가게 찾아서 시작</b><span className="tag ok">추천</span></div>
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
          <div className="note" style={{ marginTop: 14, lineHeight: 1.7 }}>
            <b>이렇게 돼요</b><br />① 가격표 한 번 입력 → 손님 주문서에 정확한 가격<br />② 주문 링크·QR을 인스타에 걸기 → 손님 폰에서 주문이 <b>실시간으로</b> 도착<br />③ 규칙 안 주문은 자동 확정, 나머지는 ‘승인 / 수정 제안’ + 대화방
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
        <h1>가게 등록 {step}/{STEPS.length} · {STEPS[step - 1]}</h1>
      </div>
      <div className="wiz-steps" style={{ paddingTop: 10, background: '#fff' }}>{STEPS.map((_, i) => <i key={i} className={i < step ? 'on' : ''} />)}</div>
      <div className="scroll pad" style={{ paddingBottom: 100 }}>
        {step === 1 && (<>
          {draft.claimed && <div className="note ok" style={{ marginBottom: 12 }}>공개 정보로 미리 채웠어요. 저장하면 이 가게가 <b>앱 주문 가능</b> 가게로 바뀌어요.</div>}
          <InfoEditor shop={draft} set={set} />
          <div className="lbl">우리 가게가 만드는 케이크</div>
          <StylesEditor shop={draft} set={set} />
        </>)}
        {step === 2 && (<>
          <MenuEditor shop={draft} set={set} compact />
          <div className="note" style={{ marginTop: 12 }}>모양·디자인·맛·토핑 추가금은 지역 평균값으로 미리 넣어 뒀어요. 등록 후 <b>내 가게 › 가격표</b>에서 언제든 바꿀 수 있어요.</div>
        </>)}
        {step === 3 && (<>
          <OpsEditor shop={draft} set={set} />
          <div className="card pad row" style={{ marginTop: 12 }}><span className="grow"><b className="small">예시 주문 넣어서 둘러보기</b><div className="xs muted">주문·매출 화면이 어떻게 보이는지 미리 볼 수 있어요. 언제든 지울 수 있어요.</div></span><Toggle on={sample} onChange={setSample} label="예시 주문" /></div>
        </>)}
      </div>
      <div className="stickybar" style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
        {step > 1 && <button className="btn line" onClick={() => setStep(step - 1)}>이전</button>}
        {step < STEPS.length ? <button className="btn pri grow" disabled={!canNext} onClick={() => setStep(step + 1)}>{canNext ? '다음' : '가게 이름을 적어 주세요'}</button>
          : <button className="btn pri grow" onClick={finish}><Icon n="check" size="sm" /> 등록 완료</button>}
      </div>
    </div>
  );
}
