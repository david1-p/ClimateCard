import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    headers: {
      // 보안 헤더 추가
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    // 프로덕션 빌드 보안 설정
    sourcemap: false,  // 소스맵 비활성화 (코드 노출 방지)
    minify: 'esbuild',  // 빠른 난독화
    rollupOptions: {
      output: {
        // 청크 파일명 난독화
        manualChunks: undefined,
      }
    }
  }
})
