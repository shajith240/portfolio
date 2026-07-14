"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { PLAYLIST, NOW_PLAYING } from "@/data/nowPlaying";
import LyricsPanel from "@/components/widgets/LyricsPanel";
import { WIDGET_UNIT, WIDGET_PADDING, WIDGET_RADIUS } from "@/lib/widgetGrid";
import { getSizeDimensions } from "@/lib/widgetSizeTiers";
import { useLiquidGlass } from "@/lib/liquidGlass";
import type { WidgetSize } from "@/lib/widgetLayoutSchema";

/* macOS "Now Playing" widget — real <audio> playback (no Spotify OAuth/infra).
   Matches the real macOS Notification Center Now Playing widget anatomy:
   - Small (170×170): full-bleed artwork + bottom-right play/pause button
   - Medium (354×170): left artwork (120×120, rounded), right text+controls (prev/play/next)
   - Large (354×354): header (medium layout) + LyricsPanel filling remaining height

   KEY DISTINCTION: Apple's Notification Center Now Playing widget has NO scrubber
   and NO volume slider (those only exist in Control Center). The previous version
   had both, which made it "vibecoded" rather than authentic.

   BACKGROUND: artwork-tinted (blurred, saturated, darkened) as layer 1 behind
   text; falls back to glass when artwork is null. This matches Sequoia's tinted
   widget treatment.

   Spring/card styling matches docs/design-system/motion.md's `entrance` preset
   and the existing PhotoWidget/AboutWidget Liquid Glass card. */

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

export default function NowPlayingWidget({ size }: { size: WidgetSize }) {
  const [trackIndex, setTrackIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const current = PLAYLIST[trackIndex] ?? NOW_PLAYING;

  const togglePlay = () => {
    if (current.src === "") return;
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play().catch(() => {
        // Autoplay-policy block or missing file at current.src —
        // stay paused rather than throwing an unhandled rejection.
      });
    }
  };


  const restart = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
  };

  const nextTrack = () => {
    if (current.src === "") return;
    if (PLAYLIST.length <= 1) {
      restart();
      return;
    }
    setTrackIndex((i) => (i + 1) % PLAYLIST.length);
  };

  const prevTrack = () => {
    if (current.src === "") return;
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.currentTime > 3 || PLAYLIST.length <= 1) {
      restart();
      return;
    }
    setTrackIndex((i) => (i - 1 + PLAYLIST.length) % PLAYLIST.length);
  };

  // `playing` is mirrored into a ref so the track-switch effect can
  // read it WITHOUT depending on it — the original effect listed
  // `playing` in its deps, so every pause/play re-ran it, and since
  // it re-assigns audio.src and zeroes currentTime, pausing
  // restarted the song from the top.
  const playingRef = useRef(false);
  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  // When a track ENDS, the browser fires `pause` BEFORE `ended` — so
  // by the time onEnded advances trackIndex, playingRef is already
  // false and looks identical to a manual pause. This ref is the
  // explicit "that pause was the song finishing, keep playing"
  // signal set by onEnded (this is what broke auto-advance after the
  // pause-restart fix).
  const autoAdvanceRef = useRef(false);

  // Runs ONLY on a real track change. The mount guard matters too:
  // the <audio> element's src attribute is already correct on mount,
  // and re-assigning .src (even to the same URL) resets playback.
  const prevTrackRef = useRef(trackIndex);
  useEffect(() => {
    if (prevTrackRef.current === trackIndex) return;
    prevTrackRef.current = trackIndex;
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = current.src;
    audio.currentTime = 0;
    if ((playingRef.current || autoAdvanceRef.current) && current.src !== "") {
      autoAdvanceRef.current = false;
      audio.play().catch(() => {
        // Autoplay or file error — silent catch.
      });
    }
  }, [trackIndex, current.src]);

  // Liquid Glass refs — declared unconditionally before the
  // size==="small" early return (rules of hooks). Small tier: a
  // circular glass play/pause button over full-bleed sharp artwork.
  // Medium/large: a thin refracting shell OVER the blurred-artwork
  // wash (low tint/blur — the artwork wash already does the heavy
  // blur; this only adds the bending rim + specular read), or the
  // full material when there's no artwork to show at all.
  const smallButtonRef = useLiquidGlass<HTMLButtonElement>({ radius: 16, bezel: 8, strength: 0.6, blur: 5, brightness: 0.9, tint: 0.2 });
  const artworkShellRef = useLiquidGlass<HTMLDivElement>({ radius: WIDGET_RADIUS, bezel: 16, strength: 0.45, blur: 3, brightness: 0.92, tint: 0.05 });
  const noArtworkShellRef = useLiquidGlass<HTMLDivElement>({ radius: WIDGET_RADIUS, bezel: 16, strength: 0.6, blur: 5, brightness: 0.88, tint: 0.16 });

  if (size === "small") {
    return (
      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={ENTRANCE_SPRING}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          borderRadius: `${WIDGET_RADIUS}px`,
          overflow: "hidden",
          boxSizing: "border-box",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.28)",
        }}
      >
        <audio
          ref={audioRef}
          src={current.src}
          preload="none"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            if (PLAYLIST.length > 1) {
              // The ended-pause already flipped playingRef false —
              // mark this as an auto-advance so the track-switch
              // effect keeps playing.
              autoAdvanceRef.current = true;
              setTrackIndex((i) => (i + 1) % PLAYLIST.length);
            } else {
              setPlaying(false);
            }
          }}
        />
        {current.artwork ? (
          <Image
            src={current.artwork}
            alt={current.title}
            width={340}
            height={340}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(160deg, #48484a 0%, #1c1c1e 100%)",
            }}
          >
            <MusicNoteGlyph />
          </div>
        )}
        {/* Single tap target, matching real Apple Music's own Small
            widget — no scrubber, no lyrics, no volume at this tier. */}
        <button
          ref={smallButtonRef}
          className="liquid-glass"
          onClick={togglePlay}
          aria-label={playing ? "Pause" : "Play"}
          style={{
            position: "absolute",
            right: "8px",
            bottom: "8px",
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            border: "none",
            cursor: current.src === "" ? "default" : "pointer",
            opacity: current.src === "" ? 0.4 : 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {playing ? <PauseGlyph /> : <PlayGlyph />}
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={ENTRANCE_SPRING}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        borderRadius: `${WIDGET_RADIUS}px`,
        overflow: "hidden",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Artwork-tinted background (layer 1): blurred, saturated,
          darkened artwork fills the card. Fallback to glass when no artwork. */}
      {current.artwork ? (
        <>
          {/* Blurred 50px anyway — a tiny source variant is visually
              identical to the full-res cover, at a fraction of the
              bytes. */}
          <Image
            src={current.artwork}
            alt=""
            aria-hidden
            width={96}
            height={96}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center",
              filter: "blur(50px) saturate(160%) brightness(0.5)",
              zIndex: 0,
            }}
          />
          {/* Wash for text contrast */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              background: "rgba(0, 0, 0, 0.25)",
              zIndex: 1,
            }}
          />
          {/* Liquid Glass shell — real refraction ON TOP of the
              artwork wash. Deliberately light touch (blur 3, tint
              0.05): the wash beneath already carries the heavy blur;
              this layer's job is just the bending rim + specular
              read that makes the whole card feel like glass over
              the album art, not a flat photo. */}
          <div ref={artworkShellRef} className="liquid-glass" style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none" }} />
        </>
      ) : (
        <div
          ref={noArtworkShellRef}
          className="liquid-glass"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            zIndex: 0,
          }}
        />
      )}

      <audio
        ref={audioRef}
        src={current.src}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          if (PLAYLIST.length > 1) {
            // Same auto-advance signal as the small tier's element.
            autoAdvanceRef.current = true;
            setTrackIndex((i) => (i + 1) % PLAYLIST.length);
          } else {
            setPlaying(false);
          }
        }}
      />

      {/* Header block: artwork (left) | text + controls (right).
          At large, this sits at the top 170px of the card. */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          padding: `${WIDGET_PADDING}px`,
          display: "flex",
          alignItems: "center",
          gap: "20px",
          height: size === "large" ? "170px" : "100%",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* Sharp artwork (120×120 medium, left-aligned & rounded) */}
        <div
          style={{
            flexShrink: 0,
            width: "120px",
            height: "120px",
            borderRadius: "12px",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: current.artwork ? undefined : "linear-gradient(160deg, #48484a 0%, #1c1c1e 100%)",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.35)",
          }}
        >
          {current.artwork ? (
            <Image
              src={current.artwork}
              alt={current.title}
              width={128}
              height={128}
              draggable={false}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <MusicNoteGlyph />
          )}
        </div>

        {/* Text + controls column (right) */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: "16px",
          }}
        >
          {/* Title + artist */}
          <div>
            <p
              style={{
                margin: 0,
                fontSize: "15px",
                fontWeight: 600,
                color: "rgba(255, 255, 255, 0.95)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                letterSpacing: "-0.01em",
              }}
            >
              {current.title}
            </p>
            <p
              style={{
                margin: 0,
                marginTop: "4px",
                fontSize: "13px",
                fontWeight: 400,
                color: "rgba(255, 255, 255, 0.6)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {current.artist}
            </p>
          </div>

          {/* Transport controls: prev / play-pause / next */}
          <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            <button
              onClick={prevTrack}
              aria-label="Previous"
              style={{
                background: "none",
                border: "none",
                padding: 0,
                cursor: current.src === "" ? "default" : "pointer",
                opacity: current.src === "" ? 0.4 : 0.9,
                display: "flex",
                color: "rgba(255, 255, 255, 0.9)",
              }}
            >
              <SkipGlyph direction="prev" />
            </button>
            <button
              onClick={togglePlay}
              aria-label={playing ? "Pause" : "Play"}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                cursor: current.src === "" ? "default" : "pointer",
                opacity: current.src === "" ? 0.4 : 0.9,
                display: "flex",
                color: "rgba(255, 255, 255, 0.9)",
              }}
            >
              {playing ? (
                <PauseGlyph />
              ) : (
                <PlayGlyph />
              )}
            </button>
            <button
              onClick={nextTrack}
              aria-label="Next"
              style={{
                background: "none",
                border: "none",
                padding: 0,
                cursor: current.src === "" ? "default" : "pointer",
                opacity: current.src === "" ? 0.4 : 0.9,
                display: "flex",
                color: "rgba(255, 255, 255, 0.9)",
              }}
            >
              <SkipGlyph direction="next" />
            </button>
          </div>
        </div>
      </div>

      {/* Lyrics panel: only at large size, fills remaining height */}
      {size === "large" && (
        <div
          style={{
            position: "relative",
            zIndex: 2,
            flex: 1,
            minHeight: 0,
            paddingLeft: `${WIDGET_PADDING}px`,
            paddingRight: `${WIDGET_PADDING}px`,
            paddingBottom: `${WIDGET_PADDING}px`,
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          <LyricsPanel audioRef={audioRef} playing={playing} lyricsSrc={current.lyricsSrc} />
        </div>
      )}
    </motion.div>
  );
}
