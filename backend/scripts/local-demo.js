// Disposable localhost demonstration: no .env, external DB, media or payments.
import { startBrowserServer } from './browser-server.js';
import { seedOperationsFixture } from './seed-operations-fixture.js';
try {
  const stop = await startBrowserServer({ seed: seedOperationsFixture });
  console.info(
    'Disposable demo API: http://127.0.0.1:4011 (data disappears on exit).',
  );
  console.info(
    'Demo-only accounts and frontend proxy commands: docs/Local-Readiness.md',
  );
  const shutdown = async () => {
    await stop();
    process.exitCode = 0;
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
} catch {
  console.error(
    'Local demo startup failed. Check free port 4011 and the test MongoDB binary cache.',
  );
  process.exitCode = 1;
}
