// Explicit, additive index preparation. Never drops indexes or seeds records.
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { parseEnv } from '../src/config/env.js';
import { createDatabase } from '../src/config/db.js';
import { createApp } from '../src/app.js';
dotenv.config({
  path: fileURLToPath(new URL('../.env', import.meta.url)),
  quiet: true,
});
let database;
try {
  const config = parseEnv(process.env);
  database = createDatabase(config);
  await database.connect();
  createApp({ config, database });
  // Audit and eligibility models are created lazily by services.
  const { createAuditModel } =
    await import('../src/modules/admin/audit.model.js');
  const { createEligibilityModel } =
    await import('../src/modules/draws/eligibility.model.js');
  createAuditModel(database.connection);
  createEligibilityModel(database.connection);
  for (const model of Object.values(database.connection.models))
    await model.createIndexes();
  console.info('Additive index preparation completed. No records were seeded.');
} catch {
  console.error(
    'Index preparation failed. Check connectivity, permissions and duplicate records before retrying.',
  );
  process.exitCode = 1;
} finally {
  await database?.disconnect();
}
