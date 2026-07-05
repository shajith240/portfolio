"use client";

import { useState, useEffect, useCallback } from "react";
import { GENERATED_WALLPAPERS } from "@/data/generated/content";

const STORAGE_KEY = "portfolio.wallpaper";

// Auto-discovered from public/wallpapers by scripts/generate-content.mjs
// — drop an image in that folder and it appears in the picker on the
// next dev start / deploy, no code changes.
export const WALLPAPERS = GENERATED_WALLPAPERS;

// SSR-safe: returns null on first render (server + first client paint),
// then reads localStorage in an effect — matches the codebase's
// established hydration-safe pattern (same as LeftSidebar's old
// entrance-animation guard, MenuBar's clock).
export function useWallpaper() {
  const [wallpaper, setWallpaperState] = useState<string | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && WALLPAPERS.includes(stored)) {
      setWallpaperState(stored);
    }
  }, []);

  const setWallpaper = useCallback((filename: string) => {
    setWallpaperState(filename);
    window.localStorage.setItem(STORAGE_KEY, filename);
  }, []);

  return { wallpaper, setWallpaper };
}
