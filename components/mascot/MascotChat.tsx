"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useLiquidGlass } from "@/lib/liquidGlass";
import { SPRITE_FIGURE, type FigureBounds } from "@/components/mascot/MascotBubble";

/* Chat with the mascot — visitors ask, "Shajith" answers, streamed from
   app/api/mascot (grounded only in the site's own data). A Liquid Glass
   panel beside the mascot; like MascotBubble it's its own fixed
   element, never inside the mascot's fading wrapper.

   The conversation lives in the parent (ShellMascot) so closing and
   reopening the panel keeps it for the rest of the visit. */

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatAnchor {
  left: number;
  top: number;
  size: number;
}

export const CONTACT_EMAIL = "shajith240@gmail.com";

const SUGGESTIONS = [
  "What are you building right now?",
  "Which project should I look at first?",
  "What's your tech stack?",
  "How can I reach you?",
];

const PANEL_WIDTH = 330;
const GAP = 8;
const PANEL_MAX_HEIGHT = 440;

// One status check per page load, shared by every mount.
let onlineCheck: Promise<boolean> | null = null;
export function mascotOnline() {
  onlineCheck ??= fetch("/api/mascot")
    .then((r) => (r.ok ? r.json() : { online: false }))
    .then((d) => Boolean(d?.online))
    .catch(() => false);
  return onlineCheck;
}

const OFFLINE_REPLY = `I'm offline right now, but I'd love to hear from you: ${CONTACT_EMAIL}`;
const BUSY_REPLY = `Lots of questions right now. Give me a minute, or email me at ${CONTACT_EMAIL}.`;

/* While the answer is on its way: three dots rising and falling in a
   wave, like a typing bubble in Messages. Reduced motion: the dots
   pulse in place instead of moving. */
function Thinking({ reduced }: { reduced: boolean }) {
  return (
    <span role="status" aria-label="Thinking" style={{ display: "inline-flex", alignItems: "center", gap: 4, height: 18, padding: "0 2px" }}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          aria-hidden
          animate={reduced ? { opacity: [0.35, 1, 0.35] } : { y: [0, -4, 0], opacity: [0.45, 1, 0.45] }}
          transition={{ duration: 1, ease: "easeInOut", repeat: Infinity, delay: i * 0.16 }}
          style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(255, 255, 255, 0.85)", display: "block" }}
        />
      ))}
    </span>
  );
}

// The model often answers in a few hundred ms; showing the dots for at
// least this long reads as considered, not canned.
const MIN_THINK_MS = 800;

export default function MascotChat({
  anchor,
  zIndex,
  isPhone,
  floor = 0,
  figure = SPRITE_FIGURE,
  section,
  getRecent,
  messages,
  setMessages,
  onClose,
  onAnswered,
  initialQuestion = null,
  onInitialSent,
  onThinking,
}: {
  anchor: ChatAnchor;
  zIndex: number;
  isPhone: boolean;
  floor?: number; // px from the viewport bottom the panel must stay above (the Dock)
  figure?: FigureBounds; // what the panel must not cover (MascotBubble)
  section: string | null; // route of the window in front, for context
  getRecent: () => { target: string; action: string }[]; // what they've been reading/clicking
  messages: ChatMessage[];
  setMessages: (update: (prev: ChatMessage[]) => ChatMessage[]) => void;
  onClose: () => void;
  onAnswered: () => void;
  /** Asked as soon as the panel opens (Spotlight's "Ask my AI"). */
  initialQuestion?: string | null;
  onInitialSent?: () => void;
  /** Fired when a question goes out — the mascot strikes a thinking pose. */
  onThinking?: () => void;
}) {
  const reduced = useReducedMotion();
  const ref = useLiquidGlass<HTMLDivElement>({ radius: 20, bezel: 12, strength: 0.55, blur: 5, brightness: 0.8, tint: 0.42, press: false });
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      abortRef.current?.abort();
    };
  }, [onClose]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  const send = async (text: string) => {
    const question = text.trim().slice(0, 400);
    if (!question || busy) return;
    setDraft("");
    setBusy(true);
    onThinking?.();
    const startedAt = performance.now();
    const history = [...messages, { role: "user" as const, content: question }];
    setMessages(() => [...history, { role: "assistant", content: "" }]);
    const write = (content: string) =>
      setMessages((prev) => {
        const next = prev.slice();
        next[next.length - 1] = { role: "assistant", content };
        return next;
      });

    if (!(await mascotOnline())) {
      write(OFFLINE_REPLY);
      setBusy(false);
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch("/api/mascot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "chat", messages: history, section, recent: getRecent() }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        write(res.status === 429 ? BUSY_REPLY : OFFLINE_REPLY);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let answer = "";
      let first = true;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        if (first) {
          first = false;
          const wait = MIN_THINK_MS - (performance.now() - startedAt);
          if (wait > 0) await new Promise((r) => setTimeout(r, wait));
        }
        write(answer);
      }
      if (!answer.trim()) write(OFFLINE_REPLY);
      else onAnswered();
    } catch {
      if (!controller.signal.aborted) write(OFFLINE_REPLY);
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  };

  // A question handed over from Spotlight: ask it once, on open.
  useEffect(() => {
    if (!initialQuestion) return;
    onInitialSent?.();
    send(initialQuestion);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuestion]);

  // Placement: phones get a sheet above the mascot; desktop sits beside
  // it, opening upward when the mascot is low (Dock) and downward when
  // it's high (perched on a window).
  const vw = typeof window !== "undefined" ? window.innerWidth : 1440;
  const vh = typeof window !== "undefined" ? window.innerHeight : 900;
  let position: React.CSSProperties;
  if (isPhone) {
    position = { left: 12, right: 12, bottom: vh - anchor.top + 6 };
  } else {
    const rightEdge = anchor.left + anchor.size * figure.right + GAP;
    const onRight = rightEdge + PANEL_WIDTH <= vw - 12;
    const horizontal = onRight
      ? { left: rightEdge }
      : { left: Math.max(12, anchor.left + anchor.size * figure.left - GAP - PANEL_WIDTH) };
    const low = anchor.top > vh / 2;
    position = low
      ? { ...horizontal, bottom: Math.max(12, floor, vh - (anchor.top + anchor.size * 0.55)) }
      // Beside a frame: level with its top. Beside the bare sprite: from
      // about shoulder height.
      : { ...horizontal, top: Math.max(32, anchor.top + (figure.left === 0 ? 0 : anchor.size * 0.45)) };
  }

  const lastIsPending = busy && messages[messages.length - 1]?.content === "";

  return (
    <motion.div
      ref={ref}
      role="dialog"
      aria-label="Chat with Shajith"
      className="liquid-glass"
      initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1 }}
      // Closing should feel instant: a short tween out, not the spring.
      exit={reduced ? { opacity: 0, transition: { duration: 0.12 } } : { opacity: 0, scale: 0.97, transition: { duration: 0.18, ease: "easeOut" } }}
      transition={{ type: "spring", visualDuration: 0.3, bounce: 0.2 }}
      style={{
        position: "fixed",
        ...position,
        width: isPhone ? undefined : PANEL_WIDTH,
        maxHeight: PANEL_MAX_HEIGHT,
        display: "flex",
        flexDirection: "column",
        borderRadius: 20,
        color: "var(--text-primary)",
        zIndex,
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px 6px" }}>
        <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: "-0.01em" }}>Ask me anything</span>
        <button
          onClick={onClose}
          aria-label="Close chat"
          style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: 18, lineHeight: 1, cursor: "pointer", padding: 2 }}
        >
          ×
        </button>
      </div>

      <div
        ref={listRef}
        aria-live="polite"
        style={{ flex: 1, overflowY: "auto", padding: "4px 14px 8px", display: "flex", flexDirection: "column", gap: 8, scrollbarWidth: "none" }}
      >
        {messages.length === 0 && (
          <>
            <p style={{ margin: "2px 0 4px", fontSize: 13, lineHeight: 1.45, color: "var(--text-secondary)" }}>
              Hi! I&apos;m Shajith. Ask me about my projects, skills, or how to reach me.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  style={{
                    fontSize: 12,
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(255,255,255,0.06)",
                    color: "var(--text-primary)",
                    cursor: "pointer",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "88%",
              padding: "7px 11px",
              borderRadius: 14,
              fontSize: 13,
              lineHeight: 1.45,
              whiteSpace: "pre-wrap",
              background: m.role === "user" ? "rgba(10,132,255,0.85)" : "rgba(255,255,255,0.08)",
              color: m.role === "user" ? "#fff" : "var(--text-primary)",
            }}
          >
            {m.content || (i === messages.length - 1 && lastIsPending ? <Thinking reduced={!!reduced} /> : "")}
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
        style={{ display: "flex", gap: 8, padding: "8px 10px 10px", borderTop: "1px solid rgba(255,255,255,0.08)" }}
      >
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={400}
          placeholder="Type a question…"
          aria-label="Your question"
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: 13,
            padding: "8px 11px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(0,0,0,0.18)",
            color: "var(--text-primary)",
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={busy || !draft.trim()}
          style={{
            fontSize: 13,
            fontWeight: 600,
            padding: "0 14px",
            borderRadius: 10,
            border: "none",
            background: busy || !draft.trim() ? "rgba(255,255,255,0.12)" : "#0a84ff",
            color: "#fff",
            cursor: busy || !draft.trim() ? "default" : "pointer",
          }}
        >
          Send
        </button>
      </form>
    </motion.div>
  );
}
