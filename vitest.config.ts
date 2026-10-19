import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'

// отдельно от vite.config.ts: PWA-плагин в тестах не нужен
export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
