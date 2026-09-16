import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  // @cueclock/shared is a symlinked workspace package built as CommonJS; without this,
  // Vite/Rollup resolve past the symlink to its real path (outside node_modules), which
  // skips the commonjs interop transform and drops its named exports during production build.
  resolve: {
    preserveSymlinks: true,
  },
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
