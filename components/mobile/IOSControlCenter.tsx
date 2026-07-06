"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useLiquidGlass } from "@/lib/liquidGlass";

/* iOS Control Center — rebuilt against the real panel's anatomy:

   ┌ connectivity 2×2 ┐ ┌ media: title + ⏮ ▶ ⏭ ┐
   ┌ brightness ┐ ┌ volume ┐   (tall pills, white fill from bottom,
   └ sun at foot┘ └ spk    ┘    icon fixed INSIDE at the bottom)
   ( GitHub ) ( LinkedIn ) ( Mail )

   Every module is one Liquid Glass surface from lib/liquidGlass.ts
   (real edge refraction) + the .liquid-glass rim/gloss class — no
   nested "circle on circle" backgrounds anywhere: a connectivity
   button is a single flat circle whose fill IS its state (solid
   system blue when active, faint white when not).

   Honesty rules kept: Wi-Fi reflects navigator.onLine; the media
   card shows "Not Playing" exactly like iOS does when nothing plays
   (phones don't mount the desktop player); brightness really dims
   the screen; volume really sets audio volumes.

   Smoothness: the blurred backdrop mounts at full blur immediately
   (only its opacity fades, 0.15s) and the module column springs in
   as a transform — nothing re-blurs frame by frame. */

const OPEN_EASE = [0.32, 0.72, 0, 1] as const;

/* ── glyphs ─────────────────────────────────────────────────── */
const AirplaneGlyph = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="rgba(255,255,255,0.95)">
    <path d="M21.5 15.5v-2l-8-5v-5a1.5 1.5 0 0 0-3 0v5l-8 5v2l8-2.5V18l-2.5 2v1.5l4-1 4 1V20L13.5 18v-5Z" />
  </svg>
);
const CellularGlyph = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="rgba(255,255,255,0.95)">
    {[0, 1, 2, 3].map((i) => (
      <rect key={i} x={i * 5} y={12 - i * 4} width="3.4" height={6 + i * 4} rx="1.2" />
    ))}
  </svg>
);
const WifiCCGlyph = () => (
  <svg width="22" height="17" viewBox="0 0 22 17" fill="none">
    <path d="M2 6a13 13 0 0 1 18 0" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
    <path d="M5.5 9.6a8 8 0 0 1 11 0" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
    <circle cx="11" cy="14" r="2" fill="#fff" />
  </svg>
);
const BluetoothGlyph = () => (
  <svg width="18" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M7 7l10 10-5 5V2l5 5L7 17" stroke="rgba(255,255,255,0.95)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
  </svg>
);
const PrevGlyph = ({ dim }: { dim: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={dim ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.95)"} style={{ transform: "scaleX(-1)" }}>
    <path d="M4 5l8 7-8 7V5Z M13 5l8 7-8 7V5Z" />
  </svg>
);
const NextGlyph = ({ dim }: { dim: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={dim ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.95)"}>
    <path d="M4 5l8 7-8 7V5Z M13 5l8 7-8 7V5Z" />
  </svg>
);
const PlayPauseGlyph = ({ playing, dim }: { playing: boolean; dim: boolean }) => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill={dim ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.95)"}>
    {playing ? <path d="M6 4h4v16H6V4Zm8 0h4v16h-4V4Z" /> : <path d="M7 4l13 8-13 8V4Z" />}
  </svg>
);
const SunGlyph = () => (
  <svg width="22" height="22" viewBox="0 0 22 22">
    <circle cx="11" cy="11" r="4.2" fill="rgba(40,40,44,0.85)" />
    {Array.from({ length: 8 }, (_, i) => {
      const a = (i * Math.PI) / 4;
      return (
        <line
          key={i}
          x1={11 + Math.cos(a) * 6.6}
          y1={11 + Math.sin(a) * 6.6}
          x2={11 + Math.cos(a) * 9}
          y2={11 + Math.sin(a) * 9}
          stroke="rgba(40,40,44,0.85)"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      );
    })}
  </svg>
);
const SpeakerGlyph = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
    <path d="M3.5 8v6h3.6L12 18.5v-15L7.1 8H3.5Z" fill="rgba(40,40,44,0.85)" />
    <path d="M14.5 8a4.4 4.4 0 0 1 0 6M16.8 5.8a7.6 7.6 0 0 1 0 10.4" stroke="rgba(40,40,44,0.85)" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
const GitHubGlyph = () => (
  <svg width="26" height="26" viewBox="0 0 16 16" fill="rgba(255,255,255,0.95)">
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
  </svg>
);
const LinkedInGlyph = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="rgba(255,255,255,0.95)">
    <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5ZM.4 8.1h4.2V23H.4V8.1Zm7.1 0h4v2h.06c.56-1.05 1.93-2.16 3.97-2.16 4.25 0 5.03 2.8 5.03 6.44V23h-4.2v-7.4c0-1.77-.03-4.05-2.47-4.05-2.47 0-2.85 1.93-2.85 3.92V23H7.5V8.1Z" />
  </svg>
);
const MailGlyph = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <rect x="2" y="5" width="20" height="14" rx="2.5" stroke="rgba(255,255,255,0.95)" strokeWidth="1.8" />
    <path d="M3 7l9 6.5L21 7" stroke="rgba(255,255,255,0.95)" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

/* ── connectivity button: ONE circle, fill = state ───────────── */
function ConnButton({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return (
    <motion.button
      whileTap={{ scale: 0.88 }}
      style={{
        width: "48px",
        height: "48px",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "none",
        padding: 0,
        background: active ? "#0a84ff" : "rgba(255,255,255,0.14)",
      }}
    >
      {children}
    </motion.button>
  );
}

/* ── vertical slider: white fill from the bottom, icon at foot ── */
function VerticalSlider({
  value,
  onChange,
  glyph,
}: {
  value: number;
  onChange: (v: number) => void;
  glyph: React.ReactNode;
}) {
  const lgRef = useLiquidGlass<HTMLDivElement>({ radius: 38, bezel: 16, strength: 0.55, blur: 8, brightness: 0.85, tint: 0.14 });

  const setFromClientY = useCallback(
    (clientY: number) => {
      const el = lgRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      onChange(Math.min(1, Math.max(0, 1 - (clientY - r.top) / r.height)));
    },
    [onChange, lgRef],
  );

  return (
    <div
      ref={lgRef}
      className="liquid-glass"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        setFromClientY(e.clientY);
      }}
      onPointerMove={(e) => {
        if (e.buttons === 1) setFromClientY(e.clientY);
      }}
      style={{
        flex: 1,
        height: "192px",
        borderRadius: "38px",
        overflow: "hidden",
        touchAction: "none",
        cursor: "default",
      }}
    >
      {/* fill — grows from the bottom, square top edge like iOS */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: `${Math.max(0.14, value) * 100}%`,
          background: "rgba(255,255,255,0.96)",
        }}
      />
      <span
        style={{
          position: "absolute",
          bottom: "16px",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          pointerEvents: "none",
        }}
      >
        {glyph}
      </span>
    </div>
  );
}

/* ── glass modules with the engine attached ─────────────────── */
function GlassCard({
  children,
  radius,
  style,
}: {
  children: React.ReactNode;
  radius: number;
  style?: React.CSSProperties;
}) {
  const ref = useLiquidGlass<HTMLDivElement>({ radius, bezel: 13, strength: 0.6, blur: 7, brightness: 0.82, tint: 0.16 });
  return (
    <div ref={ref} className="liquid-glass" style={{ borderRadius: `${radius}px`, ...style }}>
      {children}
    </div>
  );
}

function CircleLink({ children, href }: { children: React.ReactNode; href: string }) {
  const ref = useLiquidGlass<HTMLButtonElement>({ radius: 31, bezel: 11, strength: 0.65, blur: 6, brightness: 0.85, tint: 0.15 });
  return (
    <motion.button
      ref={ref}
      className="liquid-glass"
      whileTap={{ scale: 0.9 }}
      onClick={() => window.open(href, "_blank", "noopener,noreferrer")}
      style={{
        width: "62px",
        height: "62px",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "none",
        padding: 0,
      }}
    >
      {children}
    </motion.button>
  );
}

export default function IOSControlCenter({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [online, setOnline] = useState(true);
  const [brightness, setBrightness] = useState(1);
  const [volume, setVolume] = useState(1);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    const b = parseFloat(localStorage.getItem("cc-brightness") ?? "1");
    const v = parseFloat(localStorage.getItem("cc-volume") ?? "1");
    if (!Number.isNaN(b)) setBrightness(b);
    if (!Number.isNaN(v)) setVolume(v);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // Media state sampled when the panel opens — phones usually have
  // no <audio> mounted, which is the honest "Not Playing" state.
  useEffect(() => {
    if (!open) return;
    const audio = document.querySelector("audio");
    setHasAudio(!!audio);
    setAudioPlaying(!!audio && !audio.paused);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const onBrightness = (v: number) => {
    setBrightness(v);
    document.documentElement.style.setProperty("--display-dim", String((1 - v) * 0.7));
    localStorage.setItem("cc-brightness", String(v));
  };
  const onVolume = (v: number) => {
    setVolume(v);
    document.querySelectorAll("audio").forEach((a) => {
      (a as HTMLAudioElement).volume = v;
    });
    localStorage.setItem("cc-volume", String(v));
  };
  const toggleMedia = () => {
    const audio = document.querySelector("audio");
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(() => {});
      setAudioPlaying(true);
    } else {
      audio.pause();
      setAudioPlaying(false);
    }
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      {/* Screen-dim layer lives OUTSIDE the panel so it persists. */}
      {brightness < 1 && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "#000",
            opacity: `var(--display-dim, ${(1 - brightness) * 0.7})`,
            pointerEvents: "none",
            zIndex: 3000,
          }}
        />
      )}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => {
              if (e.target === e.currentTarget) onClose();
            }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 2600,
              background: "rgba(0,0,0,0.36)",
              backdropFilter: "blur(28px) saturate(160%)",
              WebkitBackdropFilter: "blur(28px) saturate(160%)",
            }}
          >
            <motion.div
              initial={{ y: -18, scale: 0.97, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: -14, scale: 0.98, opacity: 0 }}
              transition={{ duration: 0.28, ease: OPEN_EASE }}
              style={{
                maxWidth: "400px",
                margin: "0 auto",
                padding: "max(20px, env(safe-area-inset-top, 20px)) 16px 0",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                pointerEvents: "auto",
              }}
            >
              {/* Row 1: connectivity + media */}
              <div style={{ display: "flex", gap: "14px" }}>
                <GlassCard radius={26} style={{ flex: 1, padding: "14px", minHeight: "132px" }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, 48px)",
                      gap: "10px",
                      justifyContent: "center",
                      alignContent: "center",
                      height: "100%",
                    }}
                  >
                    <ConnButton>
                      <AirplaneGlyph />
                    </ConnButton>
                    <ConnButton>
                      <CellularGlyph />
                    </ConnButton>
                    <ConnButton active={online}>
                      <WifiCCGlyph />
                    </ConnButton>
                    <ConnButton>
                      <BluetoothGlyph />
                    </ConnButton>
                  </div>
                </GlassCard>

                <GlassCard radius={26} style={{ flex: 1, padding: "16px 14px", minHeight: "132px" }}>
                  <div
                    style={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "12px",
                    }}
                  >
                    <span style={{ fontSize: "14px", fontWeight: 500, color: hasAudio ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.5)" }}>
                      {hasAudio ? (audioPlaying ? "Playing" : "Paused") : "Not Playing"}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
                      <motion.button whileTap={{ scale: 0.85 }} style={{ background: "none", border: "none", padding: 0 }}>
                        <PrevGlyph dim={!hasAudio} />
                      </motion.button>
                      <motion.button whileTap={{ scale: 0.85 }} onClick={toggleMedia} style={{ background: "none", border: "none", padding: 0 }}>
                        <PlayPauseGlyph playing={audioPlaying} dim={!hasAudio} />
                      </motion.button>
                      <motion.button whileTap={{ scale: 0.85 }} style={{ background: "none", border: "none", padding: 0 }}>
                        <NextGlyph dim={!hasAudio} />
                      </motion.button>
                    </div>
                  </div>
                </GlassCard>
              </div>

              {/* Row 2: brightness + volume */}
              <div style={{ display: "flex", gap: "14px" }}>
                <VerticalSlider value={brightness} onChange={onBrightness} glyph={<SunGlyph />} />
                <VerticalSlider value={volume} onChange={onVolume} glyph={<SpeakerGlyph />} />
              </div>

              {/* Row 3: real links */}
              <div style={{ display: "flex", justifyContent: "center", gap: "16px" }}>
                <CircleLink href="https://github.com/shajith240">
                  <GitHubGlyph />
                </CircleLink>
                <CircleLink href="https://www.linkedin.com/in/shajith240">
                  <LinkedInGlyph />
                </CircleLink>
                <CircleLink href="mailto:shajith240@gmail.com">
                  <MailGlyph />
                </CircleLink>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>,
    document.body,
  );
}
