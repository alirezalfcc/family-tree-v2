
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/', // Ensure absolute paths for Firebase Hosting
  build: {
    outDir: 'dist',
    sourcemap: true, // Enable sourcemaps for better debugging in prod
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'd3', 'firebase/app', 'firebase/database'],
        },
      },
    },
  },
  server: {
    host: true // Listen on all addresses
  }
});
