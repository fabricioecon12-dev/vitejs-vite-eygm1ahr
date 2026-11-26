import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss()
  ],
  test: {
    include: ['src/tests/**/*.test.{js,ts,jsx,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/.git/**',
      '**/*.backup-*.test.{js,ts,jsx,tsx}'
    ]
  }
})
