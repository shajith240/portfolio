"use client";

import { type ReactNode } from "react";
import { LayoutProvider } from "@/contexts/LayoutContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import RightNav from "@/components/layout/RightNav";
import LeftSidebar from "@/components/layout/LeftSidebar";
import MenuButton from "@/components/ui/MenuButton";
import CommandPalette from "@/components/ui/CommandPalette";
import PageBreadcrumb from "@/components/ui/PageBreadcrumb";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <LayoutProvider>
        <div
          className="h-screen overflow-hidden"
          style={{ color: "var(--text-primary)", background: "var(--bg-page)" }}
        >
          <PageBreadcrumb />
          <LeftSidebar />
          {children}
          <RightNav />
          <MenuButton />
          <CommandPalette />
        </div>
      </LayoutProvider>
    </ThemeProvider>
  );
}
