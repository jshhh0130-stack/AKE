// 손그림 애니메이션 (디자인 핸드오프 iAKE v2): 갈색 펜 선(#6b5d54) + feTurbulence 로 살짝 흔들리는 선
// DoneRing: 주문서 보냄 — 점선 원이 천천히 돌고, 휘핑기를 든 제빵사 강아지가 원을 따라 돈다
// PaidCake: 결제 완료 — 물결 크림·꽃·초 3개 케이크 위로 별 14개가 퐁퐁 터진다
const INK = '#6b5d54';
const P = ({ d, w = 1.8, fill = 'none', ...rest }) => <path d={d} fill={fill} stroke={INK} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" {...rest} />;

function Dog() {
  return (
    <g filter="url(#akeWob)">
      <P d="M-7 -25 C-12 -26 -13 -19 -9 -18 C-10 -24 -4 -27 0 -24 C4 -27 10 -24 9 -18 C13 -19 12 -26 7 -25 C6 -30 -6 -30 -7 -25 Z M-8 -18 L-8 -14 L8 -14 L8 -18" fill="#FDF8F2" />
      <P d="M-10 -14 C-14 -13 -15 -6 -14 -1 C-12 6 -6 9 0 9 C6 9 12 6 14 -1 C15 -6 14 -13 10 -14 Z" fill="#FDF8F2" />
      <P d="M-11 -12 C-18 -12 -20 -2 -16 4 C-14 6 -12 4 -12 1" fill="#FDF8F2" />
      <P d="M11 -12 C18 -12 20 -2 16 4 C14 6 12 4 12 1" fill="#FDF8F2" />
      <circle cx={-4.5} cy={-5} r={1.5} fill={INK} /><circle cx={4.5} cy={-5} r={1.5} fill={INK} />
      <ellipse cx={0} cy={-0.5} rx={2.4} ry={1.7} fill={INK} />
      <P d="M0 1 L0 3 M-3 4 C-1.5 5.5 1.5 5.5 3 4" />
      <P d="M9 7 C11 5 15 6 14 9 C13 11 10 11 9 9 Z" fill="#FDF8F2" />
      <P d="M-9 7 C-11 5 -15 6 -14 9 C-13 11 -10 11 -9 9 Z" fill="#FDF8F2" />
      <P d="M13 7 L20 -3" w={3.4} />
      <P d="M20 -3 C17 -8 19 -15 23 -15 C27 -15 28 -8 24 -3 Z M21.5 -3.5 C20 -8 21 -14 23 -15 M22.7 -3.3 C24 -8 24.5 -13 23 -15" fill="#FDF8F2" />
    </g>
  );
}

// 지름 160px 사진 둘레 (240×240 그림을 사진보다 40px 바깥에 놓는다)
export function DoneRing() {
  const c = 120, r = 108;
  return (
    <svg className="donering" width="240" height="240" viewBox="0 0 240 240" aria-hidden="true">
      <defs><filter id="akeWob"><feTurbulence type="fractalNoise" baseFrequency=".06" numOctaves="2" seed="3" /><feDisplacementMap in="SourceGraphic" scale="1.6" /></filter></defs>
      <g className="spin-rev" style={{ transformOrigin: `${c}px ${c}px` }}>
        <circle cx={c} cy={c} r={r - 6} fill="none" stroke={INK} strokeWidth="1.6" strokeDasharray="1 7" strokeLinecap="round" filter="url(#akeWob)" />
      </g>
      <g className="spin" style={{ transformOrigin: `${c}px ${c}px` }}>
        <g transform={`translate(${c} ${c - r - 4}) scale(.72)`}><g className="bob"><Dog /></g></g>
      </g>
    </svg>
  );
}

const wave = (x0, x1, y, a, n) => { let d = `M${x0} ${y}`; const w = (x1 - x0) / n; for (let i = 0; i < n; i++) d += ` q${w / 2} ${i % 2 ? a : -a} ${w} 0`; return d; };
const star = (sz, pts) => { let d = ''; for (let i = 0; i < pts * 2; i++) { const a = (i * Math.PI) / pts - Math.PI / 2, rr = i % 2 ? sz * 0.38 : sz; d += `${i ? 'L' : 'M'}${(Math.cos(a) * rr).toFixed(2)} ${(Math.sin(a) * rr).toFixed(2)} `; } return d + 'Z'; };
const T = [[-34, -30], [-22, -44], [-8, -50], [6, -46], [20, -52], [34, -38], [42, -22], [-44, -16], [-14, -36], [14, -32], [28, -24], [-28, -18], [0, -40], [-38, -42]];
function Flower({ x, y }) {
  const petals = [0, 60, 120, 180, 240, 300].map((a) => { const rad = (a * Math.PI) / 180, cs = Math.cos(rad), sn = Math.sin(rad); return `M${(x + cs * 3).toFixed(1)} ${(y + sn * 3).toFixed(1)} l${(cs * 2.2).toFixed(1)} ${(sn * 2.2).toFixed(1)}`; }).join(' ');
  return <g><circle cx={x} cy={y} r={1.3} fill="none" stroke={INK} strokeWidth="1" /><P d={petals} w={1} /></g>;
}
export function PaidCake() {
  return (
    <svg className="paidcake" width="100%" height="100%" viewBox="-50 -50 100 100" aria-hidden="true">
      <defs><filter id="akeWob2"><feTurbulence type="fractalNoise" baseFrequency=".09" numOctaves="2" seed="5" /><feDisplacementMap in="SourceGraphic" scale="1.1" /></filter></defs>
      <g filter="url(#akeWob2)" transform="translate(0 14)">
        {T.map(([tx, ty], i) => (
          <g key={i} transform="translate(0 -18)">
            <g className="burst" style={{ '--tx': `${tx}px`, '--ty': `${ty + 10}px`, '--rot': `${i % 2 ? 40 : -40}deg`, animationDelay: `${(i * 0.17).toFixed(2)}s` }}>
              <P d={star(i % 3 === 0 ? 4.2 : i % 3 === 1 ? 3.2 : 2.5, i % 4 === 3 ? 4 : 5)} fill="#fff" w={1.1} />
            </g>
          </g>
        ))}
        <g className="head">
          {[-10, 0, 10].map((x, i) => (
            <g key={i}>
              <P d={`M${x - 1.6} -6 L${x - 1.2} -19 L${x + 1.2} -19 L${x + 1.6} -6`} w={1.5} />
              <g className="flame" style={{ animationDuration: `${0.5 + i * 0.12}s` }}>
                <P d={`M${x} -21 C${x - 2.4} -23 ${x - 1} -26 ${x} -28 C${x + 1} -26 ${x + 2.4} -23 ${x} -21 Z`} w={1.5} />
              </g>
            </g>
          ))}
          <P d="M-25 -2 C-28 -6 -24 -9 -20 -8 C-16 -12 -10 -8 -6 -9 M6 -9 C10 -8 14 -11 18 -9 C22 -11 27 -7 25 -2" w={1.5} />
          <P d={wave(-26, 26, -1, 2.2, 8)} w={1.5} />
          <P d="M-24 0 L-24 22 M24 0 L24 22" w={1.5} />
          {[-16, -5, 6, 17].map((x) => <Flower key={x} x={x} y={10} />)}
          <P d={wave(-27, 27, 23, 2.2, 8)} w={1.5} />
          <P d="M-27 23 C-29 21 -28 19 -26 20 M27 23 C29 21 28 19 26 20" w={1.5} />
        </g>
      </g>
    </svg>
  );
}
