import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { VitePWA } from 'vite-plugin-pwa'

const BACKGROUND_COLOR = '#2B2B2B'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // обновление по кнопке в шапке (см. App.tsx), а не автоматическая перезагрузка посреди раунда
      registerType: 'prompt',
      manifest: {
        id: '/',
        name: 'Boxing Timer',
        short_name: 'Boxing Timer',
        description: 'Таймер раундов для тренировок по боксу',
        lang: 'ru',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: BACKGROUND_COLOR,
        background_color: BACKGROUND_COLOR,
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'timer.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        // всё приложение, включая звуки и шрифты, кладётся в кэш при установке — работает без сети
        globPatterns: ['**/*.{js,css,html,svg,png,mp3,woff2}'],
        cleanupOutdatedCaches: true,
      },
    })
  ],
})
