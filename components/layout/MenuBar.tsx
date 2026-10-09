"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useLayout } from "@/contexts/LayoutContext";
import { useWindowManager, MENU_BAR_HEIGHT } from "@/contexts/WindowManagerContext";
import { VISIBLE_NAV_ITEMS } from "@/data/nav";
import { applyLiquidGlass, releaseLiquidGlass, useLiquidGlass } from "@/lib/liquidGlass";
import { openExternal } from "@/lib/externalLink";

/* macOS menu bar — Tahoe dark mode, and every item WORKS. No fake
   File/Edit menus, no decorative glyphs: the bar is real navigation
   for the portfolio, in real macOS anatomy.

   - 34px bar (the roomier height of Apple's notched MacBooks, not the
     cramped 24px of old displays), glass material, hairline border.
   - Titles highlight with Tahoe's floating capsule (inset from the
     bar's edges), not a full-height block.
   - Left: "Shajith" (bold app-name slot) with a dropdown (About,
     GitHub/LinkedIn/LeetCode, source), then "Go" (opens each page as
     a window — Finder's own Go menu is the model) and "Contact".
   - Menu behavior is real macOS: click opens, hovering another title
     while one is open switches to it, Escape/outside click closes,
     menu rows highlight with the system-blue fill.
   - Right: Wi-Fi + battery glyphs, the Spotlight trigger, and the
     clock in Apple's exact menu-bar format: "Sun Jul 5  12:10 PM" —
     one line, no comma. The clock is plain text, not a button: there
     is no Notification Center (or Control Center) behind it. */

const BAR_HEIGHT = MENU_BAR_HEIGHT;
// The capsule behind a hovered/open title, and the side gutters.
const PILL_HEIGHT = 26;
const EDGE = 18;
const ACCENT = "#0a84ff";

type MenuEntry = { label: string; action: () => void } | "separator";

function formatMenuClock(d: Date): string {
  const wd = d.toLocaleDateString("en-US", { weekday: "short" });
  const mo = d.toLocaleDateString("en-US", { month: "short" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  return `${wd} ${mo} ${d.getDate()} ${time}`;
}

const WifiGlyph = () => (
  <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
    <path d="M1.6 4.2a9.2 9.2 0 0 1 12.8 0" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M4 6.8a5.6 5.6 0 0 1 8 0" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="8" cy="10" r="1.5" fill="rgba(255,255,255,0.9)" />
  </svg>
);

const BatteryGlyph = () => (
  <svg width="26" height="12" viewBox="0 0 26 12" fill="none">
    <rect x="0.5" y="0.5" width="21" height="11" rx="3" stroke="rgba(255,255,255,0.45)" />
    <path d="M23 4v4a2 2 0 0 0 1.3-2A2 2 0 0 0 23 4Z" fill="rgba(255,255,255,0.45)" />
    <rect x="2" y="2" width="14.5" height="8" rx="1.6" fill="rgba(255,255,255,0.9)" />
  </svg>
);

function MenuDropdown({ entries, onClose, anchorLeft }: { entries: MenuEntry[]; onClose: () => void; anchorLeft: number }) {
  // Menus are real Liquid Glass surfaces too — engine + rim class,
  // higher tint than panels so 13px text stays readable over busy
  // wallpapers. Blur is Apple's actual Liquid Glass range (3-6px),
  // not frosted-glass territory.
  const lgRef = useLiquidGlass<HTMLDivElement>({ radius: 14, bezel: 10, strength: 0.55, blur: 5, brightness: 0.88, tint: 0.3 });
  // PORTALED to <body>, deliberately NOT rendered inside the bar: the
  // bar has its own backdrop-filter, which per the filter-effects spec
  // makes it a "backdrop root" — a descendant's backdrop-filter can
  // only sample content INSIDE that root, and the dropdown hangs
  // below the bar's painted area, so nested it sampled nothing and
  // rendered as plain transparency (the reported bug). As a sibling
  // of the bar it samples the real page behind it.
  return createPortal(
    <motion.div
      ref={lgRef}
      className="liquid-glass"
      data-menubar-popover
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.12, ease: [0, 0, 0.58, 1] }}
      style={{
        position: "fixed",
        top: `${BAR_HEIGHT + 4}px`,
        left: `${anchorLeft}px`,
        minWidth: "232px",
        padding: "6px",
        // Concentric with the rows: row radius (8) + padding (6).
        borderRadius: "14px",
        transformOrigin: "top left",
        // Above windows (z ~100+) and the Dock (90) — real macOS menus
        // top everything on the desktop.
        zIndex: 4000,
      }}
    >
      {entries.map((entry, i) =>
        entry === "separator" ? (
          <div key={i} style={{ height: "1px", background: "rgba(255, 255, 255, 0.12)", margin: "6px 12px" }} />
        ) : (
          <MenuRow key={i} entry={entry} onClose={onClose} />
        ),
      )}
    </motion.div>,
    document.body,
  );
}

function MenuRow({ entry, onClose }: { entry: Exclude<MenuEntry, "separator">; onClose: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => {
        onClose();
        entry.action();
      }}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "5px 12px",
        borderRadius: "8px",
        border: "none",
        fontSize: "13.5px",
        fontWeight: 400,
        lineHeight: "20px",
        color: "rgba(255, 255, 255, 0.92)",
        // Translucent accent wash, not a solid block — macOS menu
        // highlights are vibrancy-tinted, so the glass shows through.
        background: hovered ? "rgba(10, 132, 255, 0.55)" : "transparent",
        cursor: "default",
      }}
    >
      {entry.label}
    </button>
  );
}

const SearchGlyph = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="6" cy="6" r="4.6" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" />
    <path d="M9.6 9.6L13 13" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// Owns its own 15s tick — previously this state lived in MenuBar itself,
// so every tick re-rendered the entire bar (menus array rebuilt, frontmost
// recomputed) just to update
// this one text node. Isolated here, only this span re-renders every 15s.
function Clock() {
  const [clock, setClock] = useState("");
  useEffect(() => {
    const update = () => setClock(formatMenuClock(new Date()));
    update();
    const id = setInterval(update, 15_000);
    return () => clearInterval(id);
  }, []);
  return <>{clock}</>;
}

export default function MenuBar() {
  const { isMobileLayout, openSearch } = useLayout();
  const { openWindow, windows } = useWindowManager();
  // Carries the anchor's left edge alongside the title — the dropdown
  // is portaled to <body> (see MenuDropdown), so it can't position
  // itself relative to its button anymore; the opener measures for it.
  const [openMenu, setOpenMenu] = useState<{ title: string; left: number } | null>(null);
  const [hoveredTitle, setHoveredTitle] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  // Liquid Glass on the bar itself (radius 0 — the refraction lives
  // along the top/bottom edges). barRef already exists for
  // outside-click detection, so the engine attaches via effect.
  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const apply = () => applyLiquidGlass(el, { radius: 0, bezel: 8, strength: 0.5, blur: 5, brightness: 0.88, tint: 0.22, press: false });
    apply();
    let t: ReturnType<typeof setTimeout> | undefined;
    const onResize = () => {
      if (t) clearTimeout(t);
      t = setTimeout(apply, 150);
    };
    window.addEventListener("resize", onResize);
    return () => {
      if (t) clearTimeout(t);
      window.removeEventListener("resize", onResize);
      releaseLiquidGlass(el);
    };
  }, []);

  // Escape and outside-click both dismiss, like real menus.
  useEffect(() => {
    if (!openMenu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenu(null);
    };
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Element | null;
      // The dropdown itself is portaled to <body>, so it's no longer
      // inside barRef — a press on one of its own rows must not count
      // as "outside" (it would close the menu before the row's click
      // could fire).
      if (target?.closest?.("[data-menubar-popover]")) return;
      if (barRef.current && !barRef.current.contains(e.target as Node)) setOpenMenu(null);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [openMenu]);

  if (isMobileLayout) return null;

  const external = (url: string) => () => openExternal(url);

  // Real macOS swaps the bold app-name slot to the frontmost app.
  // Here: the highest-z window's title while any window is open,
  // "Shajith" back on the bare desktop (Finder's role).
  const frontmost = windows.length
    ? windows.reduce((a, b) => (a.zIndex > b.zIndex ? a : b))
    : null;

  const menus: { title: string; bold?: boolean; entries: MenuEntry[] }[] = [
    {
      title: frontmost?.title ?? "Shajith",
      bold: true,
      entries: [
        { label: "About This Portfolio", action: () => openWindow("/about", "About") },
        "separator",
        { label: "GitHub", action: external("https://github.com/shajith240") },
        { label: "LinkedIn", action: external("https://www.linkedin.com/in/shajith240") },
        { label: "LeetCode", action: external("https://leetcode.com/shajith240") },
        "separator",
        { label: "View Source", action: external("https://github.com/shajith240/portfolio") },
      ],
    },
    {
      title: "Go",
      // Every section window except Home (the desktop itself), minus any
      // section that has no content yet (data/nav.ts).
      entries: VISIBLE_NAV_ITEMS.filter((item) => item.href !== "/").map((item) => ({
        label: item.label,
        action: () => openWindow(item.href, item.label),
      })),
    },
    {
      title: "Contact",
      entries: [
        { label: "Email Me", action: external("mailto:shajith240@gmail.com") },
        "separator",
        { label: "GitHub", action: external("https://github.com/shajith240") },
        { label: "LinkedIn", action: external("https://www.linkedin.com/in/shajith240") },
      ],
    },
  ];

  return (
    <div
      ref={barRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: `${BAR_HEIGHT}px`,
        zIndex: 99,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        // Titles carry their own 12px side padding, so the wordmark's
        // text lands EDGE px from the left, matching the clock's right.
        padding: `0 ${EDGE}px 0 ${EDGE - 12}px`,
        // Material from the refraction engine (effect above).
        borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
        fontSize: "13.5px",
        color: "rgba(255, 255, 255, 0.92)",
        userSelect: "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "2px", height: "100%" }}>
        {menus.map((menu) => {
          const isOpen = openMenu?.title === menu.title;
          return (
            <div key={menu.title} style={{ position: "relative", height: "100%", display: "flex", alignItems: "center" }}>
              <button
                onClick={(e) =>
                  setOpenMenu(isOpen ? null : { title: menu.title, left: e.currentTarget.getBoundingClientRect().left })
                }
                // Real macOS: once any menu is open, gliding across
                // the titles switches menus without another click.
                onMouseEnter={(e) => {
                  if (openMenu && !isOpen)
                    setOpenMenu({ title: menu.title, left: e.currentTarget.getBoundingClientRect().left });
                  setHoveredTitle(menu.title);
                }}
                onMouseLeave={() => setHoveredTitle(null)}
                style={{
                  height: `${PILL_HEIGHT}px`,
                  padding: "0 12px",
                  border: "none",
                  borderRadius: "999px",
                  // Flex-centering (rather than relying on line-height
                  // alone) keeps every title's baseline anchored to the
                  // bar's vertical center regardless of its font's own
                  // ascender/descender metrics.
                  display: "inline-flex",
                  alignItems: "center",
                  // The personal wordmark slot ("Shajith" on the bare
                  // desktop, per menu.title's fallback above) gets the
                  // Borel script treatment; every other app-name title
                  // (About, Skills, Education…) stays on the system font —
                  // Borel is a brand mark, not a general title style.
                  // Borel's ascenders sit
                  // much taller above its baseline than the system
                  // font's do at the same nominal size — a normal
                  // line-height (matching every other title, not 1)
                  // is what keeps them from poking past the bar, and
                  // the size has to come down from a "reads right on
                  // its own" size to one that actually fits the box.
                  fontFamily: menu.title === "Shajith" ? "var(--font-borel)" : "inherit",
                  fontSize: menu.title === "Shajith" ? "15px" : "13.5px",
                  lineHeight: "20px",
                  fontWeight: menu.title === "Shajith" ? 400 : menu.bold ? 600 : 500,
                  color: "rgba(255, 255, 255, 0.92)",
                  // Closed titles still give hover feedback (a
                  // fainter pill than the open state) — without it
                  // the bar reads dead until the first click.
                  background: isOpen
                    ? "rgba(255, 255, 255, 0.18)"
                    : hoveredTitle === menu.title
                    ? "rgba(255, 255, 255, 0.10)"
                    : "transparent",
                  cursor: "default",
                }}
              >
                {/* Borel's baseline sits visually higher within its
                    own line box than the system font's, so the label
                    gets nudged down a couple px — on an inner span,
                    NOT the button: transforming the button moved its
                    highlight pill down with the text, which is why
                    the pill sat visibly off-center (reported bug). */}
                <span
                  style={
                    menu.title === "Shajith"
                      ? { display: "inline-block", transform: "translateY(4px)" }
                      : undefined
                  }
                >
                  {menu.title}
                </span>
              </button>
              <AnimatePresence>
                {isOpen && openMenu && (
                  <MenuDropdown entries={menu.entries} onClose={() => setOpenMenu(null)} anchorLeft={openMenu.left} />
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
        <WifiGlyph />
        <BatteryGlyph />
        {/* Spotlight lives in the status cluster, left of the clock —
            same slot as real macOS. The palette itself already
            existed; this is its visible trigger. */}
        <button
          onClick={openSearch}
          aria-label="Spotlight search"
          style={{
            display: "flex",
            alignItems: "center",
            border: "none",
            background: "transparent",
            // A capsule-sized hit area, so it's not a 14px target.
            width: "28px",
            height: `${PILL_HEIGHT}px`,
            justifyContent: "center",
            margin: "0 -7px",
            borderRadius: "999px",
            padding: 0,
            cursor: "default",
          }}
        >
          <SearchGlyph />
        </button>
        <span
          style={{
            fontSize: "13.5px",
            fontWeight: 500,
            color: "rgba(255, 255, 255, 0.92)",
            whiteSpace: "nowrap",
            fontVariantNumeric: "tabular-nums",
            cursor: "default",
          }}
        >
          <Clock />
        </span>
      </div>
    </div>
  );
}
