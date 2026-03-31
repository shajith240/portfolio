"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useLayout } from "@/contexts/LayoutContext";
import { NAV_ITEMS } from "@/data/nav";
import { useHoverSound } from "@/lib/useHoverSound";

/* ─── SVG icon components ────────────────────────────────────────── */

const GithubIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

const LinkedinIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const MailIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const HomeIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9,22 9,12 15,12 15,22" />
  </svg>
);

const AboutIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const FolderIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

const StarIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
  </svg>
);

const CodeIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16,18 22,12 16,6" />
    <polyline points="8,6 2,12 8,18" />
  </svg>
);

const FileTextIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14,2 14,8 20,8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);

const ToolIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
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
  "/notes":    <FileTextIcon />,
  "/uses":     <ToolIcon />,
};

const NAV_SHORTCUTS: Record<string, string> = {
  "/":         "H",
  "/about":    "A",
  "/projects": "P",
  "/skills":   "S",
  "/dsa":      "D",
  "/notes":    "N",
  "/uses":     "U",
};

type AnyItem = {
  id: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  shortcut?: string;
  href: string;
  section: "Quick Actions" | "Navigation";
  type: "action" | "nav";
};

/* ─── Kbd badge ──────────────────────────────────────────────────── */

function Kbd({ children }: { children: string }) {
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      fontSize: "10px",
      fontWeight: 500,
      letterSpacing: "0.06em",
      color: "var(--kbd-color)",
      background: "var(--kbd-bg)",
      border: "0.5px solid var(--kbd-border)",
      borderRadius: "5px",
      padding: "3px 7px",
      fontFamily: "ui-monospace, 'SF Mono', monospace",
      flexShrink: 0,
      transition: "color 0.22s ease, background 0.22s ease, border-color 0.22s ease",
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
      color: "var(--palette-section-lbl)",
      letterSpacing: "0.10em",
      textTransform: "uppercase",
      padding: "14px 14px 5px",
      fontFamily: "system-ui, sans-serif",
      userSelect: "none",
      transition: "color 0.22s ease",
    }}>
      {children}
    </div>
  );
}

/* ─── Item ───────────────────────────────────────────────────────── */

const itemVariants = {
  hidden: { opacity: 0, y: 4 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.16, ease: [0.25, 0, 0, 1] as const } },
};

/*
  Apple hover anatomy (reverse-engineered from macOS Spotlight):
  1. A rounded-rect highlight pill materialises — scale 0.94→1 + opacity 0→1, spring physics
  2. The whole row drifts 2px right (subtle directional pull)
  3. Icon bubble scales up 6% and brightens
  4. Label text steps up to primary color
  5. All transitions use spring, never ease curves
*/
function PaletteItem({
  icon, label, hint, shortcut, active, onClick, onHover,
}: {
  icon: React.ReactNode; label: string; hint?: string; shortcut?: string;
  active: boolean; onClick: () => void; onHover: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const highlighted = hovered || active;

  const handleEnter = useCallback(() => {
    setHovered(true);
    onHover();
  }, [onHover]);

  return (
    <motion.button
      variants={itemVariants}
      onClick={onClick}
      onMouseEnter={handleEnter}
      onMouseLeave={() => setHovered(false)}
      animate={{ x: hovered ? 2 : 0 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: "spring", stiffness: 500, damping: 38, mass: 0.5 }}
      style={{
        position: "relative",
        width: "100%",
        minHeight: "44px",
        display: "flex",
        alignItems: "center",
        gap: "11px",
        padding: "0 12px",
        border: "none",
        cursor: "pointer",
        borderRadius: "10px",
        textAlign: "left",
        outline: "none",
        overflow: "hidden",
        background: "transparent",
      }}
    >
      {/* ── Materialising highlight pill ── */}
      <AnimatePresence>
        {highlighted && (
          <motion.span
            key="hl"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.1, ease: [0.4, 0, 1, 1] } }}
            transition={{ type: "spring", stiffness: 580, damping: 36, mass: 0.4 }}
            style={{
              position: "absolute",
              inset: "1px",
              borderRadius: "9px",
              background: active ? "var(--palette-row-active)" : "var(--palette-row-hover)",
              pointerEvents: "none",
              zIndex: 0,
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Icon bubble — pops on hover ── */}
      <motion.span
        animate={{
          scale: highlighted ? 1.07 : 1,
          backgroundColor: highlighted ? "var(--palette-icon-bg-hl)" : "var(--palette-icon-bg)",
          color: highlighted ? "var(--palette-icon-color-hl)" : "var(--palette-icon-color)",
        }}
        transition={{ type: "spring", stiffness: 420, damping: 26, mass: 0.5 }}
        style={{
          position: "relative",
          zIndex: 1,
          width: "28px",
          height: "28px",
          borderRadius: "7px",
          border: `0.5px solid ${highlighted ? "var(--palette-icon-brd-hl)" : "var(--palette-icon-border)"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </motion.span>

      {/* ── Text block ── */}
      <span style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column", gap: "1px", minWidth: 0 }}>
        <motion.span
          animate={{
            color: active
              ? "var(--palette-text-active)"
              : hovered
              ? "var(--palette-text-hover)"
              : "var(--palette-text-default)",
            fontWeight: highlighted ? 500 : 400,
          }}
          transition={{ duration: 0.1, ease: "easeOut" }}
          style={{
            fontSize: "13px",
            fontFamily: "system-ui, -apple-system, sans-serif",
            letterSpacing: "-0.01em",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            display: "block",
          }}
        >
          {label}
        </motion.span>
        {hint && (
          <span style={{
            fontSize: "11px",
            color: "var(--palette-text-hint)",
            fontFamily: "system-ui, -apple-system, sans-serif",
            transition: "color 0.22s ease",
          }}>
            {hint}
          </span>
        )}
      </span>

      {/* ── Shortcut badge ── */}
      {shortcut && (
        <span style={{ position: "relative", zIndex: 1, opacity: active ? 1 : 0.4 }}>
          <Kbd>{`⇧${shortcut}`}</Kbd>
        </span>
      )}
    </motion.button>
  );
}

/* ─── Divider ────────────────────────────────────────────────────── */

function Hairline() {
  return (
    <div style={{
      height: "0.5px",
      background: "var(--palette-hairline)",
      margin: "4px 6px",
      transition: "background 0.22s ease",
    }} />
  );
}

/* ─── Main component ─────────────────────────────────────────────── */

const listVariants = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.025, delayChildren: 0.03 } },
};

export default function CommandPalette() {
  const { isSearchOpen, openSearch, closeSearch, isSoundEnabled } = useLayout();
  const playHover = useHoverSound(isSoundEnabled);
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
      icon: NAV_ICONS[n.href] ?? <CodeIcon />,
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

  useEffect(() => {
    if (isSearchOpen) {
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
            transition={{ duration: 0.15 }}
            onClick={closeSearch}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 100,
              backdropFilter: "blur(8px) saturate(120%)",
              WebkitBackdropFilter: "blur(8px) saturate(120%)",
              backgroundColor: "var(--palette-backdrop)",
              transition: "background-color 0.22s ease",
            }}
          />

          {/* ── Glass panel ──────────────────────────────────────── */}
          <motion.div
            key="cp-panel"
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 4, transition: { duration: 0.14, ease: [0.4, 0, 1, 1] } }}
            transition={{ type: "spring", stiffness: 520, damping: 38, mass: 0.75 }}
            style={{
              position: "fixed",
              top: "16%",
              left: "50%",
              x: "-50%",
              zIndex: 101,
              width: "520px",
              maxWidth: "calc(100vw - 40px)",
              borderRadius: "14px",
              overflow: "hidden",
              background: "var(--palette-bg)",
              backdropFilter: "blur(20px) saturate(150%)",
              WebkitBackdropFilter: "blur(20px) saturate(150%)",
              border: "1px solid var(--palette-border)",
              boxShadow: "var(--shadow-modal)",
              willChange: "transform, opacity",
              contain: "layout style paint",
              transition: "background 0.22s ease, border-color 0.22s ease",
            }}
          >

            {/* ── Search input row ─────────────────────────────── */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "0 14px",
              height: "54px",
              borderBottom: "0.5px solid var(--palette-divider)",
            }}>
              {/* Magnifier */}
              <svg
                width="15" height="15" viewBox="0 0 24 24"
                fill="none" stroke="var(--palette-magnifier)" strokeWidth="2.2"
                strokeLinecap="round" strokeLinejoin="round"
                style={{ flexShrink: 0, transition: "stroke 0.22s ease" }}
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
                  color: "var(--palette-input-color)",
                  fontFamily: "system-ui, -apple-system, sans-serif",
                  letterSpacing: "-0.01em",
                  caretColor: "var(--palette-caret)",
                  transition: "color 0.22s ease",
                }}
              />

              {/* Clear × when query is non-empty */}
              <AnimatePresence mode="wait">
                {query && (
                  <motion.button
                    key="clear"
                    initial={{ opacity: 0, scale: 0.75 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.75 }}
                    transition={{ duration: 0.1 }}
                    onClick={() => setQuery("")}
                    style={{
                      width: "20px",
                      height: "20px",
                      borderRadius: "50%",
                      background: "var(--palette-clear-bg)",
                      border: "0.5px solid var(--palette-clear-border)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--palette-clear-color)",
                      fontSize: "12px",
                      lineHeight: 1,
                      padding: 0,
                      flexShrink: 0,
                      transition: "background 0.22s ease, color 0.22s ease",
                    }}
                  >
                    ×
                  </motion.button>
                )}
              </AnimatePresence>

              {/* ⌘K hint when no query */}
              {!query && (
                <span style={{
                  fontSize: "11px",
                  color: "var(--palette-hint-label)",
                  fontFamily: "ui-monospace, 'SF Mono', monospace",
                  letterSpacing: "0.04em",
                  flexShrink: 0,
                  transition: "color 0.22s ease",
                }}>
                  ⌘K
                </span>
              )}

              {/* Close button */}
              <button
                onClick={closeSearch}
                title="Close (Esc)"
                style={{
                  width: "22px",
                  height: "22px",
                  borderRadius: "6px",
                  background: "var(--palette-close-bg)",
                  border: "0.5px solid var(--palette-close-border)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--palette-close-color)",
                  padding: 0,
                  flexShrink: 0,
                  fontSize: "13px",
                  lineHeight: 1,
                  fontFamily: "system-ui",
                  transition: "background 0.22s ease, color 0.22s ease",
                }}
              >
                ×
              </button>
            </div>

            {/* ── Results list ─────────────────────────────────── */}
            <div
              style={{
                maxHeight: "360px",
                overflowY: "auto",
                padding: "6px",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              }}
            >
              {filtered.length === 0 ? (
                <div style={{
                  padding: "40px 16px",
                  textAlign: "center",
                  color: "var(--palette-no-results)",
                  fontSize: "13px",
                  fontFamily: "system-ui, -apple-system, sans-serif",
                  letterSpacing: "-0.01em",
                  transition: "color 0.22s ease",
                }}>
                  No results for &ldquo;{query}&rdquo;
                </div>
              ) : (
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
                          <div key={item.id} ref={isActive ? activeRef : undefined}>
                            <PaletteItem
                              icon={item.icon}
                              label={item.label}
                              hint={item.hint}
                              shortcut={item.shortcut}
                              active={isActive}
                              onClick={() => handleSelect(item)}
                              onHover={playHover}
                            />
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </motion.div>
              )}
            </div>

            {/* ── Footer ───────────────────────────────────────── */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 16px",
              height: "34px",
              borderTop: "0.5px solid var(--palette-divider)",
              background: "var(--palette-footer-bg)",
              transition: "background 0.22s ease, border-color 0.22s ease",
            }}>
              <span style={{
                fontSize: "10px",
                fontWeight: 600,
                color: "var(--palette-footer-label)",
                fontFamily: "system-ui, sans-serif",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                userSelect: "none",
                transition: "color 0.22s ease",
              }}>
                Portfolio
              </span>

              <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <span style={{
                  fontSize: "10px",
                  fontFamily: "ui-monospace, 'SF Mono', monospace",
                  color: "var(--palette-footer-label)",
                  background: "var(--kbd-bg)",
                  border: "0.5px solid var(--kbd-border)",
                  borderRadius: "4px",
                  padding: "2px 6px",
                  letterSpacing: "0.04em",
                  transition: "color 0.22s ease, background 0.22s ease",
                }}>
                  esc
                </span>
                <span style={{
                  fontSize: "10px",
                  color: "var(--palette-footer-label)",
                  fontFamily: "system-ui, sans-serif",
                  transition: "color 0.22s ease",
                }}>
                  to close
                </span>
              </span>
            </div>

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
