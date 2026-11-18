// 첫 화면 안내(코치마크): 화면을 살짝 흐리게 하고, 설명할 칸에 네모를 쳐서 하나씩 알려 준다.
// steps: [{ sel: CSS 선택자, title, body, pad }] — 찾지 못한 칸은 건너뛴다.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

export default function Coach({ steps, onDone }) {
  const [i, setI] = useState(0);
  const [box, setBox] = useState(null); // 네모 칸 위치
  const [size, setSize] = useState({ w: 0, h: 0 });
  const root = useRef(null);
  const tipRef = useRef(null);
  const [tipH, setTipH] = useState(150);

  // 지금 단계의 칸 찾기 (지도 핀처럼 늦게 그려지는 칸을 위해 잠깐 다시 찾는다)
  const measure = useCallback(() => {
    const host = root.current?.parentElement;
    if (!host) return false;
    const hr = host.getBoundingClientRect();
    setSize({ w: hr.width, h: hr.height });
    for (let k = i; k < steps.length; k++) {
      const s = steps[k];
      // 화면 안에 다 보이고, 다른 것(위 검색창 등)에 가려지지 않은 칸만
      const inside = (e) => {
        const r = e.getBoundingClientRect();
        if (!(r.width > 0 && r.height > 0 && r.top >= hr.top - 2 && r.bottom <= hr.bottom + 2 && r.left >= hr.left - 2 && r.right <= hr.right + 2)) return false;
        const me = root.current; const v = me.style.visibility; me.style.visibility = 'hidden';
        const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        me.style.visibility = v;
        return !!top && (top === e || e.contains(top));
      };
      let cands = [];
      for (const sel of Array.isArray(s.sel) ? s.sel : [s.sel]) { cands = [...host.querySelectorAll(sel)].filter(inside); if (cands.length) break; } // 앞의 선택자부터 차례로
      // near: [가로, 세로] 비율 — 여러 개면 그 자리에 가장 가까운 것 (지도 핀 고르기)
      if (s.near && cands.length > 1) {
        const tx = hr.left + hr.width * s.near[0], ty = hr.top + hr.height * s.near[1];
        const dist = (e) => { const r = e.getBoundingClientRect(); return Math.hypot(r.left + r.width / 2 - tx, r.top + r.height / 2 - ty); };
        cands = cands.sort((a, b) => dist(a) - dist(b));
      }
      const el = cands[0];
      if (el) {
        if (k !== i) { setI(k); return true; }
        const r = el.getBoundingClientRect();
        const pad = s.pad ?? 6;
        setBox({ x: r.left - hr.left - pad, y: r.top - hr.top - pad, w: r.width + pad * 2, h: r.height + pad * 2, r: s.radius ?? 16 });
        return true;
      }
    }
    return false;
  }, [i, steps]);

  useLayoutEffect(() => {
    let tries = 0, t;
    const run = () => { if (!measure() && tries++ < 12) t = setTimeout(run, 150); else if (tries > 12) { if (i < steps.length - 1) setI(i + 1); else onDone?.(); } };
    run();
    const again = setTimeout(() => measure(), 450); // 움직이던 칸(아래 목록 등)이 멈춘 뒤 한 번 더 맞춘다
    const onR = () => measure();
    window.addEventListener('resize', onR);
    return () => { clearTimeout(t); clearTimeout(again); window.removeEventListener('resize', onR); };
  }, [i]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (tipRef.current) setTipH(tipRef.current.offsetHeight); });

  const last = i >= steps.length - 1;
  const next = () => (last ? onDone?.() : setI(i + 1));
  const s = steps[i];
  if (!s) return null;
  const W = size.w, H = size.h;
  // 흐린 막 + 네모 구멍 (구멍 모서리는 둥글게)
  let clip;
  if (box && W) {
    const { x, y, w, h, r } = box;
    const rr = Math.min(r, w / 2, h / 2);
    clip = `path(evenodd, 'M0 0H${W}V${H}H0Z M${x + rr} ${y}H${x + w - rr}A${rr} ${rr} 0 0 1 ${x + w} ${y + rr}V${y + h - rr}A${rr} ${rr} 0 0 1 ${x + w - rr} ${y + h}H${x + rr}A${rr} ${rr} 0 0 1 ${x} ${y + h - rr}V${y + rr}A${rr} ${rr} 0 0 1 ${x + rr} ${y}Z')`;
  }
  // 설명 카드는 칸 아래(자리가 없으면 위)에
  const below = box ? box.y + box.h + 14 + tipH < H - 8 : true;
  const tipTop = box ? (below ? box.y + box.h + 14 : Math.max(8, box.y - 14 - tipH)) : H / 2 - tipH / 2;
  const arrowX = box ? Math.max(28, Math.min(W - 42, box.x + box.w / 2)) - 14 - 7 : 0;
  return (
    <div className="coach" ref={root} role="dialog" aria-label="사용 안내">
      <div className="dim" style={clip ? { clipPath: clip, WebkitClipPath: clip } : undefined} onClick={next} />
      {box && <div className="ring" style={{ left: box.x, top: box.y, width: box.w, height: box.h, borderRadius: box.r }} />}
      <div className="tip" ref={tipRef} style={{ top: tipTop }}>
        {box && <span className="arrow" style={{ left: arrowX, [below ? 'top' : 'bottom']: -6 }} />}
        <div className="stp"><span>{i + 1} / {steps.length}</span><span className="dots">{steps.map((_, k) => <i key={k} className={k === i ? 'on' : ''} />)}</span></div>
        <h4>{s.title}</h4>
        <p>{s.body}</p>
        <div className="acts">
          <button className="skip" onClick={() => onDone?.()}>건너뛰기</button>
          <div className="row" style={{ gap: 4 }}>
            {i > 0 && <button className="back" onClick={() => setI(i - 1)}>이전</button>}
            <button className="next" onClick={next}>{last ? '시작하기' : '다음'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
