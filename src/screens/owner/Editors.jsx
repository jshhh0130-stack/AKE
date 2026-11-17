// 사장님 가게 편집 부품 (가게 등록 마법사와 '내 가게' 화면에서 함께 사용)
import { useState } from 'react';
import Icon from '../../components/Icon.jsx';
import { CakeView, Field, Toggle, Stepper, PriceInput, PhotoPick, toast, Seg } from '../../components/ui.jsx';
import { useApp } from '../../lib/state.js';
import { searchPlace, getGPS, reverseLabel } from '../../lib/geo.js';
import { aiReadMenu, aiWriteIntro, ruleIntro } from '../../lib/ai.js';
import { loadImage, toDataURL } from '../../lib/image.js';
import { DOW, won } from '../../lib/util.js';
import { STYLES, SIZES, SHAPES, DESIGNS, FLAVORS, RICE_FLAVORS, TOPPINGS, EXTRAS, BENCH, SIZE_MULT, CREAMS, FONTS, TEXT_COLORS, NOTICE_PRESETS, THEMES, QUICK_TEXTS } from '../../data/catalog.js';

const mid = (rg) => Math.round(((rg[0] + rg[1]) / 2) / 500) * 500;

function Row({ name, sub, value, onChange, on, onToggle }) {
  return (
    <div className="pricerow">
      {onToggle && <Toggle on={on} onChange={onToggle} label={name} />}
      <div className="nm" style={{ opacity: on === false ? 0.45 : 1 }}>{name}{sub && <small>{sub}</small>}</div>
      {on !== false && <PriceInput value={value} onChange={onChange} />}
    </div>
  );
}

export function InfoEditor({ shop, set }) {
  const [q, setQ] = useState('');
  const [res, setRes] = useState(null);
  const pickLoc = (p) => { set({ lat: p.lat, lng: p.lng, addr: shop.addr || p.full || p.label, geo: 'exact' }); setRes(null); toast('가게 위치를 지도에 표시했어요'); };
  return (
    <div>
      <Field label="가게 이름"><input className="inp" value={shop.name} onChange={(e) => set({ name: e.target.value })} placeholder="예) 봄날케이크 공방" maxLength={24} /></Field>
      <Field label="주소" hint="손님 지도에 핀으로 표시돼요. 검색해서 고르면 위치가 맞춰져요.">
        <input className="inp" value={shop.addr} onChange={(e) => set({ addr: e.target.value })} placeholder="예) 수원시 영통구 월드컵로 206" />
        <div className="row" style={{ marginTop: 6 }}>
          <input className="inp grow" value={q} onChange={(e) => setQ(e.target.value)} placeholder="위치 검색 (가게 주변 역·건물)" onKeyDown={async (e) => { if (e.key === 'Enter') setRes(await searchPlace(q).catch(() => [])); }} />
          <button className="btn dark sm" style={{ minHeight: 48 }} onClick={async () => setRes(await searchPlace(q || shop.addr).catch(() => []))}>찾기</button>
          <button className="btn line sm" style={{ minHeight: 48 }} onClick={async () => { try { const p = await getGPS(); const label = await reverseLabel(p.lat, p.lng); pickLoc({ ...p, label: label || '현재 위치' }); } catch (e) { toast(e.message); } }} aria-label="현재 위치"><Icon n="gps" size="sm" /></button>
        </div>
        {res && <div className="card" style={{ padding: '0 12px', marginTop: 6 }}>{res.length === 0 ? <div className="small muted" style={{ padding: 10 }}>결과가 없어요</div> : res.map((p, i) => <button key={i} className="list-row" onClick={() => pickLoc(p)}><Icon n="pin" size="sm" /><div className="grow"><div className="t small">{p.label}</div><div className="s">{p.full}</div></div></button>)}</div>}
      </Field>
      <div className="row">
        <Field label="동네(구)"><input className="inp" value={shop.gu} onChange={(e) => set({ gu: e.target.value })} placeholder="영통구" /></Field>
        <Field label="동"><input className="inp" value={shop.dong} onChange={(e) => set({ dong: e.target.value })} placeholder="원천동" /></Field>
      </div>
      <div className="row">
        <Field label="인스타그램"><input className="inp" value={shop.insta} onChange={(e) => set({ insta: e.target.value.replace(/^@/, '') })} placeholder="아이디" /></Field>
        <Field label="카카오톡 채널"><input className="inp" value={shop.kakao} onChange={(e) => set({ kakao: e.target.value })} placeholder="채널 이름" /></Field>
      </div>
    </div>
  );
}

export function StylesEditor({ shop, set }) {
  const toggle = (id) => set({ styles: shop.styles.includes(id) ? shop.styles.filter((x) => x !== id) : [...shop.styles, id] });
  return (
    <div className="chips wrap">{STYLES.map((s) => <button key={s.id} className={`chip ${shop.styles.includes(s.id) ? 'on' : ''}`} onClick={() => toggle(s.id)}>{s.emoji} {s.name}</button>)}</div>
  );
}

export function MenuEditor({ shop, set, compact = false }) {
  const st = useApp();
  const [busy, setBusy] = useState(false);
  const m = shop.menu;
  const setM = (k, id, v) => set({ menu: { ...m, [k]: { ...m[k], [id]: v } } });
  const fillAvg = () => {
    const menu = JSON.parse(JSON.stringify(m));
    SIZES.forEach((z) => { if (menu.sizes[z.id] !== null) menu.sizes[z.id] = mid(BENCH[z.id]); });
    DESIGNS.forEach((d) => { if (d.id !== 'simple') menu.designs[d.id] = mid(d.add); });
    FLAVORS.forEach((f) => { menu.flavors[f.id] = mid(f.add); });
    TOPPINGS.forEach((t) => { menu.toppings[t.id] = mid(t.add); });
    EXTRAS.forEach((t) => { menu.extras[t.id] = mid(t.add); });
    SHAPES.forEach((s) => { if (s.id !== 'round') menu.shapes[s.id] = mid(s.add); });
    set({ menu });
    toast('수원 공개 가격 평균으로 채웠어요. 우리 가게 가격으로 고쳐 주세요');
  };
  const readPhoto = async (file) => {
    if (!st.settings.claudeKey) { toast('가격표 사진 읽기는 설정에서 AI 키를 넣으면 쓸 수 있어요'); return; }
    setBusy(true);
    try {
      const el = await loadImage(file);
      const r = await aiReadMenu(st.settings.claudeKey, toDataURL(el, 1200, 0.85));
      const menu = JSON.parse(JSON.stringify(m));
      let n = 0;
      ['mini', 'h1', 'h2', 'h3'].forEach((k) => { if (r[k] > 0) { menu.sizes[k] = r[k]; n++; } });
      if (r.heart > 0) { menu.shapes.heart = r.heart; n++; }
      if (r.square > 0) { menu.shapes.square = r.square; n++; }
      set({ menu });
      toast(`가격표에서 ${n}개 가격을 읽었어요${r.addons?.length ? ` · 추가 옵션 ${r.addons.length}개는 아래에서 확인해 주세요` : ''}`, 4000);
      if (r.addons?.length) set({ menuNotes: r.addons.map((a) => `${a.name} ${won(a.price)}`).join(' · ') });
    } catch (e) { toast(e.message); }
    setBusy(false);
  };
  return (
    <div>
      <div className="row" style={{ marginBottom: 12 }}>
        <PhotoPick onPick={readPhoto} className="btn sec sm grow"><Icon n="camera" size="sm" />{busy ? '읽는 중…' : '가격표 사진으로 채우기'}{!st.settings.claudeKey && <span className="tag mute">AI</span>}</PhotoPick>
        <button className="btn line sm grow" onClick={fillAvg}><Icon n="wand" size="sm" />평균 가격으로 채우기</button>
      </div>
      <div className="note pink" style={{ marginBottom: 10 }}>한 번만 정해 두면 모든 주문에 자동으로 적용돼요. 손님은 고를 때마다 정확한 가격을 보게 돼요.</div>
      <div className="lbl">사이즈별 기본가 <span className="xs muted">흰 바탕 기본 레터링 기준</span></div>
      <div className="card" style={{ padding: '0 12px' }}>
        {SIZES.map((z) => <Row key={z.id} name={z.name} sub={`${z.cm}cm · ${z.serves} · 수원 평균 ${(BENCH[z.id][0] / 10000).toFixed(1)}~${(BENCH[z.id][1] / 10000).toFixed(1)}만`} value={m.sizes[z.id]} on={m.sizes[z.id] !== null} onToggle={(v) => setM('sizes', z.id, v ? mid(BENCH[z.id]) : null)} onChange={(v) => setM('sizes', z.id, v ?? 0)} />)}
      </div>
      {shop.menuNotes && <div className="note" style={{ marginTop: 8 }}>가격표에서 읽은 추가 옵션: {shop.menuNotes}</div>}
      {!compact && (
        <>
          <div className="lbl">모양 추가금</div>
          <div className="card" style={{ padding: '0 12px' }}>{SHAPES.filter((s) => s.id !== 'round').map((s) => <Row key={s.id} name={s.name} value={m.shapes[s.id]} onChange={(v) => setM('shapes', s.id, v ?? 0)} />)}</div>
          <div className="lbl">디자인 추가금 <span className="xs muted">끄면 손님에게 '확인 필요'로 보여요</span></div>
          <div className="card" style={{ padding: '0 12px' }}>{DESIGNS.filter((d) => d.id !== 'simple').map((d) => <Row key={d.id} name={d.name} sub={d.desc} value={m.designs[d.id]} on={m.designs[d.id] !== null && m.designs[d.id] !== undefined} onToggle={(v) => setM('designs', d.id, v ? mid(d.add) : null)} onChange={(v) => setM('designs', d.id, v ?? 0)} />)}</div>
          <div className="lbl">맛 변경 추가금</div>
          <div className="card" style={{ padding: '0 12px' }}>{(shop.styles.includes('rice') ? RICE_FLAVORS : FLAVORS).filter((f) => f.add[1] > 0).map((f) => <Row key={f.id} name={f.name} value={m.flavors[f.id]} onChange={(v) => setM('flavors', f.id, v ?? 0)} />)}</div>
          <div className="lbl">크림 색 추가금</div>
          <div className="card" style={{ padding: '0 12px' }}>
            <Row name="파스텔 톤" sub="베이비핑크·민트·라벤더 등" value={m.creams.pastel} onChange={(v) => setM('creams', 'pastel', v ?? 0)} />
            <Row name="진한 톤" sub="진핑크·코코아·네이비" value={m.creams.deep} onChange={(v) => setM('creams', 'deep', v ?? 0)} />
          </div>
          <div className="lbl">토핑·장식</div>
          <div className="card" style={{ padding: '0 12px' }}>{TOPPINGS.map((t) => <Row key={t.id} name={t.name} sub={t.desc} value={m.toppings[t.id]} onChange={(v) => setM('toppings', t.id, v ?? 0)} />)}</div>
          <div className="lbl">함께 받기</div>
          <div className="card" style={{ padding: '0 12px' }}>{EXTRAS.map((t) => <Row key={t.id} name={t.name} value={m.extras[t.id]} onChange={(v) => setM('extras', t.id, v ?? 0)} />)}
            <Row name="긴 문구" sub="사이즈별 권장 글자 수를 넘을 때" value={m.longText} onChange={(v) => set({ menu: { ...m, longText: v ?? 0 } })} />
          </div>
        </>
      )}
    </div>
  );
}

export function OpsEditor({ shop, set }) {
  const o = shop.ops;
  const setO = (p) => set({ ops: { ...o, ...p } });
  const hours = Array.from({ length: 16 }, (_, i) => `${String(7 + i).padStart(2, '0')}:00`);
  const [hd, setHd] = useState('');
  return (
    <div>
      <div className="lbl">쉬는 요일</div>
      <div className="chips wrap">{DOW.map((d, i) => <button key={i} className={`chip ${o.closedDays.includes(i) ? 'on' : ''}`} onClick={() => setO({ closedDays: o.closedDays.includes(i) ? o.closedDays.filter((x) => x !== i) : [...o.closedDays, i] })}>{d}</button>)}</div>
      <div className="lbl">임시 휴무일</div>
      <div className="row"><input type="date" className="inp grow" value={hd} onChange={(e) => setHd(e.target.value)} /><button className="btn dark sm" style={{ minHeight: 48 }} onClick={() => { if (hd && !o.holidays.includes(hd)) { setO({ holidays: [...o.holidays, hd].sort() }); setHd(''); } }}>추가</button></div>
      {o.holidays.length > 0 && <div className="chips wrap" style={{ marginTop: 6 }}>{o.holidays.map((h) => <button key={h} className="chip sm soft on" onClick={() => setO({ holidays: o.holidays.filter((x) => x !== h) })}>{h} ✕</button>)}</div>}
      <div className="lbl">주문 마감</div>
      <div className="card pad">
        <div className="row"><span className="grow b small">당일 주문 받기</span><Toggle on={o.sameDay} onChange={(v) => setO({ sameDay: v })} /></div>
        {o.sameDay ? (
          <div className="row" style={{ marginTop: 10 }}><span className="grow small">당일 주문 마감 시각</span><select className="inp" style={{ width: 120 }} value={o.cutoff} onChange={(e) => setO({ cutoff: e.target.value })}>{hours.map((h) => <option key={h}>{h}</option>)}</select></div>
        ) : (
          <div className="row" style={{ marginTop: 10 }}><span className="grow small">픽업 며칠 전까지 주문받을까요?</span><Stepper value={o.leadDays} min={1} max={14} onChange={(v) => setO({ leadDays: v })} fmt={(v) => `${v}일 전`} /></div>
        )}
      </div>
      <div className="lbl">하루에 받을 주문 수</div>
      <div className="card pad row"><span className="grow small">이 수가 차면 그날은 ‘마감’으로 보여요</span><Stepper value={o.dailyMax} min={1} max={50} onChange={(v) => setO({ dailyMax: v })} fmt={(v) => `${v}건`} /></div>
      <div className="lbl">픽업 시간</div>
      <div className="row">
        <select className="inp grow" value={o.pickupStart} onChange={(e) => setO({ pickupStart: e.target.value })}>{hours.map((h) => <option key={h}>{h}</option>)}</select>
        <span>~</span>
        <select className="inp grow" value={o.pickupEnd} onChange={(e) => setO({ pickupEnd: e.target.value })}>{hours.map((h) => <option key={h}>{h}</option>)}</select>
      </div>
      <div style={{ marginTop: 8 }}><Seg value={o.slotMin} onChange={(v) => setO({ slotMin: v })} items={[[30, '30분 단위'], [60, '1시간 단위']]} /></div>
      <div className="lbl">예약금</div>
      <Seg value={o.deposit} onChange={(v) => setO({ deposit: v })} items={[[0, '없음'], [30, '30%'], [50, '50%'], [100, '전액']]} />
      {o.deposit > 0 && <input className="inp" style={{ marginTop: 8 }} value={o.account || ''} onChange={(e) => setO({ account: e.target.value })} placeholder="입금 계좌 (예: 국민 000-00-0000 홍길동) — 확정 안내 메시지에 들어가요" maxLength={60} />}
      <div className="lbl">자동 확정</div>
      <div className="card pad">
        <div className="row"><span className="grow b small">규칙 안 주문은 자동 확정</span><Toggle on={o.autoConfirm} onChange={(v) => setO({ autoConfirm: v })} /></div>
        <div className="xs muted" style={{ marginTop: 6 }}>가격표에 있는 옵션만 고르고, 날짜·문구 길이가 규칙 안이며, 요청사항이 없는 주문은 사장님이 누르지 않아도 바로 확정돼요. 나머지는 ‘승인 / 수정 요청’ 두 버튼으로 처리해요.</div>
      </div>
    </div>
  );
}

export function LookEditor({ shop, set }) {
  const st = useApp();
  const [busy, setBusy] = useState(false);
  const h = shop.hero;
  const setH = (p) => set({ hero: { ...h, ...p } });
  const writeIntro = async () => {
    if (!st.settings.claudeKey) { set({ intro: ruleIntro(shop) }); toast('예시 소개글을 넣었어요. AI 키를 넣으면 AI가 써 줘요'); return; }
    setBusy(true);
    try { set({ intro: await aiWriteIntro(st.settings.claudeKey, shop) }); toast('AI가 소개글을 썼어요'); } catch (e) { toast(e.message); set({ intro: ruleIntro(shop) }); }
    setBusy(false);
  };
  return (
    <div>
      <div className="lbl">대표 색</div>
      <div className="swatches">{THEMES.map((c) => <button key={c} className={`sw ${shop.theme.color === c ? 'on' : ''}`} onClick={() => set({ theme: { ...shop.theme, color: c } })}><i style={{ background: c }} /></button>)}</div>
      <div className="lbl">배경 무늬</div>
      <Seg value={shop.theme.banner} onChange={(v) => set({ theme: { ...shop.theme, banner: v } })} items={[['dots', '도트'], ['stripe', '스트라이프'], ['plain', '단색']]} />
      <div className="lbl">대표 케이크 (가게 첫 화면)</div>
      <div className="card" style={{ overflow: 'hidden' }}>
        <CakeView o={h} fancy style={{ height: 170, background: `${shop.theme.color}22` }} />
        <div className="pad" style={{ paddingTop: 10 }}>
          <input className="inp" value={h.text} onChange={(e) => setH({ text: e.target.value })} placeholder="케이크 문구" maxLength={14} />
          <div className="chips" style={{ marginTop: 8 }}>{QUICK_TEXTS.slice(0, 5).map((t) => <button key={t} className="chip sm" onClick={() => setH({ text: t })}>{t}</button>)}</div>
          <div className="chips" style={{ marginTop: 8 }}>{SHAPES.map((s) => <button key={s.id} className={`chip sm soft ${h.shape === s.id ? 'on' : ''}`} onClick={() => setH({ shape: s.id })}>{s.name}</button>)}{DESIGNS.map((d) => <button key={d.id} className={`chip sm soft ${h.design === d.id ? 'on' : ''}`} onClick={() => setH({ design: d.id })}>{d.name}</button>)}</div>
          <div className="swatches" style={{ marginTop: 10 }}>{CREAMS.map((c) => <button key={c.id} className={`sw ${h.cream === c.id ? 'on' : ''}`} style={{ width: 44 }} onClick={() => setH({ cream: c.id })}><i style={{ background: c.hex, width: 28, height: 28 }} /></button>)}</div>
          <div className="chips" style={{ marginTop: 8 }}>{FONTS.map((f) => <button key={f.id} className={`chip sm soft ${h.font === f.id ? 'on' : ''}`} style={{ fontFamily: f.css }} onClick={() => setH({ font: f.id })}>{f.name}</button>)}{TEXT_COLORS.map((c) => <button key={c.id} className={`chip sm soft ${h.textColor === c.id ? 'on' : ''}`} onClick={() => setH({ textColor: c.id })}><i style={{ width: 12, height: 12, borderRadius: 6, background: c.hex, border: '1px solid #0002' }} /></button>)}</div>
        </div>
      </div>
      <div className="lbl">가게 소개 <button className="btn xs sec" onClick={writeIntro} disabled={busy}><Icon n="sparkle" size="sm" />{busy ? '쓰는 중…' : st.settings.claudeKey ? 'AI로 쓰기' : '예시 넣기'}</button></div>
      <textarea className="inp" value={shop.intro} onChange={(e) => set({ intro: e.target.value })} maxLength={120} placeholder="손님에게 보여 줄 한두 문장 소개" />
    </div>
  );
}

export function NoticeEditor({ shop, set }) {
  const [txt, setTxt] = useState('');
  const [fq, setFq] = useState({ q: '', a: '' });
  const toggle = (n) => set({ notices: shop.notices.includes(n) ? shop.notices.filter((x) => x !== n) : [...shop.notices, n] });
  return (
    <div>
      <div className="small muted" style={{ marginBottom: 8 }}>손님이 주문서를 보내기 전에 꼭 확인하고 체크하는 안내예요. (변경·취소 규정, 저작권, 보관 방법 등)</div>
      {[...new Set([...NOTICE_PRESETS, ...shop.notices])].map((n) => <label key={n} className="check"><input type="checkbox" checked={shop.notices.includes(n)} onChange={() => toggle(n)} />{n}</label>)}
      <div className="row" style={{ marginTop: 8 }}><input className="inp grow" value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="직접 추가 (예: 주차가 어려워요)" /><button className="btn dark sm" style={{ minHeight: 48 }} onClick={() => { if (txt.trim()) { set({ notices: [...shop.notices, txt.trim()] }); setTxt(''); } }}>추가</button></div>
      <div className="lbl" style={{ marginTop: 20 }}>자주 묻는 질문</div>
      {shop.faq.map((f, i) => <div key={i} className="card pad" style={{ marginBottom: 6 }}><div className="row"><b className="grow small">Q. {f.q}</b><button className="btn xs ghost" onClick={() => set({ faq: shop.faq.filter((_, k) => k !== i) })}>삭제</button></div><div className="small muted">A. {f.a}</div></div>)}
      <input className="inp" value={fq.q} onChange={(e) => setFq({ ...fq, q: e.target.value })} placeholder="질문 (예: 당일 주문 되나요?)" style={{ marginBottom: 6 }} />
      <div className="row"><input className="inp grow" value={fq.a} onChange={(e) => setFq({ ...fq, a: e.target.value })} placeholder="답변" /><button className="btn dark sm" style={{ minHeight: 48 }} onClick={() => { if (fq.q.trim() && fq.a.trim()) { set({ faq: [...shop.faq, { q: fq.q.trim(), a: fq.a.trim() }] }); setFq({ q: '', a: '' }); } }}>추가</button></div>
    </div>
  );
}

export function PortfolioEditor({ shop, set }) {
  const add = async (file) => {
    try {
      const el = await loadImage(file);
      const src = toDataURL(el, 560, 0.8, true);
      set({ portfolio: [{ id: 'p' + Date.now(), src, caption: '새 작품' }, ...shop.portfolio].slice(0, 12) });
      toast('작품 사진을 올렸어요');
    } catch { toast('사진을 읽지 못했어요'); }
  };
  return (
    <div>
      <div className="small muted" style={{ marginBottom: 10 }}>실제 작품 사진을 올리면 손님 화면 “이 가게 작품”에 보여요. 손님이 같은 디자인으로 바로 주문할 수 있어요. (최대 12장 · 이 기기에 저장)</div>
      <PhotoPick onPick={add} className="btn pri block"><Icon n="image" size="sm" /> 작품 사진 올리기</PhotoPick>
      <div className="opts c3" style={{ marginTop: 12 }}>
        {shop.portfolio.map((p, i) => (
          <div key={p.id} className="opt" style={{ padding: 6 }}>
            <div className="thumb">{p.src ? <img src={p.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <CakeView o={p.design} />}</div>
            <input className="inp" style={{ padding: '6px 8px', fontSize: 12.5 }} value={p.caption} onChange={(e) => set({ portfolio: shop.portfolio.map((x, k) => (k === i ? { ...x, caption: e.target.value } : x)) })} />
            <button className="btn xs ghost block" style={{ marginTop: 4 }} onClick={() => set({ portfolio: shop.portfolio.filter((_, k) => k !== i) })}>삭제</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FormEditor({ shop, set }) {
  const f = shop.form || {};
  const setF = (p) => set({ form: { ...f, ...p } });
  const items = [
    ['fontChoice', '글씨체 고르기', '손님이 6가지 글씨체 중에 골라요'],
    ['refPhoto', '참고 사진 첨부', '원하는 디자인 사진을 받아요'],
    ['allergy', '알레르기 칸', '알레르기 메모를 받아요'],
    ['extras', '초·토퍼·보냉백', '함께 받을 물건을 고르게 해요'],
    ['plateText', '판 문구', '케이크 판에 쓰는 문구'],
  ];
  return (
    <div>
      <div className="small muted" style={{ marginBottom: 8 }}>주문서 순서는 모든 가게가 같아요(디자인 → 크기 → 날짜 → 맛 → 문구 → 장식 → 요청). 받을 항목만 켜고 끄세요.</div>
      <div className="card" style={{ padding: '0 14px' }}>
        {items.map(([k, t, s]) => <div key={k} className="list-row"><div className="grow"><div className="t">{t}</div><div className="s">{s}</div></div><Toggle on={f[k] !== false} onChange={(v) => setF({ [k]: v })} /></div>)}
      </div>
      <div className="lbl">사이즈별 문구 글자 수 (권장)</div>
      <div className="card pad small">{SIZES.map((z) => <div key={z.id} className="kv"><span>{z.name}</span><b>{z.limit}자</b></div>)}</div>
    </div>
  );
}

// 가게 준비도 (똑톡의 '주문서 설정 100% 완료'처럼)
export function readiness(shop) {
  const items = [
    ['info', '기본 정보', !!(shop.name && shop.addr)],
    ['menu', '가격표', Object.values(shop.menu.sizes).some((v) => v != null && v > 0)],
    ['ops', '운영·마감', !!shop.ops],
    ['look', '꾸미기·소개', !!shop.intro],
    ['notice', '안내사항', shop.notices.length > 0],
    ['portfolio', '작품 사진', shop.portfolio.length >= 3],
  ];
  return { items, pct: Math.round((items.filter((x) => x[2]).length / items.length) * 100) };
}
