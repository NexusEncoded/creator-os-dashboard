import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Bind to all interfaces (not just localhost) so the app is reachable
    // from a Cloudflare Tunnel or another device on the LAN.
    host: true,
    // Vite blocks requests with an unrecognized Host header by default —
    // needed since a tunnel's public hostname isn't "localhost".
    allowedHosts: true,
    // Forward API/auth calls to the local backend so the whole app works
    // through a single public URL — no second tunnel, no CORS to manage.
    proxy: {
      '/api': { target: 'http://localhost:8787', changeOrigin: true },
      '/auth': { target: 'http://localhost:8787', changeOrigin: true },
    },
  },
})
