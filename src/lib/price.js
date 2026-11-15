// 예상 가격 계산 + 가게 규칙 확인
// - 사장님이 등록한 가게(menu 있음): 가격표 그대로 → 정확한 금액
// - 공개 가격이 있는 가게: 공개 기본가 + 지역 평균 추가금 → 범위
// - 정보가 없는 가게: 수원 평균 범위
import { BENCH, SIZE_MULT, SHAPES, DESIGNS, FLAVORS, RICE_FLAVORS, CREAM_ADD, TOPPINGS, EXTRAS, LONG_TEXT_ADD, sizeOf, creamOf, designOf, styleName } from '../data/catalog.js';
import { round500, textLen, fmtDate } from './util.js';
import { dayStatus, leadDaysOf } from './stores.js';

const r5 = (n) => round500(n);

export function estimate(store, o) {
  const lines = [];
  const menu = store?.menu || null;
  const size = o.size || 'h1';
  const mult = SIZE_MULT[size] ?? 1;
  let lo = 0, hi = 0, basis = menu ? 'menu' : 'bench';
  const add = (label, a, b = a, extra = {}) => {
    if (a == null) return;
    lo += a; hi += b;
    lines.push({ label, lo: a, hi: b, ...extra });
  };
  const scaled = (rg, scale = true) => [r5(rg[0] * (scale ? mult : 1)), r5(rg[1] * (scale ? mult : 1))];

  // 1) 기본가
  const sName = sizeOf(size).name;
  if (menu) {
    const p = menu.sizes?.[size];
    if (p != null) add(`${sName} 기본`, p);
    else { const [a, b] = BENCH[size]; add(`${sName} 기본 (가격표에 없음 · 평균)`, a, b, { warn: true }); }
  } else if (store?.price?.[size]) {
    const [a, b] = store.price[size];
    basis = 'public';
    add(`${sName} 기본 · 가게 공개가`, a, b ?? r5(a * 1.12));
  } else {
    const [a, b] = BENCH[size];
    add(`${sName} 기본 · 수원 평균`, a, b);
  }
  // 2) 모양
  if (o.shape && o.shape !== 'round') {
    const sh = SHAPES.find((x) => x.id === o.shape);
    const known = menu?.shapes?.[o.shape] ?? store?.addon?.[o.shape];
    if (known != null) add(`${sh.name} 모양`, known);
    else add(`${sh.name} 모양`, sh.add[0], sh.add[1]);
  }
  // 3) 디자인
  const d = designOf(o.design);
  if (d.id !== 'simple') {
    const known = menu?.designs?.[d.id];
    if (known != null) add(d.name, known);
    else { const [a, b] = scaled(d.add, d.id !== 'photo'); add(d.name, a, b); }
  }
  // 4) 맛
  const fl = [...FLAVORS, ...RICE_FLAVORS].find((x) => x.id === o.flavor);
  if (fl && fl.add[1] > 0) {
    const known = menu?.flavors?.[fl.id];
    if (known != null) { if (known > 0) add(`${fl.name} 맛`, known); }
    else { const [a, b] = scaled(fl.add); add(`${fl.name} 맛`, a, b); }
  }
  // 5) 크림 색
  const cr = creamOf(o.cream);
  if (cr.tone !== 'base') {
    const known = menu?.creams?.[cr.tone];
    if (known != null) { if (known > 0) add(`${cr.name} 크림`, known); }
    else { const [a, b] = CREAM_ADD[cr.tone]; if (b > 0) add(`${cr.name} 크림`, a, b); }
  }
  // 6) 긴 문구
  const limit = sizeOf(size).limit;
  if (!o.noText && textLen(o.text) > limit) {
    const known = menu?.longText;
    if (known != null) add(`긴 문구 (${limit}자 초과)`, known); else add(`긴 문구 (${limit}자 초과)`, LONG_TEXT_ADD[0], LONG_TEXT_ADD[1]);
  }
  // 7) 토핑·추가
  for (const id of o.toppings || []) {
    const t = TOPPINGS.find((x) => x.id === id); if (!t) continue;
    const known = menu?.toppings?.[id];
    if (known != null) add(t.name, known); else { const [a, b] = scaled(t.add, !!t.scale); add(t.name, a, b); }
  }
  for (const id of o.extras || []) {
    const t = EXTRAS.find((x) => x.id === id); if (!t) continue;
    const known = menu?.extras?.[id];
    if (known != null) { add(t.name, known); } else if (t.add[1] > 0) add(t.name, t.add[0], t.add[1]);
  }
  lo = r5(lo); hi = r5(hi);
  const exact = basis === 'menu' && lines.every((l) => l.lo === l.hi);
  return { lo, hi: exact ? lo : hi, exact, basis, lines };
}

export const basisText = (b) => (b === 'menu' ? '사장님이 등록한 가격표 기준' : b === 'public' ? '가게 공개 기본가 + 지역 평균 추가금 (추정)' : '수원 가게 공개 가격 평균 (추정)');

// 가게 규칙 확인 — 통과하면 "사장님은 승인만", 걸리면 "사장님 확인 필요"
export function ruleCheck(store, o, { orders = [] } = {}) {
  const out = [];
  const st = store?.styles || [];
  const size = o.size || 'h1';
  if (o.date) {
    const ds = dayStatus(store, o.date, orders);
    out.push({ ok: ds.ok, t: ds.ok ? `${fmtDate(o.date)} ${o.time || ''} 픽업 — 주문 가능한 날짜예요` : `${fmtDate(o.date)} — ${ds.reason}` });
  }
  if (store?.menu) {
    const ok = store.menu.sizes?.[size] != null;
    out.push({ ok, t: ok ? `${sizeOf(size).name} — 가게에서 만드는 사이즈예요` : `${sizeOf(size).name} — 가격표에 없는 사이즈라 사장님 확인이 필요해요` });
  }
  const d = designOf(o.design);
  if (store?.menu && d.id !== 'simple' && store.menu.designs?.[d.id] === null) out.push({ ok: false, t: `${d.name} — 사장님이 받지 않는 디자인으로 설정해 두어 확인이 필요해요` });
  else if (d.style && !st.includes(d.style)) out.push({ ok: false, t: `${d.name} — 이 가게 목록에 ${styleName(d.style)}이(가) 없어 가능 여부 확인이 필요해요` });
  else if (d.check) out.push({ ok: false, t: `${d.name} — ${d.check}` });
  else out.push({ ok: true, t: `${d.name} — 가게에서 하는 디자인이에요` });
  if (d.needPhoto && !o.refPhoto) out.push({ ok: false, t: '포토 케이크 — 인쇄할 사진을 첨부해 주세요' });
  if (o.toppings?.includes('freshflower')) out.push({ ok: false, t: '생화 — 생화 종류·수급은 사장님이 확인해요' });
  if (!o.noText) {
    const len = textLen(o.text), lim = sizeOf(size).limit;
    if (len === 0) out.push({ ok: false, t: '문구가 비어 있어요 — 문구 없이 주문하려면 "문구 없이"를 눌러 주세요' });
    else out.push({ ok: len <= lim, t: len <= lim ? `문구 ${len}자 — ${sizeOf(size).name} 권장 ${lim}자 안이에요` : `문구 ${len}자 — 권장 ${lim}자를 넘어 글씨 크기를 사장님이 확인해요` });
  }
  if ((o.request || '').trim()) {
    out.push({ ok: false, t: /그림|캐릭터|로고|똑같이|사진처럼/.test(o.request) ? '요청사항에 그림·로고 요청이 있어요 — 사장님 확인 필요' : '요청사항은 사장님이 직접 읽고 답해요' });
  }
  if ((o.allergy || '').trim()) out.push({ ok: false, t: `알레르기 메모(${o.allergy.trim()}) — 사장님이 재료를 확인해요` });
  return out;
}
export const verdictOf = (checks) => {
  const warn = checks.filter((c) => !c.ok).length;
  return { warn, ok: warn === 0, text: warn ? `사장님 확인이 필요한 항목 ${warn}개 — 사장님이 보고 최종 가격을 확정해요` : '이 가게 규칙 안 — 사장님은 승인만 하면 돼요' };
};

export { leadDaysOf };
