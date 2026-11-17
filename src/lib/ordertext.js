// 주문을 그림(시안)·글(카톡에 붙여 넣는 주문서)로 바꾸기
import { range, fmtDate } from './util.js';
import { SHAPES, FLAVORS, RICE_FLAVORS, TOPPINGS, EXTRAS, sizeOf, designOf, creamOf, fontOf, textColorOf, optName } from '../data/catalog.js';

export const orderView = (order) => ({ ...order.o, text: order.o.noText ? '' : order.o.text, photo: order.o.design === 'photo' ? order.imgs?.ref : undefined });
export const decoList = (o) => [...(o.toppings || []).map((t) => optName(TOPPINGS, t)), ...(o.extras || []).map((t) => optName(EXTRAS, t))];
export const flavorName = (o) => optName([...FLAVORS, ...RICE_FLAVORS], o.flavor);
export function orderText(order, link) {
  const o = order.o;
  const deco = decoList(o);
  return [
    `[디어 케이크 주문서] ${order.id}`,
    `· 성함/연락처: ${order.customer?.name || ''}${order.customer?.phone ? ' / ' + order.customer.phone : ''}`,
    `· 픽업: ${fmtDate(o.date)} ${o.time || ''}`,
    `· 케이크: ${sizeOf(o.size).name}(${sizeOf(o.size).cm}cm) ${optName(SHAPES, o.shape)} / ${designOf(o.design).name}`,
    `· 맛/크림: ${flavorName(o)} / ${creamOf(o.cream).name}`,
    `· 문구: ${o.noText ? '없음' : `"${o.text}" (${fontOf(o.font).name}체, ${textColorOf(o.textColor).name})`}`,
    deco.length ? `· 장식/추가: ${deco.join(', ')}${o.plateText ? ` (판 문구: ${o.plateText})` : ''}` : null,
    o.request ? `· 요청사항: ${o.request}` : null,
    o.allergy ? `· 알레르기: ${o.allergy}` : null,
    order.gift ? `· 선물: 받는 분 ${order.gift.to}님이 픽업해요` : null,
    `· 예상 금액: ${range(order.est?.lo, order.est?.hi)} (디어 케이크 계산)`,
    link ? `· 시안 보기: ${link}` : null,
  ].filter(Boolean).join('\n');
}
