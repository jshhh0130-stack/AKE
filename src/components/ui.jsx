import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import qrcode from 'qrcode-generator';
import Icon from './Icon.jsx';
import { back, openSheetHistory, closeSheetHistory } from '../lib/router.js';
import { cakeSVG } from '../lib/cake.js';
import { STATUS } from '../lib/orders.js';

// ── 알림(토스트) ──
let toasts = [];
const tsubs = new Set();
const tget = () => toasts;
export function toast(msg, ms = 2400) {
  const id = Math.random();
  toasts = [...toasts, { id, msg }].slice(-3);
  tsubs.forEach((f) => f());
  setTimeout(() => { toasts = toasts.filter((t) => t.id !== id); tsubs.forEach((f) => f()); }, ms);
}
export function Toasts() {
  const list = useSyncExternalStore((f) => { tsubs.add(f); return () => tsubs.delete(f); }, tget);
  return <div className="toast-wrap">{list.map((t) => <div key={t.id} className="toast">{t.msg}</div>)}</div>;
}

export function Header({ title, onBack, fallback = '/', right, clear }) {
  return (
    <div className={`hdr ${clear ? 'clear' : ''}`}>
      <button className="ib" onClick={onBack || (() => back(fallback))} aria-label="뒤로"><Icon n="back" /></button>
      <h1>{title}</h1>
      {right}
    </div>
  );
}

export const Toggle = ({ on, onChange, label }) => (
  <button type="button" role="switch" aria-checked={!!on} aria-label={label} className={`toggle ${on ? 'on' : ''}`} onClick={() => onChange(!on)} />
);
export const Seg = ({ value, onChange, items }) => (
  <div className="seg">{items.map(([v, l]) => <button key={v} type="button" className={value === v ? 'on' : ''} onClick={() => onChange(v)}>{l}</button>)}</div>
);
export function Stepper({ value, onChange, min = 0, max = 99, step = 1, fmt = (v) => v }) {
  return (
    <span className="stepper">
      <button type="button" onClick={() => onChange(Math.max(min, value - step))} aria-label="줄이기"><Icon n="minus" size="sm" /></button>
      <span>{fmt(value)}</span>
      <button type="button" onClick={() => onChange(Math.min(max, value + step))} aria-label="늘리기"><Icon n="plus" size="sm" /></button>
    </span>
  );
}
export function Field({ label, hint, children }) {
  return <div className="field">{label && <label>{label}</label>}{children}{hint && <div className="hint">{hint}</div>}</div>;
}
export function PriceInput({ value, onChange, placeholder = '0' }) {
  return (
    <span className="w">
      <input className="inp" inputMode="numeric" value={value == null ? '' : Number(value).toLocaleString('ko-KR')} placeholder={placeholder}
        onChange={(e) => { const d = e.target.value.replace(/[^\d]/g, ''); onChange(d === '' ? null : Math.min(9999999, +d)); }} />
    </span>
  );
}

// ── 아래에서 올라오는 창 ──
export function Sheet({ open, onClose, title, children, footer, height }) {
  const hid = useRef(null);
  const [dy, setDy] = useState(0);
  const start = useRef(null);
  const closing = useRef(false);
  useEffect(() => {
    if (!open) return;
    closing.current = false;
    hid.current = openSheetHistory();
    // 뒤로가기로 '이 창'의 기록이 빠졌을 때만 닫는다 (창이 겹쳐 열려도 위에 있는 것부터 닫힘)
    const onPop = () => { if (!closing.current && (history.state?.sheet || 0) < hid.current) { closing.current = true; onClose?.(); } };
    window.addEventListener('popstate', onPop);
    return () => { window.removeEventListener('popstate', onPop); };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!open) return null;
  const close = () => { if (closing.current) return; closing.current = true; closeSheetHistory(hid.current); onClose?.(); };
  return (
    <>
      <div className="backdrop" onClick={close} />
      <div className="sheet" style={{ transform: dy ? `translateY(${dy}px)` : undefined, height }} role="dialog" aria-modal="true" aria-label={title}>
        <div className="grab"
          onPointerDown={(e) => { start.current = e.clientY; e.currentTarget.setPointerCapture(e.pointerId); }}
          onPointerMove={(e) => { if (start.current != null) setDy(Math.max(0, e.clientY - start.current)); }}
          onPointerUp={() => { if (dy > 90) close(); setDy(0); start.current = null; }}><i /></div>
        {title && <div className="sh-h"><h2>{title}</h2><button className="ib" onClick={close} aria-label="닫기" style={{ width: 36, height: 36, display: 'grid', placeItems: 'center', color: '#9b8e95' }}><Icon n="close" /></button></div>}
        <div className="sh-b">{children}</div>
        {footer && <div className="sh-f">{footer}</div>}
      </div>
    </>
  );
}
// 시트 안에서 다른 화면으로 갈 때: 시트 기록을 지우고 이동
export function leaveSheet(go) { setTimeout(go, 0); }

// ── 케이크 그림 ──
export function CakeView({ o, fancy = false, bg = true, className, style }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const key = JSON.stringify(o);
  const html = useMemo(() => cakeSVG(o, { uid, fancy, bg }), [key, fancy, bg, uid]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div className={`cakev ${className || ''}`} style={style} dangerouslySetInnerHTML={{ __html: html }} />;
}

export function StatusTag({ status, owner }) {
  const s = STATUS[status] || { name: status, tone: 'mute' };
  return <span className={`tag ${s.tone}`}>{owner ? ({ requested: '새 요청', change: '고객 답 대기', proof: '시안 확인 중' }[status] || s.name) : s.name}</span>;
}
export function Stars({ n = 5, size = 14 }) {
  return <span style={{ display: 'inline-flex', gap: 1, color: '#FFB400' }}>{[1, 2, 3, 4, 5].map((i) => <Icon key={i} n="star" fill={i <= n} style={{ width: size, height: size, fill: i <= n ? '#FFB400' : 'none', stroke: '#FFB400' }} />)}</span>;
}
export function Empty({ icon = '🎂', children }) {
  return <div className="empty"><div className="big">{icon}</div>{children}</div>;
}

export function QR({ text, size = 140 }) {
  const svg = useMemo(() => {
    const q = qrcode(0, 'M');
    q.addData(text);
    q.make();
    return q.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
  }, [text]);
  return <div style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: svg }} />;
}

export function Loading({ text = '불러오는 중…' }) {
  return <div className="col" style={{ alignItems: 'center', padding: 30, gap: 12 }}><div className="loader" /><div className="small muted">{text}</div></div>;
}

// 파일 고르기 버튼 (사진)
export function PhotoPick({ onPick, children, className = 'btn sec', capture = false }) {
  const ref = useRef(null);
  return (
    <>
      <button type="button" className={className} onClick={() => ref.current?.click()}>{children}</button>
      <input ref={ref} type="file" accept="image/*" {...(capture ? { capture: 'environment' } : {})} hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onPick(f); }} />
    </>
  );
}
