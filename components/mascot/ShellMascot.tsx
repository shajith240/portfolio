"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Mascot, type MascotHandle } from "@/components/mascot/Mascot";
import MascotBubble, { FRAME_FIGURE, SPRITE_FIGURE, type FigureBounds } from "@/components/mascot/MascotBubble";
import MascotFrame from "@/components/mascot/MascotFrame";
import AskPill from "@/components/mascot/AskPill";
import MascotChat, { mascotOnline, type ChatMessage } from "@/components/mascot/MascotChat";
import { DOCK_BOTTOM, DOCK_REST_HEIGHT } from "@/components/ui/Dock";
import { useLayout } from "@/contexts/LayoutContext";
import { BOTTOM_RESERVE, TOP_BOUND, useWindowManager, type WindowState } from "@/contexts/WindowManagerContext";
import { mascotSlotRect } from "@/lib/mascotSlot";
import type { Rect } from "@/lib/widgetPositioning";
import { useMascotBrain } from "@/lib/useMascotBrain";
import { ASK_MASCOT_EVENT } from "@/lib/mascotEvents";
import type { AttentionEvent } from "@/lib/mascotAttention";
import { CHAT_HINT, GREETING_DESKTOP, GREETING_PHONE, SECTION_LINES, remarkPool, type MascotLine } from "@/data/mascotLines";

/* The chibi mascot — Shajith, guiding visitors around the desktop.

   Where it sits ("perch"):
   - No window open: "home", framed in the widget lattice's top-left
     cell where the photo widget used to be (lib/mascotSlot.ts) — a
     glass "live photo" of Shajith among the widgets (MascotFrame). The
     bubble, the "Ask me" label (while the AI is online) and the chat
     open to the frame's right.
   - A window in front: on that window's top edge near its right end,
     tucked just BEHIND it (z one below the front window, above every
     other) so only head and shoulders peek over. New windows open low
     enough to leave room (WINDOW_TOP_CLEARANCE).
     The frame fades away while it's out; it comes home to the frame
     when the windows close.
   - No room above (maximized, or dragged up to the menu bar): back to
     home if that spot is clear, otherwise out of view.

   It never slides between perches: MASCOT.md forbids animating or
   transforming its container (the head aims from its on-screen box).
   It fades out, moves, and fades back in — and stays faded while a
   window is being dragged or resized, re-perching on release.

   It talks in small glass bubbles, each at most once per visit: a
   greeting, and one line the first time each section opens — written
   by the AI from that section's real content when it's online, else
   the fixed lines in data/mascotLines.ts. Clicking it opens a chat
   (MascotChat → app/api/mascot) where visitors can ask "Shajith"
   anything about his work. Expressions and looks go through the brain
   (lib/useMascotBrain.ts), so its cooldown and cursor rules hold.

   Mascot.tsx itself is a vendored file from the mascot kit — never
   edit its motion code; drive it through the ref instead. */

const DESKTOP_SIZE = 160;
const PHONE_SIZE = 140;

// The sheet cells carry ~16px of transparent space under the hoodie;
// boxes dip by that much so the drawing itself touches its surface.
const SPRITE_FOOT_SPACE = 16;
// Home: the figure stands in its frame like a portrait, hoodie on the
// frame's bottom edge, centred. The frame sits under the mascot; both
// above the widgets (20) — nothing can be dropped on that cell anyway.
const FRAME_Z = 21;
const HOME_Z = 22;

// iOS home screen stack, bottom-up (see HomeScreen.tsx): safe-area
// margin, 80px dock (12 + 56 + 12), 14px gap, 36px Search pill.
const PHONE_BOTTOM = "calc(max(12px, env(safe-area-inset-bottom, 12px)) + 80px + 14px + 36px + 10px)";

// Window perch: the box dips behind the window's top edge by exactly
// the sprite's transparent foot space, so the hoodie SITS on the edge
// (more than that and it sinks into the titlebar). PERCH_INSET is how
// far in from the window's right edge it sits.
const PEEK_OVERLAP = SPRITE_FOOT_SPACE;
const PERCH_INSET = 28;

const FADE_MS = 160;
// Let a window's open (genie) animation land before reappearing on it.
const SETTLE_MS = 420;
const GREETING_DELAY = 1400;
const BUBBLE_MS = 5200;
const BUBBLE_Z_OVER_WIDGETS = 23; // over the frame and the widgets (20)
// How long an AI-written section line may take before the fixed line
// is used instead — the mascot should never visibly wait.
const COMMENT_TIMEOUT_MS = 2500;

// Attention remarks ("that's my GitHub heatmap"): the mascot guides the
// visitor through whatever they look at — widgets, the Dock, the cards
// inside windows — with a different line each time it comes back to
// the same thing. Paced so it stays a guide, not a chatterbox: a gap
// after anything it said (shorter after a deliberate click), longer
// before the same thing gets another line, and a cap per visit.
const REMARK_GAP_MS = 10_000;
const CLICK_REMARK_GAP_MS = 6_000;
const SAME_TARGET_GAP_MS = 45_000;
const MAX_REMARKS = 20;
const REMARK_TIMEOUT_MS = 3000;
const RECENT_LIMIT = 5;
// The bare sprite's drawing ends ~86% across its box (phone label
// placement; bubbles and chat use SPRITE_FIGURE / FRAME_FIGURE).
const FIGURE_RIGHT = SPRITE_FIGURE.right;
const FIGURE_GAP = 8;
// Overlays beside the mascot (bubble, chat, "Ask me") never dip into the
// Dock: they stay above this line, measured from the viewport bottom.
const DOCK_FLOOR = DOCK_BOTTOM + DOCK_REST_HEIGHT + 8;

type Perch =
  | { kind: "home"; left: number; top: number }
  | { kind: "window"; windowId: string; left: number; top: number; z: number }
  | { kind: "hidden" };

interface Box {
  left: number;
  top: number;
  size: number;
}

// What a bubble/chat sits beside: the frame at home, the bare sprite
// elsewhere — with the part of that box it must never cover.
interface Anchor extends Box {
  figure: FigureBounds;
}

const perchKey = (p: Perch) =>
  p.kind === "window" ? `w:${p.windowId}:${p.left}:${p.top}:${p.z}` : p.kind === "home" ? `h:${p.left}:${p.top}` : p.kind;

const samePlace = (a: Perch, b: Perch) =>
  a.kind === "window" && b.kind === "window"
    ? a.windowId === b.windowId && a.left === b.left && a.top === b.top
    : perchKey(a) === perchKey(b);

function frontWindow(windows: WindowState[]) {
  let front: WindowState | null = null;
  for (const w of windows) if (!w.minimized && (!front || w.zIndex > front.zIndex)) front = w;
  return front;
}

const frameRect = (vw: number, vh: number): Rect => mascotSlotRect(vw, vh, TOP_BOUND, BOTTOM_RESERVE);

// The mascot's own box when it's home in the frame.
function homeBox(vw: number, vh: number): Box {
  const frame = frameRect(vw, vh);
  return {
    left: Math.round(frame.x + (frame.width - DESKTOP_SIZE) / 2),
    top: Math.round(frame.y + frame.height - DESKTOP_SIZE + SPRITE_FOOT_SPACE),
    size: DESKTOP_SIZE,
  };
}

const covers = (w: WindowState, b: Box) =>
  b.left < w.x + w.width && b.left + b.size > w.x && b.top < w.y + w.height && b.top + b.size > w.y;

function choosePerch(windows: WindowState[], vw: number, vh: number): Perch {
  const front = frontWindow(windows);
  if (front && !front.maximized) {
    const top = front.y - DESKTOP_SIZE + PEEK_OVERLAP;
    if (top >= TOP_BOUND) {
      const left = Math.min(Math.max(front.x + front.width - DESKTOP_SIZE - PERCH_INSET, 8), vw - DESKTOP_SIZE - 8);
      return { kind: "window", windowId: front.id, left: Math.round(left), top: Math.round(top), z: front.zIndex - 1 };
    }
  }
  const home = homeBox(vw, vh);
  const frame = frameRect(vw, vh);
  const frameBox = { left: frame.x, top: frame.y, size: frame.width };
  return windows.some((w) => !w.minimized && covers(w, frameBox)) ? { kind: "hidden" } : { kind: "home", left: home.left, top: home.top };
}

// A line from a pool the visitor hasn't heard yet this visit (random
// among the unheard ones); once all are heard, start over without
// repeating the last one. Storage can be unavailable — then it's just
// random, which is fine.
function pickVariant(poolKey: string, variants: string[]): number | null {
  if (!variants.length) return null;
  const id = `mascot.heard.${poolKey}`;
  let heard: number[] = [];
  try {
    heard = JSON.parse(sessionStorage.getItem(id) || "[]");
  } catch {
    heard = [];
  }
  let fresh = variants.map((_, i) => i).filter((i) => !heard.includes(i));
  if (!fresh.length) {
    const last = heard[heard.length - 1];
    heard = [];
    fresh = variants.map((_, i) => i).filter((i) => i !== last || variants.length === 1);
  }
  const pick = fresh[Math.floor(Math.random() * fresh.length)];
  try {
    sessionStorage.setItem(id, JSON.stringify([...heard, pick]));
    // Each pick is a fresh line for say()'s once-per-visit guard.
    sessionStorage.removeItem(`mascot.said.remark:${poolKey}:${pick}`);
  } catch {
    // storage unavailable
  }
  return pick;
}

// Once per visit, per line. Storage can be unavailable (private mode,
// blocked site data) — then lines may repeat on reload, which is fine.
function claimLine(key: string) {
  try {
    const id = `mascot.said.${key}`;
    if (sessionStorage.getItem(id)) return false;
    sessionStorage.setItem(id, "1");
  } catch {
    // fall through: say it
  }
  return true;
}

export default function ShellMascot({ variant }: { variant: "desktop" | "phone" }) {
  const isPhone = variant === "phone";
  const mascotRef = useRef<MascotHandle>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const brain = useMascotBrain(mascotRef, anchorRef, (event) => onAttentionRef.current(event));
  const { windows, getDockIconRect } = useWindowManager();
  const { viewportWidth, viewportHeight } = useLayout();

  const target = useMemo<Perch>(
    () => (isPhone ? { kind: "home", left: 0, top: 0 } : choosePerch(windows, viewportWidth, viewportHeight)),
    [isPhone, windows, viewportWidth, viewportHeight],
  );
  const targetKey = perchKey(target);

  const [shown, setShown] = useState<Perch>(target);
  const [visible, setVisible] = useState(target.kind !== "hidden");
  const [interacting, setInteracting] = useState(false);
  const [bubble, setBubble] = useState<{ text: string; anchor: Anchor } | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatAnchor, setChatAnchor] = useState<Anchor | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [online, setOnline] = useState(false);

  useEffect(() => {
    let alive = true;
    mascotOnline().then((v) => alive && setOnline(v));
    return () => {
      alive = false;
    };
  }, []);
  const shownKey = perchKey(shown);

  // Latest values for timers that fire later.
  const shownRef = useRef(shown);
  shownRef.current = shown;
  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  const onlineRef = useRef(online);
  onlineRef.current = online;
  const chatOpenRef = useRef(chatOpen);
  chatOpenRef.current = chatOpen;
  const bubbleRef = useRef(bubble);
  bubbleRef.current = bubble;
  // -Infinity, not 0: performance.now() starts at page load, so a 0
  // here would block every remark for the first REMARK_GAP_MS.
  const lastSpokeAt = useRef(-Infinity);
  const remarkCount = useRef(0);
  const lastRemarkAt = useRef(new Map<string, number>());
  const aiVariants = useRef(new Map<string, string[]>());
  // What the visitor has been doing, for the chat's "this one".
  const recent = useRef<{ target: string; action: AttentionEvent["action"] }[]>([]);

  /* ── Moving between perches: fade out → move → fade in ────────── */
  useEffect(() => {
    if (targetKey === shownKey) return;
    // Same spot, only the stacking changed (another window was focused
    // and this one is still in front, or vice versa): no fade.
    if (samePlace(target, shown)) {
      setShown(target);
      return;
    }
    setVisible(false);
    setBubble(null);
    let reveal: ReturnType<typeof setTimeout> | undefined;
    const move = setTimeout(() => {
      setShown(target);
      if (target.kind === "hidden") return;
      reveal = setTimeout(() => setVisible(true), target.kind === "window" ? SETTLE_MS : 60);
    }, FADE_MS);
    return () => {
      clearTimeout(move);
      if (reveal) clearTimeout(reveal);
    };
    // Keyed on the perch identity, not the object (rebuilt each render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetKey]);

  /* ── Stay out of the way while a window is dragged or resized ─── */
  useEffect(() => {
    if (isPhone) return;
    const onDown = (e: PointerEvent) => {
      const el = e.target as Element | null;
      if (el?.closest?.("[data-window-chrome]") && !el.closest("button")) setInteracting(true);
    };
    const onUp = () => setInteracting(false);
    document.addEventListener("pointerdown", onDown, true);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [isPhone]);

  /* ── Talking ──────────────────────────────────────────────────── */
  const measure = (): Anchor | null => {
    if (!isPhone && shownRef.current.kind === "home") {
      const frame = frameRect(viewportWidth, viewportHeight);
      return { left: frame.x, top: frame.y, size: frame.width, figure: FRAME_FIGURE };
    }
    const box = anchorRef.current?.getBoundingClientRect();
    return box ? { left: box.left, top: box.top, size: box.width, figure: SPRITE_FIGURE } : null;
  };

  const say = (key: string, line: MascotLine) => {
    if (chatOpen || !claimLine(key)) return false;
    const anchor = measure();
    if (!anchor) return false;
    setBubble({ text: line.text, anchor });
    lastSpokeAt.current = performance.now();
    if (line.expression) brain.current?.react(line.expression, 1100);
    return true;
  };

  /* ── Noticing what the visitor reads, hovers, clicks, copies ──── */
  const onAttention = (event: AttentionEvent) => {
    const last = recent.current[recent.current.length - 1];
    if (!last || last.target !== event.target || last.action !== event.action) {
      recent.current = [...recent.current, { target: event.target, action: event.action }].slice(-RECENT_LIMIT);
    }

    // Body language first — free and immediate: look at what they're
    // reading (the top of a tall card, not its middle).
    if (event.action === "read" && visibleRef.current) {
      const { x, y, width, height } = event.rect;
      brain.current?.look({ x: x + width / 2, y: y + Math.min(height / 2, 120) }, 1400);
    }

    // Then maybe a remark.
    if (chatOpenRef.current || bubbleRef.current || !visibleRef.current) return;
    if (remarkCount.current >= MAX_REMARKS) return;
    const clicked = event.action === "code" || event.action === "live";
    const now = performance.now();
    if (now - lastSpokeAt.current < (clicked ? CLICK_REMARK_GAP_MS : REMARK_GAP_MS)) return;
    // Looking (hover / read) shares one set of lines per thing; a click
    // on a project's code or demo has its own.
    const poolKey = `${event.target}:${clicked ? event.action : "look"}`;
    if (now - (lastRemarkAt.current.get(poolKey) ?? -Infinity) < SAME_TARGET_GAP_MS) return;

    const speak = (variants: string[]) => {
      const pick = pickVariant(poolKey, variants);
      if (pick === null || chatOpenRef.current || bubbleRef.current) return;
      if (say(`remark:${poolKey}:${pick}`, { text: variants[pick], expression: clicked ? "sparkle" : undefined })) {
        remarkCount.current += 1;
        lastRemarkAt.current.set(poolKey, performance.now());
      }
    };

    // Widgets, the Dock and the thin sections: hand-written lines, said
    // instantly — no network, works with the AI offline.
    const pool = clicked ? null : remarkPool(event.target);
    if (pool) {
      speak(pool);
      return;
    }
    // Project cards and skill groups: three AI-written lines, fetched
    // once and kept for the visit.
    const cached = aiVariants.current.get(poolKey);
    if (cached) {
      speak(cached);
      return;
    }
    if (!onlineRef.current) return;
    lastSpokeAt.current = now; // hold the slot while the AI writes
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REMARK_TIMEOUT_MS);
    fetch("/api/mascot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "remark", target: event.target, action: event.action }),
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const variants = Array.isArray(d?.variants) ? d.variants.filter((v: unknown) => typeof v === "string" && v) : [];
        if (!variants.length) return;
        aiVariants.current.set(poolKey, variants);
        speak(variants);
      })
      .catch(() => {})
      .finally(() => clearTimeout(timeout));
  };
  const onAttentionRef = useRef(onAttention);
  onAttentionRef.current = onAttention;

  // Greeting, once per visit, while it's at home.
  useEffect(() => {
    const t = setTimeout(() => {
      if (shownRef.current.kind !== "home" || !visibleRef.current) return;
      const base = isPhone ? GREETING_PHONE : GREETING_DESKTOP;
      const spoke = say("greeting", onlineRef.current ? { ...base, text: `${base.text} ${CHAT_HINT}` } : base);
      // Point the way: look at the Projects icon in the Dock.
      const icon = !isPhone && spoke ? getDockIconRect("/projects") : null;
      if (icon) brain.current?.look({ x: icon.left + icon.width / 2, y: icon.top + icon.height / 2 }, 1600);
    }, GREETING_DELAY);
    return () => clearTimeout(t);
    // Mount-only: one greeting per visit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A section's line, the first time its window gets the mascot.
  const introduced = useRef(new Set<string>());
  useEffect(() => {
    if (shown.kind !== "window" || !visible || introduced.current.has(shown.windowId)) return;
    introduced.current.add(shown.windowId);
    const win = windows.find((w) => w.id === shown.windowId);
    const line = win ? SECTION_LINES[win.route] : undefined;
    if (!win || !line) return;
    const route = win.route;
    const windowId = shown.windowId;
    const speak = (text: string) => {
      // Still on that window? (The visitor may have moved on while the
      // AI was writing.)
      const now = shownRef.current;
      if (now.kind !== "window" || now.windowId !== windowId || !visibleRef.current) return;
      if (say(`section:${route}`, { ...line, text })) {
        // Look down at the window it's introducing (its title).
        brain.current?.look({ x: win.x + win.width / 2, y: win.y + 14 }, 1200);
      }
    };
    if (!onlineRef.current) {
      speak(line.text);
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), COMMENT_TIMEOUT_MS);
    fetch("/api/mascot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "comment", route }),
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => speak(typeof d?.text === "string" && d.text ? d.text : line.text))
      .catch(() => speak(line.text))
      .finally(() => clearTimeout(timeout));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shownKey, visible]);

  useEffect(() => {
    if (!bubble) return;
    const t = setTimeout(() => setBubble(null), BUBBLE_MS);
    return () => clearTimeout(t);
  }, [bubble]);

  // The section the visitor is looking at, as chat context.
  const front = frontWindow(windows);
  const frontRoute = front ? front.route : null;
  const closeChat = useCallback(() => setChatOpen(false), []);

  // The chat follows the mascot when it moves perch.
  useEffect(() => {
    if (chatOpen && visible) setChatAnchor(measure());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shownKey, visible]);

  /* ── Render ───────────────────────────────────────────────────── */
  const opacity = visible && !interacting ? 1 : 0;
  let placement: React.CSSProperties;
  let z = HOME_Z;
  if (isPhone) {
    placement = { left: "16px", bottom: PHONE_BOTTOM };
    z = 6;
  } else if (shown.kind === "window") {
    placement = { left: `${shown.left}px`, top: `${shown.top}px` };
    z = shown.z;
  } else {
    // Home (also the parking spot while hidden).
    const home = shown.kind === "home" ? shown : homeBox(viewportWidth, viewportHeight);
    placement = { left: `${home.left}px`, top: `${home.top}px` };
  }

  // "Ask me" beside the mascot at home, right of its head.
  const size = isPhone ? PHONE_SIZE : DESKTOP_SIZE;
  const frame = frameRect(viewportWidth, viewportHeight);
  const showPill = online && opacity === 1 && !chatOpen && !bubble && (isPhone || shown.kind === "home");
  const pillStyle: React.CSSProperties = isPhone
    ? { left: 16 + size * FIGURE_RIGHT + FIGURE_GAP, bottom: `calc(${PHONE_BOTTOM} + ${Math.round(size * 0.44)}px)`, zIndex: z + 1 }
    : shown.kind === "home"
      ? {
          // Just outside the frame's lower-right corner.
          left: frame.x + frame.width + FIGURE_GAP,
          top: frame.y + frame.height - 26 - 10,
          zIndex: BUBBLE_Z_OVER_WIDGETS,
        }
      : {};
  const openChat = () => {
    setBubble(null);
    setChatAnchor(measure());
    setChatOpen(true);
  };

  // Spotlight's "Ask my AI": open the chat with that question.
  const [pendingAsk, setPendingAsk] = useState<string | null>(null);
  const openChatRef = useRef(openChat);
  openChatRef.current = openChat;
  useEffect(() => {
    const onAsk = (e: Event) => {
      const q = (e as CustomEvent<{ question?: string }>).detail?.question;
      if (!q) return;
      setPendingAsk(q);
      openChatRef.current();
    };
    window.addEventListener(ASK_MASCOT_EVENT, onAsk);
    return () => window.removeEventListener(ASK_MASCOT_EVENT, onAsk);
  }, []);

  // While an answer is on its way, the mascot glances up and aside —
  // the universal "let me think" look. A real cursor move breaks it.
  const thinkingPose = () => {
    const a = anchorRef.current?.getBoundingClientRect();
    if (a) brain.current?.look({ x: a.left - a.width * 0.6, y: a.top - a.height * 1.4 }, 2200);
  };

  return (
    <>
      {!isPhone && (
        <MascotFrame
          rect={frame}
          visible={shown.kind === "home" && opacity === 1}
          zIndex={FRAME_Z}
          onOpen={() => (chatOpen ? setChatOpen(false) : openChat())}
        />
      )}
      <div
        ref={anchorRef}
        // Clicking the mascot (it still does its own boop) opens the
        // chat; clicking again closes it.
        onClick={() => (chatOpen ? setChatOpen(false) : openChat())}
        style={{
          position: "fixed",
          ...placement,
          zIndex: z,
          lineHeight: 0,
          opacity,
          // Opacity only — never a transform or a moving box (MASCOT.md).
          transition: `opacity ${FADE_MS}ms ease`,
          pointerEvents: opacity ? "auto" : "none",
        }}
        aria-hidden={opacity ? undefined : true}
      >
        <Mascot
          ref={mascotRef}
          directions="/mascots/shajith-directions-5x5.webp"
          reactions="/mascots/shajith-reactions.webp"
          grid={5}
          size={isPhone ? PHONE_SIZE : DESKTOP_SIZE}
          label="Shajith"
        />
      </div>
      <AnimatePresence>
        {bubble && opacity === 1 && !chatOpen && (
          <MascotBubble
            key={bubble.text}
            text={bubble.text}
            anchor={bubble.anchor}
            figure={bubble.anchor.figure}
            floor={isPhone ? 0 : DOCK_FLOOR}
            zIndex={shown.kind === "window" ? shown.z + 1 : BUBBLE_Z_OVER_WIDGETS}
            onDismiss={() => setBubble(null)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>{showPill && <AskPill style={pillStyle} onOpen={openChat} />}</AnimatePresence>
      <AnimatePresence>
        {chatOpen && chatAnchor && opacity === 1 && (
          <MascotChat
            anchor={chatAnchor}
            zIndex={shown.kind === "window" ? shown.z + 1 : 95}
            isPhone={isPhone}
            floor={isPhone ? 0 : DOCK_FLOOR}
            figure={chatAnchor.figure}
            section={frontRoute}
            getRecent={() => recent.current}
            messages={chatMessages}
            setMessages={setChatMessages}
            onClose={closeChat}
            onAnswered={() => brain.current?.react("delighted", 900)}
            initialQuestion={pendingAsk}
            onInitialSent={() => setPendingAsk(null)}
            onThinking={thinkingPose}
          />
        )}
      </AnimatePresence>
    </>
  );
}
