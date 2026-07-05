// scripts/generate-content.mjs
//
// Content auto-discovery: scans the three content folders under
// public/ and emits data/generated/content.ts. Runs automatically
// before `npm run dev` and `npm run build` (predev/prebuild), so
// adding a song, wallpaper, or motivation image and committing is
// ALL that's ever needed — no code changes, the site adapts.
//
//   public/songs/              → CONTENT.songs   (playlist, in-order)
//   public/wallpapers/         → CONTENT.wallpapers
//   public/motivation_quotes/  → CONTENT.motivationImages
//
// Song folder conventions (forgiving, best-effort pairing):
//   track audio:   any .mp3/.m4a/.aac/.wav/.ogg/.flac
//   cover art:     image whose name contains the audio's name (or
//                  vice versa) after normalization — "foo-cover.webp"
//                  next to "foo.m4a" just works
//   lyrics:        .lrc paired the same fuzzy way — a Youtube-titled
//                  "Artist-Song-(Official-Audio).lrc" still pairs
//                  with "song.m4a" because containment is checked in
//                  both directions on normalized names
//   metadata:      optional "<audio-basename>.json" sidecar:
//                  { "title": "...", "artist": "..." } overrides.
//                  Otherwise "Artist - Title.m4a" naming is split on
//                  " - "; otherwise the title is prettified from the
//                  filename and artist is left empty.

import { readdirSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join, dirname, extname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const AUDIO_EXTS = new Set([".mp3", ".m4a", ".aac", ".wav", ".ogg", ".flac"]);
const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"]);

function listDir(rel) {
  const abs = join(root, "public", rel);
  if (!existsSync(abs)) return [];
  return readdirSync(abs, { withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .sort();
}

// Lowercase alphanumerics only — the equivalence class under which
// "Someone-You-Loved" and "someone you loved (Official)" can match.
function normalize(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function tokenSet(name) {
  return new Set(name.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
}

// Two-stage match: containment of the full normalized names (the
// original rule), else word-token overlap. The overlap stage is what
// pairs real-world filenames where the artists are reordered or one
// file lists MORE artists than the other — e.g. audio
// "Samayama-Anurag Kulkarni Sithara Krishnakumar" vs lyrics
// "Anurag Kulkarni, Sithara Krishnakumar, Hesham Abdul Wahab -
// Samayama". Containment fails there in both directions; token
// overlap scores 5/5 = 1.0.
function matchScore(aBase, bBase) {
  const a = normalize(aBase);
  const b = normalize(bBase);
  if (!a || !b) return 0;
  if (a.includes(b) || b.includes(a)) return 1;
  const ta = tokenSet(aBase);
  const tb = tokenSet(bBase);
  if (!ta.size || !tb.size) return 0;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  return shared / Math.min(ta.size, tb.size);
}

// Highest-scoring candidate above the threshold — never "first hit",
// so a weakly-related file can't steal the pairing from a better one.
function bestMatch(candidates, base, threshold = 0.5) {
  let best = null;
  let bestScore = 0;
  for (const c of candidates) {
    const s = matchScore(basename(c, extname(c)), base);
    if (s > bestScore) {
      bestScore = s;
      best = c;
    }
  }
  return bestScore >= threshold ? best : null;
}

function prettify(slug) {
  return slug
    .replace(/[-_]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function buildSongs() {
  const files = listDir("songs");
  const audios = files.filter((f) => AUDIO_EXTS.has(extname(f).toLowerCase()));
  const images = files.filter((f) => IMAGE_EXTS.has(extname(f).toLowerCase()));
  const lrcs = files.filter((f) => extname(f).toLowerCase() === ".lrc");

  return audios.map((audio) => {
    const base = basename(audio, extname(audio));

    let artwork = bestMatch(images, base);
    // Single-track folders: one audio + one image is an unambiguous
    // pair even when the names share nothing.
    if (!artwork && audios.length === 1 && images.length === 1) artwork = images[0];

    let lyrics = bestMatch(lrcs, base);
    if (!lyrics && audios.length === 1 && lrcs.length === 1) lyrics = lrcs[0];

    let title = prettify(base);
    let artist = "";
    if (base.includes(" - ")) {
      const [a, ...t] = base.split(" - ");
      artist = a.trim();
      title = t.join(" - ").trim();
    }
    // Sidecar json is found the same fuzzy way as art/lyrics (exact
    // basename still wins by scoring 1.0) — requiring the exact
    // audio basename silently dropped metadata whenever the json
    // used hyphens where the audio used spaces.
    const jsons = files.filter((f) => extname(f).toLowerCase() === ".json");
    const sidecarName = existsSync(join(root, "public", "songs", `${base}.json`))
      ? `${base}.json`
      : bestMatch(jsons, base, 0.6);
    if (sidecarName) {
      const sidecar = join(root, "public", "songs", sidecarName);
      try {
        const meta = JSON.parse(readFileSync(sidecar, "utf8"));
        if (typeof meta.title === "string" && meta.title) title = meta.title;
        if (typeof meta.artist === "string") artist = meta.artist;
      } catch {
        console.warn(`[content] Ignoring malformed sidecar: ${base}.json`);
      }
    }

    return {
      title,
      artist,
      src: `/songs/${audio}`,
      artwork: artwork ? `/songs/${artwork}` : null,
      lyricsSrc: lyrics ? `/songs/${lyrics}` : null,
    };
  });
}

const songs = buildSongs();
const wallpapers = listDir("wallpapers").filter((f) => IMAGE_EXTS.has(extname(f).toLowerCase()));
const motivationImages = listDir("motivation_quotes")
  .filter((f) => IMAGE_EXTS.has(extname(f).toLowerCase()))
  .map((f) => `/motivation_quotes/${f}`);

const banner = `// AUTO-GENERATED by scripts/generate-content.mjs — do not edit.
// Regenerated on every \`npm run dev\` / \`npm run build\`. To change
// what's here, add/remove files in public/songs, public/wallpapers,
// or public/motivation_quotes and restart/redeploy.`;

const out = `${banner}

export interface GeneratedTrack {
  title: string;
  artist: string;
  src: string;
  artwork: string | null;
  lyricsSrc: string | null;
}

export const GENERATED_SONGS: GeneratedTrack[] = ${JSON.stringify(songs, null, 2)};

export const GENERATED_WALLPAPERS: string[] = ${JSON.stringify(wallpapers, null, 2)};

export const GENERATED_MOTIVATION_IMAGES: string[] = ${JSON.stringify(motivationImages, null, 2)};
`;

mkdirSync(join(root, "data", "generated"), { recursive: true });
writeFileSync(join(root, "data", "generated", "content.ts"), out);

console.log(
  `[content] ${songs.length} song(s), ${wallpapers.length} wallpaper(s), ${motivationImages.length} motivation image(s) → data/generated/content.ts`
);
for (const s of songs) {
  console.log(
    `[content]   ♪ ${s.artist ? `${s.artist} — ` : ""}${s.title}  art:${s.artwork ? "✓" : "–"} lyrics:${s.lyricsSrc ? "✓" : "–"}`
  );
}
