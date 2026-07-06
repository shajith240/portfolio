export interface LyricWordStamp {
  text: string;
  start: number; // seconds — REAL sung onset from the file
}

export interface LyricLine {
  time: number; // seconds
  text: string;
  // Present only when the file is enhanced LRC (A2 extension):
  // `[00:30.00]She <00:30.04>was <00:30.31>more ...` — real per-word
  // onset timestamps. Absent for plain line-level LRC.
  wordStamps?: LyricWordStamp[];
}

const LINE_TAG = /\[(\d{2}):(\d{2})(?:\.(\d{1,3}))?\]/g;
const WORD_TAG = /<(\d{2}):(\d{2})(?:\.(\d{1,3}))?>/g;

function tagToSeconds(m: RegExpMatchArray): number {
  const minutes = Number(m[1]);
  const seconds = Number(m[2]);
  const fraction = m[3] ? Number(m[3]) / Math.pow(10, m[3].length) : 0;
  return minutes * 60 + seconds + fraction;
}

// Enhanced-LRC content → word stamps. The chunk BEFORE the first
// <tag> starts at the line's own [tag] time; every <tag> stamps the
// chunk after it. A chunk holding several words gives them all the
// chunk's start — lib/lyricsWordTiming.ts subdivides equal-start
// runs by character weight.
function parseWordStamps(content: string, lineTime: number): LyricWordStamp[] | undefined {
  // Do NOT use WORD_TAG.test() to pre-check: .test() on a global
  // regex advances lastIndex, and String.matchAll clones the regex
  // WITH that lastIndex — so the first <tag> gets skipped and its
  // word keeps the raw "<00:02.81>Ki" prefix. Iterate once and track
  // whether any tag was seen instead.
  WORD_TAG.lastIndex = 0;
  const stamps: LyricWordStamp[] = [];
  let cursor = 0;
  let chunkStart = lineTime;
  let sawTag = false;
  for (const m of content.matchAll(WORD_TAG)) {
    sawTag = true;
    const chunk = content.slice(cursor, m.index).trim();
    if (chunk) for (const w of chunk.split(/\s+/)) stamps.push({ text: w, start: chunkStart });
    chunkStart = tagToSeconds(m);
    cursor = (m.index ?? 0) + m[0].length;
  }
  if (!sawTag) return undefined;

  const tail = content.slice(cursor).trim();
  if (tail) {
    for (const w of tail.split(/\s+/)) stamps.push({ text: w, start: chunkStart });
  } else {
    // A trailing <tag> with no word after it is the END time of the
    // line's last word (enhanced-LRC A2 convention). Kept as an
    // empty-text sentinel so a held final note ends exactly here
    // rather than stretching to the next line. Consumed only by
    // lib/lyricsWordTiming.ts, which drops it from what's rendered.
    stamps.push({ text: "", start: chunkStart });
  }

  return stamps.some((s) => s.text) ? stamps : undefined;
}

// Parses standard LRC (`[mm:ss.xx]lyric text`, one or more timestamp
// tags per line, metadata tags ignored) AND enhanced LRC with inline
// `<mm:ss.xx>` word timestamps. Generic — works on any well-formed
// file. Lines are returned sorted by time; a line with multiple
// [tags] (repeated-chorus convention) expands into one entry per tag,
// but word stamps attach only to single-tag lines — inline times are
// absolute, so they'd be wrong for every repetition but the first.
export function parseLRC(raw: string): LyricLine[] {
  const lines: LyricLine[] = [];

  for (const rawLine of raw.split(/\r?\n/)) {
    LINE_TAG.lastIndex = 0;
    const matches = [...rawLine.matchAll(LINE_TAG)];
    if (matches.length === 0) continue;

    const content = rawLine.replace(LINE_TAG, "").trim();
    const text = content.replace(WORD_TAG, "").replace(/\s+/g, " ").trim();
    if (!text) continue;

    for (const match of matches) {
      const time = tagToSeconds(match);
      const wordStamps = matches.length === 1 ? parseWordStamps(content, time) : undefined;
      lines.push(wordStamps ? { time, text, wordStamps } : { time, text });
    }
  }

  return lines.sort((a, b) => a.time - b.time);
}
