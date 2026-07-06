"use client";

import { useState, useEffect, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { useWallpaper } from "@/lib/useWallpaper";
import DesktopContextMenu from "@/components/layout/DesktopContextMenu";
import WallpaperPicker from "@/components/widgets/WallpaperPicker";
import SelectionMarquee from "@/components/layout/SelectionMarquee";

const PLACEHOLDER_BG =
  "radial-gradient(ellipse 120% 90% at 30% 20%, #2a2a2e 0%, #17171a 55%, #0d0d0f 100%)";

// Phone default until public/wallpapers/mobile has files — an
// iOS-style warm-to-cool mesh, NOT the desktop wallpaper (landscape
// desktop art stretched over a phone was the "same wallpaper on
// both" bug).
const IOS_PLACEHOLDER_BG =
  "radial-gradient(130% 90% at 18% 0%, #e0813c 0%, rgba(224, 129, 60, 0) 58%), " +
  "radial-gradient(120% 80% at 90% 38%, #6b3fa0 0%, rgba(107, 63, 160, 0) 62%), " +
  "radial-gradient(160% 110% at 50% 105%, #1e63b4 0%, #12224a 55%, #0a0f24 100%)";

export default function Wallpaper() {
  const { wallpaper, setWallpaper, isPhone } = useWallpaper();
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const desktopRef = useRef<HTMLDivElement>(null);

  // Close the context menu on any click/Escape, regardless of where it
  // lands (MenuBar, Dock, a widget) — not just clicks on the wallpaper
  // itself, which the div's own onClick alone wouldn't catch.
  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => {
      // Exclude clicks inside the menu itself — otherwise this
      // mousedown handler closes the menu before the clicked item's
      // own onClick (which fires after mousedown) gets a chance to run.
      // Same class of bug as the Control Center toggle fix in MenuBar.
      const target = e.target as Element;
      if (target.closest?.("[data-desktop-menu]")) return;
      setMenu(null);
    };
    const closeOnEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(null);
    };
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [menu]);

  return (
    <>
      <div
        ref={desktopRef}
        aria-hidden
        onContextMenu={(e) => {
          if (e.target !== e.currentTarget) return;
          e.preventDefault();
          setMenu({ x: e.clientX, y: e.clientY });
        }}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          background: wallpaper
            ? `url(/wallpapers/${wallpaper}) center / cover no-repeat`
            : isPhone
            ? IOS_PLACEHOLDER_BG
            : PLACEHOLDER_BG,
        }}
      />

      <SelectionMarquee desktopRef={desktopRef} />

      <AnimatePresence>
        {menu && (
          <DesktopContextMenu
            x={menu.x}
            y={menu.y}
            onChangeWallpaper={() => setPickerOpen(true)}
            onClose={() => setMenu(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pickerOpen && (
          <WallpaperPicker
            current={wallpaper}
            onSelect={(filename) => {
              setWallpaper(filename);
              setPickerOpen(false);
            }}
            onClose={() => setPickerOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
