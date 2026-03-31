"use client";

import { type ReactNode, useEffect } from "react";
import { LayoutProvider, useLayout } from "@/contexts/LayoutContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { usePerformance } from "@/lib/usePerformance";
import RightNav from "@/components/layout/RightNav";
import LeftSidebar from "@/components/layout/LeftSidebar";
import MenuButton from "@/components/ui/MenuButton";
import CommandPalette from "@/components/ui/CommandPalette";
import PageBreadcrumb from "@/components/ui/PageBreadcrumb";
import MobileTabBar from "@/components/ui/MobileTabBar";

function Shell({ children }: { children: ReactNode }) {
  const { isMobileLayout, isTabletLayout, isNavOpen, isSidebarOpen, closeSidebars } = useLayout();
  const { tier } = usePerformance();

  // Set performance tier class on <html> for CSS-level optimizations
  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove("perf-full", "perf-reduced", "perf-minimal");
    html.classList.add(`perf-${tier}`);
  }, [tier]);
  const isPhone = isMobileLayout && !isTabletLayout;

  // Phone: completely different shell — bottom tab bar, no sidebars, no MenuButton
  // Tablet: sidebars as overlays with backdrop
  // Desktop: full panel layout
  // Backdrop only for tablet (overlay sidebars) — never on phones (no sidebars exist)
  const showBackdrop = !isPhone && isMobileLayout && (isNavOpen || isSidebarOpen);

  return (
    <div
      className="h-screen overflow-hidden"
      style={{ color: "var(--text-primary)", background: "var(--bg-page)" }}
    >
      {/* Backdrop — closes panels when tapped (tablet + phone when sidebars forced open) */}
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

      {/* Phone layout: no sidebars, no MenuButton — tab bar handles navigation */}
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
          <RightNav />
          <MenuButton />
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
