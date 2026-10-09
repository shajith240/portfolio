"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useLiquidGlass } from "@/lib/liquidGlass";
import { EXTERNAL_LINK_EVENT } from "@/lib/externalLink";

/* The "Open LinkedIn?" alert — shown before any link leaves the site
   (see lib/externalLink.ts). Laid out like a macOS alert: the
   destination's app icon centred on top, a bold centred title, one
   quiet line with the address, and two equal capsule buttons (grey
   Cancel, blue Open). Liquid Glass card over a soft scrim. Open is
   focused, so Enter continues; Escape or a click outside cancels.
   Mounted once, by the top-level shell. */

// Friendly names for the sites this portfolio links to.
// [host pattern, name, app icon in public/icons (macOS-style) if any]
const SITES: [RegExp, string, string?][] = [
  [/(^|\.)linkedin\.com$/, "LinkedIn", "linkedin"],
  [/(^|\.)github\.com$/, "GitHub", "github"],
  [/(^|\.)leetcode\.com$/, "LeetCode", "leetcode"],
  [/(^|\.)codeforces\.com$/, "Codeforces"],
  [/(^|\.)instagram\.com$/, "Instagram"],
  [/^maps\.apple\.com$/, "Apple Maps"],
  [/(^|\.)iitism\.ac\.in$/, "IIT (ISM) Dhanbad"],
];

function describe(url: string) {
  const u = new URL(url);
  const host = u.hostname.replace(/^www\./, "");
  const site = SITES.find(([re]) => re.test(host));
  const path = u.pathname.replace(/\/$/, "");
  return { name: site?.[1] ?? host, icon: site?.[2], address: `${host}${path === "/" ? "" : path}` };
}

const SPRING = { type: "spring", stiffness: 420, damping: 34, mass: 0.8 } as const;

function Sheet({ url, onClose }: { url: string; onClose: () => void }) {
  const reduceMotion = useReducedMotion();
  const lgRef = useLiquidGlass<HTMLDivElement>({ radius: 24, bezel: 14, strength: 0.6, blur: 6, brightness: 0.85, tint: 0.4, press: false });
  const continueRef = useRef<HTMLButtonElement>(null);
  const { name, icon, address } = describe(url);

  useEffect(() => {
    // Focused for Enter, but without forcing the focus ring on a mouse
    // user (Chromium honours focusVisible; others ignore it).
    continueRef.current?.focus({ preventScroll: true, focusVisible: false } as FocusOptions);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const go = () => {
    window.open(url, "_blank", "noopener,noreferrer");
    onClose();
  };

  return (
    <>
      <motion.div
        aria-hidden
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        style={{ position: "fixed", inset: 0, zIndex: 4999, background: "rgba(0, 0, 0, 0.35)" }}
      />
      <div style={{ position: "fixed", inset: 0, zIndex: 5000, display: "grid", placeItems: "center", pointerEvents: "none", padding: 16 }}>
        <motion.div
          ref={lgRef}
          className="liquid-glass"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="ext-title"
          aria-describedby="ext-desc"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
          transition={reduceMotion ? { duration: 0.15 } : SPRING}
          style={{
            pointerEvents: "auto",
            width: "min(300px, 100%)",
            padding: "24px 20px 20px",
            borderRadius: 26,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            fontFamily: "-apple-system, BlinkMacSystemFont, system-ui, sans-serif",
            color: "rgba(255, 255, 255, 0.95)",
          }}
        >
          {/* The destination's app icon, like a macOS alert's badge. */}
          {icon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/icons/${icon}.png`} alt="" width={64} height={64} style={{ display: "block", width: 64, height: 64, marginBottom: 14 }} />
          ) : (
            <div
              aria-hidden
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                display: "grid",
                placeItems: "center",
                marginBottom: 16,
                background: "linear-gradient(160deg, #3a8dff 0%, #0a64e0 100%)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 6px 16px rgba(0,0,0,0.3)",
              }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 4h6v6" />
                <path d="M20 4 11 13" />
                <path d="M19 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4" />
              </svg>
            </div>
          )}
          <h2 id="ext-title" style={{ margin: 0, fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.3 }}>
            Open {name}?
          </h2>
          <p id="ext-desc" style={{ margin: "6px 0 0", fontSize: 12.5, lineHeight: 1.45, color: "rgba(235, 235, 245, 0.68)" }}>
            This opens in a new tab.
          </p>
          <p
            title={url}
            style={{
              margin: "4px 0 0",
              maxWidth: "100%",
              fontSize: 12,
              color: "rgba(235, 235, 245, 0.45)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {address}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, width: "100%", marginTop: 20 }}>
            <button type="button" onClick={onClose} className="ext-btn ext-btn-secondary">
              Cancel
            </button>
            <button ref={continueRef} type="button" onClick={go} className="ext-btn ext-btn-primary">
              Open
            </button>
          </div>
        </motion.div>
      </div>
    </>
  );
}

export default function ExternalLinkSheet() {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const onRequest = (e: Event) => {
      const next = (e as CustomEvent<{ url: string }>).detail?.url;
      if (typeof next === "string") setUrl(next);
    };
    window.addEventListener(EXTERNAL_LINK_EVENT, onRequest);
    return () => window.removeEventListener(EXTERNAL_LINK_EVENT, onRequest);
  }, []);

  return <AnimatePresence>{url && <Sheet key={url} url={url} onClose={() => setUrl(null)} />}</AnimatePresence>;
}
