import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'

export default defineConfig({
  base: '/kern/',
  plugins: [
    solid(),
    wasm(),
    topLevelAwait()
  ],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    }
  },
  worker: {
    format: 'es',
    plugins: () => [wasm(), topLevelAwait()]
  },
  resolve: {
    alias: {
      '@': '/src',
      '@components': '/src/components',
      '@workers': '/src/workers',
      '@store': '/src/store',
      '@styles': '/src/styles'
    }
  },
  optimizeDeps: {
    exclude: ['kern-wasm']
  }
})
