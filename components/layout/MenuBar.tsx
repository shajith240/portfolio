"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLayout } from "@/contexts/LayoutContext";
import { useWindowManager } from "@/contexts/WindowManagerContext";
import ControlCenter from "@/components/layout/ControlCenter";
import NotificationCenter from "@/components/layout/NotificationCenter";
import { applyLiquidGlass, releaseLiquidGlass, useLiquidGlass } from "@/lib/liquidGlass";

/* macOS menu bar — Tahoe dark mode, and every item WORKS. No fake
   File/Edit menus, no decorative glyphs: the bar is real navigation
   for the portfolio, in real macOS anatomy.

   - 24px bar, glass material, hairline bottom border.
   - Left: "Shajith" (bold app-name slot) with a dropdown (About,
     GitHub/LinkedIn/LeetCode, source), then "Go" (opens each page as
     a window — Finder's own Go menu is the model) and "Contact".
   - Menu behavior is real macOS: click opens, hovering another title
     while one is open switches to it, Escape/outside click closes,
     menu rows highlight with the system-blue fill.
   - Right: Wi-Fi + battery glyphs and the clock in Apple's exact
     menu-bar format: "Sun Jul 5  12:10 PM" — one line, no comma. */

const BAR_HEIGHT = 24;
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

function MenuDropdown({ entries, onClose }: { entries: MenuEntry[]; onClose: () => void }) {
  // Menus are real Liquid Glass surfaces too — engine + rim class,
  // higher tint than panels so 13px text stays readable over busy
  // wallpapers.
  const lgRef = useLiquidGlass<HTMLDivElement>({ radius: 10, bezel: 8, strength: 0.55, blur: 9, brightness: 0.78, tint: 0.3 });
  return (
    <motion.div
      ref={lgRef}
      className="liquid-glass"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.12, ease: [0, 0, 0.58, 1] }}
      style={{
        position: "absolute",
        top: "calc(100% + 5px)",
        left: 0,
        minWidth: "216px",
        padding: "5px",
        borderRadius: "10px",
        transformOrigin: "top left",
        zIndex: 10,
      }}
    >
      {entries.map((entry, i) =>
        entry === "separator" ? (
          <div key={i} style={{ height: "1px", background: "rgba(255, 255, 255, 0.12)", margin: "5px 10px" }} />
        ) : (
          <MenuRow key={i} entry={entry} onClose={onClose} />
        ),
      )}
    </motion.div>
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
        padding: "4px 10px",
        borderRadius: "6px",
        border: "none",
        fontSize: "13px",
        fontWeight: 400,
        lineHeight: "18px",
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

export default function MenuBar() {
  const { isMobileLayout, openSearch } = useLayout();
  const { openWindow, windows } = useWindowManager();
  const [clock, setClock] = useState("");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [hoveredTitle, setHoveredTitle] = useState<string | null>(null);
  const [ncOpen, setNcOpen] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => setClock(formatMenuClock(new Date()));
    update();
    const id = setInterval(update, 15_000);
    return () => clearInterval(id);
  }, []);

  // Liquid Glass on the bar itself (radius 0 — the refraction lives
  // along the top/bottom edges). barRef already exists for
  // outside-click detection, so the engine attaches via effect.
  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const apply = () => applyLiquidGlass(el, { radius: 0, bezel: 8, strength: 0.5, blur: 8, brightness: 0.8, tint: 0.22 });
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

  const external = (url: string) => () => window.open(url, "_blank", "noopener,noreferrer");

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
      entries: [
        { label: "About", action: () => openWindow("/about", "About") },
        { label: "Projects", action: () => openWindow("/projects", "Projects") },
        { label: "Skills", action: () => openWindow("/skills", "Skills") },
        { label: "DSA", action: () => openWindow("/dsa", "DSA") },
        { label: "Notes", action: () => openWindow("/notes", "Notes") },
        { label: "Uses", action: () => openWindow("/uses", "Uses") },
      ],
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
        padding: "0 16px 0 10px",
        // Material from the refraction engine (effect above).
        borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
        fontSize: "13px",
        color: "rgba(255, 255, 255, 0.92)",
        userSelect: "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", height: "100%" }}>
        {menus.map((menu) => {
          const isOpen = openMenu === menu.title;
          return (
            <div key={menu.title} style={{ position: "relative", height: "100%" }}>
              <button
                onClick={() => setOpenMenu(isOpen ? null : menu.title)}
                // Real macOS: once any menu is open, gliding across
                // the titles switches menus without another click.
                onMouseEnter={() => {
                  if (openMenu && !isOpen) setOpenMenu(menu.title);
                  setHoveredTitle(menu.title);
                }}
                onMouseLeave={() => setHoveredTitle(null)}
                style={{
                  height: "100%",
                  padding: "0 10px",
                  border: "none",
                  borderRadius: "5px",
                  fontSize: "13px",
                  fontWeight: menu.bold ? 600 : 400,
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
                {menu.title}
              </button>
              <AnimatePresence>
                {isOpen && <MenuDropdown entries={menu.entries} onClose={() => setOpenMenu(null)} />}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
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
            padding: "2px",
            cursor: "default",
          }}
        >
          <SearchGlyph />
        </button>
        <ControlCenter />
        {/* The clock is Notification Center's trigger — the real
            macOS gesture since Big Sur. */}
        <button
          onClick={() => setNcOpen((o) => !o)}
          // Without this, clicking the clock while the panel is open
          // would fire the panel's outside-click close first and the
          // toggle would immediately reopen it.
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            border: "none",
            background: ncOpen ? "rgba(255, 255, 255, 0.18)" : "transparent",
            borderRadius: "5px",
            padding: "2px 6px",
            fontSize: "13px",
            color: "rgba(255, 255, 255, 0.92)",
            whiteSpace: "nowrap",
            fontVariantNumeric: "tabular-nums",
            cursor: "default",
          }}
        >
          {clock}
        </button>
        <NotificationCenter open={ncOpen} onClose={() => setNcOpen(false)} />
      </div>
    </div>
  );
}
