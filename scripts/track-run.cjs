// Records one agent run in MongoDB, keyed by GitHub run_id so re-running the
// step updates the same document. Skips with a warning if MONGODB_URI is unset.
//
// Required env: RUN_ID. Everything else is optional metadata.
// Requires the `mongodb` driver to be resolvable (the workflow installs it
// into $RUNNER_TEMP and sets NODE_PATH).

const { MongoClient } = require('mongodb');

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('MONGODB_URI not set; skipping run tracking.');
    return;
  }

  const runId = process.env.RUN_ID;
  if (!runId) {
    throw new Error('RUN_ID is required');
  }

  const run = {
    run_id: runId,
    run_url: process.env.RUN_URL || null,
    repo: process.env.REPO || null,
    task: process.env.TASK || null,
    branch: process.env.BRANCH || null,
    commit_sha: process.env.COMMIT_SHA || null,
    pr_url: process.env.PR_URL || null,
    status: process.env.JOB_STATUS || null,
    updated_at: new Date(),
  };

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000 });
  try {
    await client.connect();
    const dbName = process.env.MONGODB_DB || 'software_factory';
    const runs = client.db(dbName).collection('agent_runs');
    await runs.updateOne(
      { run_id: runId },
      { $set: run, $setOnInsert: { created_at: new Date() } },
      { upsert: true },
    );
    console.log(`Recorded run ${runId} (status: ${run.status}) in ${dbName}.agent_runs.`);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error('Run tracking failed:', err.message);
  process.exit(1);
});
