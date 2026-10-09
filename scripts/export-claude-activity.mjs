#!/usr/bin/env node
/* Exports how I work with Claude Code — as daily COUNTS only — for the
   Claude widget (components/widgets/ClaudeWidget.tsx). Run by hand
   whenever the widget should refresh, then commit the JSON:

     node scripts/export-claude-activity.mjs

   Reads Claude Code's local session logs (~/.claude/projects/**.jsonl,
   or $CLAUDE_CONFIG_DIR/projects). Privacy: nothing but numbers leaves
   this script — no prompts, code, file paths, project or session names.
   Per day it keeps: agent turns, my prompts, tool calls (by kind),
   sub-agents launched, sessions, tokens (fresh / cached / output) and
   turns per model family.

   Claude Code prunes logs older than `cleanupPeriodDays` (default 30),
   so each run MERGES into the existing JSON: days still in the logs are
   recounted, older days are kept as they were. History only grows. */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "data/claudeActivity.json");
const LOGS = join(process.env.CLAUDE_CONFIG_DIR || join(homedir(), ".claude"), "projects");
const TIME_ZONE = "Asia/Kolkata"; // days are my calendar days

const TOOL_KIND = {
  Bash: "shell",
  BashOutput: "shell",
  Read: "read",
  Grep: "read",
  Glob: "read",
  LS: "read",
  LSP: "read",
  Edit: "edit",
  MultiEdit: "edit",
  Write: "edit",
  NotebookEdit: "edit",
  WebSearch: "web",
  WebFetch: "web",
  Agent: "agents",
  Task: "agents",
  Workflow: "agents",
  SendMessage: "agents",
};
const AGENT_LAUNCHERS = new Set(["Agent", "Task", "Workflow"]);

const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });
const dayOf = (ts) => dayFmt.format(new Date(ts));

const family = (model) => (/opus/i.test(model) ? "opus" : /sonnet/i.test(model) ? "sonnet" : /haiku/i.test(model) ? "haiku" : null);

function emptyDay() {
  return {
    turns: 0,
    prompts: 0,
    toolCalls: 0,
    subagents: 0,
    sessions: 0,
    tools: { shell: 0, read: 0, edit: 0, web: 0, agents: 0, other: 0 },
    models: { opus: 0, sonnet: 0, haiku: 0 },
    tokens: { fresh: 0, cached: 0, output: 0 },
  };
}

function* logFiles(dir) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) yield* logFiles(p);
    else if (name.endsWith(".jsonl")) yield p;
  }
}

// A human-typed prompt: a user message in the main thread whose content
// is text (not a tool result, not a slash-command/meta injection).
function isPrompt(d) {
  if (d.type !== "user" || d.isSidechain || d.isMeta) return false;
  const c = d.message?.content;
  if (typeof c === "string") return c.trim().length > 0 && !c.startsWith("<");
  if (!Array.isArray(c)) return false;
  return c.some((b) => b?.type === "text" && b.text?.trim() && !b.text.startsWith("<")) && !c.some((b) => b?.type === "tool_result");
}

const days = new Map();
const day = (k) => {
  if (!days.has(k)) days.set(k, emptyDay());
  return days.get(k);
};
const seenMessages = new Set();
const seenTools = new Set();

for (const file of logFiles(LOGS)) {
  const sessionDays = new Set();
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (!line) continue;
    let d;
    try {
      d = JSON.parse(line);
    } catch {
      continue;
    }
    if (!d.timestamp) continue;
    const k = dayOf(d.timestamp);

    if (isPrompt(d)) {
      day(k).prompts++;
      sessionDays.add(k);
      continue;
    }
    if (d.type !== "assistant") continue;
    const m = d.message ?? {};
    // One API response can span several log lines (one per content
    // block); count the turn, model and tokens once per message id.
    const mid = m.id ?? d.uuid;
    if (!seenMessages.has(mid)) {
      seenMessages.add(mid);
      const t = day(k);
      t.turns++;
      const f = family(m.model ?? "");
      if (f) t.models[f]++;
      const u = m.usage ?? {};
      t.tokens.fresh += (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0);
      t.tokens.cached += u.cache_read_input_tokens ?? 0;
      t.tokens.output += u.output_tokens ?? 0;
      sessionDays.add(k);
    }
    for (const b of m.content ?? []) {
      if (b?.type !== "tool_use" || seenTools.has(b.id)) continue;
      seenTools.add(b.id);
      const t = day(k);
      t.toolCalls++;
      t.tools[TOOL_KIND[b.name] ?? "other"]++;
      if (AGENT_LAUNCHERS.has(b.name)) t.subagents++;
    }
  }
  for (const k of sessionDays) day(k).sessions++;
}

// Merge: recounted days replace old ones; days no longer in the logs
// (pruned by Claude Code) are kept from the previous export.
let previous = { days: [] };
if (existsSync(OUT)) {
  try {
    previous = JSON.parse(readFileSync(OUT, "utf8"));
  } catch {
    /* start fresh */
  }
}
const merged = new Map(previous.days.map((d) => [d.date, d]));
for (const [date, v] of days) merged.set(date, { date, ...v });

const out = {
  // Shown on the widget as "updated …".
  updated: dayOf(Date.now()),
  days: [...merged.values()].sort((a, b) => a.date.localeCompare(b.date)),
};
writeFileSync(OUT, JSON.stringify(out, null, 1) + "\n");

const sum = (f) => out.days.reduce((n, d) => n + f(d), 0);
console.log(
  `[claude] ${out.days.length} days → ${OUT}\n` +
    `  turns ${sum((d) => d.turns)} · prompts ${sum((d) => d.prompts)} · tool calls ${sum((d) => d.toolCalls)} · sub-agents ${sum((d) => d.subagents)}`,
);
