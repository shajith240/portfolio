"use client";

import { createContext, useContext, useCallback, useRef, useState, useEffect, type ReactNode } from "react";

export interface WindowState {
  id: string;
  route: string;
  title: string;
  kind: "iframe" | "finder";
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  minimized: boolean;
  maximized: boolean;
  prevBounds: { x: number; y: number; width: number; height: number } | null;
}

interface WindowManagerContextValue {
  windows: WindowState[];
  openWindow: (route: string, title: string) => void;
  openFinder: () => void;
  closeWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  toggleMaximize: (id: string) => void;
  bringToFront: (id: string) => void;
  updateBounds: (id: string, bounds: Partial<Pick<WindowState, "x" | "y" | "width" | "height">>) => void;
  registerDockIconEl: (route: string, el: HTMLElement | null) => void;
  getDockIconRect: (route: string) => DOMRect | null;
}

const WindowManagerContext = createContext<WindowManagerContextValue | null>(null);

const DEFAULT_WIDTH = 900;
const DEFAULT_HEIGHT = 640;
const CASCADE_STEP = 28;
const CASCADE_WRAP = 6; // after this many cascades, restart near the top-left

// Keeps a window's titlebar always reachable — the bug this guards
// against: dragging a window until its titlebar is fully off-screen
// leaves no way to grab it back. MIN_VISIBLE is how much of the
// titlebar (horizontally) must stay on screen; TOP/BOTTOM keep it
// below the MenuBar and above the Dock.
const MIN_VISIBLE_X = 120;
const TOP_BOUND = 30;
// Exported — this is the single source of truth for "how much space to
// leave clear above the Dock" on this desktop. Any fixed-position
// element that needs to stay clear of the Dock (desktop widgets, not
// just windows) should reuse this instead of picking its own offset.
export const BOTTOM_RESERVE = 110;

// Shared with Window.tsx (as Framer Motion `dragConstraints`) so a drag
// can never produce a position this same clamp would then have to fix.
export function getPositionBounds(width: number) {
  if (typeof window === "undefined") {
    return { minX: 0, maxX: 0, minY: TOP_BOUND, maxY: TOP_BOUND };
  }
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return {
    minX: -(width - MIN_VISIBLE_X),
    maxX: vw - MIN_VISIBLE_X,
    minY: TOP_BOUND,
    maxY: Math.max(TOP_BOUND, vh - BOTTOM_RESERVE),
  };
}

function clampPosition(x: number, y: number, width: number) {
  const { minX, maxX, minY, maxY } = getPositionBounds(width);
  return {
    x: Math.min(Math.max(x, minX), maxX),
    y: Math.min(Math.max(y, minY), maxY),
  };
}

export function WindowManagerProvider({ children }: { children: ReactNode }) {
  const [windows, setWindows] = useState<WindowState[]>([]);
  const topZIndexRef = useRef(100);
  const cascadeCountRef = useRef(0);
  const dockIconEls = useRef<Map<string, HTMLElement>>(new Map());

  const bringToFront = useCallback((id: string) => {
    topZIndexRef.current += 1;
    const z = topZIndexRef.current;
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, zIndex: z } : w)));
  }, []);

  const openWindowOfKind = useCallback((route: string, title: string, kind: "iframe" | "finder", size?: { width: number; height: number }) => {
    setWindows((prev) => {
      const existing = prev.find((w) => w.route === route);
      topZIndexRef.current += 1;
      const z = topZIndexRef.current;
      if (existing) {
        // Recovery path: if a previous drag left this window with its
        // titlebar unreachable (or a viewport resize did), clicking its
        // Dock icon again snaps it back into view instead of just
        // un-minimizing it in place.
        const clamped = clampPosition(existing.x, existing.y, existing.width);
        return prev.map((w) => (w.id === existing.id ? { ...w, ...clamped, minimized: false, zIndex: z } : w));
      }

      const viewportW = typeof window !== "undefined" ? window.innerWidth : 1440;
      const viewportH = typeof window !== "undefined" ? window.innerHeight : 900;
      const width = size ? size.width : Math.min(DEFAULT_WIDTH, viewportW * 0.7);
      const height = size ? size.height : Math.min(DEFAULT_HEIGHT, viewportH * 0.75);

      const cascadeIndex = cascadeCountRef.current % CASCADE_WRAP;
      cascadeCountRef.current += 1;
      const baseX = (viewportW - width) / 2 - (CASCADE_STEP * CASCADE_WRAP) / 2;
      const baseY = (viewportH - height) / 2 - (CASCADE_STEP * CASCADE_WRAP) / 2;

      const newWindow: WindowState = {
        id: route,
        route,
        title,
        kind,
        x: Math.max(40, baseX + cascadeIndex * CASCADE_STEP),
        y: Math.max(50, baseY + cascadeIndex * CASCADE_STEP),
        width,
        height,
        zIndex: z,
        minimized: false,
        maximized: false,
        prevBounds: null,
      };
      return [...prev, newWindow];
    });
  }, []);

  const openWindow = useCallback((route: string, title: string) => {
    openWindowOfKind(route, title, "iframe");
  }, [openWindowOfKind]);

  // Finder isn't an iframe of a real route — it's its own React UI
  // (components/window/FinderApp.tsx). "finder" is a sentinel route,
  // never actually requested over the network. Real macOS's default
  // window size for Finder is roomier than a typical content window,
  // hence the explicit larger default here.
  const openFinder = useCallback(() => {
    openWindowOfKind("finder", "Finder", "finder", { width: 960, height: 620 });
  }, [openWindowOfKind]);

  const closeWindow = useCallback((id: string) => {
    setWindows((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const minimizeWindow = useCallback((id: string) => {
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, minimized: true } : w)));
  }, []);

  const toggleMaximize = useCallback((id: string) => {
    setWindows((prev) =>
      prev.map((w) => {
        if (w.id !== id) return w;
        if (w.maximized && w.prevBounds) {
          return { ...w, maximized: false, ...w.prevBounds, prevBounds: null };
        }
        const viewportW = typeof window !== "undefined" ? window.innerWidth : 1440;
        const viewportH = typeof window !== "undefined" ? window.innerHeight : 900;
        return {
          ...w,
          maximized: true,
          prevBounds: { x: w.x, y: w.y, width: w.width, height: w.height },
          x: 12,
          y: 40,
          width: viewportW - 24,
          height: viewportH - 40 - 100,
        };
      })
    );
  }, []);

  const updateBounds = useCallback((id: string, bounds: Partial<Pick<WindowState, "x" | "y" | "width" | "height">>) => {
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, ...bounds } : w)));
  }, []);

  // Safety net for the same class of bug on window resize: shrinking the
  // browser can leave an existing window's titlebar off the new,
  // smaller viewport even though nothing was dragged.
  useEffect(() => {
    const handleResize = () => {
      setWindows((prev) =>
        prev.map((w) => {
          const clamped = clampPosition(w.x, w.y, w.width);
          return clamped.x === w.x && clamped.y === w.y ? w : { ...w, ...clamped };
        })
      );
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const registerDockIconEl = useCallback((route: string, el: HTMLElement | null) => {
    if (el) dockIconEls.current.set(route, el);
    else dockIconEls.current.delete(route);
  }, []);

  const getDockIconRect = useCallback((route: string) => {
    const el = dockIconEls.current.get(route);
    return el ? el.getBoundingClientRect() : null;
  }, []);

  return (
    <WindowManagerContext.Provider
      value={{
        windows,
        openWindow,
        openFinder,
        closeWindow,
        minimizeWindow,
        toggleMaximize,
        bringToFront,
        updateBounds,
        registerDockIconEl,
        getDockIconRect,
      }}
    >
      {children}
    </WindowManagerContext.Provider>
  );
}

export function useWindowManager() {
  const ctx = useContext(WindowManagerContext);
  if (!ctx) throw new Error("useWindowManager must be used within WindowManagerProvider");
  return ctx;
}
