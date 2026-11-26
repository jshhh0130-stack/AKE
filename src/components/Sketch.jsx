// 그림판: AI 실사 사진 · 앱 시안 · 내 사진 위에 펜 · 크림 · 지우개 · 글자로 직접 고치기
// 저장하면 합친 사진(JPEG)을 onSave로 돌려준다. 지우개는 내가 그린 것만 지워요(바탕 사진은 그대로).
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { Sheet, toast, useBackClose } from './ui.jsx';
import { FONTS, fontOf } from '../data/catalog.js';
import { shade } from '../lib/util.js';

const COLORS = ['#C2185B', '#E53935', '#F4A2A8', '#FFFFFF', '#3D2A2A', '#5B3726', '#FBE7A6', '#C6EBD9', '#CBDFF6', '#DECFF4', '#2F4B7C', '#B8892B'];
// 펜 굵기 1~10 단계 (사진 너비 대비) — 슬라이더로 조절
const widthOf = (n) => 0.006 + n * 0.0035;
const TOOLS = [['pen', '펜', 'pen'], ['cream', '크림', 'piping'], ['eraser', '지우개', 'eraser'], ['text', '글자', 'text']];
const fontCss = (id) => fontOf(id).css;
const weightOf = (id) => (id === 'gaegu' || id === 'script' ? '700 ' : '');

function pathOf(x, p) {
  x.beginPath();
  x.moveTo(p[0][0], p[0][1]);
  if (p.length < 3) { p.forEach((q) => x.lineTo(q[0], q[1])); if (p.length === 1) x.lineTo(p[0][0] + 0.01, p[0][1]); return; }
  for (let i = 1; i < p.length - 1; i++) { const mx = (p[i][0] + p[i + 1][0]) / 2, my = (p[i][1] + p[i + 1][1]) / 2; x.quadraticCurveTo(p[i][0], p[i][1], mx, my); }
  const l = p[p.length - 1]; x.lineTo(l[0], l[1]);
}
function drawStroke(x, s, W) {
  const lw = s.w * W;
  x.save(); x.lineCap = 'round'; x.lineJoin = 'round';
  if (s.tool === 'eraser') { x.globalCompositeOperation = 'destination-out'; x.strokeStyle = '#000'; x.lineWidth = lw * 1.8; pathOf(x, s.pts); x.stroke(); }
  else if (s.tool === 'cream') { // 크림 짜기: 그림자 + 두꺼운 선 + 밝은 결
    x.shadowColor = 'rgba(70,40,30,.3)'; x.shadowBlur = lw * 0.4; x.shadowOffsetY = lw * 0.2;
    x.strokeStyle = s.color; x.lineWidth = lw * 1.3; pathOf(x, s.pts); x.stroke();
    x.shadowColor = 'transparent'; x.strokeStyle = shade(s.color, 0.5); x.globalAlpha = 0.7; x.lineWidth = lw * 0.42;
    x.translate(-lw * 0.14, -lw * 0.16); pathOf(x, s.pts); x.stroke();
  } else { x.strokeStyle = s.color; x.lineWidth = lw; pathOf(x, s.pts); x.stroke(); }
  x.restore();
}
function textBox(x, t, W) {
  const fs = t.s * W;
  x.font = `${weightOf(t.font)}${fs}px ${fontCss(t.font)}`;
  const lines = String(t.t).split('\n');
  const w = Math.max(...lines.map((l) => x.measureText(l).width));
  const h = lines.length * fs * 1.15;
  return { x: t.x - w / 2, y: t.y - h / 2, w, h, fs, lines };
}
function drawText(x, t, W) {
  const b = textBox(x, t, W);
  x.save(); x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
  const y0 = t.y - ((b.lines.length - 1) * b.fs * 1.15) / 2;
  x.shadowColor = 'rgba(70,40,30,.32)'; x.shadowBlur = b.fs * 0.07; x.shadowOffsetY = b.fs * 0.04;
  x.fillStyle = t.color; x.strokeStyle = t.color; x.lineWidth = b.fs * 0.07;
  b.lines.forEach((l, i) => { x.strokeText(l, t.x, y0 + i * b.fs * 1.15); x.fillText(l, t.x, y0 + i * b.fs * 1.15); });
  x.shadowColor = 'transparent'; x.globalAlpha = 0.28; x.strokeStyle = shade(t.color, 0.7); x.lineWidth = b.fs * 0.025; // 크림 결
  b.lines.forEach((l, i) => x.strokeText(l, t.x - b.fs * 0.02, y0 + i * b.fs * 1.15 - b.fs * 0.03));
  x.restore();
}

export default function Sketch({ src, title = '그림판', texts: initTexts = [], onSave, onClose }) {
  const close = useBackClose(onClose);
  const area = useRef(null), cvs = useRef(null), base = useRef(null), ink = useRef(null), live = useRef(null);
  const D = useRef({ W: 0, H: 0 });
  const [ready, setReady] = useState(false);
  const [view, setView] = useState({ w: 0, h: 0 });
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#C2185B');
  const [wid, setWid] = useState(4);
  const [strokes, setStrokes] = useState([]);
  const [texts, setTexts] = useState([]);
  const [hist, setHist] = useState([]);
  const [fut, setFut] = useState([]);
  const [sel, setSel] = useState(null);
  const [edit, setEdit] = useState(null); // 글자 넣기 창 { id?, t, font, color, x, y }
  const cur = useRef(null), drag = useRef(null), raf = useRef(0);
  const S = useRef({}); S.current = { strokes, texts, sel };

  // 바탕 사진 불러오기
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const s = Math.min(1, 1080 / Math.max(img.naturalWidth, img.naturalHeight));
      const W = Math.round(img.naturalWidth * s), H = Math.round(img.naturalHeight * s);
      D.current = { W, H };
      const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
      base.current = mk(); ink.current = mk(); live.current = mk();
      base.current.getContext('2d').drawImage(img, 0, 0, W, H);
      cvs.current.width = W; cvs.current.height = H;
      // 처음 문구(주문서 문구 등)는 가운데에 미리 놓아 둔다
      const first = initTexts.filter((t) => t && t.t).map((t, i) => ({ id: 'tx' + i, font: 'jua', color: '#C2185B', s: 0.085, x: W / 2, y: H * (0.42 + i * 0.12), ...t }));
      if (first.length) setTexts(first);
      setReady(true);
    };
    img.onerror = () => toast('사진을 열지 못했어요');
    img.src = src;
  }, [src]); // eslint-disable-line react-hooks/exhaustive-deps
  // 화면 크기에 맞춰 보이기
  useLayoutEffect(() => {
    const fit = () => { const a = area.current; if (!a || !D.current.W) return; const s = Math.min((a.clientWidth - 24) / D.current.W, (a.clientHeight - 24) / D.current.H); setView({ w: Math.floor(D.current.W * s), h: Math.floor(D.current.H * s) }); }; // 24 = 안쪽 여백
    fit();
    const ro = new ResizeObserver(fit); if (area.current) ro.observe(area.current);
    return () => ro.disconnect();
  }, [ready]);
  // 글자 글꼴 미리 불러오기
  useEffect(() => { FONTS.forEach((f) => document.fonts?.load(`${weightOf(f.id)}40px ${f.css}`, '가나다 abc').catch(() => {})); }, []);

  const render = () => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const c = cvs.current; if (!c || !base.current) return;
      const x = c.getContext('2d'); const { W, H } = D.current;
      x.clearRect(0, 0, W, H); x.drawImage(base.current, 0, 0); x.drawImage(ink.current, 0, 0); x.drawImage(live.current, 0, 0);
      const { texts: ts, sel: sl } = S.current;
      ts.forEach((t) => drawText(x, t, W));
      const st = ts.find((t) => t.id === sl);
      if (st) { const b = textBox(x, st, W); x.save(); x.setLineDash([W * 0.012, W * 0.008]); x.strokeStyle = '#3D2A2A'; x.lineWidth = Math.max(2, W * 0.003); x.strokeRect(b.x - W * 0.015, b.y - W * 0.012, b.w + W * 0.03, b.h + W * 0.024); x.restore(); }
    });
  };
  const redrawInk = (list) => { const k = ink.current; if (!k) return; const x = k.getContext('2d'); x.clearRect(0, 0, k.width, k.height); list.forEach((s) => drawStroke(x, s, D.current.W)); };
  useEffect(() => { if (ready) { redrawInk(strokes); render(); } }, [ready, strokes]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (ready) render(); }, [texts, sel]); // eslint-disable-line react-hooks/exhaustive-deps

  const remember = () => { setHist((h) => [...h.slice(-30), { strokes: S.current.strokes, texts: S.current.texts }]); setFut([]); };
  const undo = () => { if (!hist.length) return; const last = hist[hist.length - 1]; setFut((f) => [{ strokes, texts }, ...f]); setHist(hist.slice(0, -1)); setStrokes(last.strokes); setTexts(last.texts); setSel(null); };
  const redo = () => { if (!fut.length) return; const n = fut[0]; setHist((h) => [...h, { strokes, texts }]); setFut(fut.slice(1)); setStrokes(n.strokes); setTexts(n.texts); };
  const pos = (e) => { const r = cvs.current.getBoundingClientRect(); return [((e.clientX - r.left) * D.current.W) / r.width, ((e.clientY - r.top) * D.current.H) / r.height]; };
  const hitText = (p) => { const x = cvs.current.getContext('2d'); const W = D.current.W; return [...texts].reverse().find((t) => { const b = textBox(x, t, W); return p[0] >= b.x - W * 0.03 && p[0] <= b.x + b.w + W * 0.03 && p[1] >= b.y - W * 0.03 && p[1] <= b.y + b.h + W * 0.03; }); };

  const down = (e) => {
    if (!ready) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const p = pos(e);
    if (tool === 'text') {
      const t = hitText(p);
      if (t) { setSel(t.id); drag.current = { id: t.id, dx: p[0] - t.x, dy: p[1] - t.y, moved: false }; }
      else { setSel(null); setEdit({ t: '', font: 'jua', color, x: p[0], y: p[1] }); }
      return;
    }
    setSel(null);
    cur.current = { tool, color, w: widthOf(wid), pts: [p] };
  };
  const move = (e) => {
    const p = pos(e);
    if (drag.current) { const d = drag.current; d.moved = true; setTexts((ts) => ts.map((t) => (t.id === d.id ? { ...t, x: p[0] - d.dx, y: p[1] - d.dy } : t))); return; }
    const s = cur.current; if (!s) return;
    const lp = s.pts[s.pts.length - 1];
    if (Math.hypot(p[0] - lp[0], p[1] - lp[1]) < D.current.W * 0.003) return;
    s.pts.push(p);
    if (s.tool === 'eraser') { drawStroke(ink.current.getContext('2d'), { ...s, pts: s.pts.slice(-3) }, D.current.W); }
    else { const lx = live.current.getContext('2d'); lx.clearRect(0, 0, D.current.W, D.current.H); drawStroke(lx, s, D.current.W); }
    render();
  };
  const up = () => {
    if (drag.current) { if (drag.current.moved) remember(); drag.current = null; return; }
    const s = cur.current; if (!s) return;
    cur.current = null;
    live.current.getContext('2d').clearRect(0, 0, D.current.W, D.current.H);
    remember();
    setStrokes((list) => [...list, s]);
  };

  const putText = () => {
    const v = (edit.t || '').trim();
    if (!v) { setEdit(null); return; }
    remember();
    if (edit.id) setTexts((ts) => ts.map((t) => (t.id === edit.id ? { ...t, t: v, font: edit.font, color: edit.color } : t)));
    else { const id = 'tx' + Date.now(); setTexts((ts) => [...ts, { id, t: v, font: edit.font, color: edit.color, s: 0.085, x: edit.x ?? D.current.W / 2, y: edit.y ?? D.current.H / 2 }]); setSel(id); }
    setEdit(null);
  };
  const selT = texts.find((t) => t.id === sel);
  const resize = (k) => { remember(); setTexts((ts) => ts.map((t) => (t.id === sel ? { ...t, s: Math.max(0.03, Math.min(0.25, t.s * k)) } : t))); };
  const delText = () => { remember(); setTexts((ts) => ts.filter((t) => t.id !== sel)); setSel(null); };
  const save = () => {
    if (!ready) return;
    const { W, H } = D.current;
    const c = document.createElement('canvas');
    const s = Math.min(1, 760 / Math.max(W, H)); // 저장 크기 (이 기기에 여러 장 모아 둬도 가볍게)
    c.width = Math.round(W * s); c.height = Math.round(H * s);
    const x = c.getContext('2d'); x.scale(s, s);
    x.drawImage(base.current, 0, 0); x.drawImage(ink.current, 0, 0); texts.forEach((t) => drawText(x, t, W));
    onSave?.(c.toDataURL('image/jpeg', 0.86));
    close();
  };

  return (
    <div className="sk" role="dialog" aria-label="그림판">
      <div className="sk-top">
        <button className="ib" onClick={close} aria-label="닫기"><Icon n="close" /></button>
        <b className="grow">{title}</b>
        <button className="btn pri sm" onClick={save} disabled={!ready}>저장</button>
      </div>
      <div className="sk-area" ref={area}>
        <canvas ref={cvs} style={{ width: view.w, height: view.h }} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
        {!ready && <div className="loader" />}
      </div>
      <div className="sk-bar">
        {tool === 'text' ? (
          selT ? (
            <div className="sk-opts">
              <button className="chip sm" onClick={() => setEdit({ id: selT.id, t: selT.t, font: selT.font, color: selT.color })}><Icon n="edit" />고치기</button>
              <button className="chip sm" onClick={() => resize(1.15)}><Icon n="bigger" />크게</button>
              <button className="chip sm" onClick={() => resize(1 / 1.15)}><Icon n="smaller" />작게</button>
              <button className="chip sm" onClick={delText}><Icon n="trash" />지우기</button>
            </div>
          ) : <div className="sk-hint">사진을 누르면 그 자리에 글자를 넣어요. 넣은 글자는 끌어서 옮겨요.</div>
        ) : (
          <div className="sk-opts">
            {tool !== 'eraser' && COLORS.map((c) => <button key={c} className={`sk-col ${color === c ? 'on' : ''}`} style={{ background: c }} onClick={() => setColor(c)} aria-label="색" />)}
            <div className="sk-wid">
              <span>굵기</span>
              <input type="range" min="1" max="10" step="1" value={wid} onChange={(e) => setWid(+e.target.value)} aria-label="펜 굵기" />
              <i style={{ width: 4 + wid * 2.4, height: 4 + wid * 2.4, background: tool === 'eraser' ? '#fff' : color }} />
            </div>
          </div>
        )}
        <div className="sk-tools">
          {TOOLS.map(([id, n, ic]) => <button key={id} className={tool === id ? 'on' : ''} onClick={() => { setTool(id); if (id !== 'text') setSel(null); }}><Icon n={ic} />{n}</button>)}
          <button onClick={undo} disabled={!hist.length}><Icon n="undo" />되돌리기</button>
          <button onClick={redo} disabled={!fut.length}><Icon n="redo" />다시</button>
        </div>
      </div>
      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? '글자 고치기' : '글자 넣기'}
        footer={<div className="btns"><button className="btn line" onClick={() => setEdit(null)}>취소</button><button className="btn pri" style={{ flex: 2 }} onClick={putText}>{edit?.id ? '바꾸기' : '넣기'}</button></div>}>
        {edit && (<>
          <textarea className="inp" rows={2} value={edit.t} onChange={(e) => setEdit({ ...edit, t: e.target.value })} placeholder="예) 생일 축하해" autoFocus />
          <div className="lbl">글씨체</div>
          <div className="chips wrap">{FONTS.map((f) => <button key={f.id} className={`chip ${edit.font === f.id ? 'on' : ''}`} style={{ fontFamily: f.css }} onClick={() => setEdit({ ...edit, font: f.id })}>{f.name}</button>)}</div>
          <div className="lbl">색</div>
          <div className="sk-opts" style={{ padding: 0 }}>{COLORS.map((c) => <button key={c} className={`sk-col ${edit.color === c ? 'on' : ''}`} style={{ background: c }} onClick={() => setEdit({ ...edit, color: c })} aria-label="색" />)}</div>
          <div className="sk-prev" style={{ fontFamily: fontCss(edit.font), color: edit.color, fontWeight: weightOf(edit.font) ? 700 : 400 }}>{edit.t || '생일 축하해'}</div>
        </>)}
      </Sheet>
    </div>
  );
}
