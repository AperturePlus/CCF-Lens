import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import crypto from 'crypto'

// Polyfill for crypto.hash (Node.js 21.7.0+)
if (!crypto.hash) {
  (crypto as any).hash = (algorithm: string, data: crypto.BinaryLike) => {
    return crypto.createHash(algorithm).update(data).digest()
  }
}

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: [
      'test/unit/**/*.test.ts',
      'test/integration/**/*.test.ts',
      'test/property/**/*.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts', 'src/**/*.vue'],
      exclude: ['src/vite-env.d.ts', 'src/main.ts'],
    },
    // 属性测试可能需要更长时间
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
