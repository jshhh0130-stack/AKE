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
    `[에이크 주문서] ${order.id}`,
    `· 성함/연락처: ${order.customer?.name || ''}${order.customer?.phone ? ' / ' + order.customer.phone : ''}`,
    `· 픽업: ${fmtDate(o.date)} ${o.time || ''}`,
    `· 케이크: ${sizeOf(o.size).name}(${sizeOf(o.size).cm}cm) ${optName(SHAPES, o.shape)} / ${designOf(o.design).name}`,
    `· 맛/크림: ${flavorName(o)} / ${creamOf(o.cream).name}`,
    `· 문구: ${o.noText ? '없음' : `"${o.text}" (${fontOf(o.font).name}체, ${textColorOf(o.textColor).name})`}`,
    deco.length ? `· 장식/추가: ${deco.join(', ')}${o.plateText ? ` (판 문구: ${o.plateText})` : ''}` : null,
    o.request ? `· 요청사항: ${o.request}` : null,
    o.allergy ? `· 알레르기: ${o.allergy}` : null,
    order.gift ? `· 선물: 받는 분 ${order.gift.to}님이 픽업해요` : null,
    `· 예상 금액: ${range(order.est?.lo, order.est?.hi)} (에이크 계산)`,
    link ? `· 시안 보기: ${link}` : null,
  ].filter(Boolean).join('\n');
}

// 픽업 전 안내 (사장님이 복사해서 카톡으로 보낸다 — 자동 발송은 하지 않는다)
export const candleText = (o) => o.candles || (o.extras?.includes('numcandle') ? '숫자 초' : o.extras?.includes('candle') ? '기본 초' : '없음');
export function pickupNotice(order, shop) {
  const o = order.o;
  return [
    `[${shop?.name || order.storeName}] ${order.customer?.name ? `${order.customer.name}님, ` : ''}케이크 픽업 안내예요 🎂`,
    `· 픽업: ${fmtDate(o.date)} ${o.time || ''}`,
    shop?.addr ? `· 장소: ${shop.addr}` : null,
    `· 케이크: ${sizeOf(o.size).name} ${flavorName(o)}${o.noText ? '' : ` / “${o.text}”`}`,
    `· 초: ${candleText(o)}`,
    '· 보관: 받으시면 바로 냉장 보관해 주세요. 드시기 20~30분 전에 꺼내 두면 더 맛있어요.',
    '· 30분 넘게 이동하시면 보냉백을 챙겨 주세요.',
    '늦으시면 미리 연락 부탁드려요!',
  ].filter(Boolean).join('\n');
}
