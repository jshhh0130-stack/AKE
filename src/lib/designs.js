// 가게 대표 디자인 (11/23 UI): 가게 화면 '이런 케이크를 만들어요'와 주문서 1단계 '디자인 고르기'가 같은 목록을 쓴다.
// 사장님이 올린 작품(사진·시안)이 있으면 그것, 없으면 가게 스타일로 그린 예시 5개.
// 주문에는 고른 디자인의 id·이름만 담는다(사진은 사장님 가게에 이미 있으니 크게 보내지 않음).
import { storeLook } from './cake.js';
import { estimate } from './price.js';
import { getState } from './state.js';
import { designOf, creamOf, sizeOf } from '../data/catalog.js';
import { cakePhotos, photoName } from './shopPhotos.js';

const BASE = { size: 'h1', shape: 'round', design: 'simple', cream: 'white', flavor: 'vanilla', text: 'a', toppings: [], extras: [] };

export function storeDesigns(s) {
  if (!s) return [];
  // 작품 사진(work)은 위쪽 사진·관심에만, 대표 디자인은 나머지. opt 가 있으면 그 크기·디자인으로 가격을 계산
  const own = (s.portfolio || []).filter((p) => (p.src || p.design) && !p.work).map((p, i) => ({ id: p.id || `p${i}`, name: p.caption || '대표 디자인', src: p.src || null, design: p.design || null, opt: p.opt || null, real: true, sample: !!p.sample }));
  // 팀이 모은 가게 케이크 사진 (출처 표시) — 사장님 작품이 없으면 이것을 대표 디자인으로
  const shop = own.length ? [] : cakePhotos(s).map((p) => ({ id: `sp${p.n}`, name: photoName(p), src: p.url, thumb: p.thumb, design: null, real: true, shopPhoto: true, credit: p.credit, link: p.src }));
  const seen = {};
  const list = own.length ? own : shop.length ? shop : Array.from({ length: 5 }, (_, k) => {
    const d = storeLook(s, k);
    let name = `${designOf(d.design).name} · ${creamOf(d.cream).name}`;
    if (seen[name]) name = `${name} ${sizeOf(d.size).name}`; // 같은 이름이면 크기로 구분
    seen[name] = 1;
    return { id: `g${k}`, name, design: d, gen: true };
  });
  return list.map((x) => {
    const o = { ...BASE, ...(x.design || x.opt || {}) };
    return { ...x, size: o.size, price: estimate(s, o).lo };
  });
}

export const manwon = (v) => (v == null ? '' : `${Math.round(v / 1000) / 10}만원`);
export const designLabel = (d) => `${sizeOf(d.size).name} ${manwon(d.price)}`;

// 주문 썸네일 사진: 손님이 올린 참고 사진 → 고른 대표 디자인 사진(이 기기에 있으면) → 없으면 null(앱 그림을 그린다)
export function orderPhoto(order) {
  if (!order) return null;
  if (order.imgs?.ref) return order.imgs.ref;
  const id = order.o?.pickId;
  if (!id) return null;
  const st = getState();
  const pf = (st.shop?.id === order.storeId ? st.shop.portfolio : st.partners?.[order.storeId]?.portfolio) || [];
  return pf.find((p) => p.id === id)?.src || null;
}
