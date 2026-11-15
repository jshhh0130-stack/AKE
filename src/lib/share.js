// 주문서를 링크 하나로 만들기 (서버 없이 다른 폰으로 전달) — 사진은 링크에 넣지 않는다
const b64u = (bytes) => { let s = ''; bytes.forEach((b) => { s += String.fromCharCode(b); }); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb64u = (str) => { const s = atob(str.replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(s, (c) => c.charCodeAt(0)); };
async function pipe(bytes, stream) { return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer()); }

export async function encodeOrder(order) {
  const { o, customer, est } = order;
  const slim = {
    v: 1, id: order.id, s: order.storeId, sn: order.storeName, at: order.createdAt,
    o: { ...o, refPhoto: undefined },
    c: customer ? { n: customer.name, p: customer.phone } : null,
    e: est ? [est.lo, est.hi, est.basis] : null,
  };
  const bytes = new TextEncoder().encode(JSON.stringify(slim));
  if (typeof CompressionStream !== 'undefined') {
    try { return 'z' + b64u(await pipe(bytes, new CompressionStream('deflate-raw'))); } catch { /* 아래로 */ }
  }
  return 'j' + b64u(bytes);
}
export async function decodeOrder(code) {
  const kind = code[0], body = unb64u(code.slice(1));
  const bytes = kind === 'z' ? await pipe(body, new DecompressionStream('deflate-raw')) : body;
  const x = JSON.parse(new TextDecoder().decode(bytes));
  return {
    id: x.id, storeId: x.s, storeName: x.sn, createdAt: x.at, o: x.o,
    customer: x.c ? { name: x.c.n, phone: x.c.p } : null,
    est: x.e ? { lo: x.e[0], hi: x.e[1], basis: x.e[2] } : null,
  };
}
// 선물 카드 링크 (받는 분에게): 연락처는 넣지 않는다
async function pack(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  if (typeof CompressionStream !== 'undefined') { try { return 'z' + b64u(await pipe(bytes, new CompressionStream('deflate-raw'))); } catch { /* 아래로 */ } }
  return 'j' + b64u(bytes);
}
async function unpack(code) {
  const body = unb64u(code.slice(1));
  const bytes = code[0] === 'z' ? await pipe(body, new DecompressionStream('deflate-raw')) : body;
  return JSON.parse(new TextDecoder().decode(bytes));
}
export async function giftLink(order) {
  const code = await pack({ v: 1, s: order.storeId, sn: order.storeName, o: { ...order.o, refPhoto: undefined }, g: { to: order.gift?.to || '', msg: order.gift?.msg || '', from: order.gift?.from || order.customer?.name || '' } });
  return `${appBase()}#/g/${code}`;
}
export async function decodeGift(code) { const x = await unpack(code); return { storeId: x.s, storeName: x.sn, o: x.o, gift: x.g }; }
export const appBase = () => location.href.split('#')[0];
export async function orderLink(order) { return `${appBase()}#/s/${await encodeOrder(order)}`; }
