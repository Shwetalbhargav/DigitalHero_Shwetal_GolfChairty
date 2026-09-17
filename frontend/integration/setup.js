import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { startBrowserServer } from '../../backend/scripts/browser-server.js';
import { seedOperationsFixture } from '../../backend/scripts/seed-operations-fixture.js';

// Own server handles directly: Windows shell process trees can orphan a webServer.
export default async function setup() {
  const stopBackend = await startBrowserServer({ seed: seedOperationsFixture });
  let vite;
  try {
    vite = await createServer({
      configFile: false,
      envDir: false,
      plugins: [react()],
      define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('/api') },
      server: {
        host: '127.0.0.1',
        port: 5173,
        strictPort: true,
        proxy: {
          '/api': { target: 'http://127.0.0.1:4011', changeOrigin: true },
        },
      },
    });
    await vite.listen();
  } catch (error) {
    await vite?.close();
    await stopBackend();
    throw error;
  }
  return async () => {
    try {
      await vite.close();
    } finally {
      await stopBackend();
    }
  };
}
