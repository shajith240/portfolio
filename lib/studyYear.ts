import { STUDY } from "../data/profile.ts";

/* Where I am in my degree, worked out from the date so the site never
   says "second-year" a year late.

   IIT (ISM) Dhanbad runs two semesters a year (official academic
   calendars, people.iitism.ac.in/~academics): Monsoon, with classes
   from late July (23 July in 2026-27) to December — the odd semesters —
   and Winter, January to May — the even ones. A new academic year (and
   year of study) starts with each Monsoon semester. The summer break
   counts as the end of the Winter semester just finished.

   Dates are read in India time, so the switch happens on the IST day
   whatever the visitor's or server's time zone. */

/** Monsoon semester classes begin on/after this day (month is 1-based). */
const MONSOON_START = { month: 7, day: 20 };
/** Treated as graduated from this day of STUDY.gradYear (after the last
 *  Winter semester's exams and results). */
const GRADUATION = { month: 6, day: 1 };

export interface StudyStatus {
  /** 1-based year of study; 0 before joining. */
  year: number;
  /** 1-based semester; 0 before joining. */
  semester: number;
  graduated: boolean;
}

function istDate(now: Date): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { y: get("year"), m: get("month"), d: get("day") };
}

const onOrAfter = (m: number, d: number, at: { month: number; day: number }) =>
  m > at.month || (m === at.month && d >= at.day);

/** The semester number for a date: 0 before joining, 1–8 while studying,
 *  9 once graduated. One number, so it's cheap to compare and cache. */
export function semesterAt(now: Date = new Date()): number {
  const { y, m, d } = istDate(now);
  if (y > STUDY.gradYear || (y === STUDY.gradYear && onOrAfter(m, d, GRADUATION))) return 9;
  const monsoon = onOrAfter(m, d, MONSOON_START);
  const year = (monsoon ? y : y - 1) - STUDY.startYear + 1;
  if (year < 1) return 0;
  return Math.min(8, monsoon ? year * 2 - 1 : year * 2);
}

export function studyStatus(semester: number = semesterAt()): StudyStatus {
  if (semester >= 9) return { year: 4, semester: 8, graduated: true };
  return { year: Math.ceil(semester / 2), semester, graduated: false };
}

const YEAR_WORDS = ["", "first", "second", "third", "fourth"];
const ordinal = (n: number) => `${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"}`;

/** "Third year · 5th semester", or "Graduated 2028". */
export function statusLine(s: StudyStatus): string {
  if (s.graduated) return `Graduated ${STUDY.gradYear}`;
  if (s.year < 1) return `Joining ${STUDY.startYear}`;
  const word = YEAR_WORDS[s.year];
  return `${word[0].toUpperCase()}${word.slice(1)} year · ${ordinal(s.semester)} semester`;
}

/** Fills the "{standing}" slot in a BIO paragraph: "a third-year
 *  Computer Science student at", or "a Computer Science graduate of". */
export function fillStanding(text: string, s: StudyStatus): string {
  const standing = s.graduated
    ? `a ${STUDY.subject} graduate of`
    : s.year < 1
      ? `an incoming ${STUDY.subject} student at`
      : `a ${YEAR_WORDS[s.year]}-year ${STUDY.subject} student at`;
  return text.replace("{standing}", standing);
}
