// 종이 주문서: 손님이 보낸 주문을 한 장의 종이처럼 한눈에 (사장님 첫 화면 · 주문 대화방)
// · 손님이 문구를 한 글자씩 확인했으면 문구 옆에 '손님 확인' 도장 + 확인 시각
// · 손님이 주문을 고쳤으면 아래에 '변경 기록' (예: 문구 Happy Birthday → HBD 지수 · 11/25 14:02)
// · zoom: 크게 보기 — 모든 칸 + 문구 한 글자씩 + 금액 내역
import OrderThumb from './OrderThumb.jsx';
import { sizeOf, designOf, creamOf, fontOf, textColorOf, optName, SHAPES } from '../data/catalog.js';
import { flavorName, decoList } from '../lib/ordertext.js';
import { range, won, mdDate, maskName, maskPhone, ago } from '../lib/util.js';

const p2 = (n) => String(n).padStart(2, '0');
export const mdhm = (at) => { const d = new Date(at); return `${d.getMonth() + 1}/${d.getDate()} ${p2(d.getHours())}:${p2(d.getMinutes())}`; };

export default function OrderPaper({ order, compact = false, zoom = false, sumLabel = null }) {
  const x = order.o;
  const ai = x.pickName === 'AI로 만든 케이크';
  const deco = decoList(x);
  const full = !compact || zoom;
  const ok = x.textOk && !x.noText;
  const lettering = x.noText ? '문구 없음' : (
    <>
      <span>“{x.text}”</span>
      {ok && <span className="okstamp" title="손님이 한 글자씩 확인했어요"><i>손님 확인</i><small>{mdhm(x.textOk)}</small></span>}
    </>
  );
  const rows = [
    ['디자인', x.pickName || (order.imgs?.ref ? '손님이 올린 사진' : designOf(x.design).name)],
    ['케이크', `${zoom ? optName(SHAPES, x.shape) + ' · ' : ''}${sizeOf(x.size).name}(${sizeOf(x.size).cm}cm) · ${flavorName(x)}`],
    full && ['크림', creamOf(x.cream).name],
    ['레터링', lettering],
    zoom && !x.noText && x.text && ['한 글자씩', [...x.text].map((c) => (c === ' ' ? '␣' : c)).join(' ')],
    full && !x.noText && ['글씨', `${fontOf(x.font).name}체 · ${textColorOf(x.textColor).name}`],
    full && deco.length > 0 && ['장식·추가', deco.join(', ')],
    x.plateText && ['판 문구', `“${x.plateText}”`],
    ['픽업', `${mdDate(x.date)} ${x.time}`],
    x.request && ['요청사항', x.request],
    x.allergy && ['알레르기', x.allergy],
    full && ['주문하는 분', `${zoom ? order.customer?.name || '' : maskName(order.customer?.name)}${order.customer?.phone ? ` · ${zoom ? order.customer.phone : maskPhone(order.customer.phone)}` : ''}`],
    zoom && order.src === 'kakao' && ['받은 곳', '카톡 주문 붙여넣기'],
  ].filter(Boolean);
  // 변경 기록 (손님이 주문을 고친 것)
  // 손님이 고친 것(revise) + 사장님이 수정 제안한 것(change, '사장님' 표시)
  const log = (order.ev || []).filter((e) => e.t === 'revise' || e.t === 'change').flatMap((e) => {
    const who = e.t === 'change' ? '사장님 ' : '';
    if (e.changes?.length) return e.changes.map((c, i) => ({ id: e.id + i, at: e.at, k: who + c.k, from: c.from, to: c.to }));
    return e.t === 'revise' && e.summary ? [{ id: e.id, at: e.at, k: '', from: '', to: e.summary }] : [];
  });
  const lines = zoom ? (order.est?.lines || []).filter((l) => l.lo) : [];
  return (
    <div className={`paper ${compact && !zoom ? 'compact' : ''} ${zoom ? 'zoom' : ''}`}>
      <div className="pp-head">
        <span className="pp-t">주문서</span>
        <span className="grow" />
        <small>{order.sample ? '예시 · ' : ''}{order.src === 'kakao' ? '카톡 주문 · ' : ''}{ago(order.createdAt)} {order.src === 'kakao' ? '입력' : '도착'}</small>
      </div>
      <div className="pp-who"><b>{order.customer?.name ? `${zoom ? order.customer.name : maskName(order.customer.name)}님` : '손님'}</b><small>No. {order.id}</small></div>
      <div className="pp-img"><OrderThumb order={order} />{ai && <span className="ai">AI로 만든 케이크</span>}</div>
      <div className="pp-rows">{rows.map(([k, v]) => <div key={k} className={`pp-row ${k === '알레르기' ? 'warn' : ''}`}><span>{k}</span><b>{v}</b></div>)}</div>
      {lines.length > 0 && <div className="pp-lines">{lines.map((l, i) => <div key={i}><span>{l.label}</span><span>{range(l.lo, l.hi)}</span></div>)}</div>}
      <div className="pp-sum">
        <span>{sumLabel || (order.finalPrice != null ? '확정 금액' : '예상가')}</span>
        <b>{order.finalPrice != null ? won(order.finalPrice) : range(order.est?.lo, order.est?.hi)}</b>
      </div>
      {log.length > 0 && (
        <div className="pp-log">
          <b>변경 기록</b>
          {log.map((c) => <div key={c.id}><span>{c.k && <em>{c.k}</em>}{c.from ? <>{c.from} <i>→</i> </> : null}<strong>{c.to}</strong></span><small>{mdhm(c.at)}</small></div>)}
        </div>
      )}
    </div>
  );
}
