import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { errorHandler } from '../src/middleware/error.middleware.js';
import { parseEnv } from '../src/config/env.js';
import { createApp } from '../src/app.js';
import { createCsrfMiddleware } from '../src/middleware/auth.middleware.js';
import { ApiError } from '../src/utils/ApiError.js';

test('error envelope sanitizes validation, conflicts, network and unknown errors', () => {
  for (const [error, status, code] of [
    [
      Object.assign(new Error('secret-value'), { name: 'ValidationError' }),
      422,
      'VALIDATION_ERROR',
    ],
    [
      Object.assign(new Error('secret-value'), { code: 11000 }),
      409,
      'RECORD_CONFLICT',
    ],
    [
      Object.assign(new Error('secret-value'), { name: 'MongoNetworkError' }),
      503,
      'DATABASE_UNAVAILABLE',
    ],
    [new Error('secret-value'), 500, 'INTERNAL_ERROR'],
    ...[401, 403, 404, 409, 422].map((status) => [
      new ApiError(status, 'SAFE_ERROR', 'Safe guidance'),
      status,
      'SAFE_ERROR',
    ]),
  ]) {
    const response = {
      status(value) {
        this.statusCode = value;
        return this;
      },
      json(value) {
        this.body = value;
      },
    };
    errorHandler(error, { id: 'test-request' }, response, () => {});
    assert.equal(response.statusCode, status);
    assert.equal(response.body.error.code, code);
    assert.equal(response.body.requestId, 'test-request');
    assert.ok(!JSON.stringify(response.body).includes('secret-value'));
    assert.ok(!Object.hasOwn(response.body.error, 'stack'));
  }
});

test('production configuration is HTTPS-only, bounded proxy trust and fail-closed adapters', () => {
  const base = {
    NODE_ENV: 'production',
    AUTH_SECRET: 'a'.repeat(64),
    MONGODB_URI: 'mongodb://127.0.0.1:27017/config_test',
    CLIENT_ORIGIN: 'https://app.example.test',
  };
  const config = parseEnv({ ...base, TRUST_PROXY: '1' });
  assert.equal(config.paymentMode, 'disabled');
  assert.equal(config.proofStorage, 'disabled');
  assert.equal(
    createApp({ config, database: { isReady: async () => false } }).get(
      'trust proxy',
    ),
    1,
  );
  for (const override of [
    { TRUST_PROXY: 'true' },
    { TRUST_PROXY: '2' },
    { CLIENT_ORIGIN: 'http://app.example.test' },
    { CLIENT_ORIGIN: 'https://*.example.test' },
    { PAYMENT_MODE: 'simulated' },
    { AUTH_SECRET: 'replace-with-a-long-secret-value-123456789' },
  ]) {
    assert.throws(
      () => parseEnv({ ...base, ...override }),
      /Invalid environment/,
    );
  }
  const csrf = createCsrfMiddleware(config);
  for (const origin of [
    undefined,
    'https://evil.example.test',
    'https://app.example.test.evil.test',
  ]) {
    assert.throws(
      () =>
        csrf(
          { method: 'POST', get: (key) => (key === 'Origin' ? origin : '1') },
          {},
          () => {},
        ),
      { code: 'CSRF_REJECTED' },
    );
  }
});

test('local release configurations retain SPA fallback, blocked destination and disabled auto deployment', async () => {
  const vercel = JSON.parse(
    await readFile(
      new URL('../../frontend/vercel.json', import.meta.url),
      'utf8',
    ),
  );
  assert.equal(vercel.rewrites[0].source, '/api/:path*');
  assert.ok(
    new URL(
      vercel.rewrites[0].destination.replace(':path*', 'ready'),
    ).hostname.endsWith('.invalid'),
  );
  assert.deepEqual(vercel.rewrites.at(-1), {
    source: '/(.*)',
    destination: '/index.html',
  });
  const render = await readFile(
    new URL('../../render.yaml', import.meta.url),
    'utf8',
  );
  assert.match(render, /autoDeployTrigger: off/);
  assert.match(render, /healthCheckPath: \/api\/ready/);
  const ignore = await readFile(
    new URL('../../.gitignore', import.meta.url),
    'utf8',
  );
  assert.match(ignore, /\.env\.\*/);
});
