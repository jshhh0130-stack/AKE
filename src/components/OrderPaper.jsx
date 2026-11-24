// 종이 주문서: 손님이 보낸 주문을 한 장의 종이처럼 한눈에 (사장님 첫 화면 · 주문 대화방 첫 단계)
import OrderThumb from './OrderThumb.jsx';
import { sizeOf, designOf, creamOf, fontOf, textColorOf } from '../data/catalog.js';
import { flavorName, decoList } from '../lib/ordertext.js';
import { range, mdDate, maskName, maskPhone, ago } from '../lib/util.js';

export default function OrderPaper({ order, compact = false }) {
  const x = order.o;
  const ai = x.pickName === 'AI로 만든 케이크';
  const deco = decoList(x);
  const rows = [
    ['디자인', x.pickName || (order.imgs?.ref ? '손님이 올린 사진' : designOf(x.design).name)],
    ['케이크', `${sizeOf(x.size).name}(${sizeOf(x.size).cm}cm) · ${flavorName(x)}`],
    !compact && ['크림', creamOf(x.cream).name],
    ['레터링', x.noText ? '문구 없음' : `“${x.text}”`],
    !compact && !x.noText && ['글씨', `${fontOf(x.font).name}체 · ${textColorOf(x.textColor).name}`],
    !compact && deco.length > 0 && ['장식·추가', deco.join(', ')],
    ['픽업', `${mdDate(x.date)} ${x.time}`],
    x.request && ['요청사항', x.request],
    x.allergy && ['알레르기', x.allergy],
    !compact && ['주문하는 분', `${maskName(order.customer?.name)}${order.customer?.phone ? ` · ${maskPhone(order.customer.phone)}` : ''}`],
  ].filter(Boolean);
  return (
    <div className={`paper ${compact ? 'compact' : ''}`}>
      <div className="pp-head">
        <span className="pp-t">주문서</span>
        <span className="grow" />
        <small>{order.sample ? '예시 · ' : ''}{ago(order.createdAt)} 도착</small>
      </div>
      <div className="pp-who"><b>{maskName(order.customer?.name)}님</b><small>No. {order.id}</small></div>
      <div className="pp-img"><OrderThumb order={order} />{ai && <span className="ai">AI로 만든 케이크</span>}</div>
      <div className="pp-rows">{rows.map(([k, v]) => <div key={k} className="pp-row"><span>{k}</span><b>{v}</b></div>)}</div>
      <div className="pp-sum"><span>예상 금액</span><b>{range(order.est?.lo, order.est?.hi)}</b></div>
    </div>
  );
}
