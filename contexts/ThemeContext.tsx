"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";

/* Dark-only. There is no light theme and no toggle — a previous
   version supported switching, but the site is dark-only by design
   now, so `isDarkTheme` is a fixed constant rather than state, and
   there's no `toggleTheme` to call in the first place. */

interface ThemeContextValue {
  isDarkTheme: true;
}

const ThemeContext = createContext<ThemeContextValue>({ isDarkTheme: true });

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "dark");
  }, []);

  return <ThemeContext.Provider value={{ isDarkTheme: true }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
