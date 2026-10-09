"use client";

import type { AttentionAction } from "@/lib/mascotTargets";

/* Attention tracking — what the visitor is actually reading, hovering,
   clicking or copying, reported by the ids section pages put in
   data-mascot (lib/mascotTargets.ts). Attached per document by the
   brain (lib/useMascotBrain.ts): the page itself, and each window's
   same-origin iframe, whose coordinates are converted to the page's.

   Signals, each deliberately conservative so it means something:
   - read:  one tagged element dominates the visible area for READ_MS
            (scrolled to and left there), the strongest "reading" cue.
   - hover: the pointer rests inside a tagged element for HOVER_MS.
   - code / live / link: a click on a [data-mascot-link] inside one.
   - copy:  text copied from inside one.

   Single re-arming timeouts only; everything is torn down by the
   returned cleanup. */

export interface AttentionEvent {
  target: string;
  action: AttentionAction;
  // The element's box in page (top-level viewport) coordinates.
  rect: { x: number; y: number; width: number; height: number };
}

const READ_MS = 4500;
// Long enough to mean "looking at it", short enough that hovering a
// widget or Dock icon gets a response while the pointer is still there.
const HOVER_MS = 1000;
// A tag counts as "the thing on screen" once this much of it is
// visible — or, for tall cards, once it fills this much of the view.
const READ_MIN_ELEMENT = 0.6;
const READ_MIN_VIEWPORT = 0.45;

export function watchAttention(
  doc: Document,
  frame: HTMLIFrameElement | null,
  emit: (event: AttentionEvent) => void,
): () => void {
  const win = doc.defaultView;
  if (!win) return () => {};

  const pageRect = (el: Element) => {
    const box = el.getBoundingClientRect();
    const offset = frame?.getBoundingClientRect();
    return {
      x: box.left + (offset?.left ?? 0) + (frame?.clientLeft ?? 0),
      y: box.top + (offset?.top ?? 0) + (frame?.clientTop ?? 0),
      width: box.width,
      height: box.height,
    };
  };
  const tagged = (node: EventTarget | null) => {
    const el = node as Element | null;
    return el && typeof el.closest === "function" ? el.closest<HTMLElement>("[data-mascot]") : null;
  };
  const report = (el: HTMLElement, action: AttentionAction) => {
    const target = el.dataset.mascot;
    if (target) emit({ target, action, rect: pageRect(el) });
  };

  /* ── read ─────────────────────────────────────────────────────── */
  const visible = new Map<Element, number>(); // element → visible px height
  let reading: Element | null = null;
  let readTimer: ReturnType<typeof setTimeout> | null = null;

  const pickDominant = () => {
    const viewH = win.innerHeight || 1;
    let best: Element | null = null;
    let bestH = 0;
    for (const [el, h] of visible) {
      const fullH = el.getBoundingClientRect().height || 1;
      const qualifies = h / fullH >= READ_MIN_ELEMENT || h / viewH >= READ_MIN_VIEWPORT;
      if (qualifies && h > bestH) {
        best = el;
        bestH = h;
      }
    }
    if (best === reading) return;
    reading = best;
    if (readTimer) clearTimeout(readTimer);
    readTimer = null;
    if (best) {
      const el = best as HTMLElement;
      readTimer = setTimeout(() => {
        readTimer = null;
        if (reading === el && el.isConnected) report(el, "read");
      }, READ_MS);
    }
  };

  const IO = (win as unknown as { IntersectionObserver?: typeof IntersectionObserver }).IntersectionObserver;
  const io = IO
    ? new IO(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) visible.set(e.target, e.intersectionRect.height);
            else visible.delete(e.target);
          }
          pickDominant();
        },
        { threshold: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1] },
      )
    : null;

  const observed = new WeakSet<Element>();
  const observeAll = () => {
    if (!io) return;
    // data-mascot-hover-only: always-visible desktop chrome (widgets,
    // Dock icons) — "on screen" means nothing there, only hover does.
    for (const el of doc.querySelectorAll("[data-mascot]:not([data-mascot-hover-only])")) {
      if (!observed.has(el)) {
        observed.add(el);
        io.observe(el);
      }
    }
  };
  // Pages render (and re-render tabs) after load — pick up new tags,
  // coalesced to one scan per burst of DOM changes.
  let scanTimer: ReturnType<typeof setTimeout> | null = null;
  const mo = new MutationObserver(() => {
    if (scanTimer) return;
    scanTimer = setTimeout(() => {
      scanTimer = null;
      observeAll();
    }, 250);
  });
  if (doc.body) mo.observe(doc.body, { childList: true, subtree: true });
  observeAll();

  /* ── hover ────────────────────────────────────────────────────── */
  let hovered: HTMLElement | null = null;
  let hoverTimer: ReturnType<typeof setTimeout> | null = null;
  const onOver = (e: PointerEvent) => {
    if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
    const el = tagged(e.target);
    if (el === hovered) return;
    hovered = el;
    if (hoverTimer) clearTimeout(hoverTimer);
    hoverTimer = null;
    if (el) {
      hoverTimer = setTimeout(() => {
        hoverTimer = null;
        if (hovered === el && el.isConnected) report(el, "hover");
      }, HOVER_MS);
    }
  };

  /* ── clicks on tagged links ──────────────────────────────────── */
  const onClick = (e: MouseEvent) => {
    const t = e.target as Element | null;
    const link = t && typeof t.closest === "function" ? t.closest<HTMLElement>("[data-mascot-link]") : null;
    const el = tagged(link);
    if (!link || !el) return;
    const kind = link.dataset.mascotLink;
    report(el, kind === "code" || kind === "live" ? kind : "link");
  };

  /* ── copy ─────────────────────────────────────────────────────── */
  const onCopy = () => {
    const anchor = doc.getSelection()?.anchorNode ?? null;
    const el = tagged(anchor && anchor.nodeType === 3 ? anchor.parentElement : (anchor as Element | null));
    if (el) report(el, "copy");
  };

  const opts = { capture: true, passive: true } as const;
  doc.addEventListener("pointerover", onOver, opts);
  doc.addEventListener("click", onClick, opts);
  doc.addEventListener("copy", onCopy, opts);

  return () => {
    io?.disconnect();
    mo.disconnect();
    if (readTimer) clearTimeout(readTimer);
    if (hoverTimer) clearTimeout(hoverTimer);
    if (scanTimer) clearTimeout(scanTimer);
    doc.removeEventListener("pointerover", onOver, opts);
    doc.removeEventListener("click", onClick, opts);
    doc.removeEventListener("copy", onCopy, opts);
  };
}
