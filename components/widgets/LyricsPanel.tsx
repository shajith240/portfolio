"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { motion, useMotionValue, useTransform, animate, type MotionValue } from "framer-motion";
import { NOW_PLAYING } from "@/data/nowPlaying";
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

const PANEL_HEIGHT = 168;

function Word({ word, currentTime }: { word: TimedWord; currentTime: MotionValue<number> }) {
  const opacity = useTransform(currentTime, [word.start, word.end], [0.35, 1], { clamp: true });
  const blurPx = useTransform(currentTime, [word.start, word.end], [3, 0], { clamp: true });
  const filter = useTransform(blurPx, (b) => `blur(${b}px)`);

  return (
    <motion.span style={{ opacity, filter, display: "inline-block", marginRight: "0.28em" }}>
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
        padding: "5px 8px",
        fontSize: isActive ? "13px" : "12px",
        fontWeight: isActive ? 700 : 500,
        lineHeight: 1.4,
        color: isActive ? "var(--text-primary)" : "var(--text-muted)",
        opacity: isActive ? 1 : isPast ? 0.32 : 0.42,
        filter: isActive ? "none" : "blur(1.5px)",
        transform: isActive ? "scale(1)" : "scale(0.93)",
        transition: "font-size 0.3s ease, color 0.3s ease, opacity 0.3s ease, filter 0.3s ease, transform 0.3s ease",
      }}
    >
      {isActive ? line.words.map((w, i) => <Word key={i} word={w} currentTime={currentTime} />) : line.text}
    </div>
  );
}

export default function LyricsPanel({
  audioRef,
  playing,
}: {
  audioRef: RefObject<HTMLAudioElement | null>;
  playing: boolean;
}) {
  const [lines, setLines] = useState<TimedLine[] | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const currentTime = useMotionValue(0);
  const scrollY = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!NOW_PLAYING.lyricsSrc) return;
    let cancelled = false;
    fetch(NOW_PLAYING.lyricsSrc)
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
  }, []);

  useEffect(() => {
    if (!playing || !lines) return;
    let alive = true;
    const tick = () => {
      if (!alive) return;
      const audio = audioRef.current;
      if (audio) {
        currentTime.set(audio.currentTime);
        let idx = -1;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].time <= audio.currentTime) idx = i;
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

  useEffect(() => {
    const active = lineRefs.current[activeIndex];
    if (activeIndex < 0 || !active || !containerRef.current) return;
    const target = active.offsetTop + active.offsetHeight / 2 - containerRef.current.clientHeight / 2;
    const controls = animate(scrollY, -target, { type: "spring", stiffness: 300, damping: 40, mass: 0.9 });
    return () => controls.stop();
  }, [activeIndex, scrollY]);

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
        WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 22%, black 78%, transparent 100%)",
        maskImage: "linear-gradient(to bottom, transparent 0%, black 22%, black 78%, transparent 100%)",
      }}
    >
      <motion.div style={{ y: scrollY, position: "absolute", top: `${PANEL_HEIGHT / 2}px`, left: 0, right: 0 }}>
        {lines.map((line, i) => (
          <div key={i} ref={(el) => { lineRefs.current[i] = el; }}>
            <LineRow line={line} isActive={i === activeIndex} isPast={i < activeIndex} currentTime={currentTime} />
          </div>
        ))}
      </motion.div>
    </div>
  );
}
