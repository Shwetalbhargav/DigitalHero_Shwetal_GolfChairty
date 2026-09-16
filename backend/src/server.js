import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createApp } from './app.js';
import { parseEnv } from './config/env.js';
import { createDatabase } from './config/db.js';
export async function startServer(config, database = createDatabase(config)) {
  let shuttingDown = false;
  let server;
  const app = createApp({
    config,
    database,
    isShuttingDown: () => shuttingDown,
  });
  try {
    await database.connect();
    server = await new Promise((resolve, reject) => {
      const listener = app.listen(config.port, () => resolve(listener));
      listener.once('error', reject);
    });
  } catch {
    await database.disconnect().catch(() => {});
    throw new Error(
      'Server startup failed: check MongoDB availability and PORT. Connection details are omitted to protect credentials.',
    );
  }
  async function shutdown() {
    if (shuttingDown) return;
    shuttingDown = true;
    // Bound draining so an open socket cannot keep a terminating instance alive.
    const deadline = setTimeout(() => {
      server.closeAllConnections();
      process.exit(1);
    }, config.shutdownTimeoutMs);
    try {
      await new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      await database.disconnect();
    } finally {
      clearTimeout(deadline);
      process.off('SIGINT', onSignal);
      process.off('SIGTERM', onSignal);
    }
  }
  function onSignal() {
    shutdown().catch(() => {
      console.error('Graceful shutdown failed');
      process.exitCode = 1;
    });
  }
  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);
  return { server, shutdown };
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  dotenv.config({
    path: fileURLToPath(new URL('../.env', import.meta.url)),
    quiet: true,
  });
  try {
    const config = parseEnv(process.env);
    await startServer(config);
    console.info('Digital Heroes API listening on port ' + config.port);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
