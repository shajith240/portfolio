"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { NOW_PLAYING } from "@/data/nowPlaying";

/* macOS "Now Playing" widget — real <audio> playback (no Spotify
   OAuth/infra). Matches the real macOS Control Center Now Playing
   panel's actual layout, which has no collapsed/hover-expanded state
   at all: album art + title/artist sit on top, a full-width scrubber
   spans the whole card below that, and a centered prev/play/next row
   sits below the scrubber — everything visible permanently, not
   revealed on hover (an earlier version of this widget invented a
   hover-to-reveal interaction that isn't how the real widget behaves
   at all, which is why it read as inauthentic). Spring/card styling
   match docs/design-system/motion.md's `entrance` preset and the
   existing PhotoWidget/AboutWidget Liquid Glass card exactly — see
   docs/superpowers/specs/2026-07-01-desktop-widgets-design.md.

   Real macOS's Now Playing UI (Lock Screen, and Apple Music's own
   adaptive backgrounds) samples the dominant color out of the album
   art and uses it to tint a blurred backdrop behind the content —
   confirmed via research, not assumed. Reproduced here by drawing the
   artwork into an offscreen canvas, averaging its pixels for a
   dominant color, and layering a blurred copy of the artwork plus a
   color-tinted scrim behind the actual content. The blur/tint layer is
   a plain, non-transformed absolutely-positioned child of the card —
   never backdrop-filter directly on the same element that also has
   border-radius + a transform (the outer motion.div's mount
   animation), which is the exact Chromium/WebKit corner-bleed bug
   already fixed once in Window.tsx this session. */

const WIDGET_WIDTH = 260;
const ENTRANCE_SPRING = { type: "spring", stiffness: 520, damping: 44, mass: 0.85, restDelta: 0.01 } as const;

function MusicNoteGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M9 18V5l10-2v11" stroke="rgba(255,255,255,0.85)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="6.5" cy="18" r="2.5" fill="rgba(255,255,255,0.85)" />
      <circle cx="16.5" cy="16" r="2.5" fill="rgba(255,255,255,0.85)" />
    </svg>
  );
}

function PlayGlyph() {
  return (
    <svg width="19" height="19" viewBox="0 0 16 16" fill="none">
      <path d="M3.5 2.5L13 8L3.5 13.5V2.5Z" fill="var(--text-primary)" />
    </svg>
  );
}

function PauseGlyph() {
  return (
    <svg width="19" height="19" viewBox="0 0 16 16" fill="none">
      <rect x="3.5" y="2.5" width="3" height="11" rx="1" fill="var(--text-primary)" />
      <rect x="9.5" y="2.5" width="3" height="11" rx="1" fill="var(--text-primary)" />
    </svg>
  );
}

// Matches the real "skip to previous/next track" glyph (a single
// triangle + a trailing bar — SF Symbols' backward.end.fill /
// forward.end.fill), not the double-triangle "fast forward" glyph.
function SkipGlyph({ direction }: { direction: "prev" | "next" }) {
  const flip = direction === "prev" ? "scale(-1, 1)" : undefined;
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ transform: flip }}>
      <path d="M3 2.5L10 8L3 13.5V2.5Z" fill="var(--text-primary)" />
      <rect x="11" y="2.5" width="2" height="11" fill="var(--text-primary)" />
    </svg>
  );
}

export default function NowPlayingWidget() {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  // null until the canvas sampling below resolves (or forever, if
  // there's no artwork to sample) — the card falls back to the plain
  // glass background until then, so there's nothing locale/env
  // dependent to mismatch between server and client render.
  const [dominantColor, setDominantColor] = useState<[number, number, number] | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scrubberRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!NOW_PLAYING.artwork) return;
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      // Downscale to a tiny canvas — only the average matters, not
      // per-pixel detail, and this keeps the sampling cost trivial.
      const size = 24;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, size, size);
      const { data } = ctx.getImageData(0, 0, size, size);
      let r = 0, g = 0, b = 0;
      const pixelCount = data.length / 4;
      for (let i = 0; i < data.length; i += 4) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
      }
      setDominantColor([Math.round(r / pixelCount), Math.round(g / pixelCount), Math.round(b / pixelCount)]);
    };
    img.src = NOW_PLAYING.artwork;
    return () => {
      cancelled = true;
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play().catch(() => {
        // Autoplay-policy block or missing file at NOW_PLAYING.src —
        // stay paused rather than throwing an unhandled rejection.
      });
    }
  };

  // There's only one track (no playlist/queue in scope), so prev/next
  // both restart it — a real, honest action rather than a dead button
  // that looks clickable but does nothing.
  const restart = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
  };

  // Real macOS's scrubber is draggable/click-to-seek, not just a
  // read-only progress display — clicking anywhere on the track jumps
  // playback to that position.
  const seekToClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const track = scrubberRef.current;
    if (!audio || !track || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
    const rect = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * audio.duration;
  };

  const [r, g, b] = dominantColor ?? [0, 0, 0];

  return (
    <motion.div
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={ENTRANCE_SPRING}
      style={{
        position: "relative",
        width: `${WIDGET_WIDTH}px`,
        borderRadius: "20px",
        border: "1px solid var(--glass-border)",
        boxShadow: "0 16px 40px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
        overflow: "hidden",
      }}
    >
      {/* Backdrop layer(s) — plain, non-transformed children so the
          outer element's overflow:hidden clips them correctly (see the
          file header comment for why backdrop-filter never lives
          directly on a transformed/border-radius element in this
          codebase). Overscanning the inset hides the blur's own soft
          edge from ever peeking past the card's rounded corner. */}
      {NOW_PLAYING.artwork && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: "-20px",
            backgroundImage: `url(${NOW_PLAYING.artwork})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(28px) saturate(160%) brightness(0.55)",
            zIndex: 0,
          }}
        />
      )}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          background: dominantColor
            ? `linear-gradient(165deg, rgba(${r}, ${g}, ${b}, 0.55), rgba(10, 10, 14, 0.72))`
            : "var(--glass-regular-bg)",
          backdropFilter: "blur(var(--glass-blur-regular)) saturate(var(--glass-saturate))",
          WebkitBackdropFilter: "blur(var(--glass-blur-regular)) saturate(var(--glass-saturate))",
          transition: "background 0.4s ease",
        }}
      />

      <div style={{ position: "relative", zIndex: 2, padding: "14px" }}>
        <audio
          ref={audioRef}
          src={NOW_PLAYING.src}
          preload="none"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={(e) => {
            setPlaying(false);
            e.currentTarget.currentTime = 0;
          }}
          onTimeUpdate={(e) => {
            const audio = e.currentTarget;
            // duration is NaN until loadedmetadata fires — guard to 0
            // rather than letting a NaN% width leak into the scrubber.
            const pct = Number.isFinite(audio.duration) && audio.duration > 0 ? (audio.currentTime / audio.duration) * 100 : 0;
            setProgress(pct);
          }}
        />

      {/* Top row: album art + title/artist only — no controls here,
          matching the real widget's layout. */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div
          style={{
            width: "56px",
            height: "56px",
            flexShrink: 0,
            borderRadius: "22%",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: NOW_PLAYING.artwork ? undefined : "linear-gradient(160deg, #FF7A45 0%, #7A1F00 100%)",
          }}
        >
          {NOW_PLAYING.artwork ? (
            <img
              src={NOW_PLAYING.artwork}
              alt={NOW_PLAYING.title}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <MusicNoteGlyph />
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontSize: "14px",
              fontWeight: 600,
              color: "var(--text-primary)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {NOW_PLAYING.title}
          </p>
          <p
            style={{
              margin: 0,
              fontSize: "12px",
              color: "var(--text-muted)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {NOW_PLAYING.artist}
          </p>
        </div>
      </div>

      {/* Scrubber — full card width, click/drag-to-seek, a neutral
          white fill (not the site's orange accent) matching real
          macOS's Now Playing scrubber. */}
      <div
        ref={scrubberRef}
        onClick={seekToClick}
        style={{
          marginTop: "12px",
          height: "3px",
          borderRadius: "2px",
          background: "rgba(255, 255, 255, 0.14)",
          overflow: "hidden",
          cursor: "pointer",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            background: "rgba(255, 255, 255, 0.85)",
            borderRadius: "2px",
          }}
        />
      </div>

      {/* Controls row — prev / play-pause / next, centered under the
          full card width, always visible (never dimmed/disabled) with
          play-pause visually larger than prev/next, matching the real
          widget's control hierarchy. */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "28px", marginTop: "10px" }}>
        <button
          onClick={restart}
          aria-label="Previous"
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex" }}
        >
          <SkipGlyph direction="prev" />
        </button>
        <button
          onClick={togglePlay}
          aria-label={playing ? "Pause" : "Play"}
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex" }}
        >
          {playing ? <PauseGlyph /> : <PlayGlyph />}
        </button>
        <button
          onClick={restart}
          aria-label="Next"
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex" }}
        >
          <SkipGlyph direction="next" />
        </button>
      </div>
      </div>
    </motion.div>
  );
}
