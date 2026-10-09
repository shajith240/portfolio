"use client";

import { useSyncExternalStore } from "react";
import { semesterAt, studyStatus, type StudyStatus } from "./studyYear";

/* The current StudyStatus for client components. Pages are prerendered,
   so the HTML carries the semester as of the build; this re-reads the
   date on the visitor's device after hydration (useSyncExternalStore
   swaps server → client snapshot without a hydration mismatch). The
   value only changes twice a year, so there's nothing to subscribe to. */

// Same value on server and client: BUILD_DATE is inlined at build time
// (next.config.ts), unlike `new Date()` at module load.
const BUILD_SEMESTER = semesterAt(process.env.BUILD_DATE ? new Date(process.env.BUILD_DATE) : undefined);
const noSubscribe = () => () => {};

export function useStudyStatus(): StudyStatus {
  const semester = useSyncExternalStore(noSubscribe, () => semesterAt(), () => BUILD_SEMESTER);
  return studyStatus(semester);
}
