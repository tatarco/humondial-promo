import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  root: resolve(__dirname),
  server: { port: 5175 },
  resolve: { alias: { '@': resolve(__dirname, 'src') } },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.js'],
    exclude: ['**/node_modules/**', '**/.worktrees/**'],
    environmentOptions: {
      jsdom: {
        url: 'http://localhost/',
      },
    },
    pool: 'forks',
  },
});
