"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { NOW_PLAYING } from "@/data/nowPlaying";

/* macOS "Now Playing" widget — real <audio> playback (no Spotify
   OAuth/infra), collapsed by default, hover-expands to a scrubber +
   prev/next glyphs via Framer's `layout` prop. Spring/card styling
   match docs/design-system/motion.md's `entrance` preset and the
   existing PhotoWidget/AboutWidget Liquid Glass card exactly — see
   docs/superpowers/specs/2026-07-01-desktop-widgets-design.md. */

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
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M3.5 2.5L13 8L3.5 13.5V2.5Z" fill="var(--text-primary)" />
    </svg>
  );
}

function PauseGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <rect x="3.5" y="2.5" width="3" height="11" rx="1" fill="var(--text-primary)" />
      <rect x="9.5" y="2.5" width="3" height="11" rx="1" fill="var(--text-primary)" />
    </svg>
  );
}

function SkipGlyph({ direction }: { direction: "prev" | "next" }) {
  const flip = direction === "prev" ? "scale(-1, 1)" : undefined;
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ transform: flip }}>
      <path d="M3 2.5L10 8L3 13.5V2.5Z" fill="var(--text-muted)" />
      <rect x="11" y="2.5" width="2" height="11" fill="var(--text-muted)" />
    </svg>
  );
}

export default function NowPlayingWidget() {
  const [hovered, setHovered] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  return (
    <motion.div
      layout
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={ENTRANCE_SPRING}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: `${WIDGET_WIDTH}px`,
        padding: "14px",
        borderRadius: "20px",
        background: "var(--glass-regular-bg)",
        border: "1px solid var(--glass-border)",
        backdropFilter: "blur(var(--glass-blur-regular)) saturate(var(--glass-saturate))",
        WebkitBackdropFilter: "blur(var(--glass-blur-regular)) saturate(var(--glass-saturate))",
        boxShadow: "0 16px 40px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
        overflow: "hidden",
      }}
    >
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

      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div
          style={{
            width: "52px",
            height: "52px",
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

        <button
          onClick={togglePlay}
          aria-label={playing ? "Pause" : "Play"}
          style={{
            width: "28px",
            height: "28px",
            flexShrink: 0,
            borderRadius: "50%",
            border: "none",
            background: "rgba(255, 255, 255, 0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          {playing ? <PauseGlyph /> : <PlayGlyph />}
        </button>
      </div>

      {hovered && (
        <div style={{ marginTop: "12px" }}>
          <div
            style={{
              height: "3px",
              borderRadius: "2px",
              background: "rgba(255, 255, 255, 0.14)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progress}%`,
                background: "#FF4500",
                borderRadius: "2px",
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "18px", marginTop: "10px" }}>
            <span style={{ opacity: 0.35, pointerEvents: "none", display: "flex" }}>
              <SkipGlyph direction="prev" />
            </span>
            <span style={{ opacity: 0.35, pointerEvents: "none", display: "flex" }}>
              <SkipGlyph direction="next" />
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
