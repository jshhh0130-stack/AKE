// 케이크 시안 그리기 (SVG 문자열). 옵션을 바꾸면 즉시 다시 그린다.
// o: { shape, size, design, cream, creamHex, text, font, textColor, toppings[], extras[], variant, photo, plateText }
import { shade, esc, hash, rng, luminance } from './util.js';
import { sizeOf, creamOf, fontOf, textColorOf } from '../data/catalog.js';

let GID = 0;
const K = 0.42; // 윗면 원근(세로 눌림)
const TK = 0.62; // 글씨는 덜 눌러서 잘 읽히게
const f1 = (n) => +n.toFixed(1);

function shapePts(shape, R) {
  const pts = [];
  if (shape === 'heart') {
    const s = R / 16.5;
    for (let i = 0; i < 120; i++) {
      const t = (i / 120) * Math.PI * 2;
      const x = 16 * Math.sin(t) ** 3;
      const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      pts.push([x * s, (y - 2.5) * s]);
    }
  } else if (shape === 'square') {
    const a = R * 0.98, b = R * 0.9, n = 7;
    for (let i = 0; i < 112; i++) {
      const t = (i / 112) * Math.PI * 2, c = Math.cos(t), sn = Math.sin(t);
      pts.push([a * Math.sign(c) * Math.abs(c) ** (2 / n), b * Math.sign(sn) * Math.abs(sn) ** (2 / n)]);
    }
  } else {
    for (let i = 0; i < 96; i++) { const t = (i / 96) * Math.PI * 2; pts.push([R * Math.cos(t), R * Math.sin(t)]); }
  }
  return pts;
}
const toPath = (pts, k = 1) => 'M' + pts.map((p) => `${f1(p[0] * k)} ${f1(p[1] * k)}`).join('L') + 'Z';
function inside(pts, x, y) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
// 윗면 둘레에서 각도 t(도) 방향의 점 (0°=오른쪽, 90°=앞쪽, 270°=뒤쪽)
function rimAt(pts, deg, k = 1) {
  const t = (deg * Math.PI) / 180, dx = Math.cos(t), dy = Math.sin(t);
  let best = pts[0], bd = -1e9;
  for (const p of pts) { const d = (p[0] * dx + p[1] * dy) / (Math.hypot(p[0], p[1]) || 1); if (d > bd) { bd = d; best = p; } }
  return [best[0] * k, best[1] * k];
}

function splitLines(text, maxSingle = 7.5) {
  const t = text.trim();
  if (!t) return [];
  const est = (s) => [...s].reduce((a, c) => a + (/[가-힣ㄱ-ㅎ]/.test(c) ? 1 : /[A-Z]/.test(c) ? 0.68 : /\s/.test(c) ? 0.32 : 0.56), 0);
  if (est(t) <= maxSingle) return [t];
  const words = t.split(/\s+/);
  const lines = [];
  const target = est(t) > 15 ? 3 : 2;
  if (words.length >= 2) {
    // 단어 단위로 고르게 나눔
    const per = est(t) / target;
    let cur = '';
    for (const w of words) {
      if (cur && est(cur + ' ' + w) > per * 1.25 && lines.length < target - 1) { lines.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w;
    }
    if (cur) lines.push(cur);
    return lines;
  }
  const chars = [...t], n = Math.ceil(chars.length / target);
  for (let i = 0; i < chars.length; i += n) lines.push(chars.slice(i, i + n).join(''));
  return lines;
}
const estW = (s) => [...s].reduce((a, c) => a + (/[가-힣ㄱ-ㅎ]/.test(c) ? 1 : /[A-Z]/.test(c) ? 0.68 : /\s/.test(c) ? 0.32 : 0.56), 0);

export function cakeSVG(o = {}, opt = {}) {
  const id = 'ck' + (opt.uid || '') + (GID++).toString(36);
  const sz = sizeOf(o.size || 'h1');
  const shape = o.shape || 'round';
  const R = sz.R, H = sz.H, cx = 150;
  const box = o.size === 'dosirak' && opt.box !== false;
  const pts = shapePts(shape, R);
  const maxY = Math.max(...pts.map((p) => p[1]));
  const baseY = box ? 200 : 210;
  const topY = baseY - H - maxY * K;
  const groundY = topY + H;
  const cream = o.creamHex || creamOf(o.cream).hex;
  const design = o.design || 'simple';
  const v = (o.variant || 0) % 3;
  const r = rng(hash([o.text, design, cream, v, shape, (o.toppings || []).join()].join('|')));
  const tops = new Set(o.toppings || []);
  const ex = new Set(o.extras || []);
  const deep = luminance(cream) < 0.55;
  const pipe = shade(cream, deep ? 0.12 : -0.06), pipeS = shade(cream, deep ? -0.18 : -0.2);
  const choco = '#5E3826';
  const topFill = design === 'drip' ? choco : cream;
  const PD = toPath(pts);
  const sc = R / 84; // 크기 배율
  let s = `<svg viewBox="0 0 300 250" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="케이크 시안">`;
  s += `<defs>
    <path id="${id}p" d="${PD}"/>
    <linearGradient id="${id}sg" x1="0" x2="1"><stop offset="0" stop-color="${shade(cream, -0.17)}"/><stop offset=".36" stop-color="${shade(cream, 0.1)}"/><stop offset=".6" stop-color="${cream}"/><stop offset="1" stop-color="${shade(cream, -0.22)}"/></linearGradient>
    <radialGradient id="${id}tg" cx=".42" cy=".36" r=".78"><stop offset="0" stop-color="${shade(topFill, design === 'drip' ? 0.18 : 0.16)}"/><stop offset="1" stop-color="${shade(topFill, -0.03)}"/></radialGradient>
    <radialGradient id="${id}bg" cx=".5" cy=".45" r=".62"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".7" stop-color="#FFF2F6"/><stop offset="1" stop-color="#FFE3EC"/></radialGradient>
    <filter id="${id}bl" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="5"/></filter>
    <clipPath id="${id}side">${Array.from({ length: Math.ceil(H / 2) + 1 }, (_, i) => `<use href="#${id}p" transform="translate(${cx} ${f1(topY + Math.min(H, i * 2))}) scale(1 ${K})"/>`).join('')}</clipPath>
    <clipPath id="${id}front"><rect x="0" y="${f1(groundY)}" width="300" height="${f1(260 - groundY)}"/></clipPath>
    <clipPath id="${id}top"><use href="#${id}p"/></clipPath>
  </defs>`;

  if (opt.bg !== false) s += `<rect width="300" height="250" fill="url(#${id}bg)"/>`;
  if (opt.fancy) {
    [[40, 48, 7], [262, 60, 6], [268, 178, 5], [30, 170, 5], [232, 30, 4], [70, 205, 4]].forEach(([x, y, z]) => {
      s += `<path d="M${x} ${y - z}Q${x} ${y} ${x + z} ${y}Q${x} ${y} ${x} ${y + z}Q${x} ${y} ${x - z} ${y}Q${x} ${y} ${x} ${y - z}Z" fill="#FF9EBE" opacity=".75"/>`;
    });
  }

  // 그림자 + 받침 / 도시락 상자
  const bx = R + 18 * sc, by = R * 0.94 + 18 * sc, bh = H * 0.55;
  if (box) {
    const kraft = '#D9B88C', kraftD = '#B8946A', kraftL = '#E9D2AE';
    s += `<ellipse cx="${cx}" cy="${f1(groundY + by * K + 8)}" rx="${f1(bx + 14)}" ry="${f1(by * K + 8)}" fill="#C9A3B3" opacity=".25" filter="url(#${id}bl)"/>`;
    // 뚜껑(뒤로 젖힘)
    const ly = groundY - by * K - bh;
    s += `<path d="M${f1(cx - bx)} ${f1(ly)}L${f1(cx + bx)} ${f1(ly)}L${f1(cx + bx - 10)} ${f1(ly - by * 0.95)}L${f1(cx - bx + 10)} ${f1(ly - by * 0.95)}Z" fill="${kraftL}" stroke="${kraftD}" stroke-width="1.4"/>`;
    s += `<circle cx="${cx}" cy="${f1(ly - by * 0.5)}" r="${f1(11 * sc)}" fill="#FFF" stroke="#F3B5C8" stroke-width="1.5"/><path d="M${cx} ${f1(ly - by * 0.5 + 5 * sc)}c-4.5-3-7-5.3-7-8 0-2 1.5-3.3 3.4-3.3 1.6 0 2.9.9 3.6 2.2.7-1.3 2-2.2 3.6-2.2 1.9 0 3.4 1.3 3.4 3.3 0 2.7-2.5 5-7 8z" fill="#F75C8D" transform="translate(0 ${f1(-1 * sc)})"/>`;
    // 뒷벽 + 바닥
    s += `<rect x="${f1(cx - bx)}" y="${f1(ly)}" width="${f1(2 * bx)}" height="${f1(bh)}" fill="${kraftD}"/>`;
    s += `<g transform="translate(${cx} ${f1(groundY)}) scale(1 ${K})"><rect x="${f1(-bx)}" y="${f1(-by)}" width="${f1(2 * bx)}" height="${f1(2 * by)}" rx="${f1(10 * sc)}" fill="${kraft}"/></g>`;
  } else {
    const pr = R + 24 * sc;
    s += `<ellipse cx="${cx}" cy="${f1(groundY + maxY * K + 10)}" rx="${f1(pr + 8)}" ry="${f1(pr * K * 0.85 + 6)}" fill="#C9A3B3" opacity="${opt.fancy ? 0.32 : 0.2}" filter="url(#${id}bl)"/>`;
    s += `<g transform="translate(${cx} ${f1(groundY + 4)}) scale(1 ${K})"><circle r="${f1(pr)}" fill="#FFFFFF" stroke="#EBDDE3" stroke-width="3"/><circle r="${f1(pr - 7)}" fill="none" stroke="#F4EAEE" stroke-width="2"/></g>`;
  }

  // 토퍼(가장 뒤)
  if (ex.has('topper')) {
    const t1 = cx - 0.36 * R, t2 = cx + 0.36 * R, base = topY - 0.42 * R * K, top = Math.max(10, base - 62 * sc);
    s += `<line x1="${f1(t1)}" y1="${f1(base)}" x2="${f1(t1)}" y2="${f1(top + 10)}" stroke="#C9A227" stroke-width="2.4"/><line x1="${f1(t2)}" y1="${f1(base)}" x2="${f1(t2)}" y2="${f1(top + 10)}" stroke="#C9A227" stroke-width="2.4"/>`;
    s += `<path d="M${f1(t1 - 8)} ${f1(top + 4)}Q${cx} ${f1(top - 10)} ${f1(t2 + 8)} ${f1(top + 4)}L${f1(t2 + 8)} ${f1(top + 22)}Q${cx} ${f1(top + 9)} ${f1(t1 - 8)} ${f1(top + 22)}Z" fill="#FFF7DD" stroke="#C9A227" stroke-width="1.5"/>`;
    s += `<text x="${cx}" y="${f1(top + 15)}" text-anchor="middle" font-size="${f1(8.5 + 3 * sc)}" font-weight="700" fill="#A87D12" font-family="Fredoka, 'Jua', sans-serif" letter-spacing=".5">${esc(o.topperText || 'HAPPY DAY')}</text>`;
  }

  // 옆면
  s += `<rect x="${f1(cx - R - 4)}" y="${f1(topY - R - 4)}" width="${f1(2 * R + 8)}" height="${f1(H + 2 * R + 8)}" fill="url(#${id}sg)" clip-path="url(#${id}side)"/>`;
  const front = pts.filter((p) => p[1] > 0).sort((a, b) => a[0] - b[0]);
  const sideAt = (p, h) => [cx + p[0], topY + p[1] * K + h];
  const pickFront = (n) => Array.from({ length: n }, (_, i) => front[Math.round(((i + 0.5) / n) * (front.length - 1))]);

  // 옆면 장식
  if (design === 'vintage' || (design === 'simple' && v === 1)) {
    const anchors = pickFront(design === 'vintage' ? 7 : 6);
    const h0 = H * 0.2;
    const col = design === 'vintage' ? pipeS : shade(cream, -0.14);
    for (let i = 0; i < anchors.length - 1; i++) {
      const [x1, y1] = sideAt(anchors[i], h0), [x2, y2] = sideAt(anchors[i + 1], h0);
      s += `<path d="M${f1(x1)} ${f1(y1)}Q${f1((x1 + x2) / 2)} ${f1((y1 + y2) / 2 + H * 0.3)} ${f1(x2)} ${f1(y2)}" fill="none" stroke="${col}" stroke-width="${f1(2.8 * sc + 1)}" stroke-linecap="round"/>`;
    }
    anchors.forEach((a) => { const [x, y] = sideAt(a, h0); s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(3.4 * sc + 0.8)}" fill="${pipe}" stroke="${pipeS}" stroke-width=".8"/>`; });
  }
  const accent = textColorOf(o.textColor).hex === '#FFFFFF' ? '#E8487C' : textColorOf(o.textColor).hex;
  if (design === 'heartdots' || (design === 'simple' && v === 2)) {
    pickFront(design === 'heartdots' ? 7 : 5).forEach((p, i) => {
      const [x, y] = sideAt(p, H * 0.52 + (i % 2 ? H * 0.12 : 0)), z = 4.6 * sc + 1.5;
      s += `<path d="M${f1(x)} ${f1(y + z * 0.9)}C${f1(x - z * 1.6)} ${f1(y - z * 0.2)} ${f1(x - z * 0.7)} ${f1(y - z * 1.3)} ${f1(x)} ${f1(y - z * 0.35)}C${f1(x + z * 0.7)} ${f1(y - z * 1.3)} ${f1(x + z * 1.6)} ${f1(y - z * 0.2)} ${f1(x)} ${f1(y + z * 0.9)}Z" fill="${accent}" opacity=".85"/>`;
    });
  }
  if (tops.has('ribbon')) {
    const band = front.filter((_, i) => i % 2 === 0).map((p) => sideAt(p, H * 0.62));
    s += `<polyline points="${band.map(([x, y]) => `${f1(x)},${f1(y)}`).join(' ')}" fill="none" stroke="#F49AB8" stroke-width="${f1(6 * sc)}" stroke-linecap="round"/>`;
    const [bxx, byy] = sideAt(rimAt(pts, 90), H * 0.62);
    const w = 13 * sc;
    s += `<path d="M${f1(bxx)} ${f1(byy)}C${f1(bxx - w)} ${f1(byy - w * 0.9)} ${f1(bxx - w * 1.4)} ${f1(byy + w * 0.5)} ${f1(bxx)} ${f1(byy)}C${f1(bxx + w)} ${f1(byy - w * 0.9)} ${f1(bxx + w * 1.4)} ${f1(byy + w * 0.5)} ${f1(bxx)} ${f1(byy)}Z" fill="#F7A8C2" stroke="#E07DA0" stroke-width="1"/>`;
    s += `<path d="M${f1(bxx - 2)} ${f1(byy + 2)}l${f1(-5 * sc)} ${f1(12 * sc)}M${f1(bxx + 2)} ${f1(byy + 2)}l${f1(5 * sc)} ${f1(12 * sc)}" stroke="#E07DA0" stroke-width="${f1(3 * sc)}" stroke-linecap="round"/><circle cx="${f1(bxx)}" cy="${f1(byy)}" r="${f1(3.2 * sc)}" fill="#E07DA0"/>`;
  }
  // 초코 드립
  if (design === 'drip') {
    pickFront(13).forEach((p) => {
      const [x, y] = sideAt(p, -1), L = (0.22 + r() * 0.42) * H, w = 3.4 * sc + 1.2;
      s += `<path d="M${f1(x - w)} ${f1(y)}L${f1(x - w)} ${f1(y + L)}A${f1(w)} ${f1(w)} 0 0 0 ${f1(x + w)} ${f1(y + L)}L${f1(x + w)} ${f1(y)}Z" fill="${choco}"/>`;
    });
  }
  // 아래 테두리 (앞쪽만 보이게)
  const bw = 4.6 * sc + 1.6, gap = bw * 1.15;
  s += `<g clip-path="url(#${id}front)"><g transform="translate(${cx} ${f1(groundY)}) scale(1 ${K})">
    <path d="${toPath(pts, 1.005)}" fill="none" stroke="${pipeS}" stroke-width="${f1(bw + 1.6)}" stroke-linecap="round" stroke-dasharray="0 ${f1(gap)}"/>
    <path d="${toPath(pts, 1.005)}" fill="none" stroke="${pipe}" stroke-width="${f1(bw)}" stroke-linecap="round" stroke-dasharray="0 ${f1(gap)}"/></g></g>`;

  // 윗면
  s += `<use href="#${id}p" transform="translate(${cx} ${f1(topY)}) scale(1 ${K})" fill="url(#${id}tg)"/>`;
  if (design === 'drip') s += `<g transform="translate(${cx} ${f1(topY)}) scale(1 ${K})"><path d="${toPath(pts, 0.98)}" fill="none" stroke="${shade(choco, 0.25)}" stroke-width="3" opacity=".6"/></g>`;

  // 윗면 위 평평한 장식 (같은 원근으로 눌림)
  let flat = '';
  if (tops.has('pearl') || (design === 'simple' && v === 2)) {
    flat += `<path d="${toPath(pts, 0.8)}" fill="none" stroke="#E9DFD2" stroke-width="${f1(4.2 * sc + 1.6)}" stroke-linecap="round" stroke-dasharray="0 ${f1(7 * sc + 2)}"/>`;
    flat += `<path d="${toPath(pts, 0.8)}" fill="none" stroke="#FFFDF8" stroke-width="${f1(3.2 * sc + 1)}" stroke-linecap="round" stroke-dasharray="0 ${f1(7 * sc + 2)}"/>`;
  }
  if (tops.has('sprinkle')) {
    const cols = ['#FF8FB1', '#7EC8E3', '#FFD166', '#9BE3A0', '#C3A6FF', '#FFFFFF'];
    let n = 0, guard = 0;
    while (n < 46 && guard++ < 400) {
      const x = (r() * 2 - 1) * R * 0.92, y = (r() * 2 - 1) * R * 0.92;
      if (!inside(pts, x / 0.93, y / 0.93) || Math.hypot(x, y * 1.4) < R * 0.42) continue;
      flat += `<rect x="${f1(x - 3)}" y="${f1(y - 1)}" width="${f1(6 * sc + 1)}" height="2.2" rx="1.1" fill="${cols[n % cols.length]}" transform="rotate(${Math.round(r() * 180)} ${f1(x)} ${f1(y)})"/>`;
      n++;
    }
  }
  const hasText = !!(o.text || '').trim();
  let textX = 0, textY = 0, textW = (shape === 'heart' ? 1.3 : 1.5) * R;
  if (design === 'photo') {
    const pr = R * (hasText ? 0.42 : 0.56), py = hasText ? -R * 0.22 : 0;
    flat += `<clipPath id="${id}ph"><circle cx="0" cy="${f1(py)}" r="${f1(pr)}"/></clipPath>`;
    if (o.photo) flat += `<image href="${o.photo}" x="${f1(-pr)}" y="${f1(py - pr)}" width="${f1(pr * 2)}" height="${f1(pr * 2)}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id}ph)"/>`;
    else flat += `<circle cx="0" cy="${f1(py)}" r="${f1(pr)}" fill="#EFE6F7"/><g transform="translate(0 ${f1(py)}) scale(${f1(pr / 30)})" opacity=".55"><rect x="-14" y="-9" width="28" height="20" rx="4" fill="none" stroke="#8E6BBE" stroke-width="3"/><circle r="6" fill="none" stroke="#8E6BBE" stroke-width="3" cy="1"/></g>`;
    flat += `<circle cx="0" cy="${f1(py)}" r="${f1(pr)}" fill="none" stroke="${pipeS}" stroke-width="3" stroke-dasharray="0 6" stroke-linecap="round"/>`;
    if (hasText) { textY = R * 0.5; textW = R * 1.25; }
  }
  if (design === 'character') {
    const bx0 = 0, by0 = hasText ? -R * 0.3 : -R * 0.04, z = R * (hasText ? 0.3 : 0.42);
    const line = textColorOf(o.textColor).hex === '#FFFFFF' ? '#6B4A3A' : shade(textColorOf(o.textColor).hex, -0.1);
    flat += `<g transform="translate(${f1(bx0)} ${f1(by0)}) scale(${f1(z / 30)})" stroke="${line}" stroke-width="2.6" stroke-linejoin="round">
      <circle cx="-19" cy="-18" r="9" fill="#F3D9BD"/><circle cx="19" cy="-18" r="9" fill="#F3D9BD"/>
      <circle cx="-19" cy="-18" r="4" fill="#F7B6C8" stroke="none"/><circle cx="19" cy="-18" r="4" fill="#F7B6C8" stroke="none"/>
      <ellipse cx="0" cy="2" rx="28" ry="25" fill="#F3D9BD"/>
      <circle cx="-10" cy="-2" r="2.8" fill="${line}" stroke="none"/><circle cx="10" cy="-2" r="2.8" fill="${line}" stroke="none"/>
      <ellipse cx="0" cy="9" rx="9" ry="7" fill="#FFF3E6"/><ellipse cx="0" cy="6.5" rx="3.4" ry="2.4" fill="${line}" stroke="none"/>
      <path d="M-4 12q4 3.5 8 0" fill="none" stroke-width="2"/>
      <ellipse cx="-17" cy="8" rx="4.5" ry="2.6" fill="#F7A9BE" stroke="none" opacity=".8"/><ellipse cx="17" cy="8" rx="4.5" ry="2.6" fill="#F7A9BE" stroke="none" opacity=".8"/></g>`;
    if (hasText) { textY = R * 0.5; textW = R * 1.25; }
  }
  if (design === 'flower' || tops.has('freshflower')) textW = Math.min(textW, R * 1.1);
  if (flat) s += `<g transform="translate(${cx} ${f1(topY)}) scale(1 ${K})">${flat}</g>`;

  // 위 테두리 짜기
  const tb = (design === 'vintage' ? 6 : 4.2) * sc + 1.4, tg = tb * (design === 'vintage' ? 1.05 : 1.2);
  const shell = design === 'vintage' || v === 1;
  s += `<g transform="translate(${cx} ${f1(topY)}) scale(1 ${K})">`;
  if (design === 'drip') {
    s += `<path d="${toPath(pts, 0.95)}" fill="none" stroke="#FFF4EA" stroke-width="${f1(tb)}" stroke-linecap="round" stroke-dasharray="0 ${f1(tg * 1.8)}"/>`;
  } else {
    s += `<path d="${toPath(pts, 0.965)}" fill="none" stroke="${pipeS}" stroke-width="${f1(tb + 1.6)}" stroke-linecap="round" stroke-dasharray="0 ${f1(tg)}"/>`;
    s += `<path d="${toPath(pts, 0.965)}" fill="none" stroke="${pipe}" stroke-width="${f1(tb)}" stroke-linecap="round" stroke-dasharray="0 ${f1(tg)}"/>`;
    if (shell) s += `<path d="${toPath(pts, 0.9)}" fill="none" stroke="${pipe}" stroke-width="${f1(tb * 0.55)}" stroke-linecap="round" stroke-dasharray="0 ${f1(tg * 0.9)}" stroke-dashoffset="${f1(tg / 2)}" opacity=".95"/>`;
  }
  s += `</g>`;

  // 문구
  if (hasText) {
    const crowded = ['flower', 'photo', 'character'].includes(design) || tops.has('freshflower');
    const lines = splitLines(o.text, crowded ? 5.5 : 7.5);
    const longest = Math.max(...lines.map(estW), 1);
    const shift = v === 1 ? -R * 0.08 : 0;
    let fs = Math.min(R * 0.36, textW / (longest * 0.98));
    if (lines.length >= 3) fs = Math.min(fs, R * 0.25);
    fs = Math.max(fs, 7);
    const tc = design === 'drip' && textColorOf(o.textColor).id !== 'white' ? '#FFF3E6' : textColorOf(o.textColor).hex;
    const needStroke = luminance(tc) > 0.8 && luminance(design === 'drip' ? choco : cream) > 0.7;
    const font = fontOf(o.font).css.replace(/"/g, "'");
    const ty = topY + (textY + shift) * K;
    s += `<g transform="translate(${f1(cx + textX)} ${f1(ty)}) scale(1 ${TK})">`;
    lines.forEach((l, i) => {
      const yy = (i - (lines.length - 1) / 2) * fs * 1.12 + fs * 0.36;
      s += `<text x="0" y="${f1(yy)}" text-anchor="middle" font-size="${f1(fs)}" font-weight="700" fill="${tc}" ${needStroke ? `stroke="${shade(cream, -0.4)}" stroke-width="1.1" paint-order="stroke"` : ''} font-family="${font}">${esc(l)}</text>`;
    });
    if (v === 2 && design !== 'character') {
      const hy = (lines.length / 2) * fs * 1.12 + fs * 0.5;
      [-1, 1].forEach((d) => { s += `<text x="${f1(d * (longest * fs * 0.5 + fs * 0.45))}" y="${f1(fs * 0.3)}" text-anchor="middle" font-size="${f1(fs * 0.55)}" fill="${accent}">♥</text>`; });
      s += `<text x="0" y="${f1(hy)}" text-anchor="middle" font-size="${f1(fs * 0.42)}" fill="${accent}" opacity=".8">· · ·</text>`;
    }
    s += `</g>`;
  }

  // 위에 세워지는 장식 (뒤 → 앞 순서)
  const items = [];
  const layout = (n, kind) => {
    if (v === 1) return Array.from({ length: n }, (_, i) => 300 + (i * 120) / Math.max(1, n - 1)); // 오른쪽 초승달
    if (v === 2) return Array.from({ length: n }, (_, i) => (i * 360) / n + 15); // 빙 두르기
    return Array.from({ length: n }, (_, i) => 200 + (i * 140) / Math.max(1, n - 1)); // 뒤쪽 아치
  };
  const at = (deg, k = 0.78) => { const [x, y] = rimAt(pts, deg, k); return [cx + x, topY + y * K, y]; };
  if (design === 'flower') {
    const spots = v === 1 ? [[300, 0.72, 1], [322, 0.8, 0.85], [280, 0.82, 0.8], [45, 0.82, 0.7]] : v === 2 ? [[235, 0.76, 1], [305, 0.76, 1], [90, 0.84, 0.85], [130, 0.84, 0.7], [50, 0.84, 0.7]] : [[215, 0.74, 1], [235, 0.84, 0.85], [195, 0.86, 0.8], [35, 0.8, 0.95], [55, 0.86, 0.75], [15, 0.88, 0.7]];
    const pal = ['#F48FB1', '#FFFFFF', '#CE93D8', '#FFB38A', '#F06292', '#FFF59D'];
    spots.forEach(([deg, k, z], i) => {
      const [x, y, depth] = at(deg, k);
      items.push([depth, () => {
        const pr = (9 * z + 2) * sc;
        let g = `<ellipse cx="${f1(x - pr * 1.3)}" cy="${f1(y + pr * 0.5)}" rx="${f1(pr * 0.85)}" ry="${f1(pr * 0.38)}" fill="#8FBF8A" transform="rotate(-20 ${f1(x - pr * 1.3)} ${f1(y + pr * 0.5)})"/>`;
        for (let p = 0; p < 5; p++) { const a = (p * 72 * Math.PI) / 180; g += `<circle cx="${f1(x + pr * 0.62 * Math.cos(a))}" cy="${f1(y + pr * 0.45 * Math.sin(a))}" r="${f1(pr * 0.55)}" fill="${pal[i % pal.length]}" stroke="${shade(pal[i % pal.length] === '#FFFFFF' ? '#F0D0DC' : pal[i % pal.length], -0.15)}" stroke-width=".7"/>`; }
        return g + `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(pr * 0.3)}" fill="#FFD54F"/>`;
      }]);
    });
  }
  if (tops.has('freshflower')) {
    const base = v === 1 ? 20 : v === 2 ? 135 : 215;
    [[0, 1], [22, 0.8], [-20, 0.75]].forEach(([d, z], i) => {
      const [x, y, depth] = at(base + d, 0.7);
      items.push([depth + 0.1, () => {
        const pr = 10 * z * sc;
        let g = `<path d="M${f1(x)} ${f1(y)}q${f1(-pr * 1.6)} ${f1(-pr * 0.2)} ${f1(-pr * 2)} ${f1(pr * 0.9)}q${f1(pr * 1.2)} ${f1(pr * 0.2)} ${f1(pr * 2)} ${f1(-pr * 0.9)}z" fill="#7FB77E"/>`;
        const c = ['#FFFFFF', '#FFD1DC', '#FFF0B3'][i];
        for (let p = 0; p < 6; p++) { const a = (p * 60 * Math.PI) / 180; g += `<ellipse cx="${f1(x + pr * 0.7 * Math.cos(a))}" cy="${f1(y - pr * 0.3 + pr * 0.5 * Math.sin(a))}" rx="${f1(pr * 0.6)}" ry="${f1(pr * 0.42)}" fill="${c}" stroke="#E8C8D2" stroke-width=".7" transform="rotate(${p * 60} ${f1(x + pr * 0.7 * Math.cos(a))} ${f1(y - pr * 0.3 + pr * 0.5 * Math.sin(a))})"/>`; }
        return g + `<circle cx="${f1(x)}" cy="${f1(y - pr * 0.3)}" r="${f1(pr * 0.28)}" fill="#F2B84B"/>`;
      }]);
    });
  }
  if (tops.has('cherry')) layout(v === 2 ? 8 : 5).forEach((deg) => {
    const [x, y, depth] = at(deg, 0.8);
    items.push([depth, () => { const rr = 6.2 * sc; return `<path d="M${f1(x)} ${f1(y - rr)}q${f1(3 * sc)} ${f1(-9 * sc)} ${f1(9 * sc)} ${f1(-12 * sc)}" fill="none" stroke="#6D8B3A" stroke-width="1.6" stroke-linecap="round"/><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(rr)}" fill="#D7263D"/><circle cx="${f1(x - rr * 0.35)}" cy="${f1(y - rr * 0.35)}" r="${f1(rr * 0.3)}" fill="#fff" opacity=".7"/>`; }]);
  });
  if (tops.has('strawberry')) layout(v === 2 ? 7 : 4).map((d) => d + 10).forEach((deg) => {
    const [x, y, depth] = at(deg, 0.72);
    items.push([depth, () => { const w = 8 * sc, h = 11 * sc; return `<path d="M${f1(x - w)} ${f1(y - h * 0.55)}Q${f1(x)} ${f1(y - h * 0.85)} ${f1(x + w)} ${f1(y - h * 0.55)}Q${f1(x + w * 0.6)} ${f1(y + h * 0.6)} ${f1(x)} ${f1(y + h * 0.55)}Q${f1(x - w * 0.6)} ${f1(y + h * 0.6)} ${f1(x - w)} ${f1(y - h * 0.55)}Z" fill="#E53950"/><path d="M${f1(x - w * 0.7)} ${f1(y - h * 0.62)}l${f1(w * 0.35)} ${f1(-h * 0.35)} ${f1(w * 0.35)} ${f1(h * 0.25)} ${f1(w * 0.35)} ${f1(-h * 0.3)} ${f1(w * 0.35)} ${f1(h * 0.32)}z" fill="#4E9A4B"/><circle cx="${f1(x - w * 0.3)}" cy="${f1(y)}" r=".9" fill="#FFE08A"/><circle cx="${f1(x + w * 0.25)}" cy="${f1(y - h * 0.15)}" r=".9" fill="#FFE08A"/><circle cx="${f1(x)}" cy="${f1(y + h * 0.25)}" r=".9" fill="#FFE08A"/>`; }]);
  });
  if (tops.has('macaron')) [245, 290].forEach((deg, i) => {
    const [x, y, depth] = at(v === 1 ? deg + 80 : deg, 0.62);
    items.push([depth, () => { const w = 11 * sc, c = ['#BFE6D0', '#F8C3D4'][i]; return `<g transform="rotate(${i ? 12 : -10} ${f1(x)} ${f1(y)})"><rect x="${f1(x - w)}" y="${f1(y - w * 1.5)}" width="${f1(2 * w)}" height="${f1(w * 0.75)}" rx="${f1(w * 0.37)}" fill="${c}" stroke="${shade(c, -0.15)}"/><rect x="${f1(x - w * 0.92)}" y="${f1(y - w * 0.8)}" width="${f1(w * 1.84)}" height="${f1(w * 0.3)}" fill="#FFF8EE"/><rect x="${f1(x - w)}" y="${f1(y - w * 0.52)}" width="${f1(2 * w)}" height="${f1(w * 0.75)}" rx="${f1(w * 0.37)}" fill="${c}" stroke="${shade(c, -0.15)}"/></g>`; }]);
  });
  if (ex.has('candle')) [-0.32, 0, 0.32].forEach((k, i) => {
    const x = cx + k * R, y = topY - 0.5 * R * K - (i === 1 ? 3 : 0), h = 30 * sc;
    items.push([-R * 0.5, () => `<rect x="${f1(x - 3)}" y="${f1(y - h)}" width="6" height="${f1(h)}" rx="2" fill="${['#8EC5FF', '#FF9EC0', '#FFD36E'][i]}"/><path d="M${f1(x - 3)} ${f1(y - h * 0.7)}l6 -5M${f1(x - 3)} ${f1(y - h * 0.35)}l6 -5" stroke="#fff" stroke-width="1.6" opacity=".8"/><line x1="${f1(x)}" y1="${f1(y - h)}" x2="${f1(x)}" y2="${f1(y - h - 4)}" stroke="#555" stroke-width="1"/>${opt.fancy ? `<circle cx="${f1(x)}" cy="${f1(y - h - 10)}" r="10" fill="#FFD54F" opacity=".3"/>` : ''}<path d="M${f1(x)} ${f1(y - h - 16)}q5 7 0 11q-5 -4 0 -11z" fill="#FFB300"/><path d="M${f1(x)} ${f1(y - h - 11)}q2 3 0 5q-2 -2 0 -5z" fill="#FFF3C4"/>`]);
  });
  if (ex.has('numcandle')) {
    const num = ((o.text || '').match(/\d+/) || ['1'])[0].slice(0, 2);
    const x = cx + R * 0.5, y = topY - 0.36 * R * K, fs = 30 * sc;
    items.push([-R * 0.36, () => `<text x="${f1(x)}" y="${f1(y)}" text-anchor="middle" font-size="${f1(fs)}" font-weight="700" font-family="Fredoka, sans-serif" fill="#F4C542" stroke="#B8892B" stroke-width="1.6" paint-order="stroke">${esc(num)}</text><line x1="${f1(x)}" y1="${f1(y - fs * 0.72)}" x2="${f1(x)}" y2="${f1(y - fs * 0.72 - 4)}" stroke="#555"/><path d="M${f1(x)} ${f1(y - fs * 0.72 - 15)}q5 7 0 11q-5 -4 0 -11z" fill="#FFB300"/>`]);
  }
  items.sort((a, b) => a[0] - b[0]).forEach(([, fn]) => { s += fn(); });

  // 판 문구
  if (ex.has('plate') && !box) {
    const py = groundY + maxY * K + 13;
    s += `<text x="${cx}" y="${f1(py)}" text-anchor="middle" font-size="${f1(9 + 2 * sc)}" font-family="'Dancing Script','Nanum Pen Script',cursive" font-weight="700" fill="#B8892B">${esc(o.plateText || 'Happy Day')}</text>`;
  }
  if (ex.has('card')) {
    const x = box ? cx + bx - 8 : cx + R + 4, y = groundY + 6;
    s += `<g transform="rotate(-8 ${f1(x)} ${f1(y)})"><rect x="${f1(x - 12)}" y="${f1(y - 18)}" width="26" height="18" rx="2" fill="#FFFDF8" stroke="#E7CDD7"/><path d="M${f1(x - 12)} ${f1(y - 18)}l13 9 13 -9" fill="none" stroke="#E7CDD7"/><path d="M${f1(x + 1)} ${f1(y - 6)}c-2.2-1.5-3.6-2.7-3.6-4.1 0-1 .8-1.7 1.7-1.7.8 0 1.5.4 1.9 1.1.4-.7 1.1-1.1 1.9-1.1.9 0 1.7.7 1.7 1.7 0 1.4-1.4 2.6-3.6 4.1z" fill="#F75C8D"/></g>`;
  }

  // 도시락 상자 앞벽
  if (box) {
    const kraft = '#D9B88C', kraftD = '#B8946A';
    const fy = groundY + by * K;
    s += `<rect x="${f1(cx - bx)}" y="${f1(fy - bh)}" width="${f1(2 * bx)}" height="${f1(bh)}" fill="${kraft}" stroke="${kraftD}" stroke-width="1.2"/>`;
    s += `<line x1="${f1(cx - bx)}" y1="${f1(fy - bh)}" x2="${f1(cx + bx)}" y2="${f1(fy - bh)}" stroke="#EAD3AF" stroke-width="2"/>`;
    if (ex.has('plate')) s += `<text x="${cx}" y="${f1(fy - bh * 0.38)}" text-anchor="middle" font-size="${f1(10 * sc + 3)}" font-family="'Dancing Script','Nanum Pen Script',cursive" font-weight="700" fill="#7A5634">${esc(o.plateText || 'Happy Day')}</text>`;
  }
  if (opt.fancy) s += `<ellipse cx="${f1(cx - R * 0.62)}" cy="${f1(topY + H * 0.62)}" rx="${f1(5 * sc)}" ry="${f1(H * 0.28)}" fill="#fff" opacity=".2"/>`;
  return s + '</svg>';
}

// 가게 대표 이미지용 기본 시안 (가게마다 다르게)
export function storeLook(store, k = 0) {
  const r = rng(hash(store.id + ':' + k));
  const creams = ['pink', 'white', 'lavender', 'butter', 'mint', 'sky', 'peach', 'white'];
  const st = store.styles || [];
  const designs = ['simple'];
  if (st.includes('flower') || st.includes('rice')) designs.push('flower');
  if (st.includes('character')) designs.push('character');
  if (st.includes('photo')) designs.push('photo');
  if (st.includes('lettering')) designs.push('vintage', 'heartdots');
  const texts = ['생일 축하해', 'HAPPY DAY', '사랑해', '축하해', '고생했어', 'LOVE'];
  const shapes = ['round', 'round', 'heart', 'square'];
  return {
    shape: shapes[Math.floor(r() * shapes.length)],
    size: st.includes('dosirak') && k % 2 === 0 ? 'dosirak' : 'h1',
    design: designs[Math.floor(r() * designs.length)],
    cream: creams[Math.floor(r() * creams.length)],
    text: texts[Math.floor(r() * texts.length)],
    font: ['jua', 'pen', 'gaegu', 'melody'][Math.floor(r() * 4)],
    textColor: ['berry', 'choco', 'navy'][Math.floor(r() * 3)],
    toppings: r() > 0.6 ? ['cherry'] : r() > 0.5 ? ['pearl'] : [],
    extras: [],
    variant: Math.floor(r() * 3),
  };
}
