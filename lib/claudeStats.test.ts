import assert from "node:assert/strict";
import { compact, percentages, recentActions, summarize, type ClaudeActivity, type ClaudeDay } from "./claudeStats.ts";

const day = (date: string, over: Partial<ClaudeDay> = {}): ClaudeDay => ({
  date,
  turns: 10,
  prompts: 2,
  toolCalls: 30,
  subagents: 1,
  sessions: 1,
  tools: { shell: 10, read: 10, edit: 5, web: 5, agents: 0, other: 0 },
  models: { opus: 6, sonnet: 3, haiku: 1 },
  tokens: { fresh: 100, cached: 900, output: 50 },
  ...over,
});

const data: ClaudeActivity = {
  updated: "2026-10-10",
  days: [day("2026-10-08"), day("2026-10-10", { prompts: 3, toolCalls: 45, models: { opus: 1, sonnet: 1, haiku: 1 } })],
};

const s = summarize(data);
assert.equal(s.activeDays, 2);
assert.equal(s.prompts, 5);
assert.equal(s.toolCalls, 75);
assert.equal(s.leverage, 15); // 75 / 5
assert.equal(s.cacheShare, 90); // 1800 / 2000
assert.equal(s.subagents, 2);
assert.deepEqual(s.modelShare, { opus: 54, sonnet: 31, haiku: 15 }); // 7/4/2 of 13
assert.equal(Object.values(s.modelShare).reduce((a, b) => a + b, 0), 100);

// Largest remainder keeps the total at exactly 100.
assert.deepEqual(percentages({ a: 1, b: 1, c: 1 }), { a: 34, b: 33, c: 33 });
assert.deepEqual(percentages({ a: 0, b: 0 }), { a: 0, b: 0 });

// Recent window: ends at `updated`, fills gaps with 0, oldest first.
assert.deepEqual(recentActions(data, 3), [
  { date: "2026-10-08", actions: 30 },
  { date: "2026-10-09", actions: 0 },
  { date: "2026-10-10", actions: 45 },
]);

// No prompts / no tokens: zeros, never NaN.
const empty = summarize({ updated: "2026-10-10", days: [] });
assert.equal(empty.leverage, 0);
assert.equal(empty.cacheShare, 0);

assert.equal(compact(980), "980");
assert.equal(compact(15200), "15.2K");
assert.equal(compact(11274), "11.3K");
assert.equal(compact(2000), "2K");
assert.equal(compact(1_250_000), "1.3M");

console.log("claudeStats: all assertions passed");
