import 'dotenv/config';
import { parseEnv } from '../src/config/env.js';
import { createDatabase } from '../src/config/db.js';
import { createEvidenceModel } from '../src/modules/winners/evidence.model.js';
import { createEvidenceStorage } from '../src/modules/winners/evidence.storage.js';
const config = parseEnv(process.env);
const database = createDatabase(config);
try {
  await database.connect();
  const storage = createEvidenceStorage(
    createEvidenceModel(database.connection),
    config,
  );
  console.log(JSON.stringify(await storage.retryCleanup()));
} catch {
  console.error(
    'Evidence cleanup failed. Pending cleanup records were retained.',
  );
  process.exitCode = 1;
} finally {
  await database.disconnect();
}
