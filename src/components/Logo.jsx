// 에이크(AKE) 로고: 팀이 만든 로고 그림(초 + AKE)을 그대로 쓴다. public/brand 에 있음 (tools/make-icons.mjs 로 만듦)
const BASE = import.meta.env.BASE_URL;
export const LOGO_SRC = `${BASE}brand/logo.webp`;
export const CANDLE_SRC = `${BASE}brand/candle.webp`;
export const BRAND = '에이크';

// 가로 로고 (높이로 크기 지정)
export function Logo({ h = 28, style, className = '' }) {
  return <img className={`logo-img ${className}`} src={LOGO_SRC} alt="에이크 AKE" style={{ height: h, width: 'auto', ...style }} draggable={false} />;
}
// 생일초만 (작은 자리용)
export function Candle({ h = 40, style, className = '' }) {
  return <img className={className} src={CANDLE_SRC} alt="" style={{ height: h, width: 'auto', ...style }} draggable={false} />;
}
// 동그란 크림색 바탕 위의 초 (프로필·설치 안내 등)
export function LogoBadge({ size = 34 }) {
  return (
    <span className="logo-badge" style={{ width: size, height: size, borderRadius: size * 0.3 }}>
      <Candle h={size * 0.72} />
    </span>
  );
}
// 예전 이름 호환
export const Wordmark = ({ size = 22 }) => <Logo h={size * 1.25} />;
export const LogoMark = ({ size = 64 }) => <Candle h={size} />;
