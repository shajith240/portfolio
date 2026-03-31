"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";

interface LayoutContextValue {
  isNavOpen: boolean;
  isSidebarOpen: boolean;
  isSearchOpen: boolean;
  isSoundEnabled: boolean;
  isMobileLayout: boolean;
  isTabletLayout: boolean;
  toggleNav: () => void;
  toggleSidebar: () => void;
  openSearch: () => void;
  closeSearch: () => void;
  toggleSound: () => void;
  closeSidebars: () => void;
}

const LayoutContext = createContext<LayoutContextValue>({
  isNavOpen: false,
  isSidebarOpen: false,
  isSearchOpen: false,
  isSoundEnabled: true,
  isMobileLayout: false,
  isTabletLayout: false,
  toggleNav: () => {},
  toggleSidebar: () => {},
  openSearch: () => {},
  closeSearch: () => {},
  toggleSound: () => {},
  closeSidebars: () => {},
});

export function LayoutProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/";

  /*
    Sidebar is open by default only on the home route.
    This ensures SSR output matches client initial render on every page —
    eliminating the hydration mismatch on the sidebar transform attribute.
  */
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  // SSR-safe: default false (desktop) → updates after mount
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  // isTabletLayout: 640px–1023px (iPad-size range)
  const [isTabletLayout, setIsTabletLayout] = useState(false);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      setIsMobileLayout(w < 1024);
      setIsTabletLayout(w >= 640 && w < 1024);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  /*
    Route change handler — close both panels on any sub-page.
    On home, reopen the sidebar so navigating back feels natural.
  */
  useEffect(() => {
    if (isHome) {
      // Only auto-open sidebar on desktop/tablet — phones have no sidebar
      setIsSidebarOpen(!isMobileLayout || isTabletLayout);
    } else {
      setIsNavOpen(false);
      setIsSidebarOpen(false);
    }
  }, [isHome, isMobileLayout, isTabletLayout]);

  const toggleNav = useCallback(() => {
    setIsNavOpen((v) => !v);
    if (isMobileLayout) setIsSidebarOpen(false);
  }, [isMobileLayout]);
  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((v) => !v);
    if (isMobileLayout) setIsNavOpen(false);
  }, [isMobileLayout]);
  const openSearch = useCallback(() => setIsSearchOpen(true), []);
  const closeSearch = useCallback(() => setIsSearchOpen(false), []);
  const toggleSound = useCallback(() => setIsSoundEnabled((v) => !v), []);
  const closeSidebars = useCallback(() => { setIsNavOpen(false); setIsSidebarOpen(false); }, []);

  return (
    <LayoutContext.Provider value={{
      isNavOpen, isSidebarOpen, isSearchOpen, isSoundEnabled, isMobileLayout, isTabletLayout,
      toggleNav, toggleSidebar, openSearch, closeSearch, toggleSound, closeSidebars,
    }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  return useContext(LayoutContext);
}
