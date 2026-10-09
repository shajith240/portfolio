/* Derived numbers for the Claude widget, from data/claudeActivity.json
   (written by scripts/export-claude-activity.mjs — daily counts only).

   The point of the widget is HOW effectively I use Claude Code, not
   how much, so the headline numbers are ratios:
   - leverage: tool calls per prompt I typed — how much the agent does
     on its own per instruction (delegating real work vs. chatting);
   - cache share: input tokens served from the prompt cache — long,
     well-structured sessions instead of re-sending context;
   - model routing: turns per model family — Opus for the hard
     problems, Sonnet and Haiku where they're enough;
   - sub-agents: parallel agents launched. */

export interface ClaudeDay {
  date: string; // "YYYY-MM-DD", my (IST) calendar day
  turns: number;
  prompts: number;
  toolCalls: number;
  subagents: number;
  sessions: number;
  tools: { shell: number; read: number; edit: number; web: number; agents: number; other: number };
  models: { opus: number; sonnet: number; haiku: number };
  tokens: { fresh: number; cached: number; output: number };
}

export interface ClaudeActivity {
  updated: string; // "YYYY-MM-DD"
  days: ClaudeDay[];
}

export type ModelFamily = "opus" | "sonnet" | "haiku";
export const MODEL_FAMILIES: ModelFamily[] = ["opus", "sonnet", "haiku"];

export interface ClaudeSummary {
  activeDays: number;
  turns: number;
  prompts: number;
  toolCalls: number;
  subagents: number;
  /** Tool calls per prompt, one decimal. */
  leverage: number;
  /** % of input tokens read from cache, whole number. */
  cacheShare: number;
  /** % of turns per model family; sums to 100 (largest-remainder). */
  modelShare: Record<ModelFamily, number>;
}

/** Whole-number percentages that always sum to exactly 100. */
export function percentages<K extends string>(counts: Record<K, number>): Record<K, number> {
  const keys = Object.keys(counts) as K[];
  const total = keys.reduce((n, k) => n + counts[k], 0);
  const out = {} as Record<K, number>;
  if (total === 0) {
    for (const k of keys) out[k] = 0;
    return out;
  }
  const raw = keys.map((k) => ({ k, v: (counts[k] / total) * 100 }));
  for (const r of raw) out[r.k] = Math.floor(r.v);
  let left = 100 - raw.reduce((n, r) => n + Math.floor(r.v), 0);
  for (const r of [...raw].sort((a, b) => (b.v % 1) - (a.v % 1))) {
    if (left <= 0) break;
    out[r.k]++;
    left--;
  }
  return out;
}

export function summarize(data: ClaudeActivity): ClaudeSummary {
  const sum = (f: (d: ClaudeDay) => number) => data.days.reduce((n, d) => n + f(d), 0);
  const prompts = sum((d) => d.prompts);
  const toolCalls = sum((d) => d.toolCalls);
  const fresh = sum((d) => d.tokens.fresh);
  const cached = sum((d) => d.tokens.cached);
  return {
    activeDays: data.days.filter((d) => d.turns > 0).length,
    turns: sum((d) => d.turns),
    prompts,
    toolCalls,
    subagents: sum((d) => d.subagents),
    leverage: prompts ? Math.round((toolCalls / prompts) * 10) / 10 : 0,
    cacheShare: fresh + cached ? Math.round((cached / (fresh + cached)) * 100) : 0,
    modelShare: percentages({
      opus: sum((d) => d.models.opus),
      sonnet: sum((d) => d.models.sonnet),
      haiku: sum((d) => d.models.haiku),
    }),
  };
}

/** Tool calls per day for the `n` days ending at `data.updated`
 *  (missing days are 0), oldest first. */
export function recentActions(data: ClaudeActivity, n: number): { date: string; actions: number }[] {
  const byDate = new Map(data.days.map((d) => [d.date, d.toolCalls]));
  const end = Date.parse(`${data.updated}T00:00:00Z`);
  return Array.from({ length: n }, (_, i) => {
    const date = new Date(end - (n - 1 - i) * 86_400_000).toISOString().slice(0, 10);
    return { date, actions: byDate.get(date) ?? 0 };
  });
}

/** 15200 → "15.2K", 980 → "980". */
export function compact(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 100_000 ? 1 : 0).replace(/\.0$/, "")}K`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
}
