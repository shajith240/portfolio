"use client";

import { type ReactNode } from "react";
import { LayoutProvider, useLayout } from "@/contexts/LayoutContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import RightNav from "@/components/layout/RightNav";
import LeftSidebar from "@/components/layout/LeftSidebar";
import MenuButton from "@/components/ui/MenuButton";
import CommandPalette from "@/components/ui/CommandPalette";
import PageBreadcrumb from "@/components/ui/PageBreadcrumb";

function Shell({ children }: { children: ReactNode }) {
  const { isMobileLayout, isNavOpen, isSidebarOpen, closeSidebars } = useLayout();
  const showBackdrop = isMobileLayout && (isNavOpen || isSidebarOpen);

  return (
    <div
      className="h-screen overflow-hidden"
      style={{ color: "var(--text-primary)", background: "var(--bg-page)" }}
    >
      {/* Mobile backdrop — closes panels when tapped */}
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
      <PageBreadcrumb />
      <LeftSidebar />
      {children}
      <RightNav />
      <MenuButton />
      <CommandPalette />
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
