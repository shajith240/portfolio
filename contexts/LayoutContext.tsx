"use client";

import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from "react";

interface LayoutContextValue {
  isSearchOpen: boolean;
  isMobileLayout: boolean;
  isTabletLayout: boolean;
  viewportWidth: number;
  viewportHeight: number;
  openSearch: () => void;
  closeSearch: () => void;
}

const LayoutContext = createContext<LayoutContextValue>({
  isSearchOpen: false,
  isMobileLayout: false,
  isTabletLayout: false,
  viewportWidth: 1440,
  viewportHeight: 900,
  openSearch: () => {},
  closeSearch: () => {},
});

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  // SSR-safe: default false (desktop) → updates after mount
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  // isTabletLayout: 640px–1023px (iPad-size range)
  const [isTabletLayout, setIsTabletLayout] = useState(false);
  const [viewport, setViewport] = useState({ width: 1440, height: 900 });

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setViewport({ width: w, height: h });
      setIsMobileLayout(w < 1024);
      setIsTabletLayout(w >= 640 && w < 1024);
    };
    update();
    // Throttled to one update per animation frame (~16ms), NOT a flat
    // debounce — "resize" fires continuously both while a browser window
    // edge is being dragged AND for every frame of a windowed page's own
    // maximize/restore spring (that page lives in an iframe whose box
    // dimensions are animating, which fires native resize events on the
    // iframe's own window the whole time). A flat 150ms debounce means
    // the debounce timer keeps getting pushed back for the animation's
    // entire ~300-400ms duration, so the page's own layout (columns,
    // padding, breakpoint) stays stale at its PRE-resize size for the
    // whole maximize, then pops to the correct one ~150ms after the box
    // finishes moving — a smoothly resizing chrome around content that's
    // frozen-then-snapping is exactly what read as a "wiggle" here.
    // RAF-throttling still coalesces the flood of native events into one
    // state update per frame (the original problem this solved), but
    // tracks the resize in real time instead of lagging behind it.
    let raf: number | undefined;
    const handleResize = () => {
      if (raf !== undefined) return;
      raf = requestAnimationFrame(() => {
        raf = undefined;
        update();
      });
    };
    window.addEventListener("resize", handleResize);
    return () => {
      if (raf !== undefined) cancelAnimationFrame(raf);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const openSearch = useCallback(() => setIsSearchOpen(true), []);
  const closeSearch = useCallback(() => setIsSearchOpen(false), []);

  // Memoized — every route/component that calls useLayout() re-renders
  // whenever this value's identity changes; without this, an unrelated
  // provider re-render (or the resize handler above) would re-render
  // every one of those consumers even when the values they read didn't
  // change.
  const value = useMemo(
    () => ({
      isSearchOpen,
      isMobileLayout,
      isTabletLayout,
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
      openSearch,
      closeSearch,
    }),
    [isSearchOpen, isMobileLayout, isTabletLayout, viewport.width, viewport.height, openSearch, closeSearch]
  );

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
}

export function useLayout() {
  return useContext(LayoutContext);
}
