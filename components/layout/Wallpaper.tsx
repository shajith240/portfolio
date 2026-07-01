"use client";

// Swap this to a real image path (e.g. "/wallpaper.jpg" dropped into
// public/) once you have the actual macOS wallpaper. Empty string falls
// back to a dark gradient placeholder so the widgets/menu bar/dock have
// something to sit on in the meantime.
const WALLPAPER_URL = "";

export default function Wallpaper() {
  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        background: WALLPAPER_URL
          ? `url(${WALLPAPER_URL}) center / cover no-repeat`
          : "radial-gradient(ellipse 120% 90% at 30% 20%, #2a2a2e 0%, #17171a 55%, #0d0d0f 100%)",
      }}
    />
  );
}
