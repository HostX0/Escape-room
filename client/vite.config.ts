import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // اجعل السيرفر يستمع على جميع الشبكات بدل localhost فقط
    // هذا ضروري للوصول من أجهزة أخرى عبر Tailscale
    host: '0.0.0.0',
    proxy: { '/api': 'http://localhost:5000', '/uploads': 'http://localhost:5000' },
  },
})
