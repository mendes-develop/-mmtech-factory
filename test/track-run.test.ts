import { describe, expect, test } from "bun:test";
import { buildUpdate } from "../scripts/track-run";

const now = new Date("2026-01-01T00:00:00Z");

describe("buildUpdate", () => {
	test("start marks the run as running and keeps set fields", () => {
		const update = buildUpdate(
			"start",
			{ RUN_ID: "1", ISSUE_NUMBER: "7", BRANCH: "agent/x" },
			now,
		);
		expect(update).toMatchObject({
			status: "running",
			issue_number: "7",
			branch: "agent/x",
			started_at: now,
		});
	});

	test("finish drops unset fields so it never overwrites earlier values with null", () => {
		const update = buildUpdate(
			"finish",
			{ STATUS: "success", PR_URL: "https://example/pull/1" },
			now,
		);
		expect(update).toEqual({
			status: "success",
			pr_url: "https://example/pull/1",
			finished_at: now,
		});
		expect(Object.values(update)).not.toContain(null);
	});

	test("task text is truncated to 500 characters", () => {
		const update = buildUpdate("start", { TASK: "x".repeat(900) }, now);
		expect((update.task as string).length).toBe(500);
	});
});
