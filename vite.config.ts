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
      },
      // иконки, apple-touch-icon и заставки iOS генерируются из pwa-assets.config.ts,
      // ссылки на них добавляются в index.html при сборке
      pwaAssets: {
        config: true,
        overrideManifestIcons: true,
      },
      workbox: {
        // всё приложение, включая звуки и шрифты, кладётся в кэш при установке — работает без сети
        globPatterns: ['**/*.{js,css,html,svg,png,ico,mp3,woff2}'],
        // заставки iOS забирает сама при добавлении на экран «Домой», в кэше они не нужны
        globIgnores: ['**/apple-splash-*'],
        cleanupOutdatedCaches: true,
      },
    })
  ],
})
