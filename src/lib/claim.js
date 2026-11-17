// 공개 정보가 있는 실제 가게를 '내 가게'로 등록할 때, 알려진 정보로 미리 채운다
import { NEW_SHOP } from '../data/demo.js';
import { parseClosed, parseHours } from './util.js';

export function fromSeed(s) {
  const styles = (s.styles || []).filter((x) => x !== 'custom');
  const shop = NEW_SHOP({
    id: s.id, claimed: true, name: s.name, gu: s.gu || '', dong: s.dong || '', addr: s.addr || '', lat: s.lat, lng: s.lng, geo: s.geo,
    insta: s.insta || '', kakao: s.kakao || '', styles: styles.length ? styles : ['lettering'], src: s.src,
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
