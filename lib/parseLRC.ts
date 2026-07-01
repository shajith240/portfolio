export interface LyricLine {
  time: number; // seconds
  text: string;
}

// Parses standard LRC format (`[mm:ss.xx]lyric text`, one or more
// timestamp tags per line, optional [ti:]/[ar:]/[al:]/[by:] metadata
// tags which are ignored). Generic — works on any well-formed LRC
// file, not tied to a specific song. Lines are returned sorted by
// time; a line with multiple timestamp tags (a common LRC convention
// for repeated choruses) expands into one entry per tag.
export function parseLRC(raw: string): LyricLine[] {
  const TIMESTAMP = /\[(\d{2}):(\d{2})(?:\.(\d{1,3}))?\]/g;
  const lines: LyricLine[] = [];

  for (const rawLine of raw.split(/\r?\n/)) {
    const matches = [...rawLine.matchAll(TIMESTAMP)];
    if (matches.length === 0) continue;

    const text = rawLine.replace(TIMESTAMP, "").trim();
    if (!text) continue;

    for (const match of matches) {
      const minutes = Number(match[1]);
      const seconds = Number(match[2]);
      const fraction = match[3] ? Number(match[3]) / Math.pow(10, match[3].length) : 0;
      lines.push({ time: minutes * 60 + seconds + fraction, text });
    }
  }

  return lines.sort((a, b) => a.time - b.time);
}
