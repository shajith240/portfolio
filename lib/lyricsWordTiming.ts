import type { LyricLine } from "./parseLRC";

export interface TimedWord {
  text: string;
  start: number; // seconds
  end: number; // seconds
}

export interface TimedLine {
  time: number; // seconds — start of the line
  text: string;
  words: TimedWord[];
}

// Plain LRC only carries one timestamp per LINE, not per word/syllable
// (unlike the TTML format Apple Music/Spicy Lyrics use, which has real
// per-syllable timing). To still get a word-by-word reveal sweep
// instead of the whole line lighting up at once, each line's own time
// budget (from its timestamp to the next line's timestamp) is split
// across its words — weighted by character count, so a long word
// takes proportionally longer than "a" or "the". This is an honest
// approximation of syllable timing, not a claim of precision LRC
// doesn't contain.
const FALLBACK_LAST_LINE_DURATION = 4;

/* The line's time budget (gap to the next timestamp) is NOT how long
   the line is actually sung — singers finish early and the remainder
   is breath/instrumental. Spreading words across the whole gap (the
   previous behavior) made late words light up seconds after they were
   sung. So the sung window is estimated with a delivery-rate model —
   chars-per-second plus a per-word constant for inter-word gaps —
   and capped by the real gap. Pop vocal delivery averages ~10–13
   chars/sec; 11 splits the difference for ballads vs upbeat. */
const CHARS_PER_SECOND = 11;
const PER_WORD_PAUSE = 0.06; // breath/consonant gap between words
const MAX_GAP_FRACTION = 0.95; // last word must land before the next line

export function computeWordTimings(lines: LyricLine[]): TimedLine[] {
  return lines.map((line, i) => {
    const nextTime = lines[i + 1]?.time ?? line.time + FALLBACK_LAST_LINE_DURATION;
    const gap = Math.max(0.1, nextTime - line.time);

    const words = line.text.split(/\s+/).filter(Boolean);
    const totalChars = words.reduce((sum, w) => sum + w.length, 0) || 1;

    const estimated = totalChars / CHARS_PER_SECOND + words.length * PER_WORD_PAUSE;
    const singDuration = Math.min(gap * MAX_GAP_FRACTION, estimated);

    // Weight = chars + 2 so one-letter words ("a", "I") still get an
    // audible slice instead of a near-zero one.
    const totalWeight = words.reduce((sum, w) => sum + w.length + 2, 0) || 1;

    let cursor = line.time;
    const timedWords: TimedWord[] = words.map((word) => {
      const share = (word.length + 2) / totalWeight;
      const start = cursor;
      const end = cursor + singDuration * share;
      cursor = end;
      return { text: word, start, end };
    });

    return { time: line.time, text: line.text, words: timedWords };
  });
}
