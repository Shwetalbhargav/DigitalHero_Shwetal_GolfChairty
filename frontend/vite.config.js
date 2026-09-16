import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const base = env.VITE_API_BASE_URL || '/api';
  if (!/^(\/api|https?:\/\/[^\s]+\/api)\/?$/.test(base))
    throw new Error(
      'VITE_API_BASE_URL must be /api or an HTTP(S) URL ending in /api',
    );
  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: env.API_PROXY_TARGET || 'http://127.0.0.1:4000',
          changeOrigin: true,
        },
      },
    },
    test: {
      // Avoid Windows child-process startup stalls in the test runner.
      pool: 'threads',
      maxWorkers: 1,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.js'],
      restoreMocks: true,
    },
  };
});
