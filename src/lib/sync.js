// 다른 폰과 주문·채팅 주고받기 (서버 없이).
// - 공개 중계 서비스(ntfy.sh)를 '우체통'으로만 쓰고, 내용은 기기에서 암호화(AES-GCM / ECDH)해서 보낸다 → 중계 서버는 내용을 읽을 수 없다.
// - 가게마다 '받은편지함(inbox)'과 공개키가 있고(주문 링크·QR에 들어 있음), 주문마다 손님·사장님 둘만 아는 '대화방(chan)'이 생긴다.
// - 중계 서버는 메시지를 12시간만 보관한다. 실제 서비스에서는 자체 서버로 바꾸면 된다(docs/실서비스-전환.md).
const RELAY = 'https://ntfy.sh';
const PART = 2800; // 메시지 1개 최대 4KB → 조각으로 나눠 보냄

const te = new TextEncoder(), td = new TextDecoder();
export const b64u = (bytes) => { let s = ''; const b = new Uint8Array(bytes); for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
export const unb64u = (str) => Uint8Array.from(atob(str.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
const rand = (n) => crypto.getRandomValues(new Uint8Array(n));
export const randTopic = () => 'dc' + Array.from(rand(20), (b) => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('');
export const randKey = () => b64u(rand(32));
export const uid8 = () => b64u(rand(6));

async function pipe(bytes, stream) { return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer()); }
async function zip(str) { const b = te.encode(str); if (typeof CompressionStream === 'undefined') return { z: 0, b }; try { return { z: 1, b: await pipe(b, new CompressionStream('deflate-raw')) }; } catch { return { z: 0, b }; } }
async function unzip(z, b) { return td.decode(z ? await pipe(b, new DecompressionStream('deflate-raw')) : b); }

// ── 압축해서 링크에 넣기 ──
export async function pack(obj) { const { z, b } = await zip(JSON.stringify(obj)); return (z ? 'z' : 'j') + b64u(b); }
export async function unpack(code) { return JSON.parse(await unzip(code[0] === 'z' ? 1 : 0, unb64u(code.slice(1)))); }

// ── 암호화 ──
const aesKey = (k) => crypto.subtle.importKey('raw', typeof k === 'string' ? unb64u(k) : k, 'AES-GCM', false, ['encrypt', 'decrypt']);
async function seal(key, obj) {
  const { z, b } = await zip(JSON.stringify(obj));
  const iv = rand(12);
  const c = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, b);
  return `${z}.${b64u(iv)}.${b64u(c)}`;
}
async function open(key, str) {
  const [z, iv, c] = str.split('.');
  return JSON.parse(await unzip(+z, new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64u(iv) }, key, unb64u(c)))));
}
export const sealSym = async (k, obj) => seal(await aesKey(k), obj);
export const openSym = async (k, str) => open(await aesKey(k), str);

const EC = { name: 'ECDH', namedCurve: 'P-256' };
export async function genShopKeys() {
  const kp = await crypto.subtle.generateKey(EC, true, ['deriveBits']);
  const pub = await crypto.subtle.exportKey('jwk', kp.publicKey), priv = await crypto.subtle.exportKey('jwk', kp.privateKey);
  return { pub: { x: pub.x, y: pub.y }, priv, inbox: randTopic() };
}
const pubKey = (p) => crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: p.x, y: p.y, ext: true }, EC, false, []);
async function shared(privKey, pubJwk) { return aesKey(new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: await pubKey(pubJwk) }, privKey, 256))); }
// 가게 공개키로 잠그기 (가게만 열 수 있음)
export async function sealForShop(pub, obj) {
  const eph = await crypto.subtle.generateKey(EC, true, ['deriveBits']);
  const ej = await crypto.subtle.exportKey('jwk', eph.publicKey);
  return `${ej.x}.${ej.y}.${await seal(await shared(eph.privateKey, pub), obj)}`;
}
export async function openForShop(privJwk, str) {
  const [x, y, ...rest] = str.split('.');
  const priv = await crypto.subtle.importKey('jwk', privJwk, EC, false, ['deriveBits']);
  return open(await shared(priv, { x, y }), rest.join('.'));
}

// ── 보내기 (조각 나눠서) ──
async function postRaw(topic, body) {
  const res = await fetch(`${RELAY}/${topic}`, { method: 'POST', body });
  if (!res.ok) throw new Error('relay ' + res.status);
}
export async function send(topic, str) {
  const m = uid8(), n = Math.ceil(str.length / PART);
  for (let i = 0; i < n; i++) await postRaw(topic, JSON.stringify({ m, i, n, d: str.slice(i * PART, (i + 1) * PART) }));
}

// ── 받기 ──
const partial = new Map(); // m → { n, parts[], got }
const seenMsg = new Set();
function feed(raw) {
  // raw: ntfy 메시지 { id, topic, message }
  if (!raw || raw.event !== 'message' || seenMsg.has(raw.id)) return null;
  seenMsg.add(raw.id);
  if (seenMsg.size > 4000) { const it = seenMsg.values(); for (let i = 0; i < 1000; i++) seenMsg.delete(it.next().value); }
  let p; try { p = JSON.parse(raw.message); } catch { return null; }
  if (!p || typeof p.m !== 'string' || !(p.n >= 1) || p.n > 60) return null;
  let e = partial.get(p.m);
  if (!e) { e = { n: p.n, parts: new Array(p.n), got: 0 }; partial.set(p.m, e); }
  if (e.parts[p.i] == null) { e.parts[p.i] = p.d; e.got++; }
  if (e.got < e.n) return null;
  partial.delete(p.m);
  return { topic: raw.topic, str: e.parts.join('') };
}
// 한 번 읽어 오기 (최근 12시간)
export async function poll(topic) {
  const res = await fetch(`${RELAY}/${topic}/json?poll=1&since=12h`);
  if (!res.ok) throw new Error('relay ' + res.status);
  const out = [];
  for (const line of (await res.text()).split('\n')) { if (!line.trim()) continue; try { const f = feed(JSON.parse(line)); if (f) out.push(f); } catch { /* 깨진 줄 무시 */ } }
  return out;
}
// 계속 듣기: topics 가 바뀌면 다시 호출. 반환값을 부르면 끊는다.
let es = null, esKey = '';
export function listen(topics, onMsg, onState) {
  const key = topics.slice().sort().join(',');
  if (key === esKey && es && es.readyState !== 2) return;
  if (es) { es.close(); es = null; }
  esKey = key;
  if (!topics.length) { onState?.('off'); return; }
  es = new EventSource(`${RELAY}/${key}/sse?since=12h`);
  es.onopen = () => onState?.('on');
  es.onerror = () => onState?.(navigator.onLine === false ? 'offline' : 'retry');
  es.onmessage = (ev) => { try { const f = feed(JSON.parse(ev.data)); if (f) onMsg(f); } catch { /* 무시 */ } };
}
export function stopListen() { if (es) { es.close(); es = null; esKey = ''; } }
