"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useLayout } from "@/contexts/LayoutContext";
import { NAV_ITEMS } from "@/data/nav";

/* ─── data ──────────────────────────────────────────────────────── */

const QUICK_ACTIONS = [
  { id: "github",   label: "GitHub",   hint: "Open source profile",  icon: "GH", href: "https://github.com" },
  { id: "linkedin", label: "LinkedIn", hint: "Professional profile",  icon: "in", href: "https://linkedin.com" },
  { id: "email",    label: "Email",    hint: "Get in touch",          icon: "@",  href: "mailto:you@example.com" },
];

const NAV_SHORTCUTS: Record<string, string> = {
  "/":         "⇧H",
  "/about":    "⇧A",
  "/shop":     "⇧S",
  "/projects": "⇧P",
  "/notes":    "⇧N",
  "/tools":    "⇧T",
};

type AnyItem = {
  id: string;
  label: string;
  hint?: string;
  icon: string;
  shortcut?: string;
  href: string;
  section: "Quick Actions" | "Navigation";
  type: "action" | "nav";
};

/* ─── Kbd badge ─────────────────────────────────────────────────── */
/* Apple HIG: monospace, barely-there pill — reads as a hint, not UI chrome */

function Kbd({ children, active = false }: { children: string; active?: boolean }) {
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      fontSize: "10px",
      fontWeight: 500,
      letterSpacing: "0.04em",
      color: active ? "rgba(255,69,0,0.7)" : "rgba(255,255,255,0.22)",
      background: active ? "rgba(255,69,0,0.08)" : "rgba(255,255,255,0.05)",
      border: `0.5px solid ${active ? "rgba(255,69,0,0.2)" : "rgba(255,255,255,0.08)"}`,
      borderRadius: "5px",
      padding: "3px 7px",
      fontFamily: "ui-monospace, 'SF Mono', monospace",
      flexShrink: 0,
      transition: "color 0.15s, background 0.15s, border-color 0.15s",
    }}>
      {children}
    </span>
  );
}

/* ─── Section label ──────────────────────────────────────────────── */

function SectionLabel({ children }: { children: string }) {
  return (
    <div style={{
      fontSize: "10px",
      fontWeight: 600,
      color: "rgba(255,255,255,0.2)",
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      padding: "14px 14px 5px",
      fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
      userSelect: "none",
    }}>
      {children}
    </div>
  );
}

/* ─── Item ───────────────────────────────────────────────────────── */
/* 44px height = Apple HIG minimum touch/click target */

const itemVariants = {
  hidden: { opacity: 0, y: 5 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.18, ease: [0.25, 0, 0, 1] as const } },
};

function PaletteItem({
  icon, label, hint, shortcut, active, onClick,
}: {
  icon: string; label: string; hint?: string; shortcut?: string; active: boolean; onClick: () => void;
}) {
  return (
    <motion.button
      variants={itemVariants}
      onClick={onClick}
      style={{
        position: "relative",
        width: "100%",
        minHeight: "44px",
        display: "flex",
        alignItems: "center",
        gap: "11px",
        padding: "0 12px 0 14px",
        border: "none",
        cursor: "pointer",
        borderRadius: "9px",
        textAlign: "left",
        outline: "none",
        overflow: "hidden",
        background: active ? "rgba(255,69,0,0.07)" : "transparent",
        transition: "background 0.12s ease",
      }}
    >
      {/* Left orange accent bar — Raycast/Apple signature detail */}
      <span style={{
        position: "absolute",
        left: 0,
        top: "7px",
        bottom: "7px",
        width: "2.5px",
        borderRadius: "2px",
        background: "#FF4500",
        opacity: active ? 1 : 0,
        transition: "opacity 0.12s ease",
        flexShrink: 0,
      }} />

      {/* Icon bubble */}
      <span style={{
        width: "28px",
        height: "28px",
        borderRadius: "7px",
        background: active ? "rgba(255,69,0,0.12)" : "rgba(255,255,255,0.05)",
        border: `0.5px solid ${active ? "rgba(255,69,0,0.22)" : "rgba(255,255,255,0.07)"}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "9px",
        fontWeight: 700,
        letterSpacing: "0.02em",
        color: active ? "#FF4500" : "rgba(255,255,255,0.3)",
        flexShrink: 0,
        fontFamily: "ui-monospace, 'SF Mono', monospace",
        transition: "background 0.12s, border-color 0.12s, color 0.12s",
      }}>
        {icon}
      </span>

      {/* Text block */}
      <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1px", minWidth: 0 }}>
        <span style={{
          fontSize: "13px",
          fontWeight: 500,
          color: active ? "#FFFFFF" : "rgba(255,255,255,0.65)",
          fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
          letterSpacing: "-0.01em",
          transition: "color 0.12s",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
          {label}
        </span>
        {hint && (
          <span style={{
            fontSize: "11px",
            color: "rgba(255,255,255,0.2)",
            fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
            letterSpacing: "0",
          }}>
            {hint}
          </span>
        )}
      </span>

      {/* Shortcut badge */}
      {shortcut && <Kbd active={active}>{shortcut}</Kbd>}
    </motion.button>
  );
}

/* ─── Divider ────────────────────────────────────────────────────── */

function Hairline() {
  return (
    <div style={{
      height: "0.5px",
      background: "rgba(255,255,255,0.05)",
      margin: "4px 0",
    }} />
  );
}

/* ─── Main component ─────────────────────────────────────────────── */

const listVariants = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.03, delayChildren: 0.04 } },
};

export default function CommandPalette() {
  const { isSearchOpen, openSearch, closeSearch } = useLayout();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);

  const allItems: AnyItem[] = useMemo(() => [
    ...QUICK_ACTIONS.map((a) => ({ ...a, section: "Quick Actions" as const, type: "action" as const })),
    ...NAV_ITEMS.map((n) => ({
      id: n.href,
      label: n.label.charAt(0) + n.label.slice(1).toLowerCase(),
      hint: undefined as string | undefined,
      icon: n.num,
      shortcut: NAV_SHORTCUTS[n.href],
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

  /* Focus on open */
  useEffect(() => {
    if (isSearchOpen) {
      setQuery("");
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [isSearchOpen]);

  /* ⌘K / Ctrl+K */
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

  /* Arrow / Enter / Esc */
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

  /* Scroll active item into view */
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [cursor]);

  useEffect(() => { setCursor(0); }, [query]);

  function handleSelect(item: AnyItem | undefined) {
    if (!item) return;
    closeSearch();
    if (item.type === "nav") router.push(item.href);
    else window.open(item.href, "_blank");
  }

  let globalIdx = 0;

  return (
    <AnimatePresence>
      {isSearchOpen && (
        <>
          {/* ── Backdrop ─────────────────────────────────────────── */}
          <motion.div
            key="cp-bd"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={closeSearch}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 100,
              backdropFilter: "blur(4px) saturate(120%)",
              WebkitBackdropFilter: "blur(4px) saturate(120%)",
              backgroundColor: "rgba(0,0,0,0.42)",
            }}
          />

          {/* ── Glass panel ──────────────────────────────────────── */}
          <motion.div
            key="cp-panel"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 6, transition: { duration: 0.16, ease: [0.4, 0, 1, 1] } }}
            transition={{ type: "spring", stiffness: 500, damping: 40, mass: 0.8 }}
            style={{
              position: "fixed",
              top: "16%",
              left: "50%",
              x: "-50%",
              zIndex: 101,
              width: "540px",
              maxWidth: "calc(100vw - 40px)",
              borderRadius: "18px",
              overflow: "hidden",
              /* Glass material: dark theme — matches macOS .regularMaterial on dark */
              background: "rgba(16, 16, 18, 0.84)",
              backdropFilter: "blur(52px) saturate(160%)",
              WebkitBackdropFilter: "blur(52px) saturate(160%)",
              /* Edge definition: 0.5px border + top-edge light-catch inset */
              border: "0.5px solid rgba(255,255,255,0.09)",
              /* Shadow: large soft depth + thin specular rim on top */
              boxShadow: [
                "0 44px 88px rgba(0,0,0,0.55)",
                "0 12px 28px rgba(0,0,0,0.35)",
                "inset 0 1px 0 rgba(255,255,255,0.10)",   /* top light catch */
                "inset 0 -1px 0 rgba(0,0,0,0.25)",         /* bottom weight */
              ].join(", "),
            }}
          >

            {/* ── Search input row ─────────────────────────────── */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "0 16px",
              height: "56px",
              borderBottom: "0.5px solid rgba(255,255,255,0.06)",
              background: "rgba(255,255,255,0.015)",  /* barely lifted */
            }}>
              {/* Magnifier */}
              <svg
                width="15" height="15" viewBox="0 0 24 24"
                fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2"
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
                placeholder="Search pages, actions…"
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontSize: "15px",
                  fontWeight: 400,
                  color: "rgba(255,255,255,0.82)",
                  fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                  letterSpacing: "-0.01em",
                  caretColor: "#FF4500",
                }}
              />

              {/* Clear button or shortcut badge */}
              <AnimatePresence mode="wait">
                {query ? (
                  <motion.button
                    key="clear"
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    transition={{ duration: 0.12 }}
                    onClick={() => setQuery("")}
                    style={{
                      width: "20px",
                      height: "20px",
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.08)",
                      border: "0.5px solid rgba(255,255,255,0.08)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "rgba(255,255,255,0.35)",
                      fontSize: "12px",
                      lineHeight: 1,
                      padding: 0,
                      flexShrink: 0,
                    }}
                  >
                    ×
                  </motion.button>
                ) : (
                  <motion.span
                    key="hint"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                  >
                    <Kbd>⌘K</Kbd>
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            {/* ── Results list ─────────────────────────────────── */}
            <div
              style={{
                maxHeight: "380px",
                overflowY: "auto",
                padding: "6px 6px",
                /* Orange hairline scrollbar */
                scrollbarWidth: "thin",
                scrollbarColor: "rgba(255,69,0,0.35) transparent",
              }}
            >
              {filtered.length === 0 ? (
                <div style={{
                  padding: "36px 16px",
                  textAlign: "center",
                  color: "rgba(255,255,255,0.2)",
                  fontSize: "13px",
                  fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                  letterSpacing: "-0.01em",
                }}>
                  No results for &ldquo;{query}&rdquo;
                </div>
              ) : (
                /* key=query forces re-stagger on every new search */
                <motion.div
                  key={query}
                  variants={listVariants}
                  initial="hidden"
                  animate="show"
                >
                  {Array.from(sections.entries()).map(([section, items], sectionIdx) => (
                    <div key={section}>
                      {sectionIdx > 0 && <Hairline />}
                      <SectionLabel>{section}</SectionLabel>
                      {items.map((item) => {
                        const idx = globalIdx++;
                        const isActive = cursor === idx;
                        return (
                          <div
                            key={item.id}
                            ref={isActive ? activeRef : undefined}
                          >
                            <PaletteItem
                              icon={item.icon}
                              label={item.label}
                              hint={item.hint}
                              shortcut={item.shortcut}
                              active={isActive}
                              onClick={() => handleSelect(item)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </motion.div>
              )}
            </div>

            {/* ── Footer bar ───────────────────────────────────── */}
            {/* Slightly darker material — Apple uses this to ground the overlay */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 16px",
              height: "38px",
              borderTop: "0.5px solid rgba(255,255,255,0.05)",
              background: "rgba(0,0,0,0.18)",
            }}>
              <span style={{
                fontSize: "11px",
                fontWeight: 500,
                color: "rgba(255,255,255,0.18)",
                fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}>
                Portfolio
              </span>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {/* Navigation hint */}
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <Kbd>↑↓</Kbd>
                  <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.18)", fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}>
                    navigate
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <Kbd>↵</Kbd>
                  <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.18)", fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}>
                    open
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <Kbd>Esc</Kbd>
                  <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.18)", fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}>
                    close
                  </span>
                </div>
              </div>
            </div>

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
