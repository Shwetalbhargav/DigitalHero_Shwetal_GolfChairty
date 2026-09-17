// Isolated browser-test server: never reads .env or connects to a user database.
import { randomBytes } from 'node:crypto';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { createDatabase } from '../src/config/db.js';
import { parseEnv } from '../src/config/env.js';
import { createApp } from '../src/app.js';
import { createCharityModel } from '../src/modules/charities/charity.model.js';
import { seedDemoCharities } from './seed.js';
export async function startBrowserServer({ seed } = {}) {
  const mongo = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    binary: { version: '8.2.6' },
  });
  let database, server;
  let stopping;
  function stop() {
    // Teardown and startup failure may both request cleanup; perform it once.
    stopping ||= (async () => {
      try {
        if (server) {
          server.closeAllConnections();
          await new Promise((resolve) => server.close(resolve));
        }
      } finally {
        try {
          await database?.disconnect();
        } finally {
          await mongo.stop();
        }
      }
    })();
    return stopping;
  }
  try {
    const config = parseEnv({
      NODE_ENV: 'test',
      MONGODB_URI: mongo.getUri(),
      CLIENT_ORIGIN: 'http://127.0.0.1:5173',
      AUTH_SECRET: randomBytes(32).toString('hex'),
      PAYMENT_MODE: 'simulated',
      EMAIL_MODE: 'demo',
    });
    database = createDatabase(config);
    await database.connect();
    await seedDemoCharities(createCharityModel(database.connection));
    if (seed) await seed(database, config);
    server = createApp({ config, database }).listen(4011, '127.0.0.1');
    await new Promise((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });
    return stop;
  } catch (error) {
    await stop();
    throw error;
  }
}
