"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useLayout } from "@/contexts/LayoutContext";
import { useWindowManager } from "@/contexts/WindowManagerContext";
import { VISIBLE_NAV_ITEMS } from "@/data/nav";
import { RESUME_URL, EMAIL, HANDLE } from "@/data/profile";
import { applyLiquidGlass, releaseLiquidGlass } from "@/lib/liquidGlass";
import { openExternal } from "@/lib/externalLink";
import { ICON_FILE } from "@/components/ui/Dock";
import { askMascot } from "@/lib/mascotEvents";

/* Spotlight, in macOS Tahoe's shape: a floating Liquid Glass CAPSULE
   for the search field, and the results in their own glass card just
   below it. Rows carry the same app icons as the Dock, so Spotlight
   and the Dock read as one system.

   Performance (it used to lag on every keystroke):
   - The capsule never changes size, so the refraction engine builds its
     lens ONCE on open. Previously the whole panel was refracted with
     autoResize, so every keystroke that changed the result count
     rebuilt the displacement map.
   - The results card, whose height does change, is plain CSS glass
     (backdrop blur + saturation): cheap at any size.
   - Entrance is opacity only — scaling a backdrop-filtered surface
     re-runs the blur every frame.
   - Hover is CSS (:hover), not React state, so moving the pointer over
     the list renders nothing.

   Typing also offers "Ask my AI": it opens the mascot chat with the
   query (lib/mascotEvents.ts → ShellMascot). */

const ACCENT_BLUE = "#0a84ff"; // macOS systemBlue, dark mode

type Section = "Ask" | "Quick Actions" | "Navigation" | "Apps";
type Item = {
  id: string;
  label: string;
  hint?: string;
  /** App icon in public/icons (Dock-style), or a drawn glyph tile. */
  icon: { file: string } | { glyph: React.ReactNode; tint: string };
  section: Section;
  run: () => void;
};

/* Glyphs for the few rows without an app icon. */
const MailGlyph = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />
    <path d="m21 7-9 6-9-6" />
  </svg>
);
const DocGlyph = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5M9 13h6M9 17h4" />
  </svg>
);
const SparkGlyph = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff" aria-hidden>
    <path d="M12 2.5c.5 4.6 2.9 7 7.5 7.5-4.6.5-7 2.9-7.5 7.5-.5-4.6-2.9-7-7.5-7.5 4.6-.5 7-2.9 7.5-7.5zM19 15c.25 2 1.25 3 3 3.25-1.75.25-2.75 1.25-3 3.25-.25-2-1.25-3-3-3.25 1.75-.25 2.75-1.25 3-3.25z" />
  </svg>
);

function RowIcon({ icon }: { icon: Item["icon"] }) {
  if ("file" in icon) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={`/icons/${icon.file}.png`} alt="" width={28} height={28} className="sp-icon" draggable={false} />;
  }
  return (
    <span className="sp-icon sp-glyph" style={{ background: icon.tint }} aria-hidden>
      {icon.glyph}
    </span>
  );
}

export default function CommandPalette() {
  const { isSearchOpen, openSearch, closeSearch, isMobileLayout, isTabletLayout } = useLayout();
  const { openWindow, openFinder, openCredits, openVSCode } = useWindowManager();
  const router = useRouter();
  const isPhone = isMobileLayout && !isTabletLayout;
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Liquid Glass on the capsule, built once per open (it never
  // resizes). Callback ref: the capsule only exists while open.
  const capsuleNode = useRef<HTMLDivElement | null>(null);
  const attachCapsuleGlass = useCallback((el: HTMLDivElement | null) => {
    if (el) {
      capsuleNode.current = el;
      applyLiquidGlass(el, { radius: 28, bezel: 14, strength: 0.65, blur: 5, brightness: 0.86, tint: 0.34, press: false });
    } else if (capsuleNode.current) {
      releaseLiquidGlass(capsuleNode.current);
      capsuleNode.current = null;
    }
  }, []);

  const base: Item[] = useMemo(() => {
    const nav: Item[] = VISIBLE_NAV_ITEMS.filter((n) => n.href !== "/").map((n) => ({
      id: n.href,
      label: n.label.charAt(0) + n.label.slice(1).toLowerCase(),
      icon: { file: ICON_FILE[n.href] ?? "finder" },
      section: "Navigation",
      // Desktop: open as a window, like the Dock (a router push would
      // tear down the whole desktop). Phones navigate for real.
      run: () => (isPhone ? router.push(n.href) : openWindow(n.href, n.label)),
    }));
    const actions: Item[] = [
      { id: "github", label: "GitHub", hint: "Code and open source", icon: { file: "github" }, section: "Quick Actions", run: () => openExternal(`https://github.com/${HANDLE}`) },
      { id: "linkedin", label: "LinkedIn", hint: "Professional profile", icon: { file: "linkedin" }, section: "Quick Actions", run: () => openExternal(`https://linkedin.com/in/${HANDLE}`) },
      { id: "leetcode", label: "LeetCode", hint: "Problem solving", icon: { file: "leetcode" }, section: "Quick Actions", run: () => openExternal(`https://leetcode.com/u/${HANDLE}/`) },
      { id: "email", label: "Email", hint: EMAIL, icon: { glyph: MailGlyph, tint: "linear-gradient(160deg, #4aa3ff, #0a64e0)" }, section: "Quick Actions", run: () => openExternal(`mailto:${EMAIL}`) },
      ...(RESUME_URL
        ? [{ id: "resume", label: "Resume", hint: "View my resume", icon: { glyph: DocGlyph, tint: "linear-gradient(160deg, #ff8a5c, #e2482c)" }, section: "Quick Actions" as const, run: () => openExternal(RESUME_URL) }]
        : []),
    ];
    // Apps without a Dock slot, kept as desktop easter eggs.
    const apps: Item[] = isPhone
      ? []
      : [
          { id: "app:finder", label: "Finder", hint: "Browse the file system", icon: { file: "finder" }, section: "Apps", run: openFinder },
          { id: "app:credits", label: "Credits", hint: "Who and what built this", icon: { file: "notes" }, section: "Apps", run: openCredits },
          { id: "app:vscode", label: "VS Code", hint: "Read the source", icon: { file: "vscode" }, section: "Apps", run: openVSCode },
        ];
    return [...nav, ...actions, ...apps];
  }, [isPhone, router, openWindow, openFinder, openCredits, openVSCode]);

  const results: Item[] = useMemo(() => {
    const q = query.trim();
    if (!q) return base;
    const lower = q.toLowerCase();
    const matches = base.filter((i) => i.label.toLowerCase().includes(lower) || i.hint?.toLowerCase().includes(lower));
    const ask: Item = {
      id: "ask",
      label: `Ask my AI: “${q}”`,
      hint: "Answers from what's on this site",
      icon: { glyph: SparkGlyph, tint: "linear-gradient(160deg, #e8916f, #c2552f)" },
      section: "Ask",
      run: () => askMascot(q),
    };
    // A real match wins the top spot; with none, asking is the answer.
    return matches.length ? [...matches, ask] : [ask];
  }, [query, base]);

  const sections = useMemo(() => {
    const map = new Map<Section, Item[]>();
    for (const item of results) {
      if (!map.has(item.section)) map.set(item.section, []);
      map.get(item.section)!.push(item);
    }
    return [...map.entries()];
  }, [results]);

  const select = useCallback(
    (item: Item | undefined) => {
      if (!item) return;
      closeSearch();
      item.run();
    },
    [closeSearch],
  );

  useEffect(() => {
    if (!isSearchOpen) return;
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    setQuery("");
    setCursor(0);
    // Next frame: the input exists by then.
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [isSearchOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isSearchOpen) closeSearch();
        else openSearch();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isSearchOpen, openSearch, closeSearch]);

  useEffect(() => setCursor(0), [query]);

  // Keep the keyboard selection in view.
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${cursor}"]`)?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      select(results[cursor]);
    } else if (e.key === "Escape") {
      closeSearch();
    }
  };

  let index = 0;

  return (
    <AnimatePresence>
      {isSearchOpen && (
        <motion.div
          key="spotlight"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.1 } }}
          transition={{ duration: 0.14, ease: [0, 0, 0.58, 1] }}
          style={{ position: "fixed", inset: 0, zIndex: 100 }}
        >
          {/* Click-catcher — Spotlight doesn't dim the screen. */}
          <div onClick={closeSearch} style={{ position: "absolute", inset: 0 }} />

          <div className="sp-stack">
            <div ref={attachCapsuleGlass} className="liquid-glass sp-capsule">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-4-4" />
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKey}
                placeholder="Spotlight Search"
                aria-label="Search the portfolio"
                aria-controls="sp-results"
                aria-activedescendant={results[cursor] ? `sp-${results[cursor].id}` : undefined}
                spellCheck={false}
                autoComplete="off"
                className="sp-input"
                style={{ caretColor: ACCENT_BLUE }}
              />
            </div>

            {results.length > 0 && (
              <div ref={listRef} id="sp-results" role="listbox" className="sp-results">
                {sections.map(([section, items]) => (
                  <div key={section} className="sp-section">
                    <div className="sp-section-label">{section}</div>
                    {items.map((item) => {
                      const i = index++;
                      const active = i === cursor;
                      return (
                        <button
                          key={item.id}
                          id={`sp-${item.id}`}
                          data-index={i}
                          role="option"
                          aria-selected={active}
                          className={`sp-row${active ? " is-active" : ""}`}
                          onClick={() => select(item)}
                          tabIndex={-1}
                        >
                          <RowIcon icon={item.icon} />
                          <span className="sp-text">
                            <span className="sp-label">{item.label}</span>
                            {item.hint && <span className="sp-hint">{item.hint}</span>}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
