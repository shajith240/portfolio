import assert from "node:assert/strict";
import { semesterAt, statusLine, studyStatus, fillStanding } from "./studyYear.ts";

// Noon IST on a given day, as a UTC instant.
const ist = (iso: string) => new Date(`${iso}T12:00:00+05:30`);

const cases: [string, number][] = [
  ["2024-07-10", 0], // before joining
  ["2024-07-25", 1],
  ["2024-12-31", 1],
  ["2025-01-01", 2],
  ["2025-06-15", 2], // summer break: still the semester just finished
  ["2025-07-20", 3],
  ["2026-01-05", 4],
  ["2026-07-19", 4],
  ["2026-07-20", 5],
  ["2026-10-10", 5], // third year, fifth semester (as of writing)
  ["2027-01-10", 6],
  ["2027-08-01", 7],
  ["2028-02-01", 8],
  ["2028-05-31", 8],
  ["2028-06-01", 9], // graduated
  ["2031-01-01", 9],
];
for (const [day, sem] of cases) assert.equal(semesterAt(ist(day)), sem, day);

// IST day boundary: 23:30 UTC on 19 July is already 20 July in India.
assert.equal(semesterAt(new Date("2026-07-19T23:30:00Z")), 5);

assert.equal(statusLine(studyStatus(5)), "Third year · 5th semester");
assert.equal(statusLine(studyStatus(1)), "First year · 1st semester");
assert.equal(statusLine(studyStatus(9)), "Graduated 2028");
assert.equal(fillStanding("I'm {standing} IIT.", studyStatus(5)), "I'm a third-year Computer Science student at IIT.");
assert.equal(fillStanding("I'm {standing} IIT.", studyStatus(9)), "I'm a Computer Science graduate of IIT.");

console.log("studyYear: all assertions passed");
