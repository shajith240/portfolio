"use client";

import { type ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { LayoutProvider, useLayout } from "@/contexts/LayoutContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { WindowManagerProvider } from "@/contexts/WindowManagerContext";
import { usePerformance } from "@/lib/usePerformance";
import Wallpaper from "@/components/layout/Wallpaper";
import BootSequence from "@/components/boot/BootSequence";
import MenuBar from "@/components/layout/MenuBar";
import PhotoWidget from "@/components/widgets/PhotoWidget";
import AboutWidget from "@/components/widgets/AboutWidget";
import CommandPalette from "@/components/ui/CommandPalette";
import PageBreadcrumb from "@/components/ui/PageBreadcrumb";
import MobileTabBar from "@/components/ui/MobileTabBar";
import Dock from "@/components/ui/Dock";
import WindowLayer from "@/components/window/WindowLayer";

function Shell({ children }: { children: ReactNode }) {
  const { isMobileLayout, isTabletLayout } = useLayout();
  const { tier } = usePerformance();
  const pathname = usePathname();
  const isHome = pathname === "/";

  // Set performance tier class on <html> for CSS-level optimizations
  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove("perf-full", "perf-reduced", "perf-minimal");
    html.classList.add(`perf-${tier}`);
  }, [tier]);
  const isPhone = isMobileLayout && !isTabletLayout;

  return (
    <div
      className="h-screen overflow-hidden"
      style={{ color: "var(--text-primary)", background: "var(--bg-page)" }}
    >
      <Wallpaper />
      <BootSequence />

      {/* Phone layout: no menu bar/widgets — tab bar handles navigation */}
      {isPhone ? (
        <>
          <PageBreadcrumb />
          {children}
          <MobileTabBar />
          <CommandPalette />
        </>
      ) : (
        <>
          <MenuBar />
          {isHome && (
            <>
              <PhotoWidget />
              <AboutWidget />
            </>
          )}
          <PageBreadcrumb />
          {children}
          <WindowLayer />
          <Dock />
          <CommandPalette />
        </>
      )}
    </div>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  // Pages loaded as a Window's iframe content (see components/window/Window.tsx)
  // request their own route with ?__window=1 — render them bare, with no
  // desktop chrome, or every window would recursively nest a whole second
  // desktop (menu bar, dock, wallpaper) inside itself.
  //
  // Defaults to false (matching the server's render) and flips after
  // mount, the same hydration-safe pattern used elsewhere in this
  // codebase (MenuBar's clock) — avoids needing useSearchParams()
  // wrapped in a Suspense boundary just for this one client-only check.
  const [isEmbedded, setIsEmbedded] = useState(false);
  useEffect(() => {
    if (window.location.search.includes("__window")) setIsEmbedded(true);
  }, []);

  if (isEmbedded) {
    return (
      <ThemeProvider>
        <LayoutProvider>{children}</LayoutProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <LayoutProvider>
        <WindowManagerProvider>
          <Shell>{children}</Shell>
        </WindowManagerProvider>
      </LayoutProvider>
    </ThemeProvider>
  );
}
