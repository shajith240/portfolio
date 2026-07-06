"use client";

import { useState, useEffect, useCallback } from "react";
import { GENERATED_WALLPAPERS, GENERATED_MOBILE_WALLPAPERS } from "@/data/generated/content";

const STORAGE_KEY = "portfolio.wallpaper";
const MOBILE_STORAGE_KEY = "portfolio.wallpaper.mobile";
// Same breakpoint LayoutContext uses for isPhone (mobile && !tablet).
const PHONE_MAX_WIDTH = 640;

// Auto-discovered from public/wallpapers by scripts/generate-content.mjs
// — drop an image in that folder and it appears in the picker on the
// next dev start / deploy, no code changes. Phones get their own
// PORTRAIT set from public/wallpapers/mobile (entries carry the
// "mobile/" prefix so the /wallpapers/<name> URL convention holds).
// Deliberately NO desktop fallback: landscape desktop art on a phone
// is exactly the wrong look — until the mobile folder has files, the
// phone shows its own iOS-style gradient (see Wallpaper.tsx).
export const WALLPAPERS = GENERATED_WALLPAPERS;
export const MOBILE_WALLPAPERS = GENERATED_MOBILE_WALLPAPERS;

/**
 * Compute average color from an image file by downsampling to 12x12 and averaging RGB.
 * Returns [r, g, b] as 0-255 integers. On error, returns null.
 */
async function computeAverageColor(imagePath: string): Promise<[number, number, number] | null> {
  if (typeof window === "undefined") return null;

  try {
    const img = new Image();
    img.crossOrigin = "anonymous";

    return new Promise((resolve) => {
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = 12;
          canvas.height = 12;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(null);
            return;
          }

          ctx.drawImage(img, 0, 0, 12, 12);
          const imageData = ctx.getImageData(0, 0, 12, 12);
          const data = imageData.data;

          let r = 0,
            g = 0,
            b = 0;
          for (let i = 0; i < data.length; i += 4) {
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
          }

          const pixelCount = (12 * 12);
          r = Math.round(r / pixelCount);
          g = Math.round(g / pixelCount);
          b = Math.round(b / pixelCount);

          resolve([r, g, b]);
        } catch {
          resolve(null);
        }
      };

      img.onerror = () => resolve(null);
      img.src = imagePath;
    });
  } catch {
    return null;
  }
}

/**
 * Convert RGB to HSL.
 */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return [h, s, l];
}

/**
 * Convert HSL to RGB.
 */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [
    Math.round(r * 255),
    Math.round(g * 255),
    Math.round(b * 255),
  ];
}

/**
 * Boost saturation of an RGB color: convert to HSL, clamp saturation to [0.35, 1],
 * clamp lightness to [0.35, 0.55], convert back to RGB.
 */
function boostSaturation(r: number, g: number, b: number): [number, number, number] {
  let [h, s, l] = rgbToHsl(r, g, b);
  s = Math.max(0.35, Math.min(1, s));
  l = Math.max(0.35, Math.min(0.55, l));
  return hslToRgb(h, s, l);
}

/**
 * Apply wallpaper tint to document root CSS variable.
 */
function applyWallpaperTint(r: number, g: number, b: number) {
  if (typeof window === "undefined") return;
  document.documentElement.style.setProperty(
    "--wallpaper-tint-rgb",
    `${r}, ${g}, ${b}`
  );
}

/**
 * Handle wallpaper change: compute average color, boost saturation, apply to CSS.
 */
async function handleWallpaperChange(imagePath: string) {
  const avgColor = await computeAverageColor(imagePath);
  if (!avgColor) return;

  const [r, g, b] = boostSaturation(avgColor[0], avgColor[1], avgColor[2]);
  applyWallpaperTint(r, g, b);
}

// SSR-safe: returns null on first render (server + first client paint),
// then reads localStorage in an effect — matches the codebase's
// established hydration-safe pattern (same as LeftSidebar's old
// entrance-animation guard, MenuBar's clock).
export function useWallpaper() {
  const [wallpaper, setWallpaperState] = useState<string | null>(null);
  const [isPhone, setIsPhone] = useState(false);

  useEffect(() => {
    // Device class decides WHICH list and WHICH persistence slot this
    // hook works against — the phone remembers its own wallpaper
    // independently of the desktop. Checked once at mount (a device
    // doesn't change class mid-session; a resized desktop browser
    // keeping its desktop wallpaper is correct behavior).
    const phone = window.innerWidth < PHONE_MAX_WIDTH;
    setIsPhone(phone);
    const list = phone ? MOBILE_WALLPAPERS : WALLPAPERS;
    const key = phone ? MOBILE_STORAGE_KEY : STORAGE_KEY;
    const stored = window.localStorage.getItem(key);
    if (stored && list.includes(stored)) {
      setWallpaperState(stored);
      handleWallpaperChange(`/wallpapers/${stored}`);
    } else if (phone && list.length > 0) {
      // Phone with wallpapers available but nothing chosen yet:
      // the first portrait file is live immediately — dropping one
      // image into public/wallpapers/mobile is all it takes.
      setWallpaperState(list[0]);
      handleWallpaperChange(`/wallpapers/${list[0]}`);
    }
  }, []);

  const setWallpaper = useCallback(
    (filename: string) => {
      setWallpaperState(filename);
      window.localStorage.setItem(isPhone ? MOBILE_STORAGE_KEY : STORAGE_KEY, filename);
      handleWallpaperChange(`/wallpapers/${filename}`);
    },
    [isPhone],
  );

  return { wallpaper, setWallpaper, isPhone };
}
