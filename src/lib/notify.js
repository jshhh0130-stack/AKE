// 알림: 앱 안 알림함 + 화면 위 알림(토스트) + 소리·진동 + (허용하면) 휴대폰/브라우저 알림
import { getState, setState } from './state.js';
import { toast } from '../components/ui.jsx';

const roleName = (r) => (r === 'c' ? 'customer' : 'owner');
let actx = null;
function beep() {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(880, actx.currentTime); o.frequency.setValueAtTime(1174, actx.currentTime + 0.09);
    g.gain.setValueAtTime(0.0001, actx.currentTime); g.gain.exponentialRampToValueAtTime(0.12, actx.currentTime + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + 0.28);
    o.connect(g); g.connect(actx.destination); o.start(); o.stop(actx.currentTime + 0.3);
  } catch { /* 소리 못 내는 환경 */ }
}
async function systemNotify(title, body, link) {
  try {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const opt = { body, icon: './icons/icon-192.png', badge: './icons/icon-192.png', tag: link || 'dearcake', data: { link } };
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg?.showNotification) await reg.showNotification(title, opt);
    else { const n = new Notification(title, opt); n.onclick = () => { window.focus(); if (link) location.hash = '#' + link; }; }
  } catch { /* 무시 */ }
}

// role: 'c'(손님) | 'o'(사장님), kind: 'status' | 'proof' | 'chat'
export function notify(role, kind, title, body, link) {
  const s = getState();
  const set = s.notiSet?.[role] || {};
  if (set[kind] === false) return;
  const n = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), role, kind, title, body, link, at: new Date().toISOString(), read: false };
  setState((x) => ({ ...x, notis: [n, ...(x.notis || [])].slice(0, 80) }));
  if (s.role !== roleName(role)) return; // 지금 그 모드가 아니면 알림함에만 쌓는다
  const here = link && location.hash.replace(/^#/, '').split('?')[0] === link;
  if (!here || document.hidden) toast(`${title}${body ? ' · ' + body : ''}`, 3200);
  if (set.sound !== false) { beep(); try { navigator.vibrate?.(60); } catch { /* 무시 */ } }
  if (set.browser && (document.hidden || !here)) systemNotify(title, body, link);
}
export const unreadNotis = (s, role) => (s.notis || []).filter((n) => n.role === role && !n.read).length;
export const readAll = (role) => setState((s) => ({ ...s, notis: (s.notis || []).map((n) => (n.role === role ? { ...n, read: true } : n)) }));
export const readLink = (role, link) => setState((s) => ((s.notis || []).some((n) => n.role === role && n.link === link && !n.read) ? { ...s, notis: s.notis.map((n) => (n.role === role && n.link === link ? { ...n, read: true } : n)) } : s));
export async function askPermission() {
  if (typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  try { return await Notification.requestPermission(); } catch { return 'denied'; }
}
