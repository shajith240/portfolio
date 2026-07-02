"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { NOW_PLAYING } from "@/data/nowPlaying";
import LyricsPanel from "@/components/widgets/LyricsPanel";
import { WIDGET_UNIT, WIDGET_PADDING, WIDGET_RADIUS } from "@/lib/widgetGrid";

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

   An album-art color-extraction tinted backdrop was tried and then
   explicitly reverted — kept to the plain glass card instead. */

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

// Matches SF Symbols' speaker.wave.2.fill / speaker.slash.fill — the
// two states real macOS volume controls actually use (not a
// low/medium/high three-way split, which would need a third glyph
// with no clear real-world trigger point).
function SpeakerGlyph({ muted }: { muted: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
      <path d="M2 7.5H5L9 4V16L5 12.5H2V7.5Z" fill="var(--text-muted)" />
      {muted ? (
        <>
          <line x1="12.5" y1="7.5" x2="17.5" y2="12.5" stroke="var(--text-muted)" strokeWidth="1.4" strokeLinecap="round" />
          <line x1="17.5" y1="7.5" x2="12.5" y2="12.5" stroke="var(--text-muted)" strokeWidth="1.4" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d="M12.3 7.2a3.2 3.2 0 0 1 0 5.6" stroke="var(--text-muted)" strokeWidth="1.3" strokeLinecap="round" fill="none" />
          <path d="M14.3 5a6 6 0 0 1 0 10" stroke="var(--text-muted)" strokeWidth="1.3" strokeLinecap="round" fill="none" />
        </>
      )}
    </svg>
  );
}

export default function NowPlayingWidget() {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scrubberRef = useRef<HTMLDivElement>(null);
  const volumeTrackRef = useRef<HTMLDivElement>(null);

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

  // Single source of truth for the audio element's real volume —
  // whatever changes `volume`/`muted`, the <audio> element is kept in
  // sync here rather than set ad hoc at each call site.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = muted ? 0 : volume;
  }, [volume, muted]);

  const toggleMute = () => setMuted((m) => !m);

  const setVolumeFromClientX = (clientX: number) => {
    const track = volumeTrackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    setVolume(ratio);
    // Dragging the slider un-mutes, matching real macOS volume sliders
    // — there's no reason to leave it muted once the user has
    // explicitly picked a level.
    if (ratio > 0) setMuted(false);
  };

  const onVolumePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setVolumeFromClientX(e.clientX);
    const onMove = (ev: PointerEvent) => setVolumeFromClientX(ev.clientX);
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
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

  return (
    <motion.div
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={ENTRANCE_SPRING}
      style={{
        width: `${WIDGET_UNIT}px`,
        padding: `${WIDGET_PADDING}px`,
        borderRadius: `${WIDGET_RADIUS}px`,
        background: "var(--glass-regular-bg)",
        border: "1px solid var(--glass-border)",
        backdropFilter: "blur(var(--glass-blur-regular)) saturate(var(--glass-saturate))",
        WebkitBackdropFilter: "blur(var(--glass-blur-regular)) saturate(var(--glass-saturate))",
        // Tight, close-to-surface shadow, not a wide diffuse glow —
        // real macOS widgets rest near the surface rather than
        // levitating, and a wider blur here would bleed past
        // DesktopWidgetStack's 14px inter-widget gap into whatever's
        // stacked next to it.
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
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
          macOS's Now Playing scrubber. A visible playhead thumb is
          load-bearing, not decorative: at 0% progress the fill is 0
          width, so without a thumb the bar is just one flat "unplayed
          track" color with nothing to anchor "this is the start" —
          indistinguishable at a glance from "fully played." Real
          macOS/Apple Music scrubbers always show this dot for exactly
          that reason. The thumb lives outside the track's own
          overflow:hidden (a sibling, not a child) so it's never
          clipped at the 0%/100% extremes, where it straddles the
          track's edge — the same way a native slider thumb does. */}
      <div style={{ position: "relative", marginTop: "12px" }}>
        <div
          ref={scrubberRef}
          onClick={seekToClick}
          style={{
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
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: "50%",
            left: `${progress}%`,
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: "#fff",
            transform: "translate(-50%, -50%)",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.45)",
            pointerEvents: "none",
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

      {/* Volume — speaker icon toggles mute, slider is click-and-drag
          (not click-only like the scrubber intentionally is; a volume
          slider is the one control real macOS always lets you drag).
          Same neutral white fill / track treatment as the scrubber
          above for visual consistency between the two sliders in this
          widget. */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "12px" }}>
        <button
          onClick={toggleMute}
          aria-label={muted ? "Unmute" : "Mute"}
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", flexShrink: 0 }}
        >
          <SpeakerGlyph muted={muted || volume === 0} />
        </button>
        <div style={{ position: "relative", flex: 1 }}>
          <div
            ref={volumeTrackRef}
            onPointerDown={onVolumePointerDown}
            style={{
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
                width: `${(muted ? 0 : volume) * 100}%`,
                background: "rgba(255, 255, 255, 0.85)",
                borderRadius: "2px",
              }}
            />
          </div>
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: "50%",
              left: `${(muted ? 0 : volume) * 100}%`,
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#fff",
              transform: "translate(-50%, -50%)",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.45)",
              pointerEvents: "none",
            }}
          />
        </div>
      </div>

      <LyricsPanel audioRef={audioRef} playing={playing} />
    </motion.div>
  );
}
