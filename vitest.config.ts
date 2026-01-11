import { defineConfig } from 'vitest/config'
import solid from 'vite-plugin-solid'

export default defineConfig({
  plugins: [solid()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
  },
  resolve: {
    alias: {
      '@': '/src',
      '@components': '/src/components',
      '@workers': '/src/workers',
      '@store': '/src/store',
      '@styles': '/src/styles'
    }
  }
})
