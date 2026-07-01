"use client";

import { type ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LayoutProvider, useLayout } from "@/contexts/LayoutContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { WindowManagerProvider, useWindowManager } from "@/contexts/WindowManagerContext";
import { usePerformance } from "@/lib/usePerformance";
import { NAV_ITEMS } from "@/data/nav";
import Wallpaper from "@/components/layout/Wallpaper";
import BootSequence from "@/components/boot/BootSequence";
import MenuBar from "@/components/layout/MenuBar";
import DesktopWidgetStack from "@/components/widgets/DesktopWidgetStack";
import PhotoWidget from "@/components/widgets/PhotoWidget";
import NowPlayingWidget from "@/components/widgets/NowPlayingWidget";
import MotivationWidget from "@/components/widgets/MotivationWidget";
import CommandPalette from "@/components/ui/CommandPalette";
import PageBreadcrumb from "@/components/ui/PageBreadcrumb";
import MobileTabBar from "@/components/ui/MobileTabBar";
import Dock from "@/components/ui/Dock";
import WindowLayer from "@/components/window/WindowLayer";

function Shell({ children }: { children: ReactNode }) {
  const { isMobileLayout, isTabletLayout } = useLayout();
  const { tier } = usePerformance();
  const pathname = usePathname();
  const router = useRouter();
  const { openWindow } = useWindowManager();
  const isHome = pathname === "/";
  const isPhone = isMobileLayout && !isTabletLayout;

  // Closes the loophole no individual link fix can fully cover: a
  // direct visit to /about (typed URL, bookmark, browser back/forward,
  // or any link this session hasn't found yet) would otherwise always
  // render as its own full top-level page — Next.js routes just work
  // that way. Instead of chasing every possible entry point, enforce
  // the invariant at the root: any non-embedded, non-home NAV_ITEMS
  // route redirects to "/" and opens the same content as a window.
  const strayNavItem = !isHome && !isPhone ? NAV_ITEMS.find((item) => item.href === pathname) : undefined;

  useEffect(() => {
    if (strayNavItem) {
      openWindow(strayNavItem.href, strayNavItem.label);
      router.replace("/");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Set performance tier class on <html> for CSS-level optimizations
  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove("perf-full", "perf-reduced", "perf-minimal");
    html.classList.add(`perf-${tier}`);
  }, [tier]);

  return (
    <div
      className="h-screen overflow-hidden"
      style={{ color: "var(--text-primary)", background: "var(--bg-page)" }}
    >
      <Wallpaper />
      <BootSequence />

      {/* Phone layout: no menu bar/widgets — tab bar handles navigation.
          Phone intentionally keeps real page navigation (no window
          system there), so it's excluded from the redirect above. */}
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
              <DesktopWidgetStack>
                <PhotoWidget />
                <NowPlayingWidget />
              </DesktopWidgetStack>
              <MotivationWidget />
            </>
          )}
          <PageBreadcrumb />
          {/* Suppress the raw page while the redirect above is in
              flight, so a stray /about visit never flashes as a full
              page before it's relocated into a window. */}
          {!strayNavItem && children}
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
  // null = "not yet determined". This used to default to false (assume
  // not embedded) and flip after mount, but that meant Shell — and its
  // stray-route redirect effect — mounted for one tick inside every
  // iframe too, since child effects fire before parent effects: the
  // iframe's own Shell would see e.g. pathname "/about", not yet know
  // it was embedded, and redirect ITSELF to "/", leaving every window
  // blank. Rendering nothing until the check completes (a same-tick
  // effect, imperceptible) means Shell never mounts prematurely inside
  // an iframe at all.
  const [isEmbedded, setIsEmbedded] = useState<boolean | null>(null);
  useEffect(() => {
    setIsEmbedded(window.location.search.includes("__window"));
  }, []);

  if (isEmbedded === null) {
    return null;
  }

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
