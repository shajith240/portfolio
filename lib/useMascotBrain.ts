"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { Expression, LookTarget, MascotHandle } from "@/components/mascot/Mascot";
import { watchAttention, type AttentionEvent } from "@/lib/mascotAttention";

/* The mascot's "brain" — page-level behaviours layered on top of the
   Mascot command API (MASCOT.md §5). It never touches the engine;
   everything here is lookAt / release / react / sleep / wake.

   Rules it keeps, in priority order:
   1. One brain reaction at a time, ≥3s apart — anything arriving
      inside the cooldown is dropped, never queued. Clicks on the
      mascot itself are the component's business and exempt.
   2. It mostly LOOKS; expressions stay rare.
   3. It never fights the cursor: every brain lookAt() releases itself
      within ~2s, and a real cursor move (>40px) cancels it at once.
   4. Reduced motion skips the idle glances; blinks and sleep remain.
   5. Single re-arming setTimeouts only (no setInterval), and every
      timer/listener is torn down on unmount.

   Desktop windows render their routes in same-origin iframes (see
   components/window/Window.tsx), so the About page — where the email
   address lives — never dispatches events to this document. The
   brain therefore also listens inside each window's iframe, or a
   visitor reading a window would look "idle" and copying the email
   would never register. */

const IDLE_AFTER = 4000;
const SLEEP_AFTER = 30_000;
const REACTION_COOLDOWN = 3000;
const BLINK_EVERY: Range = [3000, 6000];
const GLANCE_EVERY: Range = [5000, 9000];
const GLANCE_HOLD: Range = [1000, 1800];
const GLANCE_DISTANCE: Range = [200, 400];
// A glance shouldn't start while an expression is still on screen
// (turn-to-front + longest brain reaction).
const REACTION_SETTLE = 1600;
// Rule 3's "within a couple of seconds" — the ceiling on every look.
const LOOK_MAX_HOLD = 2000;
const CURSOR_SLACK = 40;
const FAST_SCROLL = 1500; // px/s
const SCROLL_LOOK_OFFSET = 300;
const SCROLL_SETTLE = 600;
// Two scroll samples further apart than this belong to different
// gestures, so no speed is derived from them.
const SCROLL_SAMPLE_GAP = 120;
const AWAY_FOR_WELCOME = 60_000;
const FOCUSABLE = "a, button, [tabindex]";

type Range = readonly [number, number];
type LookOwner = "glance" | "focus" | "scroll" | "guide";

const between = ([min, max]: Range) => min + Math.random() * (max - min);

/* What the guide layer (ShellMascot) can ask of the brain. Both go
   through the same rules as everything else: react() is dropped (not
   queued) inside the 3s cooldown and returns whether it fired; look()
   is capped at LOOK_MAX_HOLD and a real cursor move cancels it. */
export interface MascotBrainApi {
  react(expression: Expression, ms: number): boolean;
  look(target: LookTarget, ms: number): void;
}

export function useMascotBrain(
  mascotRef: RefObject<MascotHandle | null>,
  anchorRef: RefObject<HTMLElement | null>,
  // What the visitor reads / hovers / clicks / copies on the page and
  // inside windows (lib/mascotAttention.ts) — the guide decides what,
  // if anything, to say about it.
  onAttention?: (event: AttentionEvent) => void
): RefObject<MascotBrainApi | null> {
  const apiRef = useRef<MascotBrainApi | null>(null);
  const onAttentionRef = useRef(onAttention);
  onAttentionRef.current = onAttention;

  useEffect(() => {
    const mascot = () => mascotRef.current;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const timers = new Set<number>();
    const later = (run: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        run();
      }, ms);
      timers.add(id);
      return id;
    };
    const cancel = (id: number | null): null => {
      if (id !== null) {
        window.clearTimeout(id);
        timers.delete(id);
      }
      return null;
    };

    const center = () => {
      const box = anchorRef.current?.getBoundingClientRect();
      return box ? { x: box.left + box.width / 2, y: box.top + box.height / 2 } : null;
    };

    // ── Looking (owned, self-releasing) ─────────────────────────────
    // Exactly one brain look at a time, tagged with who started it so
    // e.g. a focusout can't release a scroll look it doesn't own.
    let lookOwner: LookOwner | null = null;

    // ── Cursor inside a window (iframe) ─────────────────────────────
    // The engine follows the cursor from `pointermove` on THIS window,
    // which never fires while the cursor is over a window's iframe — it
    // would freeze on the last desktop position. So the brain forwards
    // the iframe cursor (converted to page coordinates) through the
    // public lookAt(), once per frame, and release()s the moment the
    // cursor is back on the desktop. Anything that "returns to the
    // cursor" while it's inside a window returns to this point.
    let proxyPoint: { x: number; y: number } | null = null;
    let proxyRaf = 0;
    const restOnCursor = () => {
      if (proxyPoint) mascot()?.lookAt(proxyPoint);
      else mascot()?.release();
    };
    let lookTimer: number | null = null;

    const stopLook = (owner?: LookOwner) => {
      if (lookOwner === null || (owner && owner !== lookOwner)) return;
      lookTimer = cancel(lookTimer);
      lookOwner = null;
      restOnCursor();
    };

    const look = (owner: LookOwner, target: LookTarget, holdMs: number) => {
      lookTimer = cancel(lookTimer);
      lookOwner = owner;
      mascot()?.lookAt(target);
      lookTimer = later(() => stopLook(owner), Math.min(holdMs, LOOK_MAX_HOLD));
    };

    // ── Reacting (rule 1) ───────────────────────────────────────────
    let lastReactionAt = -Infinity;

    const tryReact = (expression: Expression, ms: number) => {
      const now = performance.now();
      if (now - lastReactionAt < REACTION_COOLDOWN) return false;
      lastReactionAt = now;
      stopLook();
      mascot()?.react(expression, ms);
      return true;
    };

    // ── Idle life & sleep ───────────────────────────────────────────
    // Activity only stamps a time; the idle/sleep timers check that
    // stamp when they fire and re-arm for the remainder. That keeps a
    // stream of pointermoves from churning clearTimeout/setTimeout.
    let lastActivity = performance.now();
    let idle = false;
    let idleTimer: number | null = null;
    let sleepTimer: number | null = null;
    let blinkTimer: number | null = null;
    let glanceTimer: number | null = null;

    const isAsleep = () => mascot()?.isSleeping() ?? false;

    const blink = () => {
      blinkTimer = null;
      if (!idle || isAsleep()) return;
      // Never blink over a glance — react() would yank the head forward.
      if (lookOwner === null) tryReact("blink", 140);
      blinkTimer = later(blink, between(BLINK_EVERY));
    };

    const glance = () => {
      glanceTimer = null;
      if (!idle || isAsleep() || reducedMotion.matches) return;
      const origin = center();
      const settled = performance.now() - lastReactionAt > REACTION_SETTLE;
      if (origin && settled && lookOwner === null) {
        const side = Math.random() < 0.5 ? -1 : 1;
        const distance = between(GLANCE_DISTANCE);
        // Mostly sideways, sometimes a little up or down.
        const tilt = between([-0.35, 0.35]);
        look("glance", { x: origin.x + side * distance, y: origin.y + tilt * distance }, between(GLANCE_HOLD));
      }
      glanceTimer = later(glance, between(GLANCE_EVERY));
    };

    const leaveIdle = () => {
      idle = false;
      blinkTimer = cancel(blinkTimer);
      glanceTimer = cancel(glanceTimer);
      stopLook("glance");
    };

    const checkIdle = () => {
      idleTimer = null;
      const quiet = performance.now() - lastActivity;
      if (quiet < IDLE_AFTER) {
        idleTimer = later(checkIdle, IDLE_AFTER - quiet);
        return;
      }
      if (isAsleep()) return;
      idle = true;
      blinkTimer = later(blink, between(BLINK_EVERY));
      if (!reducedMotion.matches) glanceTimer = later(glance, between(GLANCE_EVERY));
    };

    const checkSleep = () => {
      sleepTimer = null;
      // Hidden tabs never doze off — coming back is the "welcome
      // back" case, not a wake-up (the visibility handler re-arms).
      if (document.hidden) return;
      const quiet = performance.now() - lastActivity;
      if (quiet < SLEEP_AFTER) {
        sleepTimer = later(checkSleep, SLEEP_AFTER - quiet);
        return;
      }
      leaveIdle();
      stopLook();
      mascot()?.sleep();
    };

    const armTimers = () => {
      if (idleTimer === null) idleTimer = later(checkIdle, IDLE_AFTER);
      if (sleepTimer === null && !document.hidden) sleepTimer = later(checkSleep, SLEEP_AFTER);
    };

    const activity = () => {
      lastActivity = performance.now();
      if (isAsleep()) {
        mascot()?.wake();
        // The surprised wake-up counts as this beat's reaction.
        lastReactionAt = lastActivity;
      }
      if (idle) leaveIdle();
      armTimers();
    };

    // ── Input handlers (shared by the page and every window iframe) ──
    let lastInputWasKeyboard = false;
    let pointerAnchor: { x: number; y: number } | null = null;

    const onPointerMove = (x: number, y: number) => {
      // Sub-40px jitter is neither "activity" nor a reason to drop a
      // look; anything more is the visitor steering, and wins.
      if (pointerAnchor && Math.hypot(x - pointerAnchor.x, y - pointerAnchor.y) < CURSOR_SLACK) return;
      pointerAnchor = { x, y };
      stopLook();
      activity();
    };

    const onPointerDown = () => {
      lastInputWasKeyboard = false;
      stopLook();
      activity();
    };

    const onKeyDown = () => {
      lastInputWasKeyboard = true;
      activity();
    };

    const onFocusIn = (target: EventTarget | null, frame: HTMLIFrameElement | null) => {
      if (!lastInputWasKeyboard) return;
      // Cross-realm safe: an element inside an iframe isn't an
      // `instanceof Element` of this window.
      const el = target as Element | null;
      if (!el || typeof el.matches !== "function" || !el.matches(FOCUSABLE)) return;
      if (anchorRef.current?.contains(el)) return;
      if (!frame) {
        look("focus", el, LOOK_MAX_HOLD);
        return;
      }
      // Inside a window the element's rect is relative to the iframe's
      // viewport — translate it into this page's coordinates.
      const box = el.getBoundingClientRect();
      const frameBox = frame.getBoundingClientRect();
      look(
        "focus",
        {
          x: frameBox.left + frame.clientLeft + box.left + box.width / 2,
          y: frameBox.top + frame.clientTop + box.top + box.height / 2,
        },
        LOOK_MAX_HOLD
      );
    };

    const onFocusOut = () => stopLook("focus");

    const scrollSamples = new WeakMap<object, { top: number; at: number }>();
    let scrollDirection = 0;
    let scrollSettleTimer: number | null = null;

    const onScroll = (target: EventTarget | null) => {
      activity();
      const node = target as Element | Document | null;
      const el = node && "scrollingElement" in node ? node.scrollingElement : node;
      if (!el) return;

      const now = performance.now();
      const top = el.scrollTop;
      const previous = scrollSamples.get(el);
      scrollSamples.set(el, { top, at: now });

      if (lookOwner === "scroll") {
        scrollSettleTimer = cancel(scrollSettleTimer);
        scrollSettleTimer = later(() => stopLook("scroll"), SCROLL_SETTLE);
      }

      if (!previous || now - previous.at > SCROLL_SAMPLE_GAP) return;
      const speed = ((top - previous.top) / Math.max(now - previous.at, 1)) * 1000;
      if (Math.abs(speed) < FAST_SCROLL) return;
      // Don't steal a keyboard-focus look, and don't re-aim while
      // already looking the same way. (A glance is already gone:
      // activity() above ended idle.)
      if (lookOwner === "focus") return;
      const direction = Math.sign(speed);
      if (lookOwner === "scroll" && direction === scrollDirection) return;
      const origin = center();
      if (!origin) return;
      scrollDirection = direction;
      look("scroll", { x: origin.x, y: origin.y + direction * SCROLL_LOOK_OFFSET }, LOOK_MAX_HOLD);
      scrollSettleTimer = cancel(scrollSettleTimer);
      scrollSettleTimer = later(() => stopLook("scroll"), SCROLL_SETTLE);
    };

    const onCopy = () => tryReact("heart", 1100);

    // Wires one document (this page, or a window's iframe) into the
    // handlers above; returns its teardown.
    const listen = (doc: Document, frame: HTMLIFrameElement | null) => {
      const pointerMove = (e: PointerEvent) => {
        const box = frame?.getBoundingClientRect();
        const x = e.clientX + (box?.left ?? 0) + (frame?.clientLeft ?? 0);
        const y = e.clientY + (box?.top ?? 0) + (frame?.clientTop ?? 0);
        if (e.pointerType === "mouse" || e.pointerType === "pen") {
          if (frame) {
            proxyPoint = { x, y };
            if (!proxyRaf) {
              proxyRaf = requestAnimationFrame(() => {
                proxyRaf = 0;
                // A deliberate brain look (focus, scroll, guide) keeps
                // the head until it releases — then it lands here.
                if (proxyPoint && lookOwner === null) mascot()?.lookAt(proxyPoint);
              });
            }
          } else if (proxyPoint) {
            // Back on the desktop: the engine's own cursor tracking
            // takes over again (this same event reaches it next).
            proxyPoint = null;
            if (lookOwner === null) mascot()?.release();
          }
        }
        onPointerMove(x, y);
      };
      const focusIn = (e: FocusEvent) => onFocusIn(e.target, frame);
      const scroll = (e: Event) => onScroll(e.target);
      const opts = { capture: true, passive: true } as const;

      doc.addEventListener("pointermove", pointerMove, opts);
      doc.addEventListener("pointerdown", onPointerDown, opts);
      doc.addEventListener("keydown", onKeyDown, opts);
      doc.addEventListener("focusin", focusIn, opts);
      doc.addEventListener("focusout", onFocusOut, opts);
      // Capture: on the desktop nothing scrolls the window itself —
      // only inner panes do, and scroll events don't bubble.
      doc.addEventListener("scroll", scroll, opts);
      doc.addEventListener("copy", onCopy, opts);
      const unwatch = watchAttention(doc, frame, (event) => onAttentionRef.current?.(event));
      return () => {
        unwatch();
        doc.removeEventListener("pointermove", pointerMove, opts);
        doc.removeEventListener("pointerdown", onPointerDown, opts);
        doc.removeEventListener("keydown", onKeyDown, opts);
        doc.removeEventListener("focusin", focusIn, opts);
        doc.removeEventListener("focusout", onFocusOut, opts);
        doc.removeEventListener("scroll", scroll, opts);
        doc.removeEventListener("copy", onCopy, opts);
      };
    };

    const unlistenPage = listen(document, null);

    // ── Window iframes ──────────────────────────────────────────────
    // Each iframe gets re-wired on every load (its document is
    // replaced on navigation) and unwired when it leaves the DOM.
    const frames = new Map<HTMLIFrameElement, { onLoad: () => void; unlisten: (() => void) | null }>();

    const wireFrame = (frame: HTMLIFrameElement) => {
      const entry = frames.get(frame);
      if (!entry) return;
      entry.unlisten?.();
      entry.unlisten = null;
      try {
        const doc = frame.contentDocument;
        if (doc) entry.unlisten = listen(doc, frame);
      } catch {
        // Cross-origin frame — nothing to listen to.
      }
    };

    const syncFrames = () => {
      const present = new Set(document.querySelectorAll("iframe"));
      for (const [frame, entry] of frames) {
        if (present.has(frame)) continue;
        frame.removeEventListener("load", entry.onLoad);
        entry.unlisten?.();
        frames.delete(frame);
      }
      for (const frame of present) {
        if (frames.has(frame)) continue;
        const onLoad = () => wireFrame(frame);
        frames.set(frame, { onLoad, unlisten: null });
        frame.addEventListener("load", onLoad);
        wireFrame(frame);
      }
    };

    const frameObserver = new MutationObserver(syncFrames);
    frameObserver.observe(document.body, { childList: true, subtree: true });
    syncFrames();

    // ── Tab visibility ──────────────────────────────────────────────
    let hiddenAt: number | null = document.hidden ? performance.now() : null;

    const onVisibilityChange = () => {
      if (document.hidden) {
        hiddenAt = performance.now();
        sleepTimer = cancel(sleepTimer);
        leaveIdle();
        return;
      }
      const awayFor = hiddenAt === null ? 0 : performance.now() - hiddenAt;
      hiddenAt = null;
      // Coming back restarts the clocks without counting as "input",
      // so a sleeping mascot isn't woken just by the tab reappearing.
      lastActivity = performance.now();
      if (awayFor > AWAY_FOR_WELCOME) tryReact("delighted", 1200);
      armTimers();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    armTimers();

    apiRef.current = {
      react: tryReact,
      look: (target, ms) => {
        // A guide look is deliberate — it takes over from an idle
        // glance, but never from a keyboard user's focus.
        if (lookOwner === "focus") return;
        look("guide", target, ms);
      },
    };

    return () => {
      apiRef.current = null;
      for (const id of timers) window.clearTimeout(id);
      timers.clear();
      cancelAnimationFrame(proxyRaf);
      unlistenPage();
      frameObserver.disconnect();
      for (const [frame, entry] of frames) {
        frame.removeEventListener("load", entry.onLoad);
        entry.unlisten?.();
      }
      frames.clear();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [mascotRef, anchorRef]);

  return apiRef;
}
