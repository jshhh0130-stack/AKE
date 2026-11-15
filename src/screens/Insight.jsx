// 시장 데이터 · 인사이트 (비즈니스 데이터 시각화 발표용으로도 쓸 수 있게)
import { useState } from 'react';
import { Header } from '../components/ui.jsx';
import { SEED_STORES, SEED_UPDATED } from '../lib/stores.js';
import { BENCH, SIZES, STYLES, styleName } from '../data/catalog.js';
import { man } from '../lib/util.js';

const BAR = '#E04479';
const INK = '#2A2126', MUTE = '#8D8288', GRID = '#F1E3E9';

function HBars({ data, unit = '곳', title }) {
  const max = Math.max(...data.map((d) => d.v), 1);
  const rowH = 30, labelW = 92, w = 340, barW = w - labelW - 44;
  const [hover, setHover] = useState(null);
  return (
    <svg viewBox={`0 0 ${w} ${data.length * rowH + 6}`} width="100%" role="img" aria-label={title}>
      {data.map((d, i) => {
        const y = i * rowH + 4, bw = Math.max(4, (d.v / max) * barW);
        return (
          <g key={d.k} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}>
            <title>{`${d.k}: ${d.v}${unit}`}</title>
            <rect x="0" y={y - 2} width={w} height={rowH - 2} fill={hover === i ? '#FFF5F8' : 'transparent'} />
            <text x="0" y={y + 15} fontSize="12.5" fill={INK} fontWeight="600">{d.k}</text>
            <path d={`M${labelW} ${y + 4}h${bw - 4}a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4h-${bw - 4}z`} fill={BAR} opacity={hover == null || hover === i ? 1 : 0.55} />
            <text x={labelW + bw + 6} y={y + 15} fontSize="12" fill={MUTE} fontWeight="700">{d.v}{unit}</text>
          </g>
        );
      })}
    </svg>
  );
}

function PriceStrip({ rows }) {
  const w = 340, labelW = 54, rowH = 34, lo = 10000, hi = 90000;
  const x = (v) => labelW + ((v - lo) / (hi - lo)) * (w - labelW - 10);
  const ticks = [20000, 40000, 60000, 80000];
  return (
    <svg viewBox={`0 0 ${w} ${rows.length * rowH + 24}`} width="100%" role="img" aria-label="크기별 공개 기본가 분포">
      {ticks.map((t) => <g key={t}><line x1={x(t)} x2={x(t)} y1="0" y2={rows.length * rowH} stroke={GRID} /><text x={x(t)} y={rows.length * rowH + 16} fontSize="10.5" fill={MUTE} textAnchor="middle">{man(t)}</text></g>)}
      {rows.map((r, i) => {
        const y = i * rowH + rowH / 2;
        const [b0, b1] = BENCH[r.id];
        return (
          <g key={r.id}>
            <text x="0" y={y + 4} fontSize="12.5" fill={INK} fontWeight="600">{r.name}</text>
            <rect x={x(b0)} y={y - 9} width={x(b1) - x(b0)} height="18" rx="9" fill="#FFE7EF"><title>{`${r.name} 수원 평균 범위 ${man(b0)}~${man(b1)}원`}</title></rect>
            {r.pts.map((p, k) => <circle key={k} cx={x(p.v)} cy={y} r="5" fill={BAR} stroke="#fff" strokeWidth="2"><title>{`${p.name} ${r.name} ${p.v.toLocaleString()}원~`}</title></circle>)}
          </g>
        );
      })}
    </svg>
  );
}

const FACTS = [
  { big: '2조 1,454억 원', t: '국내 케이크 생산액 (2024, 전년 대비 +28.1%)', src: 'aT 식품외식통계', note: '공장 생산 포함 — 동네 커스텀 가게 시장 규모는 아니에요' },
  { big: '월 23,140회', t: "‘주문제작케이크’ 네이버 월간 검색 (2026.8)", src: '네이버 검색광고 키워드 도구 · 팀 조사' },
  { big: '약 100곳', t: '경기도 비프랜차이즈 케이크 매장 개업 (2024)', src: '경인일보 2025.3.3' },
  { big: '4,465건 · 평균 9.5만원', t: '맞춤 케이크 견적 요청 누적 · 평균 견적(1만~17만원)', src: '숨고 가격 페이지' },
  { big: '주 10건+', t: '수원 1인 레터링 업체 주문 수 (근처 같은 업체 5~6곳)', src: '경인일보 2025.3.3 · 사례 1건' },
];
const TOOLS = [['똑톡', '월 5,000~45,000원', '사장님용 주문서·예약 관리'], ['카오르', '월 55,000원', '사장님용 관리'], ['부카', '월 9,900원~', '사장님용 관리'], ['케이크잇', '무료 도안', '손님용 AI 도안 → 업체 견적']];

export default function Insight() {
  const S = SEED_STORES;
  const byGu = ['영통구', '권선구', '팔달구', '장안구'].map((g) => ({ k: g, v: S.filter((s) => s.gu === g).length }));
  const byStyle = STYLES.filter((x) => x.id !== 'custom').map((st) => ({ k: st.name, v: S.filter((s) => s.styles?.includes(st.id)).length })).filter((d) => d.v > 0).sort((a, b) => b.v - a.v);
  const priced = S.filter((s) => s.price);
  const rows = SIZES.map((z) => ({ id: z.id, name: z.name, pts: priced.filter((s) => s.price[z.id]?.[0]).map((s) => ({ name: s.name, v: s.price[z.id][0] })) }));
  const detail = S.filter((s) => s.level === 'detail').length;
  const sameDay = S.filter((s) => s.sameDay === true).length;
  return (
    <div className="screen">
      <Header title="시장 데이터 · 인사이트" fallback="/c/my" />
      <div className="scroll pad">
        <div className="small muted">수원 커스텀·레터링 케이크 가게 공개 자료 ({SEED_UPDATED} 조사) + 팀 리서치</div>
        <div className="kpis light" style={{ marginTop: 10 }}>
          <div><small>조사한 가게</small><b>{S.length}곳</b></div>
          <div><small>가격·운영 확인</small><b>{detail}곳</b></div>
          <div><small>당일 주문 가능</small><b>{sameDay}곳</b></div>
        </div>

        <div className="sec-t"><h3>구별 가게 수</h3></div>
        <div className="card pad"><HBars data={byGu} title="구별 커스텀 케이크 가게 수" /><div className="xs muted">영통구(아주대·광교·망포)에 가장 많이 모여 있어요 → 첫 시범 지역으로 적합</div></div>

        <div className="sec-t"><h3>만드는 케이크 종류</h3><span className="more">가게 수 · 중복 포함</span></div>
        <div className="card pad"><HBars data={byStyle} title="스타일별 가게 수" /><div className="xs muted">레터링이 기본이고, 도시락·플라워·떡케이크가 뒤따라요</div></div>

        <div className="sec-t"><h3>크기별 공개 기본가</h3><span className="more">점 = 가게 · 띠 = 평균 범위</span></div>
        <div className="card pad">
          <PriceStrip rows={rows} />
          <div className="xs muted" style={{ marginTop: 4 }}>가격을 공개한 {priced.length}곳의 “~부터” 기본가예요. 같은 1호도 3.5만~6만 원대로 가게마다 차이가 커서, <b>가격을 먼저 보여 주는 것</b>이 손님에게 큰 도움이 돼요.</div>
        </div>

        <div className="sec-t"><h3>주문 과정, 7단계 → 3단계</h3></div>
        <div className="card pad">
          <div className="b small" style={{ color: MUTE }}>지금 (카톡 주문)</div>
          <div className="chips wrap" style={{ margin: '6px 0 12px' }}>{['인스타 캡처', '카톡 상담', '주문서 복붙', '가격 안내', '계좌이체', '입금 확인 톡', '확정'].map((t, i) => <span key={t} className="tag mute">{i + 1}. {t}</span>)}</div>
          <div className="b small pink">Dear Cake</div>
          <div className="chips wrap" style={{ marginTop: 6 }}>{['지도·사진으로 찾기', '옵션 고르면 시안·가격 바로', '사장님 승인(규칙 안이면 자동)'].map((t, i) => <span key={t} className="tag">{i + 1}. {t}</span>)}</div>
          <div className="xs muted" style={{ marginTop: 10 }}>팀 직접 주문 체험(2026.11.13)과 리서치 리포트 기준</div>
        </div>

        <div className="sec-t"><h3>시장 근거</h3></div>
        {FACTS.map((f) => (
          <div key={f.t} className="card pad" style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: -0.5 }}>{f.big}</div>
            <div className="small">{f.t}</div>
            <div className="xs muted" style={{ marginTop: 2 }}>출처: {f.src}{f.note ? ` · ${f.note}` : ''}</div>
          </div>
        ))}

        <div className="sec-t"><h3>비슷한 서비스와 빈자리</h3></div>
        <div className="card pad">
          {TOOLS.map(([n, p, d]) => <div key={n} className="kv"><span>{n}</span><b>{p} · <span className="muted" style={{ fontWeight: 600 }}>{d}</span></b></div>)}
          <div className="note pink" style={{ marginTop: 10 }}>사장님용 관리 도구는 이미 여럿 있지만, <b>가게의 실제 옵션·가격과 연결된 미리보기를 손님이 보고 고르는 화면</b>은 비어 있어요. Dear Cake는 이 빈자리 + 사장님 승인만 남기는 구조예요.</div>
        </div>
        <div className="xs muted" style={{ margin: '14px 2px 24px', lineHeight: 1.6 }}>※ 수치는 팀 조사 자료에서 옮겼어요. 발표 전에 원문을 한 번 더 확인해 주세요. 가게 정보는 공개 자료라 바뀌었을 수 있어요.</div>
      </div>
    </div>
  );
}
