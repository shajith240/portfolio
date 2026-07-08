// Attribution data for the Credits window (components/window/CreditsApp.tsx
// — a native window kind, not a routed page; see WindowManagerContext's
// openCredits).
//
// Songs, wallpapers, and motivation-quote images are pulled straight
// from data/generated/content.ts, which scripts/generate-content.mjs
// regenerates on every dev/build by scanning public/songs,
// public/wallpapers, and public/motivation_quotes. Add or remove a
// file in those folders and the window updates itself automatically —
// nothing here needs to change.
//
// Icons and fonts are hand-maintained below since they aren't part of
// that auto-discovery pipeline. Adding a new dock/tech icon later just
// means appending one line to ICON_CREDITS.

import {
  GENERATED_SONGS,
  GENERATED_WALLPAPERS,
  GENERATED_MOBILE_WALLPAPERS,
  GENERATED_MOTIVATION_IMAGES,
} from "./generated/content";

export const SONGS = GENERATED_SONGS;
export const WALLPAPERS = [...GENERATED_WALLPAPERS, ...GENERATED_MOBILE_WALLPAPERS];
export const MOTIVATION_IMAGES = GENERATED_MOTIVATION_IMAGES;

export interface IconCredit {
  name: string;
  owner: string;
}

// One entry per brand/tech logo used as a dock/app/skill icon under
// public/icons. Purely descriptive — trademarks stay with their owners.
export const ICON_CREDITS: IconCredit[] = [
  { name: "ChatGPT", owner: "OpenAI" },
  { name: "Claude", owner: "Anthropic" },
  { name: "Codex", owner: "OpenAI" },
  { name: "Cursor", owner: "Anysphere" },
  { name: "Docker", owner: "Docker, Inc." },
  { name: "Gemini", owner: "Google" },
  { name: "Git", owner: "Software Freedom Conservancy" },
  { name: "GitHub", owner: "GitHub, Inc. (Microsoft)" },
  { name: "HTML5", owner: "W3C / WHATWG" },
  { name: "Instagram", owner: "Meta Platforms, Inc." },
  { name: "Java", owner: "Oracle Corporation" },
  { name: "JavaScript", owner: "Ecma International" },
  { name: "LeetCode", owner: "LeetCode LLC" },
  { name: "Linux", owner: "Linus Torvalds" },
  { name: "LinkedIn", owner: "Microsoft Corporation" },
  { name: "MongoDB", owner: "MongoDB, Inc." },
  { name: "n8n", owner: "n8n GmbH" },
  { name: "Node.js", owner: "OpenJS Foundation" },
  { name: "PostgreSQL", owner: "The PostgreSQL Global Development Group" },
  { name: "Python", owner: "Python Software Foundation" },
  { name: "React", owner: "Meta Platforms, Inc." },
  { name: "Spotify", owner: "Spotify AB" },
  { name: "TypeScript", owner: "Microsoft Corporation" },
  { name: "Visual Studio Code", owner: "Microsoft Corporation" },
  { name: "X (Twitter)", owner: "X Corp." },
  { name: "Xcode", owner: "Apple Inc." },
];

export interface FontCredit {
  name: string;
  owner: string;
  license: string;
}

export const FONT_CREDITS: FontCredit[] = [
  { name: "VG5000", owner: "velvetyne.fr", license: "See vg5000-master/LICENSE.txt in the repository" },
];

// Some wallpapers depict third-party brands or copyrighted characters
// beyond generic stock photography — called out explicitly rather
// than left implicit in a filename.
export const WALLPAPER_NOTE =
  "Wallpapers may include stock photography, brand imagery, and characters from copyrighted media, sourced from publicly available wallpaper collections. None of it is original artwork by this site's owner.";
