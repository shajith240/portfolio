import assert from "node:assert/strict";
import { buildKnowledge, KNOWLEDGE_MAX_CHARS } from "./mascotKnowledge.ts";
import { PROJECTS } from "../data/projects.ts";
import { CATEGORIES } from "../data/skills.ts";
import { RESUME_URL, ACHIEVEMENTS } from "../data/profile.ts";

const pack = buildKnowledge();

// Non-empty and within the token budget (~1,500 tokens ≈ 6,000 chars)
assert.ok(pack.length > 0, "knowledge pack is empty");
assert.ok(
  pack.length <= KNOWLEDGE_MAX_CHARS,
  `knowledge pack is ${pack.length} chars, budget is ${KNOWLEDGE_MAX_CHARS}`,
);

// Deterministic — it's a cached system-prompt prefix
assert.equal(buildKnowledge(), pack);

// Every project and every skill group makes it in
for (const p of PROJECTS) assert.ok(pack.includes(p.title), `missing project: ${p.title}`);
for (const c of CATEGORIES) assert.ok(pack.includes(c.label), `missing skill group: ${c.label}`);

// The gaps line is present so the model can decline instead of guessing
assert.ok(pack.includes("NOT KNOWN / NOT ON THE SITE"));

// Resume: mentioned (with its path) only once one is uploaded, and only
// listed as a gap while it isn't
if (RESUME_URL) {
  assert.ok(pack.includes(`Resume: ${RESUME_URL}`), "resume path missing from the pack");
  assert.ok(!pack.includes("resume/CV file"), "resume still listed as unknown");
} else {
  assert.ok(!pack.includes("Resume:"), "resume mentioned with no RESUME_URL");
  assert.ok(pack.includes("resume/CV file"), "missing resume gap");
}

// Achievements: listed as a gap while empty
if (ACHIEVEMENTS.length === 0) {
  assert.ok(!pack.includes("ACHIEVEMENTS"), "empty achievements section rendered");
  assert.ok(pack.includes("achievements, hackathon results"), "missing achievements gap");
}

// Coding stats live in the LeetCode/Codeforces widgets: the pack points
// there and no longer lists them as unknown; the removed DSA section and
// CodeChef are gone from it.
assert.ok(pack.includes("LeetCode and Codeforces stats"), "missing coding-widgets pointer");
assert.ok(!pack.includes("LeetCode stats or ratings"), "LeetCode stats still listed as unknown");
assert.ok(!/\bDSA\b|codechef/i.test(pack), "pack still mentions DSA or CodeChef");

// No stringification accidents
assert.ok(!pack.includes("undefined"), "pack contains 'undefined'");
assert.ok(!pack.includes("[object Object]"), "pack contains '[object Object]'");

console.log(`mascotKnowledge: all assertions passed (${pack.length} chars)`);
