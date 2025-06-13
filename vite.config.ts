import { defineConfig } from 'vite';

export default defineConfig({
  root: './src',
  publicDir: '../public',
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    sourcemap: true,
  },
}); 