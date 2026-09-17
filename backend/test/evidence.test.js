import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { v2 as cloudinary } from 'cloudinary';
import { fixture } from '../test-support/fixture.js';
import {
  createEvidenceStorage,
  validateEvidence,
} from '../src/modules/winners/evidence.storage.js';
import { parseEnv } from '../src/config/env.js';
let f, png;
before(
  async () => {
    f = await fixture();
    png = await sharp({
      create: { width: 4, height: 4, channels: 3, background: 'green' },
    })
      .png()
      .toBuffer();
  },
  { timeout: 180000 },
);
after(async () => f?.stop());
test('Cloudinary adapter signs authenticated uploads, verifies response and proxies expiring private reads', async () => {
  const config = {
    ...f.config,
    proofStorage: 'cloudinary',
    cloudinary: {
      cloud_name: 'fixture-only',
      api_key: 'fixture-key',
      api_secret: 'fixture-secret-not-real',
    },
  };
  let optionsSeen, urlSeen;
  const client = {
    utils: cloudinary.utils,
    uploader: {
      upload_stream: (options, callback) => {
        optionsSeen = options;
        return {
          end: () =>
            callback(null, {
              public_id: options.public_id,
              version: 1,
              type: 'authenticated',
              resource_type: 'image',
              format: 'png',
              bytes: png.length,
              signature: cloudinary.utils.api_sign_request(
                { public_id: options.public_id, version: 1 },
                config.cloudinary.api_secret,
              ),
            }),
        };
      },
      destroy: async () => ({ result: 'ok' }),
    },
  };
  const evidence = await validateEvidence(png, 'image/png');
  const storage = createEvidenceStorage(f.Evidence, config, {
    client,
    fetcher: async (url) => {
      urlSeen = url;
      return new Response(evidence.data);
    },
  });
  const asset = await storage.upload(
    { id: 'digital-heroes-proof/offline-signed-test' },
    evidence,
  );
  assert.equal(optionsSeen.type, 'authenticated');
  assert.equal(optionsSeen.overwrite, false);
  assert.equal(optionsSeen.api_secret, config.cloudinary.api_secret);
  await f.Evidence.updateOne(
    { _id: asset._id },
    { $set: { state: 'attached' } },
  );
  assert.deepEqual(await storage.read(asset._id), evidence.data);
  const url = new URL(urlSeen);
  assert.equal(url.searchParams.get('type'), 'authenticated');
  assert.ok(url.searchParams.get('signature'));
  assert.ok(Number(url.searchParams.get('expires_at')) > Date.now() / 1000);
});
test('invalid upload signature fails closed and durable cleanup survives provider deletion failure', async () => {
  const config = {
    ...f.config,
    proofStorage: 'cloudinary',
    cloudinary: {
      cloud_name: 'fixture-only',
      api_key: 'fixture-key',
      api_secret: 'fixture-secret-not-real',
    },
  };
  let failCleanup = true;
  const client = {
    utils: cloudinary.utils,
    uploader: {
      upload_stream: (options, callback) => ({
        end: () =>
          callback(null, {
            public_id: options.public_id,
            version: 1,
            signature: 'forged',
            type: 'authenticated',
            resource_type: 'image',
            format: 'png',
            bytes: png.length,
          }),
      }),
      destroy: async () => {
        if (failCleanup) throw new Error('fixture provider unavailable');
        return { result: 'ok' };
      },
    },
  };
  const storage = createEvidenceStorage(f.Evidence, config, { client });
  await assert.rejects(
    () =>
      storage.upload(
        { id: 'digital-heroes-proof/offline-forged-test' },
        awaitable(),
      ),
    { code: 'PROOF_UPLOAD_FAILED' },
  );
  function awaitable() {
    return { data: png, format: 'png', bytes: png.length, digest: 'fixture' };
  }
  assert.equal(
    (await f.Evidence.findById('digital-heroes-proof/offline-forged-test'))
      .state,
    'cleanup',
  );
  failCleanup = false;
  assert.equal((await storage.retryCleanup()).removed, 1);
  assert.equal(
    await f.Evidence.countDocuments({
      _id: 'digital-heroes-proof/offline-forged-test',
    }),
    0,
  );
});
test('production local storage and incomplete Cloudinary configuration are rejected clearly', () => {
  const base = {
    NODE_ENV: 'production',
    MONGODB_URI: 'mongodb://127.0.0.1:27017/fixture',
    CLIENT_ORIGIN: 'https://example.test',
    AUTH_SECRET: 'fixture-secret-at-least-thirty-two-characters',
  };
  assert.throws(
    () => parseEnv({ ...base, PROOF_STORAGE: 'local' }),
    /local is forbidden/,
  );
  assert.throws(
    () => parseEnv({ ...base, PROOF_STORAGE: 'cloudinary' }),
    /Cloudinary proof storage requires/,
  );
});
