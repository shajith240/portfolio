"use client";

import { createContext, useContext, useCallback, useMemo, useRef, useState, useEffect, type ReactNode } from "react";

export interface WindowState {
  id: string;
  route: string;
  title: string;
  kind: "iframe" | "finder" | "credits" | "vscode";
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
  openCredits: () => void;
  openVSCode: () => void;
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
// Exported alongside BOTTOM_RESERVE — WidgetLayoutContext reuses both
// rather than picking its own MenuBar/Dock clearance values.
// The menu bar's height (components/layout/MenuBar.tsx) — the one
// number every "stay below the menu bar" offset derives from.
export const MENU_BAR_HEIGHT = 34;
export const TOP_BOUND = MENU_BAR_HEIGHT + 2;
// Exported — this is the single source of truth for "how much space to
// leave clear above the Dock" on this desktop. Any fixed-position
// element that needs to stay clear of the Dock (desktop widgets, not
// just windows) should reuse this instead of picking its own offset.
// = Dock bottom offset (24) + its resting height (80) + 16px of air.
export const BOTTOM_RESERVE = 120;
// New windows open at least this far down, leaving headroom above
// their titlebar for the mascot to sit on (components/mascot/
// ShellMascot.tsx): its 160px box minus 16px of transparent foot
// space, below the 26px menu bar, plus a few px of air. Height shrinks
// to fit instead of the window pushing down into the Dock's reserve.
export const WINDOW_TOP_CLEARANCE = 176;

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

// Key the Dock registers its own pill element under (via
// registerDockIconEl) — a sentinel, like "finder"/"external:*", that
// can never collide with a real window route. Windows whose app has no
// Dock icon (Finder/Credits/VS Code are Spotlight-only easter eggs)
// minimize toward this rect instead of collapsing in place.
export const DOCK_RECT_KEY = "dock:pill";

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

  const openWindowOfKind = useCallback((route: string, title: string, kind: "iframe" | "finder" | "credits" | "vscode", size?: { width: number; height: number }) => {
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
      const wantedHeight = size ? size.height : Math.min(DEFAULT_HEIGHT, viewportH * 0.75);

      const cascadeIndex = cascadeCountRef.current % CASCADE_WRAP;
      cascadeCountRef.current += 1;
      const baseX = (viewportW - width) / 2 - (CASCADE_STEP * CASCADE_WRAP) / 2;
      // Cascade from the mascot-clearance line down. The height leaves
      // room for a couple of cascade steps; deeper steps are pulled back
      // up (below) rather than every window being shrunk for all six.
      const cascadeSpan = CASCADE_STEP * (CASCADE_WRAP - 1);
      const height = Math.max(
        320,
        Math.min(wantedHeight, viewportH - WINDOW_TOP_CLEARANCE - CASCADE_STEP * 2 - BOTTOM_RESERVE),
      );
      const baseY = Math.max(WINDOW_TOP_CLEARANCE, (viewportH - height) / 2 - cascadeSpan / 2);
      const maxY = Math.max(WINDOW_TOP_CLEARANCE, viewportH - BOTTOM_RESERVE - height);

      const newWindow: WindowState = {
        id: route,
        route,
        title,
        kind,
        x: Math.max(40, baseX + cascadeIndex * CASCADE_STEP),
        y: Math.min(baseY + cascadeIndex * CASCADE_STEP, maxY),
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

  // Credits isn't an iframe of a real route either — same reasoning as
  // Finder above: it's its own React UI (components/window/CreditsApp.tsx),
  // "credits" is a sentinel route, never requested over the network.
  const openCredits = useCallback(() => {
    openWindowOfKind("credits", "Credits", "credits");
  }, [openWindowOfKind]);

  // Same sentinel-route treatment as Finder/Credits — "vscode" is never a
  // real route, it's the VSCodeApp window kind. Sized larger than the
  // default content window since a code viewer needs real room.
  const openVSCode = useCallback(() => {
    openWindowOfKind("vscode", "VS Code", "vscode", { width: 1040, height: 680 });
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

  // Every consumer (Dock, every open Window, MenuBar, AppSwitcher) re-reads
  // this value on every provider re-render — without memoizing it, a fresh
  // object identity forces all of them to re-render even when nothing they
  // actually use changed. `windows` is the only piece that legitimately
  // changes on its own; every callback below is already stable via
  // useCallback, so this only recomputes when `windows` itself changes.
  const value = useMemo(
    () => ({
      windows,
      openWindow,
      openFinder,
      openCredits,
      openVSCode,
      closeWindow,
      minimizeWindow,
      toggleMaximize,
      bringToFront,
      updateBounds,
      registerDockIconEl,
      getDockIconRect,
    }),
    [windows, openWindow, openFinder, openCredits, openVSCode, closeWindow, minimizeWindow, toggleMaximize, bringToFront, updateBounds, registerDockIconEl, getDockIconRect]
  );

  return (
    <WindowManagerContext.Provider value={value}>
      {children}
    </WindowManagerContext.Provider>
  );
}

export function useWindowManager() {
  const ctx = useContext(WindowManagerContext);
  if (!ctx) throw new Error("useWindowManager must be used within WindowManagerProvider");
  return ctx;
}
