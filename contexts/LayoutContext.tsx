"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface LayoutContextValue {
  isNavOpen: boolean;
  isSidebarOpen: boolean;
  isSearchOpen: boolean;
  toggleNav: () => void;
  toggleSidebar: () => void;
  openSearch: () => void;
  closeSearch: () => void;
}

const LayoutContext = createContext<LayoutContextValue>({
  isNavOpen: true,
  isSidebarOpen: true,
  isSearchOpen: false,
  toggleNav: () => {},
  toggleSidebar: () => {},
  openSearch: () => {},
  closeSearch: () => {},
});

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [isNavOpen, setIsNavOpen] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const toggleNav = useCallback(() => setIsNavOpen((v) => !v), []);
  const toggleSidebar = useCallback(() => setIsSidebarOpen((v) => !v), []);
  const openSearch = useCallback(() => setIsSearchOpen(true), []);
  const closeSearch = useCallback(() => setIsSearchOpen(false), []);

  return (
    <LayoutContext.Provider value={{ isNavOpen, isSidebarOpen, isSearchOpen, toggleNav, toggleSidebar, openSearch, closeSearch }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  return useContext(LayoutContext);
}
