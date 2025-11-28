import { config } from 'dotenv';
config({ override: false }); // Must run before any queue imports

import { parseArgs } from 'node:util';
import { JOB_NAMES } from './config';

// Dynamic import to ensure env vars are loaded first
const { previewQueue } = await import('./queues/previews');

const validJobNames = Object.values(JOB_NAMES);

const { positionals } = parseArgs({
  allowPositionals: true,
});

const [jobName, paramsJson] = positionals;

if (!jobName || !validJobNames.includes(jobName as (typeof validJobNames)[number])) {
  console.error(
    'Usage: REDIS_URL=redis://localhost:6379 bun run workers:trigger-job <job-name> [params-json]'
  );
  console.error(`\nValid job names: ${validJobNames.join(', ')}`);
  console.error('\nExample:');
  console.error(
    '  REDIS_URL=redis://localhost:6379 bun run workers:trigger-job cleanup-inactive-previews \'{"thresholdMinutes":1}\''
  );
  process.exit(1);
}

const params = paramsJson ? JSON.parse(paramsJson) : {};

const job = await previewQueue.add(jobName, params);
console.log(`Job queued: ${job.id}`);
process.exit(0);
