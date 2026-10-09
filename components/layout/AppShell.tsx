"use client";

import { type ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LayoutProvider, useLayout } from "@/contexts/LayoutContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { WindowManagerProvider, useWindowManager } from "@/contexts/WindowManagerContext";
import { usePerformance } from "@/lib/usePerformance";
import { NAV_ITEMS, PHONE_ONLY_ROUTES } from "@/data/nav";
import { HANDLE, SOCIALS } from "@/data/profile";
import Wallpaper from "@/components/layout/Wallpaper";
import MenuBar from "@/components/layout/MenuBar";
import { WidgetLayoutProvider } from "@/contexts/WidgetLayoutContext";
import WidgetCanvas from "@/components/widgets/WidgetCanvas";
import CommandPalette from "@/components/ui/CommandPalette";
import IPhoneShell from "@/components/mobile/IPhoneShell";
import Dock from "@/components/ui/Dock";
import WindowLayer from "@/components/window/WindowLayer";
import AppSwitcher from "@/components/layout/AppSwitcher";
import ShellMascot from "@/components/mascot/ShellMascot";

// Plain-link route map for screen-reader, keyboard and text-only users, so
// nothing depends on the desktop metaphor (Dock, windows, Spotlight).
// Visually hidden until something inside it takes keyboard focus.
const SOCIAL_LINKS = [
  ...SOCIALS.filter((s) => s.label === "GitHub" || s.label === "LinkedIn"),
  { label: "LeetCode", url: `https://leetcode.com/u/${HANDLE}/` },
];

const A11Y_PANEL =
  "focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[10000] focus:rounded-lg focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:outline-none focus:ring-2 focus:ring-[#0a84ff] focus:bg-[#1c1c1e] focus:text-white";

function AccessibleNav() {
  return (
    <>
      <a href="#main-content" className={`sr-only ${A11Y_PANEL}`}>
        Skip to content
      </a>
      <nav
        aria-label="Sections"
        className="sr-only focus-within:not-sr-only focus-within:fixed focus-within:left-3 focus-within:top-14 focus-within:z-[10000] focus-within:rounded-lg focus-within:p-3 focus-within:text-sm focus-within:text-white focus-within:bg-[#1c1c1e] focus-within:ring-1 focus-within:ring-white/15"
      >
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <a href={item.href} className="rounded px-1 focus:outline-none focus:ring-2 focus:ring-[#0a84ff]">
                {item.label}
              </a>
            </li>
          ))}
          {SOCIAL_LINKS.map((link) => (
            <li key={link.label}>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded px-1 focus:outline-none focus:ring-2 focus:ring-[#0a84ff]"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}

// Skip-link target: an empty, unstyled marker placed right before the
// main content so it adds nothing visual.
function ContentAnchor() {
  return <span id="main-content" tabIndex={-1} className="sr-only" />;
}

function Shell({ children }: { children: ReactNode }) {
  const { isMobileLayout, isTabletLayout, isLayoutReady } = useLayout();
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
  // Only once the viewport is actually measured: before that, isPhone is
  // the desktop default, and a phone opening a shared /about link would be
  // bounced to "/" (the phone shell shows real pages, not windows).
  const strayNavItem =
    isLayoutReady && !isHome && !isPhone ? NAV_ITEMS.find((item) => item.href === pathname) : undefined;
  // Phone-only apps (data/nav.ts PHONE_ONLY_ROUTES, e.g. /coding) have
  // no desktop window: their content already sits on the desktop as
  // widgets, so a desktop visit just goes home. Same measurement gate.
  const strayPhoneRoute = isLayoutReady && !isPhone && PHONE_ONLY_ROUTES.includes(pathname);

  useEffect(() => {
    if (strayNavItem) {
      openWindow(strayNavItem.href, strayNavItem.label);
      router.replace("/");
    } else if (strayPhoneRoute) {
      router.replace("/");
    }
    // Re-checked when the measurement lands, not just on navigation —
    // a direct desktop visit to /about is only known to be "desktop"
    // after the first layout pass.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, isLayoutReady]);

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

      {/* No boot screen: the desktop (or phone shell) renders on the
          first frame — recruiters skim in ~30s, so nothing stands
          between them and the content.

          Phone layout: the full iPhone experience — lock screen,
          home-screen icon grid, apps zooming out of their icons.
          Real page navigation underneath (no window system on
          phones), so it's excluded from the redirect above. */}
      {isPhone ? (
        <>
          <ContentAnchor />
          <IPhoneShell>{children}</IPhoneShell>
          <CommandPalette />
        </>
      ) : (
        <>
          <MenuBar />
          <ContentAnchor />
          {isHome && (
            <WidgetLayoutProvider>
              <WidgetCanvas />
            </WidgetLayoutProvider>
          )}
          {/* No breadcrumb on the desktop: every route opens as a
              window, so the old "Back to Home / <Page>" top-left
              breadcrumb was both redundant and flashed during the
              stray-route → window redirect. Removed. */}
          {/* Suppress the raw page while the redirect above is in
              flight, so a stray /about visit never flashes as a full
              page before it's relocated into a window. */}
          {/* Not before the viewport is known either: a desktop visit to
              /about would otherwise flash the bare page for a frame
              before being relocated into a window. */}
          {isLayoutReady && !strayNavItem && !strayPhoneRoute && children}
          <WindowLayer />
          <AppSwitcher />
          <ShellMascot variant="desktop" />
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

  // The accessible nav renders from the first (server) pass so it's in the
  // HTML crawlers and text browsers get; never inside window iframes.
  if (isEmbedded === null) {
    return <AccessibleNav />;
  }

  if (isEmbedded) {
    return (
      <ThemeProvider>
        <LayoutProvider>{children}</LayoutProvider>
      </ThemeProvider>
    );
  }

  return (
    <>
      <AccessibleNav />
      <ThemeProvider>
        <LayoutProvider>
          <WindowManagerProvider>
            <Shell>{children}</Shell>
          </WindowManagerProvider>
        </LayoutProvider>
      </ThemeProvider>
    </>
  );
}
