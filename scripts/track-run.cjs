// Records agent run state in MongoDB.
//
// Stores run metadata only: run id/URL, issue number, branch, a truncated
// task summary, actor, status, and PR URL. It never stores prompts, Claude
// output, issue bodies, or secrets.
//
// Usage: node scripts/track-run.cjs start|finish
// Env:   MONGODB_URI (required), MONGODB_DB (optional, default software_factory),
//        RUN_ID (required), RUN_URL, ISSUE_NUMBER, BRANCH, TASK, ACTOR,
//        STATUS (finish), PR_URL (finish).
// The `mongodb` driver must be resolvable, e.g. via NODE_PATH.
//
// If MONGODB_URI is unset this exits 0 without doing anything.

const phase = process.argv[2];
if (phase !== "start" && phase !== "finish") {
  console.error("usage: track-run.cjs start|finish");
  process.exit(2);
}

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.log("MONGODB_URI not set; skipping run tracking.");
  process.exit(0);
}

const runId = process.env.RUN_ID;
if (!runId) {
  console.error("RUN_ID is required");
  process.exit(2);
}

const now = new Date();
const env = (name) => process.env[name] || null;

const common = {
  run_url: env("RUN_URL"),
  issue_number: env("ISSUE_NUMBER"),
  branch: env("BRANCH"),
  task: (env("TASK") || "").slice(0, 500) || null,
  actor: env("ACTOR"),
};

const built =
  phase === "start"
    ? { ...common, status: "running", started_at: now }
    : { ...common, status: env("STATUS") || "unknown", pr_url: env("PR_URL"), finished_at: now };

// Drop unset values so a later call never overwrites earlier fields with null.
const update = Object.fromEntries(Object.entries(built).filter(([, v]) => v !== null));

async function main() {
  // Required here, not at the top, so the skip path above works without the driver.
  const { MongoClient } = require("mongodb");
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
  try {
    await client.connect();
    const collection = client
      .db(process.env.MONGODB_DB || "software_factory")
      .collection("agent_runs");
    await collection.updateOne(
      { _id: runId },
      phase === "start" ? { $set: update, $setOnInsert: { created_at: now } } : { $set: update },
      { upsert: true }
    );
    console.log(`agent run ${runId}: ${phase} recorded`);
  } finally {
    await client.close().catch(() => {});
  }
}

main().catch((err) => {
  // Print only the message: driver errors can include connection details.
  console.error(`track-run ${phase} failed: ${err.message}`);
  process.exit(1);
});
