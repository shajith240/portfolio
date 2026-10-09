"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { AnimatePresence } from "framer-motion";
import { useWallpaper } from "@/lib/useWallpaper";
import { useWindowManager } from "@/contexts/WindowManagerContext";
import { openFinderAtFolder } from "@/components/window/FinderApp";
import DesktopContextMenu from "@/components/layout/DesktopContextMenu";
import WallpaperPicker from "@/components/widgets/WallpaperPicker";
import SelectionMarquee from "@/components/layout/SelectionMarquee";

// Painted under the wallpaper until it loads: the wallpapers are dark
// with black sides, so a near-black backdrop makes the fade-in seamless.
const PLACEHOLDER_BG = "#050507";

export default function Wallpaper() {
  const { wallpaper, setWallpaper } = useWallpaper();
  const { openFinder } = useWindowManager();
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
          // The gradient always paints instantly underneath; the image
          // fades over it once loaded, so a slow connection sees a
          // designed backdrop rather than a blank flash.
          background: PLACEHOLDER_BG,
        }}
      >
        {wallpaper && (
          // next/image instead of a raw CSS background-image: the CSS
          // url() served the ORIGINAL file (several of these are
          // 4-5K-pixel multi-MB JPEGs) to every visitor — the single
          // biggest slow-connection cost on the site. This serves a
          // viewport-sized AVIF/WebP and preloads it (priority).
          // pointerEvents none keeps the container the event target,
          // so the desktop context menu and selection marquee behave
          // exactly as before.
          <Image
            src={`/wallpapers/${wallpaper}`}
            alt=""
            fill
            priority
            sizes="100vw"
            draggable={false}
            // Centred subject: cover-cropping keeps it in the middle on
            // any aspect, a phone's portrait screen included.
            style={{ objectFit: "cover", objectPosition: "center", pointerEvents: "none" }}
          />
        )}
      </div>

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
            onSeeMore={() => {
              openFinderAtFolder("Wallpapers");
              openFinder();
              setPickerOpen(false);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
