import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { parseEnv } from '../src/config/env.js';
import { createDatabase } from '../src/config/db.js';
import { createCharityModel } from '../src/modules/charities/charity.model.js';

export const DEMO_CHARITIES = Object.freeze([
  {
    seedKey: 'b04:demo-youth-golf',
    name: 'Demo: Youth Golf Access',
    slug: 'demo-youth-golf-access',
    description:
      'Every young person deserves somewhere to belong. This fictional cause illustrates equipment lending, welcoming coaching sessions and community mentoring that help young people take their first steps into sport. Demo charity: no real organisation or transfer is represented.',
    category: 'youth',
    images: [{ url: '/demo-art/community.svg', alt: 'Original illustration of neighbours growing a community garden.' }],
    upcomingEvents: [{ title: 'Demo event: community open day', startsAt: new Date(Date.now() + 30 * 86400000), location: 'Illustrative community garden', description: 'Fictional demo event: meet neighbours, try an outdoor activity and learn about this cause. This is not a bookable real event.' }],
    featured: true,
    active: true,
    isDemo: true,
  },
  {
    seedKey: 'b04:demo-habitat',
    name: 'Demo: Green Habitat',
    slug: 'demo-green-habitat',
    description:
      'Healthier green spaces bring communities together. This fictional cause illustrates native planting, habitat restoration and volunteer garden days that create more room for nature close to home. Demo charity: no real organisation or transfer is represented.',
    category: 'environment',
    images: [{ url: '/demo-art/community.svg', alt: 'Original illustration of neighbours growing a community garden.' }],
    upcomingEvents: [{ title: 'Demo event: community open day', startsAt: new Date(Date.now() + 30 * 86400000), location: 'Illustrative community garden', description: 'Fictional demo event: meet neighbours, try an outdoor activity and learn about this cause. This is not a bookable real event.' }],
    featured: true,
    active: true,
    isDemo: true,
  },
  {
    seedKey: 'b04:demo-community',
    name: 'Demo: Community Connections',
    slug: 'demo-community-connections',
    description:
      'Connection can start with a shared afternoon outdoors. This fictional cause illustrates accessible activities, peer support and neighbour-led projects that help people feel part of their community. Demo charity: no real organisation or transfer is represented.',
    category: 'community',
    images: [{ url: '/demo-art/community.svg', alt: 'Original illustration of neighbours growing a community garden.' }],
    upcomingEvents: [{ title: 'Demo event: community open day', startsAt: new Date(Date.now() + 30 * 86400000), location: 'Illustrative community garden', description: 'Fictional demo event: meet neighbours, try an outdoor activity and learn about this cause. This is not a bookable real event.' }],
    featured: false,
    active: true,
    isDemo: true,
  },
]);

export async function seedDemoCharities(Charity) {
  await Charity.init();
  let inserted = 0;
  let existing = 0;
  for (const record of DEMO_CHARITIES) {
    await new Charity(record).validate();
    const timestamp = new Date();
    try {
      // Insert-only upserts preserve later edits, including timestamps and active state.
      const result = await Charity.updateOne(
        { seedKey: record.seedKey, isDemo: true },
        {
          $setOnInsert: {
            ...record,
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        },
        { upsert: true, runValidators: true, timestamps: false },
      ).exec();
      if (result.upsertedCount) inserted++;
      else existing++;
    } catch (error) {
      if (error.code !== 11000) throw error;
      // Concurrent runs may race the unique seed key; only an owned demo row is safe to keep.
      if (await Charity.exists({ seedKey: record.seedKey, isDemo: true }))
        existing++;
      else
        throw new Error(
          'Demo seed conflict: a reserved slug or seed key is already owned by another record.',
          { cause: error },
        );
    }
  }
  return { inserted, existing };
}

export async function runSeed(config) {
  if (config.nodeEnv === 'production')
    throw new Error('Demo seeding is disabled when NODE_ENV=production.');
  const database = createDatabase(config);
  try {
    await database.connect();
    return await seedDemoCharities(createCharityModel(database.connection));
  } finally {
    await database.disconnect();
  }
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
    const result = await runSeed(parseEnv(process.env));
    console.info(
      JSON.stringify({
        message:
          'Demo charity seed completed. No existing records were changed.',
        ...result,
      }),
    );
  } catch (error) {
    console.error(
      error.message.startsWith('Invalid environment') ||
        error.message.startsWith('Demo seed')
        ? error.message
        : 'Demo seed failed: check MongoDB connectivity and reserved demo slugs.',
    );
    process.exitCode = 1;
  }
}
