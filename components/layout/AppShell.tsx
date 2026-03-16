"use client";

import { type ReactNode } from "react";
import { LayoutProvider } from "@/contexts/LayoutContext";
import RightNav from "@/components/layout/RightNav";
import LeftSidebar from "@/components/layout/LeftSidebar";
import MenuButton from "@/components/ui/MenuButton";
import CommandPalette from "@/components/ui/CommandPalette";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <LayoutProvider>
      <div className="h-screen overflow-hidden bg-void text-white">
        <LeftSidebar />
        {children}
        <RightNav />
        <MenuButton />
        <CommandPalette />
      </div>
    </LayoutProvider>
  );
}
