import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' : GitHub Pages(하위 경로), 안드로이드 앱 포장, 로컬 미리보기 어디서든 같은 결과물이 열리게 상대 경로로 빌드
export default defineConfig({
  plugins: [react()],
  base: './',
  build: { chunkSizeWarningLimit: 1500 },
});
