"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { motion, useMotionValue, useSpring, useTransform, animate, type MotionValue } from "framer-motion";
import { parseLRC } from "@/lib/parseLRC";
import { computeWordTimings, type TimedLine, type TimedWord } from "@/lib/lyricsWordTiming";

/* Synced lyrics panel reimplementing the Spicy Lyrics animation
   MECHANISM (studied from its source, reimplemented from scratch —
   the project is AGPL-3.0, so no code is copied; techniques and
   tuning constants are facts, not expression):

   1. Karaoke wipe — each word's highlight is a background-clip:text
      gradient whose position sweeps -20% → 100% with sin-out easing
      of the word's own time progress. Sung glyphs sit bright to the
      left of the wipe edge, unsung sit dim to the right, with a 20%
      feather between. No opacity crossfade — the wipe IS the reveal.
   2. Underdamped springs, not tweens — scale / lift / glow don't
      animate on fixed durations; they spring toward targets sampled
      from spline-ish curves of word progress (scale 0.95→1.175→1.0
      peaking at 70%, lift peaking at 90%, glow peaking mid-word).
      Their damping-ratio/frequency pairs are converted here to
      Framer stiffness/damping: k = (2πf)², c = 2ζ·2πf, mass 1.
   3. Interlude dots — a vocal gap over ~2s renders a 3-dot row in
      the line flow; each dot fills over its third of the gap, the
      group exits with a scale-up fade when singing resumes.
   4. One rAF loop drives a single currentTime motion value that
      every word/dot derives from via useTransform — the same
      "one loop, ref-read" pattern the Dock's magnification uses.

   Word start/end times come from lib/lyricsWordTiming.ts's
   delivery-rate model (plain LRC has line stamps only — see that
   file for why the sung window is estimated, not gap-filled). */

const PANEL_HEIGHT = 190;

/* Small sync lead: LRC stamps mark vocal onset and the wipe follows
   currentTime directly now, so only render latency needs absorbing —
   not animation ramp time like the previous opacity design. */
const SYNC_LEAD = 0.05;

/* Spicy's spring constants (dampingRatio ζ, frequency f in Hz)
   converted for Framer's useSpring: stiffness = (2πf)², damping =
   2ζ(2πf), mass 1. */
const SCALE_SPRING = { stiffness: 30.6, damping: 7.1, mass: 1 }; // ζ0.64 f0.88
const LIFT_SPRING = { stiffness: 83, damping: 7.3, mass: 1 }; // ζ0.40 f1.45
const GLOW_SPRING = { stiffness: 55, damping: 8.3, mass: 1 }; // ζ0.56 f1.18
const DOT_SPRING = { stiffness: 19.3, damping: 5.3, mass: 1 }; // ζ0.60 f0.70

const SUNG_COLOR = "rgba(255, 255, 255, 0.98)";
const UNSUNG_COLOR = "rgba(255, 255, 255, 0.34)";

const easeSinOut = (p: number) => Math.sin((p * Math.PI) / 2);

type DisplayItem =
  | { kind: "line"; time: number; line: TimedLine }
  | { kind: "dots"; time: number; start: number; end: number };

/* Vocal gaps ≥ this many seconds get an interlude dots row. Spicy
   triggers at 1.5s; slightly higher here so breath-length pauses in
   a ballad don't flicker dots in and out. */
const INTERLUDE_MIN_GAP = 2.0;

function buildDisplayItems(lines: TimedLine[]): DisplayItem[] {
  const items: DisplayItem[] = [];
  const first = lines[0];
  if (first && first.time > 3) {
    items.push({ kind: "dots", time: 0.2, start: 0.4, end: first.time - 0.3 });
  }
  lines.forEach((line, i) => {
    items.push({ kind: "line", time: line.time, line });
    const next = lines[i + 1];
    if (!next) return;
    const sungEnd = line.words.length ? line.words[line.words.length - 1].end : line.time;
    if (next.time - sungEnd >= INTERLUDE_MIN_GAP) {
      items.push({ kind: "dots", time: sungEnd + 0.3, start: sungEnd + 0.3, end: next.time - 0.25 });
    }
  });
  return items;
}

function Word({ word, currentTime }: { word: TimedWord; currentTime: MotionValue<number> }) {
  const progress = useTransform(currentTime, [word.start, word.end], [0, 1], { clamp: true });

  // Wipe edge: -20 (fully unsung, off the left edge) → 100 (fully
  // sung), sin-out eased so the sweep decelerates into the word end.
  const backgroundImage = useTransform(progress, (p) => {
    const pos = -20 + 120 * easeSinOut(p);
    return `linear-gradient(90deg, ${SUNG_COLOR} ${pos}%, ${UNSUNG_COLOR} ${pos + 20}%)`;
  });

  const scaleTarget = useTransform(progress, [0, 0.7, 1], [0.95, 1.175, 1]);
  const scale = useSpring(scaleTarget, SCALE_SPRING);

  // Peak lift is em-relative (≈ -1/56 em in the source material) so
  // it scales with the line's font size instead of a px constant.
  const liftTarget = useTransform(progress, [0, 0.9, 1], [0.01, -0.018, 0]);
  const liftSpring = useSpring(liftTarget, LIFT_SPRING);
  const y = useTransform(liftSpring, (v) => `${v}em`);

  const glowTarget = useTransform(progress, [0, 0.5, 1], [0, 1, 0]);
  const glowOpacity = useSpring(glowTarget, GLOW_SPRING);

  return (
    // The glow is a duplicate glyph layer with a FIXED text-shadow
    // whose only animated property is opacity — opacity composites on
    // the GPU, so the halo breathes at 60fps. The first version
    // animated a drop-shadow() filter string per frame, which forces
    // a repaint of the word every frame and was the visible jank.
    // (text-shadow on the transparent-color twin still renders — the
    // shadow isn't multiplied by the fill alpha.)
    <span style={{ position: "relative", display: "inline-block", marginRight: "0.3em" }}>
      <motion.span
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          color: "transparent",
          textShadow: "0 0 12px rgba(255, 255, 255, 0.55)",
          opacity: glowOpacity,
          scale,
          y,
          pointerEvents: "none",
          willChange: "opacity, transform",
        }}
      >
        {word.text}
      </motion.span>
      <motion.span
        style={{
          display: "inline-block",
          backgroundImage,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          scale,
          y,
          willChange: "transform",
          backfaceVisibility: "hidden",
        }}
      >
        {word.text}
      </motion.span>
    </span>
  );
}

function Dot({ start, end, currentTime }: { start: number; end: number; currentTime: MotionValue<number> }) {
  const progress = useTransform(currentTime, [start, end], [0, 1], { clamp: true });
  const opacityTarget = useTransform(progress, [0, 1], [0.3, 1]);
  const opacity = useSpring(opacityTarget, DOT_SPRING);
  const scaleTarget = useTransform(progress, [0, 0.7, 1], [0.75, 1.05, 1]);
  const scale = useSpring(scaleTarget, DOT_SPRING);

  return (
    <motion.span
      style={{
        width: "7px",
        height: "7px",
        borderRadius: "50%",
        background: "rgba(255, 255, 255, 0.95)",
        display: "block",
        opacity,
        scale,
      }}
    />
  );
}

function DotsRow({
  item,
  isActive,
  isPast,
  currentTime,
}: {
  item: Extract<DisplayItem, { kind: "dots" }>;
  isActive: boolean;
  isPast: boolean;
  currentTime: MotionValue<number>;
}) {
  const third = Math.max(0.1, (item.end - item.start) / 3);
  return (
    <motion.div
      // Exit-on-resume: past dots scale UP slightly while fading —
      // the group "releases" rather than shrinking away.
      animate={isActive ? { opacity: 1, scale: 1 } : isPast ? { opacity: 0, scale: 1.15 } : { opacity: 0, scale: 0.8 }}
      transition={{ duration: isPast ? 0.28 : 0.35, ease: "easeOut" }}
      style={{
        display: "flex",
        gap: "9px",
        justifyContent: "center",
        alignItems: "center",
        padding: isActive || !isPast ? "12px 0" : "2px 0",
      }}
    >
      {[0, 1, 2].map((i) => (
        <Dot key={i} start={item.start + i * third} end={item.start + (i + 1) * third} currentTime={currentTime} />
      ))}
    </motion.div>
  );
}

function LineRow({
  line,
  isActive,
  isPast,
  currentTime,
}: {
  line: TimedLine;
  isActive: boolean;
  isPast: boolean;
  currentTime: MotionValue<number>;
}) {
  return (
    // Fixed font-size + transform scale, never a font-size
    // transition: animating font-size relayouts the ENTIRE list every
    // frame for the whole transition (and fights the scroll spring,
    // which is re-measuring row offsets) — that was the biggest
    // source of the "not buttery" feel. Scale is compositor-only.
    <motion.div
      animate={{
        scale: isActive ? 1 : 0.8,
        opacity: isActive ? 1 : isPast ? 0.28 : 0.4,
        filter: isActive ? "blur(0px)" : "blur(2.5px)",
      }}
      transition={{
        scale: { type: "spring", stiffness: 320, damping: 30 },
        opacity: { duration: 0.3, ease: "easeOut" },
        filter: { duration: 0.3, ease: "easeOut" },
      }}
      style={{
        textAlign: "center",
        padding: "5px 10px",
        fontSize: "16px",
        fontWeight: 700,
        lineHeight: 1.4,
        color: isActive ? "var(--text-primary)" : "var(--text-muted)",
        transformOrigin: "center",
        willChange: "transform",
      }}
    >
      {isActive ? line.words.map((w, i) => <Word key={i} word={w} currentTime={currentTime} />) : line.text}
    </motion.div>
  );
}

export default function LyricsPanel({
  audioRef,
  playing,
  lyricsSrc,
}: {
  audioRef: RefObject<HTMLAudioElement | null>;
  playing: boolean;
  lyricsSrc: string | null;
}) {
  const [lines, setLines] = useState<TimedLine[] | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const currentTime = useMotionValue(0);
  const scrollY = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rafRef = useRef<number | undefined>(undefined);

  const items = useMemo(() => (lines ? buildDisplayItems(lines) : null), [lines]);

  useEffect(() => {
    if (!lyricsSrc) {
      setLines(null);
      return;
    }
    let cancelled = false;
    fetch(lyricsSrc)
      .then((r) => r.text())
      .then((raw) => {
        if (cancelled) return;
        setLines(computeWordTimings(parseLRC(raw)));
      })
      .catch(() => {
        // Missing/unreachable lyrics file — panel just stays absent
        // (see the `if (!items) return null` below), not a broken UI.
      });
    return () => {
      cancelled = true;
    };
  }, [lyricsSrc]);

  useEffect(() => {
    if (!playing || !items) return;
    let alive = true;
    const tick = () => {
      if (!alive) return;
      const audio = audioRef.current;
      if (audio) {
        const led = audio.currentTime + SYNC_LEAD;
        currentTime.set(led);
        let idx = -1;
        for (let i = 0; i < items.length; i++) {
          if (items[i].time <= led) idx = i;
          else break;
        }
        setActiveIndex((prev) => (prev !== idx ? idx : prev));
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      alive = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, items, audioRef, currentTime]);

  // Keeps the list centered on "where we are in the timeline" even
  // before the first item's timestamp arrives — activeIndex is -1 at
  // that point (nothing has been sung yet), but the scroll position
  // still needs a real row to center on, or the list sits at its
  // untouched default position with a blank gap above row 0 instead
  // of row 0 already being framed and ready. isActive/isPast below
  // still key off the real activeIndex, so row 0 doesn't render as
  // "currently singing" until its actual timestamp — only the scroll
  // position defaults early.
  useEffect(() => {
    const centerIndex = activeIndex >= 0 ? activeIndex : 0;
    const target = itemRefs.current[centerIndex];
    if (!target || !containerRef.current) return;
    // scrollY shifts the whole (position: absolute, top: 0) list, so
    // centering a row means: bring its own vertical center to the
    // container's vertical center. No other static offset is applied
    // anywhere else — a previous version also gave the list itself a
    // `top: PANEL_HEIGHT / 2` CSS offset on top of this same
    // calculation, double-applying the centering and pushing every
    // row roughly half the panel's height further down than intended.
    const rowCenter = target.offsetTop + target.offsetHeight / 2;
    const containerCenter = containerRef.current.clientHeight / 2;
    const controls = animate(scrollY, containerCenter - rowCenter, {
      type: "spring",
      stiffness: 280,
      damping: 34,
      mass: 0.8,
    });
    return () => controls.stop();
  }, [activeIndex, scrollY, items]);

  // No lyricsSrc, fetch failed, or still loading — omit the panel
  // entirely rather than reserving empty space for it.
  if (!items) return null;

  return (
    <div
      ref={containerRef}
      style={{
        marginTop: "12px",
        height: `${PANEL_HEIGHT}px`,
        overflow: "hidden",
        position: "relative",
        WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 24%, black 76%, transparent 100%)",
        maskImage: "linear-gradient(to bottom, transparent 0%, black 24%, black 76%, transparent 100%)",
      }}
    >
      <motion.div style={{ y: scrollY, position: "absolute", top: 0, left: 0, right: 0 }}>
        {items.map((item, i) => (
          <div key={i} ref={(el) => { itemRefs.current[i] = el; }}>
            {item.kind === "line" ? (
              <LineRow line={item.line} isActive={i === activeIndex} isPast={i < activeIndex} currentTime={currentTime} />
            ) : (
              <DotsRow item={item} isActive={i === activeIndex} isPast={i < activeIndex} currentTime={currentTime} />
            )}
          </div>
        ))}
      </motion.div>
    </div>
  );
}
