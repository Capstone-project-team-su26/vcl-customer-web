import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api/image-upload": {
        target: "https://catbox.moe",
        changeOrigin: true,
        rewrite: () => "/user/api.php",
      },
    },
  },
})
