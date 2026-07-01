"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "portfolio.wallpaper";

export const WALLPAPERS = [
  "abstract-background-3840x2160-11753.jpeg",
  "dahlia-flower-orange-flower-black-background-amoled-5k-8k-3840x2160-8535.jpg",
  "maserati-gt2-3840x2160-26562.jpg",
  "microsoft-surface-3840x2160-9246.png",
  "orange-tulips-black-background-spring-flowers-colorful-4096x2160-2339.jpg",
];

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
