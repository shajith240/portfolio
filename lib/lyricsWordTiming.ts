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

export function computeWordTimings(lines: LyricLine[]): TimedLine[] {
  return lines.map((line, i) => {
    const nextTime = lines[i + 1]?.time ?? line.time + FALLBACK_LAST_LINE_DURATION;
    const duration = Math.max(0.1, nextTime - line.time);

    const words = line.text.split(/\s+/).filter(Boolean);
    const totalChars = words.reduce((sum, w) => sum + w.length, 0) || 1;

    let cursor = line.time;
    const timedWords: TimedWord[] = words.map((word) => {
      const share = word.length / totalChars;
      const wordDuration = duration * share;
      const start = cursor;
      const end = cursor + wordDuration;
      cursor = end;
      return { text: word, start, end };
    });

    return { time: line.time, text: line.text, words: timedWords };
  });
}
