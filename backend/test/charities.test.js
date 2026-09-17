import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createDatabase } from '../src/config/db.js';
import { createApp } from '../src/app.js';
import { createCharityModel } from '../src/modules/charities/charity.model.js';
import { DEMO_CHARITIES, seedDemoCharities, runSeed } from '../scripts/seed.js';
const exec = promisify(execFile);
const base = {
  name: 'Alpha Golf',
  slug: 'alpha-golf',
  description: 'Community coaching and equipment access for young golfers.',
  category: 'youth',
  active: true,
  featured: true,
  images: [
    {
      url: 'https://example.org/golf.jpg',
      alt: 'Golf coaching on a practice green.',
    },
  ],
  upcomingEvents: [
    {
      title: 'Later event',
      startsAt: new Date('2099-07-01T10:00:00Z'),
      location: 'Practice green',
    },
    { title: 'Past event', startsAt: new Date('2000-01-01T10:00:00Z') },
    { title: 'Earlier event', startsAt: new Date('2099-06-01T10:00:00Z') },
  ],
};
describe('Public charities with a real isolated MongoDB', () => {
  let mongo, database, Charity, app, config;
  before(
    async () => {
      mongo = await MongoMemoryServer.create({
        binary: { version: '8.2.6' },
        instance: { dbName: 'charity_api_b04' },
      });
      config = {
        nodeEnv: 'test',
        mongodbUri: mongo.getUri(),
        clientOrigin: 'http://localhost:5173',
        dbTimeoutMs: 3000,
      };
      database = createDatabase(config);
      await database.connect();
      Charity = createCharityModel(database.connection);
      await Charity.init();
      app = createApp({ config, database });
    },
    { timeout: 180000 },
  );
  after(async () => {
    await database?.disconnect();
    await mongo?.stop();
  });
  beforeEach(async () => {
    await Charity.deleteMany({});
  });
  async function fixtures() {
    return Charity.create([
      base,
      {
        ...base,
        name: 'Beta Habitat',
        slug: 'beta-habitat',
        category: 'environment',
        active: false,
      },
      {
        ...base,
        name: 'Cedar Community',
        slug: 'cedar-community',
        category: 'community',
        featured: false,
      },
      { ...base, name: 'Delta Golf [Club]', slug: 'delta-golf-club' },
    ]);
  }
  it('lists only active charities with stable pagination and envelope metadata', async () => {
    await fixtures();
    const first = await request(app)
      .get('/api/charities?page=1&limit=2')
      .expect(200);
    assert.equal(first.body.success, true);
    assert.equal(first.body.requestId, first.headers['x-request-id']);
    assert.deepEqual(
      first.body.data.items.map((item) => item.name),
      ['Alpha Golf', 'Cedar Community'],
    );
    assert.deepEqual(first.body.data.pagination, {
      page: 1,
      limit: 2,
      total: 3,
      totalPages: 2,
      hasNextPage: true,
      hasPreviousPage: false,
    });
    const second = await request(app)
      .get('/api/charities?page=2&limit=2')
      .expect(200);
    assert.deepEqual(
      second.body.data.items.map((item) => item.name),
      ['Delta Golf [Club]'],
    );
    assert.equal(second.body.data.pagination.hasNextPage, false);
    const beyond = await request(app)
      .get('/api/charities?page=1000&limit=50')
      .expect(200);
    assert.deepEqual(beyond.body.data.items, []);
    assert.equal(beyond.body.data.pagination.total, 3);
  });
  it('combines literal case-insensitive search and normalized exact category', async () => {
    await fixtures();
    let response = await request(app)
      .get('/api/charities')
      .query({ q: 'gOlF', category: ' YOUTH ' })
      .expect(200);
    assert.equal(response.body.data.pagination.total, 2);
    response = await request(app)
      .get('/api/charities')
      .query({ q: 'equipment', category: 'community' })
      .expect(200);
    assert.equal(response.body.data.items[0].name, 'Cedar Community');
    response = await request(app)
      .get('/api/charities')
      .query({ q: '[Club]' })
      .expect(200);
    assert.deepEqual(
      response.body.data.items.map((item) => item.slug),
      ['delta-golf-club'],
    );
    response = await request(app)
      .get('/api/charities')
      .query({ q: '.*' })
      .expect(200);
    assert.equal(response.body.data.pagination.total, 0);
    response = await request(app)
      .get('/api/charities?category=not-a-category')
      .expect(200);
    assert.deepEqual(response.body.data.items, []);
  });
  it('featured route precedes ID and uses the same filters and pagination', async () => {
    await fixtures();
    let response = await request(app)
      .get('/api/charities/featured?limit=1')
      .expect(200);
    assert.equal(response.body.data.pagination.total, 2);
    assert.equal(response.body.data.items.length, 1);
    response = await request(app)
      .get('/api/charities/featured?q=delta&category=youth')
      .expect(200);
    assert.equal(response.body.data.items[0].slug, 'delta-golf-club');
    response = await request(app)
      .get('/api/charities/featured?category=environment')
      .expect(200);
    assert.equal(response.body.data.pagination.total, 0);
  });
  it('returns a public DTO and only future events sorted by UTC instant', async () => {
    const [record] = await fixtures();
    await Charity.collection.updateOne(
      { _id: record._id },
      { $set: { internalNotes: 'private-test-value' } },
    );
    const response = await request(app)
      .get('/api/charities/' + record.id)
      .expect(200);
    const data = response.body.data;
    assert.deepEqual(
      Object.keys(data).sort(),
      [
        'id',
        'name',
        'slug',
        'description',
        'images',
        'category',
        'upcomingEvents',
        'featured',
        'active',
        'isDemo',
      ].sort(),
    );
    assert.equal(data.id, record.id);
    assert.deepEqual(data.images, base.images);
    assert.equal(data.isDemo, false);
    assert.deepEqual(
      data.upcomingEvents.map((event) => event.title),
      ['Earlier event', 'Later event'],
    );
    assert.equal(data.upcomingEvents[0].startsAt, '2099-06-01T10:00:00.000Z');
    assert.ok(!JSON.stringify(response.body).includes('private-test-value'));
  });
  it('malformed IDs are 400; inactive and unknown IDs are indistinguishable 404s', async () => {
    const [, inactive] = await fixtures();
    for (const id of ['not-an-id', '123', 'zzzzzzzzzzzzzzzzzzzzzzzz']) {
      const res = await request(app)
        .get('/api/charities/' + id)
        .expect(400);
      assert.equal(res.body.error.code, 'INVALID_ID');
    }
    const hidden = await request(app)
      .get('/api/charities/' + inactive.id)
      .expect(404);
    const missing = await request(app)
      .get('/api/charities/000000000000000000000000')
      .expect(404);
    assert.deepEqual(hidden.body.error, missing.body.error);
    assert.equal(hidden.body.error.code, 'CHARITY_NOT_FOUND');
  });
  it('rejects invalid, repeated, unknown and operator-shaped query parameters', async () => {
    const queries = [
      'page=0',
      'page=-1',
      'page=1.5',
      'page=1001',
      'page=01',
      'page=',
      'limit=0',
      'limit=51',
      'limit=999999999999999999999',
      'page=1&page=2',
      'q=x&q=y',
      'active=false',
      'featured=true',
      'q[$ne]=x',
      'category[$ne]=x',
      'category=bad%20category',
      'q=' + 'x'.repeat(101),
      'q=a%00b',
    ];
    for (const query of queries) {
      const response = await request(app)
        .get('/api/charities?' + query)
        .expect(400);
      assert.equal(response.body.error.code, 'INVALID_QUERY', query);
    }
    await request(app)
      .get('/api/charities/000000000000000000000000?page=1')
      .expect(400);
  });
  it('returns consistent empty list and featured responses', async () => {
    for (const path of ['/api/charities', '/api/charities/featured']) {
      const res = await request(app).get(path).expect(200);
      assert.deepEqual(res.body.data, {
        items: [],
        pagination: {
          page: 1,
          limit: 12,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });
    }
  });
  it('enforces schema content constraints, safe defaults and slug uniqueness', async () => {
    const record = await Charity.create({
      ...base,
      slug: ' NORMALIZED-SLUG ',
      category: ' YOUTH ',
      active: undefined,
      featured: undefined,
    });
    assert.equal(record.slug, 'normalized-slug');
    assert.equal(record.category, 'youth');
    assert.equal(record.active, false);
    assert.equal(record.featured, false);
    for (const change of [
      { name: '' },
      { description: 'short' },
      { slug: 'spaces not allowed' },
      { category: 'bad category' },
      { images: [{ url: 'javascript:alert(1)', alt: 'bad' }] },
      { images: [{ url: 'https://example.org/photo', alt: '' }] },
      { upcomingEvents: [{ title: 'Invalid date', startsAt: 'not-a-date' }] },
      { images: Array.from({ length: 11 }, () => base.images[0]) },
    ])
      await assert.rejects(() =>
        new Charity({ ...base, ...change }).validate(),
      );
    await Charity.create(base);
    await assert.rejects(
      () => Charity.create(base),
      (error) => error.code === 11000,
    );
  });
  it('seeds idempotently, marks demo data, and preserves edits and unrelated records', async () => {
    await Charity.create(base);
    assert.deepEqual(await seedDemoCharities(Charity), {
      inserted: 3,
      existing: 0,
    });
    const demo = await Charity.findOne({ slug: DEMO_CHARITIES[0].slug });
    demo.name = 'Edited demo name';
    demo.active = false;
    await demo.save();
    const timestamp = demo.updatedAt.getTime();
    assert.deepEqual(await seedDemoCharities(Charity), {
      inserted: 0,
      existing: 3,
    });
    assert.equal(await Charity.countDocuments(), 4);
    const preserved = await Charity.findById(demo.id);
    assert.equal(preserved.name, 'Edited demo name');
    assert.equal(preserved.active, false);
    assert.equal(preserved.updatedAt.getTime(), timestamp);
    assert.equal(await Charity.countDocuments({ isDemo: true }), 3);
    assert.equal(await Charity.countDocuments({ slug: base.slug }), 1);
    const res = await request(app).get('/api/charities?q=demo').expect(200);
    assert.ok(res.body.data.items.every((item) => item.isDemo));
    assert.ok(
      res.body.data.items.every((item) => !Object.hasOwn(item, 'seedKey')),
    );
  });
  it('concurrent seed runs do not duplicate rows or overwrite slug collisions', async () => {
    await Promise.all([seedDemoCharities(Charity), seedDemoCharities(Charity)]);
    assert.equal(await Charity.countDocuments(), 3);
    await Charity.deleteMany({});
    const real = await Charity.create({
      ...base,
      slug: DEMO_CHARITIES[0].slug,
    });
    await assert.rejects(
      () => seedDemoCharities(Charity),
      /Demo seed conflict/,
    );
    assert.equal(await Charity.countDocuments(), 1);
    assert.equal((await Charity.findById(real.id)).isDemo, false);
  });
  it('actual seed CLI can run twice against the isolated DB and refuses production', async () => {
    const script = fileURLToPath(
      new URL('../scripts/seed.js', import.meta.url),
    );
    const env = {
      ...process.env,
      NODE_ENV: 'test',
      AUTH_SECRET: 'test-only-secret-with-at-least-32-characters',
      MONGODB_URI: config.mongodbUri,
      CLIENT_ORIGIN: config.clientOrigin,
    };
    const first = await exec(process.execPath, [script], {
      env,
      timeout: 30000,
    });
    assert.equal(JSON.parse(first.stdout).inserted, 3);
    const second = await exec(process.execPath, [script], {
      env,
      timeout: 30000,
    });
    assert.equal(JSON.parse(second.stdout).existing, 3);
    assert.equal(await Charity.countDocuments(), 3);
    await assert.rejects(
      () => runSeed({ ...config, nodeEnv: 'production' }),
      /disabled/,
    );
  });
  it('database failure yields 503 rather than empty success, and recovery works', async () => {
    await database.disconnect();
    await request(app).get('/api/charities').expect(503);
    await request(app).get('/api/charities/featured').expect(503);
    await request(app)
      .get('/api/charities/000000000000000000000000')
      .expect(503);
    await request(app).get('/api/ready').expect(503);
    await request(app).get('/api/health').expect(200);
    await database.connect();
    await request(app).get('/api/charities').expect(200);
    await request(app).get('/api/ready').expect(200);
  });
  it('does not expose public writes', async () => {
    await request(app).post('/api/charities').send(base).expect(404);
    assert.equal(await Charity.countDocuments(), 0);
  });
});
