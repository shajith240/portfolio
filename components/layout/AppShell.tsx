"use client";

import { type ReactNode, useEffect } from "react";
import { LayoutProvider, useLayout } from "@/contexts/LayoutContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { usePerformance } from "@/lib/usePerformance";
import LeftSidebar from "@/components/layout/LeftSidebar";
import CommandPalette from "@/components/ui/CommandPalette";
import PageBreadcrumb from "@/components/ui/PageBreadcrumb";
import MobileTabBar from "@/components/ui/MobileTabBar";
import Dock from "@/components/ui/Dock";

function Shell({ children }: { children: ReactNode }) {
  const { isMobileLayout, isTabletLayout, isSidebarOpen, closeSidebars } = useLayout();
  const { tier } = usePerformance();

  // Set performance tier class on <html> for CSS-level optimizations
  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove("perf-full", "perf-reduced", "perf-minimal");
    html.classList.add(`perf-${tier}`);
  }, [tier]);
  const isPhone = isMobileLayout && !isTabletLayout;

  // Phone: completely different shell — bottom tab bar, no sidebars
  // Tablet: sidebar as overlay with backdrop
  // Desktop: full panel layout
  // Backdrop only for tablet (overlay sidebar) — never on phones (no sidebar exists)
  const showBackdrop = !isPhone && isMobileLayout && isSidebarOpen;

  return (
    <div
      className="h-screen overflow-hidden"
      style={{ color: "var(--text-primary)", background: "var(--bg-page)" }}
    >
      {/* Backdrop — closes panel when tapped (tablet + phone when sidebar forced open) */}
      {showBackdrop && (
        <div
          onClick={closeSidebars}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.55)",
            zIndex: 35,
          }}
        />
      )}

      {/* Phone layout: no sidebar — tab bar handles navigation */}
      {isPhone ? (
        <>
          <PageBreadcrumb />
          {children}
          <MobileTabBar />
          <CommandPalette />
        </>
      ) : (
        <>
          <PageBreadcrumb />
          <LeftSidebar />
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
