import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8420',
      '/ws': { target: 'ws://localhost:8420', ws: true },
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        index: path.resolve(__dirname, 'index.html'),
        control: path.resolve(__dirname, 'control.html'),
        display: path.resolve(__dirname, 'display.html'),
      },
    },
  },
});
