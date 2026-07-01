"use client";

import { createContext, useContext, useCallback, useRef, useState, type ReactNode } from "react";

export interface WindowState {
  id: string;
  route: string;
  title: string;
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

  const openWindow = useCallback((route: string, title: string) => {
    setWindows((prev) => {
      const existing = prev.find((w) => w.route === route);
      topZIndexRef.current += 1;
      const z = topZIndexRef.current;
      if (existing) {
        return prev.map((w) => (w.id === existing.id ? { ...w, minimized: false, zIndex: z } : w));
      }

      const width = Math.min(DEFAULT_WIDTH, typeof window !== "undefined" ? window.innerWidth * 0.7 : DEFAULT_WIDTH);
      const height = Math.min(DEFAULT_HEIGHT, typeof window !== "undefined" ? window.innerHeight * 0.75 : DEFAULT_HEIGHT);
      const viewportW = typeof window !== "undefined" ? window.innerWidth : 1440;
      const viewportH = typeof window !== "undefined" ? window.innerHeight : 900;

      const cascadeIndex = cascadeCountRef.current % CASCADE_WRAP;
      cascadeCountRef.current += 1;
      const baseX = (viewportW - width) / 2 - (CASCADE_STEP * CASCADE_WRAP) / 2;
      const baseY = (viewportH - height) / 2 - (CASCADE_STEP * CASCADE_WRAP) / 2;

      const newWindow: WindowState = {
        id: route,
        route,
        title,
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
