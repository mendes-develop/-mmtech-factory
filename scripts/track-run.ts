// Records agent run state in MongoDB.
//
// Stores run metadata only: run id/URL, issue number, branch, a truncated
// task summary, actor, status, and PR URL. It never stores prompts, Claude
// output, issue bodies, or secrets.
//
// Usage: bun scripts/track-run.ts start|finish
// Env:   MONGODB_URI (required; unset means skip), MONGODB_DB (default software_factory),
//        RUN_ID (required), REPO (target owner/name), RUN_URL, ISSUE_NUMBER, BRANCH, TASK, ACTOR,
//        STATUS (finish), PR_URL (finish).

import { MongoClient } from "mongodb";

export type Phase = "start" | "finish";

export function buildUpdate(
	phase: Phase,
	env: Record<string, string | undefined>,
	now: Date,
): Record<string, unknown> {
	const value = (name: string) => env[name] || null;
	const common = {
		repo: value("REPO"),
		run_url: value("RUN_URL"),
		issue_number: value("ISSUE_NUMBER"),
		branch: value("BRANCH"),
		task: (env.TASK ?? "").slice(0, 500) || null,
		actor: value("ACTOR"),
	};
	const built =
		phase === "start"
			? { ...common, status: "running", started_at: now }
			: {
					...common,
					status: value("STATUS") ?? "unknown",
					pr_url: value("PR_URL"),
					finished_at: now,
				};
	// Drop unset values so a later call never overwrites earlier fields with null.
	return Object.fromEntries(
		Object.entries(built).filter(([, v]) => v !== null),
	);
}

async function main(): Promise<void> {
	const phase = process.argv[2];
	if (phase !== "start" && phase !== "finish") {
		console.error("usage: bun scripts/track-run.ts start|finish");
		process.exit(2);
	}

	const uri = process.env.MONGODB_URI;
	if (!uri) {
		console.log("MONGODB_URI not set; skipping run tracking.");
		return;
	}

	const runId = process.env.RUN_ID;
	if (!runId) {
		console.error("RUN_ID is required");
		process.exit(2);
	}

	const now = new Date();
	const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
	try {
		await client.connect();
		const collection = client
			.db(process.env.MONGODB_DB || "software_factory")
			.collection<{ _id: string }>("agent_runs");
		const update = buildUpdate(phase, process.env, now);
		await collection.updateOne(
			{ _id: runId },
			phase === "start"
				? { $set: update, $setOnInsert: { created_at: now } }
				: { $set: update },
			{ upsert: true },
		);
		console.log(`agent run ${runId}: ${phase} recorded`);
	} finally {
		await client.close().catch(() => {});
	}
}

if (import.meta.main) {
	main().catch((err: unknown) => {
		// Print only the message: driver errors can include connection details.
		const message = err instanceof Error ? err.message : String(err);
		console.error(`track-run failed: ${message}`);
		process.exit(1);
	});
}
