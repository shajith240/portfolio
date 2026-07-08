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
    // Debounced (150ms, same as WidgetLayoutContext's resize handler):
    // "resize" fires continuously while a browser window edge is being
    // dragged, not once at the end — reacting to every intermediate size
    // meant 3 setState calls per event, app-wide, for the whole drag.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const handleResize = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(update, 150);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      if (timer) clearTimeout(timer);
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
