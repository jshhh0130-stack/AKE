import fs from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 카카오 지도 JavaScript 키: 환경 변수 VITE_KAKAO_KEY 가 있으면 그것, 없으면 kakaomap_key.txt (git에 올리지 않는 파일)
// JavaScript 키는 원래 웹 페이지에 그대로 실리는 키예요. 대신 카카오 개발자 콘솔의 '사이트 도메인'에 등록된 주소에서만 동작해요.
function kakaoKey() {
  if (process.env.VITE_KAKAO_KEY) return process.env.VITE_KAKAO_KEY.trim();
  try { return fs.readFileSync(new URL('./kakaomap_key.txt', import.meta.url), 'utf8').trim(); } catch { return ''; }
}

// base './' : GitHub Pages(하위 경로), 안드로이드 앱 포장, 로컬 미리보기 어디서든 같은 결과물이 열리게 상대 경로로 빌드
export default defineConfig({
  plugins: [react()],
  base: './',
  define: { 'import.meta.env.VITE_KAKAO_KEY': JSON.stringify(kakaoKey()) },
  build: { chunkSizeWarningLimit: 1500 },
});
