import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Served under /app/ next to the public website, which owns the root path.
  base: '/app/',
  plugins: [react()],
  // The website's dev server uses 5173 and proxies /app here.
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      '/app/api/ctgov': {
        target: 'https://clinicaltrials.gov',
        changeOrigin: true,
        rewrite: (path) => path.replace('/app/api/ctgov', '/api/v2'),
      },
    },
  },
  test: { include: ['src/**/*.test.ts'] },
});
