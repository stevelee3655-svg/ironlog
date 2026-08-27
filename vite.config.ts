import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  server: {
    // 포트를 박아 두면 이전에 띄운 개발 서버가 5173을 잡고 있을 때 새로 못 뜬다.
    // 도구가 PORT로 빈 포트를 지정해 주므로 그것을 그대로 쓰고, 없으면 기본값을 쓴다.
    port: Number(process.env.PORT) || 5173,
    // 그 포트마저 차 있으면 다음 빈 포트로 넘어간다(멈추지 않는다).
    strictPort: false
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icons/*.png'],
      manifest: {
        name: 'IronLog - Gym & LLM Wiki Tracker',
        short_name: 'IronLog',
        description: '헬스 운동 기록 및 Google Drive LLM Wiki 자동 전송 트래커',
        theme_color: '#090A0F',
        background_color: '#090A0F',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ]
});
