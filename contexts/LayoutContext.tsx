"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

interface LayoutContextValue {
  isSearchOpen: boolean;
  isSoundEnabled: boolean;
  isMobileLayout: boolean;
  isTabletLayout: boolean;
  viewportWidth: number;
  viewportHeight: number;
  openSearch: () => void;
  closeSearch: () => void;
  toggleSound: () => void;
}

const LayoutContext = createContext<LayoutContextValue>({
  isSearchOpen: false,
  isSoundEnabled: true,
  isMobileLayout: false,
  isTabletLayout: false,
  viewportWidth: 1440,
  viewportHeight: 900,
  openSearch: () => {},
  closeSearch: () => {},
  toggleSound: () => {},
});

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
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
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const openSearch = useCallback(() => setIsSearchOpen(true), []);
  const closeSearch = useCallback(() => setIsSearchOpen(false), []);
  const toggleSound = useCallback(() => setIsSoundEnabled((v) => !v), []);

  return (
    <LayoutContext.Provider value={{
      isSearchOpen, isSoundEnabled, isMobileLayout, isTabletLayout,
      viewportWidth: viewport.width, viewportHeight: viewport.height,
      openSearch, closeSearch, toggleSound,
    }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  return useContext(LayoutContext);
}
