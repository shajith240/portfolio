"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* macOS Control Center — deliberately SMALL, because everything in
   it must genuinely work (house rule: no dummy chrome):

   - Display slider: really dims the screen via a full-viewport
     overlay whose opacity tracks the slider (the practical browser
     equivalent of backlight control).
   - Sound slider: really sets .volume on every <audio> on the page
     (the music widget's element included).

   Both persist in localStorage. Wi-Fi/Bluetooth/Focus tiles are
   omitted on purpose — they'd be lies on a website.

   Anatomy follows the real CC panel: glass card below the menu bar's
   right edge, 16px radius, module rows with the glyph riding INSIDE
   the slider's filled region, white fill on a translucent track. */

const PANEL_W = 300;

const SunGlyph = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <circle cx="6.5" cy="6.5" r="2.6" fill="rgba(60,60,60,0.85)" />
    {Array.from({ length: 8 }, (_, i) => {
      const a = (i * Math.PI) / 4;
      return (
        <line
          key={i}
          x1={6.5 + Math.cos(a) * 4.2}
          y1={6.5 + Math.sin(a) * 4.2}
          x2={6.5 + Math.cos(a) * 5.8}
          y2={6.5 + Math.sin(a) * 5.8}
          stroke="rgba(60,60,60,0.85)"
          strokeWidth="1.1"
          strokeLinecap="round"
        />
      );
    })}
  </svg>
);

const SpeakerGlyph = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <path d="M2 4.8v3.4h2.2L7.4 11V2L4.2 4.8H2Z" fill="rgba(60,60,60,0.85)" />
    <path d="M9 4.4a3 3 0 0 1 0 4.2M10.6 3a5.2 5.2 0 0 1 0 7" stroke="rgba(60,60,60,0.85)" strokeWidth="1.1" strokeLinecap="round" />
  </svg>
);

/* The menu-bar trigger: two capsules with offset dots — the real CC
   status glyph. */
const CCGlyph = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <rect x="0.75" y="1.25" width="13.5" height="5.5" rx="2.75" stroke="rgba(255,255,255,0.9)" strokeWidth="1.2" />
    <circle cx="4" cy="4" r="1.5" fill="rgba(255,255,255,0.9)" />
    <rect x="0.75" y="8.25" width="13.5" height="5.5" rx="2.75" stroke="rgba(255,255,255,0.9)" strokeWidth="1.2" />
    <circle cx="11" cy="11" r="1.5" fill="rgba(255,255,255,0.9)" />
  </svg>
);

function CCSlider({
  label,
  glyph,
  value,
  onChange,
}: {
  label: string;
  glyph: React.ReactNode;
  value: number;
  onChange: (v: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  const setFromClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      onChange(Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)));
    },
    [onChange],
  );

  // Fill never collapses below the glyph's housing — same as the
  // real slider, where the sun/speaker always sits on the white cap.
  const fillPct = 10 + value * 90;

  return (
    <div style={{ padding: "10px 12px 12px" }}>
      <div style={{ fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.85)", marginBottom: "8px" }}>
        {label}
      </div>
      <div
        ref={trackRef}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          setFromClientX(e.clientX);
        }}
        onPointerMove={(e) => {
          if (e.buttons === 1) setFromClientX(e.clientX);
        }}
        style={{
          position: "relative",
          height: "22px",
          borderRadius: "11px",
          background: "rgba(255, 255, 255, 0.22)",
          overflow: "hidden",
          cursor: "default",
          // A hairline so the white fill reads as a pill inside the
          // track rather than floating.
          boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.15)",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            bottom: 0,
            width: `${fillPct}%`,
            background: "#ffffff",
            borderRadius: "11px",
          }}
        />
        <span
          style={{
            position: "absolute",
            left: "6px",
            top: "50%",
            transform: "translateY(-50%)",
            display: "flex",
            pointerEvents: "none",
          }}
        >
          {glyph}
        </span>
      </div>
    </div>
  );
}

export default function ControlCenter() {
  const [open, setOpen] = useState(false);
  const [brightness, setBrightness] = useState(1);
  const [volume, setVolume] = useState(1);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Restore persisted values once on mount.
  useEffect(() => {
    const b = parseFloat(localStorage.getItem("cc-brightness") ?? "1");
    const v = parseFloat(localStorage.getItem("cc-volume") ?? "1");
    if (!Number.isNaN(b)) setBrightness(b);
    if (!Number.isNaN(v)) applyVolume(Number.isNaN(v) ? 1 : v);
    if (!Number.isNaN(v)) setVolume(v);
  }, []);

  const applyVolume = (v: number) => {
    document.querySelectorAll("audio").forEach((el) => {
      (el as HTMLAudioElement).volume = v;
    });
  };

  const onBrightness = (v: number) => {
    setBrightness(v);
    localStorage.setItem("cc-brightness", String(v));
  };

  const onVolume = (v: number) => {
    setVolume(v);
    applyVolume(v);
    localStorage.setItem("cc-volume", String(v));
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointer = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <div ref={wrapRef} style={{ position: "relative", display: "flex", alignItems: "center" }}>
      {/* Screen dim layer — the Display slider's real effect. Sits
          over everything, ignores the pointer, dims like a backlight
          (capped so the screen can never go fully black). */}
      {brightness < 1 && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "#000",
            opacity: (1 - brightness) * 0.7,
            pointerEvents: "none",
            zIndex: 3000,
          }}
        />
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Control Center"
        style={{
          display: "flex",
          alignItems: "center",
          border: "none",
          background: "transparent",
          padding: "2px",
          cursor: "default",
        }}
      >
        <CCGlyph />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14, ease: [0, 0, 0.58, 1] }}
            style={{
              position: "absolute",
              top: "calc(100% + 7px)",
              right: 0,
              width: `${PANEL_W}px`,
              padding: "6px",
              borderRadius: "16px",
              background: "rgba(30, 30, 32, 0.72)",
              backdropFilter: "blur(50px) saturate(180%)",
              WebkitBackdropFilter: "blur(50px) saturate(180%)",
              border: "1px solid rgba(255, 255, 255, 0.10)",
              boxShadow: "0 10px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.06)",
              zIndex: 3001,
            }}
          >
            <div
              style={{
                borderRadius: "12px",
                background: "rgba(255, 255, 255, 0.06)",
                marginBottom: "6px",
              }}
            >
              <CCSlider label="Display" glyph={<SunGlyph />} value={brightness} onChange={onBrightness} />
            </div>
            <div style={{ borderRadius: "12px", background: "rgba(255, 255, 255, 0.06)" }}>
              <CCSlider label="Sound" glyph={<SpeakerGlyph />} value={volume} onChange={onVolume} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
