import { PROJECTS } from "../data/projects.ts";
import { CATEGORIES } from "../data/skills.ts";
import { EDUCATION } from "../data/profile.ts";

/* What the mascot can "see". Section pages tag the things worth noticing
   with data-mascot={mascotTarget(kind, name)}; the brain reports what
   the visitor reads, hovers, clicks or copies by that id; the server
   (app/api/mascot) only accepts ids from targetLabels() — a fixed
   whitelist built from the site's own data, so nothing a visitor types
   or a page renders can smuggle text into the prompt, and the set of
   remark cache keys stays small.

   Pure and import-safe on both server and client. */

export type TargetKind = "project" | "skills" | "education" | "about" | "widget" | "dock";

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function mascotTarget(kind: TargetKind, name: string) {
  return `${kind}:${slug(name)}`;
}

// Fixed, page-level targets (not derived from a data list).
export const ABOUT_BIO = mascotTarget("about", "bio");
export const ABOUT_CONTACT = mascotTarget("about", "contact");

// Desktop widgets, by widget id (lib/widgetLayoutSchema.ts).
export const WIDGET_TARGETS: Record<string, string> = {
  aiTools: mascotTarget("widget", "github"),
  location: mascotTarget("widget", "location"),
  motivation: mascotTarget("widget", "motivation"),
  leetcode: mascotTarget("widget", "leetcode"),
  codeforces: mascotTarget("widget", "codeforces"),
  claude: mascotTarget("widget", "claude"),
};
const WIDGET_LABELS: Record<string, string> = {
  aiTools: "my live GitHub contribution heatmap widget",
  location: "my location and local time widget",
  motivation: "the motivation-quote widget on my desktop",
  leetcode: "my LeetCode stats widget: solved problems by difficulty and recent activity",
  codeforces: "my Codeforces widget: rating, rank and recent activity",
  claude: "my Claude Code widget: how I work with AI agents (actions per prompt, sub-agents, model routing, cache use) and my daily agent activity",
};
// Dock icons, by their label (components/ui/Dock.tsx).
const DOCK_LABELS = ["Projects", "About", "Skills", "Achievements", "Education", "GitHub", "LinkedIn", "LeetCode", "Resume"];

// id → how the AI should refer to it ("the visitor is reading <label>").
export function targetLabels(): Record<string, string> {
  const labels: Record<string, string> = {};
  for (const p of PROJECTS) {
    labels[mascotTarget("project", p.title)] = `my ${p.title} project card (${p.sub})`;
  }
  for (const c of CATEGORIES) {
    labels[mascotTarget("skills", c.label)] = `my ${c.label} skills (${c.icons.map((i) => i.name).join(", ")})`;
  }
  for (const e of EDUCATION) {
    labels[mascotTarget("education", e.institution)] = `my education entry: ${e.degree}, ${e.institution}`;
  }
  labels[ABOUT_BIO] = "my About bio";
  labels[ABOUT_CONTACT] = "my contact links (email, LinkedIn, GitHub, Instagram)";
  for (const [id, target] of Object.entries(WIDGET_TARGETS)) labels[target] = WIDGET_LABELS[id];
  for (const label of DOCK_LABELS) labels[mascotTarget("dock", label)] = `the ${label} icon in my Dock`;
  return labels;
}

// What the visitor did with it. Ids are what the client sends.
export const ATTENTION_ACTIONS = {
  read: "is reading",
  hover: "is looking closely at",
  code: "just opened the source code (GitHub) of",
  live: "just opened the live demo of",
  link: "just clicked a link in",
  copy: "just copied text from",
} as const;

export type AttentionAction = keyof typeof ATTENTION_ACTIONS;
