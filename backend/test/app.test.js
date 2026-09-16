import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { parseEnv } from '../src/config/env.js';
import { createDatabase } from '../src/config/db.js';
import { startServer } from '../src/server.js';
const config = parseEnv({
  MONGODB_URI: 'mongodb://127.0.0.1:1/test',
  CLIENT_ORIGIN: 'http://localhost:5173',
  DB_TIMEOUT_MS: '100',
});
function fixture(ready = true, draining = false) {
  return createApp({
    config,
    database: { isReady: async () => ready },
    isShuttingDown: () => draining,
  });
}
test('environment rejects missing values without exposing credentials', () => {
  assert.throws(() => parseEnv({}), /MONGODB_URI.*CLIENT_ORIGIN/);
  for (const source of [
    { PORT: '3.5' },
    { CLIENT_ORIGIN: 'http://localhost:5173/' },
    { DB_TIMEOUT_MS: '0' },
    { NODE_ENV: 'staging' },
  ])
    assert.throws(
      () =>
        parseEnv({
          MONGODB_URI: config.mongodbUri,
          CLIENT_ORIGIN: config.clientOrigin,
          ...source,
        }),
      /Invalid environment/,
    );
});
test('liveness, readiness and request IDs use shared envelope', async () => {
  const res = await request(fixture()).get('/api/health').expect(200);
  assert.equal(res.body.data.status, 'alive');
  assert.equal(res.headers['x-request-id'], res.body.requestId);
  assert.equal(
    (await request(fixture()).get('/api/ready').expect(200)).body.data.database,
    'connected',
  );
});
test('readiness reflects DB loss, recovery and shutdown while health stays live', async () => {
  let connected = true;
  const app = createApp({
    config,
    database: { isReady: async () => connected },
  });
  await request(app).get('/api/ready').expect(200);
  connected = false;
  const res = await request(app).get('/api/ready').expect(503);
  assert.equal(res.body.error.code, 'SERVICE_UNAVAILABLE');
  await request(app).get('/api/health').expect(200);
  connected = true;
  await request(app).get('/api/ready').expect(200);
  await request(fixture(true, true)).get('/api/ready').expect(503);
});
test('central errors normalize missing routes, malformed JSON and large bodies', async () => {
  assert.equal(
    (await request(fixture()).get('/api/missing').expect(404)).body.error.code,
    'NOT_FOUND',
  );
  assert.equal(
    (
      await request(fixture())
        .post('/api/missing')
        .set('Content-Type', 'application/json')
        .send('{')
        .expect(400)
    ).body.error.code,
    'INVALID_JSON',
  );
  assert.equal(
    (
      await request(fixture())
        .post('/api/missing')
        .send({ value: 'a'.repeat(17000) })
        .expect(413)
    ).body.error.code,
    'PAYLOAD_TOO_LARGE',
  );
});
test('unexpected errors do not leak internal messages', async () => {
  const app = createApp({
    config,
    database: {
      isReady: async () => {
        throw new Error('secret');
      },
    },
  });
  const res = await request(app).get('/api/ready').expect(500);
  assert.equal(res.body.error.code, 'INTERNAL_ERROR');
  assert.ok(!JSON.stringify(res.body).includes('secret'));
});
test('credentialed CORS permits exact origin and rejects other origins', async () => {
  const res = await request(fixture())
    .get('/api/health')
    .set('Origin', config.clientOrigin)
    .expect(200);
  assert.equal(res.headers['access-control-allow-origin'], config.clientOrigin);
  assert.equal(res.headers['access-control-allow-credentials'], 'true');
  await request(fixture())
    .options('/api/health')
    .set('Origin', config.clientOrigin)
    .set('Access-Control-Request-Method', 'GET')
    .expect(204);
  await request(fixture())
    .get('/api/health')
    .set('Origin', 'https://attacker.example')
    .expect(403);
});
test('actual Mongoose connection failure is unready and startup fails safely', async () => {
  const db = createDatabase(config);
  assert.equal(await db.isReady(), false);
  await assert.rejects(() => startServer(config, db), /Server startup failed/);
  assert.equal(await db.isReady(), false);
});
test('startup connects and shutdown closes listener and database', async () => {
  let connected = false;
  const database = {
    connect: async () => {
      connected = true;
    },
    isReady: async () => connected,
    disconnect: async () => {
      connected = false;
    },
  };
  const runtime = await startServer({ ...config, port: 0 }, database);
  assert.equal(connected, true);
  assert.equal(runtime.server.listening, true);
  await runtime.shutdown();
  await runtime.shutdown();
  assert.equal(connected, false);
  assert.equal(runtime.server.listening, false);
});
