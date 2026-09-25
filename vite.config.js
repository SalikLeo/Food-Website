import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
  const isMobile = process.env.VITE_APP_MODE === 'customer' || process.env.VITE_APP_MODE === 'admin';

  return {
    // When building for mobile APKs, do not bundle public assets/downloads into the app.
    // Images are loaded live from the production server (https://salikleo.website) to keep APK size minimal.
    publicDir: isMobile ? false : 'public',
    build: {
      emptyOutDir: true,
      chunkSizeWarningLimit: 2000
    },
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true
        },
        '/uploads': {
          target: 'http://localhost:5000',
          changeOrigin: true
        }
      }
    }
  };
});
