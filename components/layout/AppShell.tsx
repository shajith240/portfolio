"use client";

import { type ReactNode, useEffect } from "react";
import { usePathname } from "next/navigation";
import { LayoutProvider, useLayout } from "@/contexts/LayoutContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { usePerformance } from "@/lib/usePerformance";
import Wallpaper from "@/components/layout/Wallpaper";
import MenuBar from "@/components/layout/MenuBar";
import PhotoWidget from "@/components/widgets/PhotoWidget";
import AboutWidget from "@/components/widgets/AboutWidget";
import CommandPalette from "@/components/ui/CommandPalette";
import PageBreadcrumb from "@/components/ui/PageBreadcrumb";
import MobileTabBar from "@/components/ui/MobileTabBar";
import Dock from "@/components/ui/Dock";

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
          <Dock />
          <CommandPalette />
        </>
      )}
    </div>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <LayoutProvider>
        <Shell>{children}</Shell>
      </LayoutProvider>
    </ThemeProvider>
  );
}
