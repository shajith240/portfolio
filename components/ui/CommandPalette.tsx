"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useLayout } from "@/contexts/LayoutContext";
import { useWindowManager } from "@/contexts/WindowManagerContext";
import { NAV_ITEMS } from "@/data/nav";
import { applyLiquidGlass, releaseLiquidGlass } from "@/lib/liquidGlass";

/* macOS Spotlight (Tahoe, dark mode) — restyled to match the real
   thing, not a generic web command palette. The load-bearing
   differences from the previous version, each checkable against
   actual Spotlight:
   - no close ×, no clear ×, no ⌘K hint, no footer bar — Spotlight's
     chrome is the search field and the results, nothing else
   - no full-screen dim/blur behind it; the backdrop is a transparent
     click-catcher only
   - large search field (~20px text in a ~58px row) with a plain
     magnifier, placeholder "Search"
   - selection is a SOLID system-blue rounded rect with white text —
     not a translucent white overlay; hover is a faint white wash
   - icons are plain glyphs, not bordered chip "bubbles"
   - section headers are 11px semibold sentence-case gray, not
     uppercase letter-spaced eyebrows
   - rows don't drift sideways and results don't stagger in; the
     panel itself appears in one quick fade+scale (~180ms ease-out,
     no spring bounce)
   - Liquid Glass material: heavy blur + saturation, hairline border,
     top-edge inner highlight, one deep soft shadow */

const SPOTLIGHT_EASE = [0.32, 0.72, 0, 1] as const;
const ACCENT_BLUE = "#0a84ff"; // macOS systemBlue, dark mode

/* ─── SVG icon components ────────────────────────────────────────── */

const GithubIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

const LinkedinIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const MailIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const HomeIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9,22 9,12 15,12 15,22" />
  </svg>
);

const AboutIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const FolderIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

const StarIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
  </svg>
);

const CodeIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16,18 22,12 16,6" />
    <polyline points="8,6 2,12 8,18" />
  </svg>
);

const AwardIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="6" />
    <path d="M9 13.5 7 22l5-3 5 3-2-8.5" />
  </svg>
);

const GraduationCapIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 10 12 5 2 10l10 5 10-5Z" />
    <path d="M6 12v5c0 1.66 2.69 3 6 3s6-1.34 6-3v-5" />
  </svg>
);

/* ─── data ──────────────────────────────────────────────────────── */

const QUICK_ACTIONS = [
  { id: "github",   label: "GitHub",   hint: "Open source profile",  icon: <GithubIcon />,   href: "https://github.com/shajith240" },
  { id: "linkedin", label: "LinkedIn", hint: "Professional profile",  icon: <LinkedinIcon />, href: "https://linkedin.com/in/shajith240" },
  { id: "email",    label: "Email",    hint: "Get in touch",          icon: <MailIcon />,     href: "mailto:shajith240@gmail.com" },
];

const NAV_ICONS: Record<string, React.ReactNode> = {
  "/":         <HomeIcon />,
  "/about":    <AboutIcon />,
  "/projects": <FolderIcon />,
  "/skills":   <StarIcon />,
  "/dsa":      <CodeIcon />,
  "/achievements": <AwardIcon />,
  "/education":    <GraduationCapIcon />,
};

// No keyboard-shortcut chips on rows — real Spotlight rows carry no
// badge clutter, just glyph + text. (The ⇧-shortcut chips this
// component once had were a web-command-palette convention, not an
// Apple one.)
type AnyItem = {
  id: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  href: string;
  section: "Quick Actions" | "Navigation";
  type: "action" | "nav";
};

/* ─── Section label — Spotlight style: 11px semibold sentence-case
       gray, NOT an uppercase letter-spaced eyebrow. ─────────────── */

function SectionLabel({ children }: { children: string }) {
  return (
    <div style={{
      fontSize: "11px",
      fontWeight: 600,
      color: "rgba(255, 255, 255, 0.4)",
      padding: "12px 14px 4px",
      fontFamily: "system-ui, -apple-system, sans-serif",
      userSelect: "none",
    }}>
      {children}
    </div>
  );
}

/* ─── Item — Spotlight row anatomy: plain glyph, single-line text,
       translucent system-blue selection wash. Real Spotlight rows
       do NOT react to the pointer: no hover highlight, no fade, and
       the keyboard selection never follows the mouse — the row only
       responds to click. Selection moves instantly (no transition),
       like every native list. ──────────────────────────────────── */

function PaletteItem({
  icon, label, hint, active, onClick,
}: {
  icon: React.ReactNode; label: string; hint?: string;
  active: boolean; onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        width: "100%",
        minHeight: "40px",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "0 12px",
        border: "none",
        cursor: "default", // Spotlight rows use the arrow cursor, not a pointer
        borderRadius: "8px",
        textAlign: "left",
        outline: "none",
        overflow: "hidden",
        // Selection is a translucent system-blue WASH, not a solid
        // fill — that's what real Spotlight does on the glass panel
        // (researched: ~a third-opacity blue over the material,
        // radius 8, no solid #0a84ff block).
        // Hover is a faint instant wash under the pointer (macOS
        // shows one); it never moves the keyboard selection and
        // never fades — both states snap like a native list.
        background: active
          ? "rgba(10, 132, 255, 0.32)"
          : hovered
          ? "rgba(255, 255, 255, 0.06)"
          : "transparent",
      }}
    >
      <span
        aria-hidden
        style={{
          width: "22px",
          height: "22px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          color: active ? "#ffffff" : "rgba(255, 255, 255, 0.65)",
        }}
      >
        {icon}
      </span>

      <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1px", minWidth: 0 }}>
        <span
          style={{
            fontSize: "13px",
            fontWeight: active ? 500 : 400,
            fontFamily: "system-ui, -apple-system, sans-serif",
            letterSpacing: "-0.01em",
            color: active ? "#ffffff" : "rgba(255, 255, 255, 0.85)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            display: "block",
          }}
        >
          {label}
        </span>
        {hint && (
          <span style={{
            fontSize: "11px",
            color: active ? "rgba(255, 255, 255, 0.75)" : "rgba(255, 255, 255, 0.4)",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}>
            {hint}
          </span>
        )}
      </span>

    </button>
  );
}

/* ─── Divider ────────────────────────────────────────────────────── */

function Hairline() {
  return (
    <div style={{
      height: "0.5px",
      background: "rgba(255, 255, 255, 0.1)",
      margin: "4px 8px",
    }} />
  );
}

/* ─── Main component ─────────────────────────────────────────────── */

export default function CommandPalette() {
  const { isSearchOpen, openSearch, closeSearch, isMobileLayout, isTabletLayout } = useLayout();
  const { openWindow } = useWindowManager();
  const router = useRouter();
  const isPhone = isMobileLayout && !isTabletLayout;
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  // Panel material — refraction engine, attached via CALLBACK ref:
  // the panel only exists while search is open, so a mount-time
  // hook in this component would run before the node exists and
  // never apply (that was the fully-transparent-Spotlight bug).
  const panelNode = useRef<HTMLDivElement | null>(null);
  const attachPanelGlass = (el: HTMLDivElement | null) => {
    if (el) {
      panelNode.current = el;
      applyLiquidGlass(el, { radius: 24, bezel: 14, strength: 0.6, blur: 5, brightness: 0.88, tint: 0.3 });
    } else if (panelNode.current) {
      releaseLiquidGlass(panelNode.current);
      panelNode.current = null;
    }
  };
  const activeRef = useRef<HTMLDivElement>(null);

  const allItems: AnyItem[] = useMemo(() => [
    ...QUICK_ACTIONS.map((a) => ({ ...a, section: "Quick Actions" as const, type: "action" as const })),
    ...NAV_ITEMS.map((n) => ({
      id: n.href,
      label: n.label.charAt(0) + n.label.slice(1).toLowerCase(),
      hint: undefined as string | undefined,
      icon: NAV_ICONS[n.href] ?? <CodeIcon />,
      href: n.href,
      section: "Navigation" as const,
      type: "nav" as const,
    })),
  ], []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return q ? allItems.filter((i) => i.label.toLowerCase().includes(q)) : allItems;
  }, [query, allItems]);

  const sections = useMemo(() => {
    const map = new Map<string, AnyItem[]>();
    for (const item of filtered) {
      if (!map.has(item.section)) map.set(item.section, []);
      map.get(item.section)!.push(item);
    }
    return map;
  }, [filtered]);

  useEffect(() => {
    if (isSearchOpen) {
      // Blur any focused input (e.g. skills search bar) so keystrokes go to the palette
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      setQuery("");
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [isSearchOpen]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        isSearchOpen ? closeSearch() : openSearch();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [isSearchOpen, openSearch, closeSearch]);

  useEffect(() => {
    if (!isSearchOpen) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(c + 1, filtered.length - 1)); }
      if (e.key === "ArrowUp")   { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
      if (e.key === "Enter")     { e.preventDefault(); handleSelect(filtered[cursor]); }
      if (e.key === "Escape")    { closeSearch(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSearchOpen, filtered, cursor]);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  useEffect(() => { setCursor(0); }, [query]);

  function handleSelect(item: AnyItem | undefined) {
    if (!item) return;
    closeSearch();
    if (item.type === "nav") {
      // Desktop: open the page as a WINDOW, exactly like the Dock and
      // menu bar do. router.push here navigated the whole top-level
      // page to /about, tearing down the entire desktop (wallpaper,
      // widgets, dock) before AppShell's stray-route guard bounced it
      // back to "/" and remounted everything — which read as the whole
      // app reloading on every Spotlight navigation (reported bug).
      // Home is the desktop itself, so it just closes the palette.
      // Phones have no window system — real navigation stays correct.
      if (isPhone) {
        router.push(item.href);
      } else if (item.href !== "/") {
        openWindow(item.href, item.label);
      }
    } else {
      window.open(item.href, "_blank");
    }
  }

  let globalIdx = 0;

  return (
    <AnimatePresence>
      {isSearchOpen && (
        <>
          {/* Transparent click-catcher — real Spotlight does not dim
              or blur the screen behind it. */}
          <div
            key="cp-bd"
            onClick={closeSearch}
            style={{ position: "fixed", inset: 0, zIndex: 100 }}
          />

          {/* ── Liquid Glass panel — refraction engine + rim class;
                 higher tint so 22px query text stays readable. ──── */}
          <motion.div
            key="cp-panel"
            ref={attachPanelGlass}
            className="liquid-glass"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.12, ease: "easeIn" } }}
            transition={{ duration: 0.18, ease: SPOTLIGHT_EASE }}
            style={{
              position: "fixed",
              top: "20%",
              left: "50%",
              x: "-50%",
              zIndex: 101,
              width: "640px",
              maxWidth: "calc(100vw - 40px)",
              borderRadius: "24px",
              overflow: "hidden",
              willChange: "transform, opacity",
            }}
          >

            {/* ── Search field — Spotlight's is large and bare:
                magnifier + big text, nothing else. ─────────────── */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "0 18px",
              height: "58px",
            }}>
              <svg
                width="18" height="18" viewBox="0 0 24 24"
                fill="none" stroke="rgba(255, 255, 255, 0.45)" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"
                style={{ flexShrink: 0 }}
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>

              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search"
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontSize: "20px",
                  fontWeight: 400,
                  color: "rgba(255, 255, 255, 0.9)",
                  fontFamily: "system-ui, -apple-system, sans-serif",
                  letterSpacing: "-0.01em",
                  caretColor: ACCENT_BLUE,
                }}
              />
            </div>

            {/* Hairline between field and results, exactly like
                Spotlight once results are showing. */}
            {filtered.length > 0 && (
              <div style={{ height: "0.5px", background: "rgba(255, 255, 255, 0.1)" }} />
            )}

            {/* ── Results ──────────────────────────────────────── */}
            <div
              style={{
                maxHeight: "384px",
                overflowY: "auto",
                padding: "6px 8px 8px",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              }}
            >
              {filtered.length === 0 ? (
                <div style={{
                  padding: "36px 16px",
                  textAlign: "center",
                  color: "rgba(255, 255, 255, 0.4)",
                  fontSize: "13px",
                  fontFamily: "system-ui, -apple-system, sans-serif",
                  letterSpacing: "-0.01em",
                }}>
                  No results for &ldquo;{query}&rdquo;
                </div>
              ) : (
                Array.from(sections.entries()).map(([section, items], sectionIdx) => (
                  <div key={section}>
                    {sectionIdx > 0 && <Hairline />}
                    <SectionLabel>{section}</SectionLabel>
                    {items.map((item) => {
                      const idx = globalIdx++;
                      const isActive = cursor === idx;
                      return (
                        <div key={item.id} ref={isActive ? activeRef : undefined}>
                          <PaletteItem
                            icon={item.icon}
                            label={item.label}
                            hint={item.hint}
                            active={isActive}
                            onClick={() => handleSelect(item)}
                          />
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
