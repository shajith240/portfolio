import { PROJECTS } from "../data/projects.ts";
import { CATEGORIES } from "../data/skills.ts";
import { AI_TOOLS } from "../data/aiTools.ts";
import {
  NAME,
  HANDLE,
  HEADLINE,
  TAGLINE,
  BIO,
  ABOUT_PROJECTS,
  LOCATION,
  EMAIL,
  SOCIALS,
  EDUCATION,
  ACHIEVEMENTS,
  RESUME_URL,
} from "../data/profile.ts";
import { fillStanding, statusLine, studyStatus, type StudyStatus } from "./studyYear.ts";
import { summarize, type ClaudeActivity } from "./claudeStats.ts";
import claudeActivity from "../data/claudeActivity.json" with { type: "json" };

/* The mascot's knowledge pack: a compact, plain-text digest of the
   site's own data that the chat model is grounded in.

   Constraints, and why:
   - Deterministic. It's sent as a fixed system-prompt prefix on every
     request, and an identical prefix lets the provider cache it. So:
     no dates, no randomness, and every list keeps its source order.
   - Small (~1,500 tokens / ~6,000 chars max, enforced by
     mascotKnowledge.test.ts). The free model tier has tight daily
     token limits and this text is paid for on every turn.
   - Honest. Gaps are stated explicitly in a "Not known" section, so
     the model says it doesn't know instead of guessing.
   - Server-safe. Pure data → string; no browser APIs, no React. The
     relative ".ts" imports let `node lib/mascotKnowledge.test.ts` run
     it under Node type stripping, same as the other lib tests. */

/** Upper bound on the pack's length, shared with the test. */
export const KNOWLEDGE_MAX_CHARS = 6000;

/** "https://example.com/" → "example.com" — saves tokens, stays unambiguous. */
function shortUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/^mailto:/, "").replace(/\/$/, "");
}

function projectsSection(): string[] {
  const lines = ["PROJECTS (from the Projects page)"];
  for (const p of PROJECTS) {
    const live = p.live ? `Live: ${shortUrl(p.live)}` : "No live demo";
    const code = p.github ? `Code: ${shortUrl(p.github)}` : "Code not public";
    lines.push(`- ${p.title} (${p.sub}): ${p.description}${p.howBuilt ? ` ${p.howBuilt}` : ""}`);
    lines.push(`  Stack: ${p.tech.join(", ")}. ${code}. ${live}.`);
  }

  // The About page also names a few projects that have no entry (and so
  // no description or links) on the Projects page. List only those, with
  // the About page's own one-line blurb, so the model doesn't invent detail.
  const listed = new Set(PROJECTS.map((p) => p.title.toLowerCase()));
  const extra = ABOUT_PROJECTS.filter((a) => !listed.has(a.name.toLowerCase()));
  if (extra.length > 0) {
    lines.push(
      `Also mentioned on the About page (no further details or links on the site): ${extra
        .map((a) => `${a.name} (${a.blurb})`)
        .join("; ")}.`,
    );
  }
  return lines;
}

function skillsSection(): string[] {
  const lines = ["SKILLS (from the Skills page)"];
  for (const c of CATEGORIES) {
    lines.push(`- ${c.label}: ${c.icons.map((i) => i.name).join(", ")}`);
  }
  // aiTools.ts adds a couple of tools (e.g. Codex, Cursor) the Skills
  // page doesn't list, so it's worth one line.
  lines.push(`- AI tools I use day to day: ${AI_TOOLS.map((t) => t.name).join(", ")}`);
  return lines;
}

function educationSection(study: StudyStatus): string[] {
  const lines = ["EDUCATION"];
  for (const [i, e] of EDUCATION.entries()) {
    // EDUCATION is newest first: [0] is the degree I'm doing now.
    const period = e.period ? ` (${e.period}${i === 0 ? `; currently: ${statusLine(study)}` : ""})` : "";
    const score = e.score ? ` ${e.score}${e.scoreDetail ? ` (${e.scoreDetail})` : ""}.` : "";
    const details = e.details.length > 0 ? ` ${e.details.join("; ")}.` : "";
    lines.push(`- ${e.degree}, ${e.institution}${period}.${score}${details}`);
    if (e.precededBy) lines.push(`- Before that: ${e.precededBy.label} (${e.precededBy.period})${e.precededBy.note ? `: ${e.precededBy.note}` : ""}`);
  }
  if (ACHIEVEMENTS.length > 0) {
    lines.push("ACHIEVEMENTS");
    for (const a of ACHIEVEMENTS) {
      const desc = a.description ? `: ${a.description}` : "";
      lines.push(`- ${a.title}, ${a.org}${a.date ? ` (${a.date})` : ""}${desc}`);
    }
  }
  return lines;
}

// From my own Claude Code logs (daily counts, scripts/export-claude-
// activity.mjs). Ratios, so the model can explain HOW I use AI.
function aiSection(): string[] {
  const data = claudeActivity as ClaudeActivity;
  if (data.days.length === 0) return [];
  const s = summarize(data);
  const first = data.days[0].date;
  return [
    `HOW I WORK WITH AI (Claude Code widget on the desktop; from my own Claude Code logs, ${first} to ${data.updated})`,
    `- I use Claude Code as an agent, not a chatbot: about ${Math.round(s.leverage)} agent actions (shell commands, file reads and edits, web research) per prompt I write; ${s.toolCalls} actions from ${s.prompts} prompts over ${s.activeDays} active days.`,
    `- I route work across models: Opus ${s.modelShare.opus}%, Sonnet ${s.modelShare.sonnet}%, Haiku ${s.modelShare.haiku}% of turns (Opus for hard problems, lighter models for quick research).`,
    `- I run multi-agent work: ${s.subagents} sub-agents launched in that time.`,
    `- Lean context: ${s.cacheShare}% of input tokens served from the prompt cache.`,
  ];
}

/** Gaps derived from the data itself, so filling a field removes its line. */
function gapsSection(): string[] {
  const gaps: string[] = [];
  // EDUCATION is newest first, so [0] is the current degree.
  const current = EDUCATION[0];
  if (current && !current.period) gaps.push(`${current.degree} start year and expected graduation`);
  if (current && !current.score && current.details.length === 0) gaps.push(`${current.degree} CGPA and grades`);
  if (current && !current.coursework?.length) gaps.push("university coursework");
  if (ACHIEVEMENTS.length === 0) gaps.push("achievements, hackathon results, contest ranks, certifications");
  // Never on the site at all:
  gaps.push(
    "work experience or internships",
    ...(RESUME_URL ? [] : ["resume/CV file"]),
    "phone number",
    "GitHub star or user counts for any project",
    "salary expectations, visa status, availability dates",
    "anything about projects beyond what is written above",
  );
  return [
    "NOT KNOWN / NOT ON THE SITE",
    `${gaps.join("; ")}. If asked about these, say I haven't shared that here and suggest emailing ${EMAIL}. Never guess or make up details.`,
  ];
}

/** `study` defaults to today; the mascot route rebuilds when it changes. */
export function buildKnowledge(study: StudyStatus = studyStatus()): string {
  const sections: string[][] = [
    [
      `ABOUT ME (${NAME}, handle "${HANDLE}" on GitHub, LeetCode and LinkedIn)`,
      `- ${HEADLINE}. ${TAGLINE}`,
      ...BIO.map((p) => `- ${fillStanding(p, study)}`),
      `- Based in ${LOCATION.city}, ${LOCATION.region} (time zone ${LOCATION.timeZone}).`,
    ],
    educationSection(study),
    projectsSection(),
    skillsSection(),
    [
      "CONTACT",
      `- ${SOCIALS.map((s) => `${s.label}: ${shortUrl(s.url)}`).join(" | ")}`,
      // Only once a resume is uploaded (data/profile.ts); it's a site path.
      ...(RESUME_URL
        ? [`- Resume: ${shortUrl(RESUME_URL)} on this site (also in the Dock and the Cmd+K search).`]
        : []),
    ],
    aiSection(),
    [
      "CODING PRACTICE",
      "- My live LeetCode and Codeforces stats are in widgets on the desktop (the Coding app on phones). The numbers change, so point visitors there instead of quoting figures.",
    ],
    gapsSection(),
  ];
  return sections.map((lines) => lines.join("\n")).join("\n\n");
}
