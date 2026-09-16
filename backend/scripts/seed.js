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
      'Fictional demo charity showing how equipment and coaching could make golf more accessible. This record does not represent a real organization.',
    category: 'youth',
    images: [],
    upcomingEvents: [],
    featured: true,
    active: true,
    isDemo: true,
  },
  {
    seedKey: 'b04:demo-habitat',
    name: 'Demo: Green Habitat',
    slug: 'demo-green-habitat',
    description:
      'Fictional demo charity for testing nature and habitat directory filters. This record is illustrative and cannot receive donations.',
    category: 'environment',
    images: [],
    upcomingEvents: [],
    featured: true,
    active: true,
    isDemo: true,
  },
  {
    seedKey: 'b04:demo-community',
    name: 'Demo: Community Connections',
    slug: 'demo-community-connections',
    description:
      'Fictional demo charity for testing community wellbeing information. No partnership, grant, or donation is represented by this record.',
    category: 'community',
    images: [],
    upcomingEvents: [],
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
