"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { motion, useMotionValue, useTransform, animate, type MotionValue } from "framer-motion";
import { parseLRC } from "@/lib/parseLRC";
import { computeWordTimings, type TimedLine, type TimedWord } from "@/lib/lyricsWordTiming";

/* Synced lyrics panel, styled after the Spicy Lyrics Spicetify
   extension's animated reveal: a masked, auto-scrolling line list
   where the active line sits sharp and full-size while neighboring
   lines sit dimmed/blurred/scaled down, and — within the active line
   only — each word sweeps from blurred+dim to sharp+bright as its own
   timing window arrives.

   Real caveat, not glossed over: plain LRC only carries one timestamp
   per LINE (confirmed by inspecting this file's timestamp syntax, not
   its lyric content — 60 line-level tags, no per-word tags). Spicy
   Lyrics gets true per-syllable smoothness from TTML data (the same
   format Apple Music uses), which isn't available here. The
   word-by-word sweep is computed by lib/lyricsWordTiming.ts, splitting
   each line's own time budget across its words proportional to word
   length — an honest approximation, not a claim of syllable-accurate
   timing.

   The rAF loop below is the single shared driver for one currentTime
   motion value (never a per-item poll) — the same "one loop, ref-read"
   pattern this codebase already established for the Dock's
   magnification physics, applied here instead of Framer's `layout`
   prop (already ruled out once this session — see NowPlayingWidget.tsx
   and CurrentlyBuildingWidget.tsx's own notes on why). */

const PANEL_HEIGHT = 190;

/* Highlight leads the audio slightly: LRC stamps mark vocal onset,
   but the visual ramp itself takes time, so without a lead the word
   only LOOKS lit after the singer has moved on. Apple Music's
   karaoke highlight runs marginally ahead for the same reason. */
const SYNC_LEAD = 0.15;

function Word({ word, currentTime }: { word: TimedWord; currentTime: MotionValue<number> }) {
  // A word must be fully bright near its ONSET, not its end — the
  // ramp starts a hair early and completes within 0.25s (or the
  // word's own duration if shorter). Previously the ramp spanned
  // [start, end], so every word finished lighting up only after it
  // had already been sung.
  const rampStart = word.start - 0.08;
  const rampEnd = Math.min(word.end, word.start + 0.25);
  const opacity = useTransform(currentTime, [rampStart, rampEnd], [0.3, 1], { clamp: true });
  const blurPx = useTransform(currentTime, [rampStart, rampEnd], [6, 0], { clamp: true });
  const filter = useTransform(blurPx, (b) => `blur(${b}px)`);

  return (
    <motion.span style={{ opacity, filter, display: "inline-block", marginRight: "0.3em" }}>
      {word.text}
    </motion.span>
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
    <div
      style={{
        textAlign: "center",
        padding: "6px 10px",
        fontSize: isActive ? "16px" : "12.5px",
        fontWeight: isActive ? 700 : 500,
        lineHeight: 1.4,
        color: isActive ? "var(--text-primary)" : "var(--text-muted)",
        textShadow: isActive ? "0 0 18px rgba(255, 255, 255, 0.25)" : "none",
        opacity: isActive ? 1 : isPast ? 0.28 : 0.4,
        filter: isActive ? "none" : "blur(2.5px)",
        transform: isActive ? "scale(1)" : "scale(0.88)",
        transition: "font-size 0.35s ease, color 0.35s ease, opacity 0.35s ease, filter 0.35s ease, transform 0.35s ease, text-shadow 0.35s ease",
      }}
    >
      {isActive ? line.words.map((w, i) => <Word key={i} word={w} currentTime={currentTime} />) : line.text}
    </div>
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
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rafRef = useRef<number | undefined>(undefined);

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
        // (see the `if (!lines) return null` below), not a broken UI.
      });
    return () => {
      cancelled = true;
    };
  }, [lyricsSrc]);

  useEffect(() => {
    if (!playing || !lines) return;
    let alive = true;
    const tick = () => {
      if (!alive) return;
      const audio = audioRef.current;
      if (audio) {
        const led = audio.currentTime + SYNC_LEAD;
        currentTime.set(led);
        let idx = -1;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].time <= led) idx = i;
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
  }, [playing, lines, audioRef, currentTime]);

  // Keeps the list centered on "where we are in the timeline" even
  // before the first line's timestamp arrives — activeIndex is -1 at
  // that point (nothing has been sung yet), but the scroll position
  // still needs a real line to center on, or the list sits at its
  // untouched default position with a blank gap above line 0 instead
  // of line 0 already being framed and ready. isActive/isPast below
  // still key off the real activeIndex, so line 0 doesn't render as
  // "currently singing" until its actual timestamp — only the scroll
  // position defaults early.
  useEffect(() => {
    const centerIndex = activeIndex >= 0 ? activeIndex : 0;
    const target = lineRefs.current[centerIndex];
    if (!target || !containerRef.current) return;
    // scrollY shifts the whole (position: absolute, top: 0) list, so
    // centering a line means: bring its own vertical center to the
    // container's vertical center. No other static offset is applied
    // anywhere else — a previous version also gave the list itself a
    // `top: PANEL_HEIGHT / 2` CSS offset on top of this same
    // calculation, double-applying the centering and pushing every
    // line roughly half the panel's height further down than
    // intended (the active line ended up sitting past the bottom
    // mask edge instead of centered, and — since it was clipped out
    // of the visible area entirely — only ever the dim, inactive
    // lines were actually visible on screen).
    const lineCenter = target.offsetTop + target.offsetHeight / 2;
    const containerCenter = containerRef.current.clientHeight / 2;
    const controls = animate(scrollY, containerCenter - lineCenter, {
      type: "spring",
      stiffness: 300,
      damping: 40,
      mass: 0.9,
    });
    return () => controls.stop();
  }, [activeIndex, scrollY, lines]);

  // No lyricsSrc, fetch failed, or still loading — omit the panel
  // entirely rather than reserving empty space for it.
  if (!lines) return null;

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
        {lines.map((line, i) => (
          <div key={i} ref={(el) => { lineRefs.current[i] = el; }}>
            <LineRow line={line} isActive={i === activeIndex} isPast={i < activeIndex} currentTime={currentTime} />
          </div>
        ))}
      </motion.div>
    </div>
  );
}
