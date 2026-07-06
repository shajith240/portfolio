"use client";

import { useEffect, useState } from "react";

/* iPhone status bar — shared by lock screen, home screen, and open
   apps. Lock variant shows the "carrier" slot on the left (the big
   lock clock owns timekeeping there); default variant shows the
   time. Right cluster is always signal / Wi-Fi / battery. Spec:
   scratchpad/ios26-lock-home-spec.md §1.1/§2.6. */

const SignalGlyph = () => (
  <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
    {[0, 1, 2, 3].map((i) => (
      <rect key={i} x={i * 4.6} y={7.5 - i * 2.5} width="3" height={4.5 + i * 2.5} rx="1" fill="rgba(255,255,255,0.95)" />
    ))}
  </svg>
);

const WifiGlyph = () => (
  <svg width="17" height="12" viewBox="0 0 17 12" fill="none">
    <path d="M1.8 4.4a10 10 0 0 1 13.4 0" stroke="rgba(255,255,255,0.95)" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M4.3 7a6.2 6.2 0 0 1 8.4 0" stroke="rgba(255,255,255,0.95)" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="8.5" cy="10.2" r="1.6" fill="rgba(255,255,255,0.95)" />
  </svg>
);

const BatteryGlyph = () => (
  <svg width="27" height="13" viewBox="0 0 27 13" fill="none">
    <rect x="0.5" y="0.5" width="22" height="12" rx="3.5" stroke="rgba(255,255,255,0.5)" />
    <path d="M24 4.5v4a2.2 2.2 0 0 0 1.4-2A2.2 2.2 0 0 0 24 4.5Z" fill="rgba(255,255,255,0.5)" />
    <rect x="2" y="2" width="15.5" height="9" rx="2" fill="rgba(255,255,255,0.95)" />
  </svg>
);

export default function IOSStatusBar({ variant }: { variant: "lock" | "default" }) {
  const [time, setTime] = useState("");

  useEffect(() => {
    const update = () =>
      setTime(new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).replace(/\s?[AP]M/, ""));
    update();
    const id = setInterval(update, 10_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "max(44px, env(safe-area-inset-top, 44px))",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "6px 26px 0 30px",
        zIndex: 900,
        pointerEvents: "none",
        color: "rgba(255,255,255,0.95)",
      }}
    >
      {variant === "lock" ? (
        <span style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.01em" }}>Shajith Wi-Fi</span>
      ) : (
        <span style={{ fontSize: "15px", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{time}</span>
      )}
      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <SignalGlyph />
        <WifiGlyph />
        <BatteryGlyph />
      </span>
    </div>
  );
}
