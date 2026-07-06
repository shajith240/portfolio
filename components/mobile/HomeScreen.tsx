"use client";

import { motion } from "framer-motion";
import { useLayout } from "@/contexts/LayoutContext";

/* iPhone home screen — iOS 26 anatomy per
   scratchpad/ios26-lock-home-spec.md §2: 4-column grid of 60px
   squircle icons with 11px shadowed labels, the Search pill above
   the dock (wired to the REAL Spotlight palette), and a Liquid
   Glass dock holding the four core pages. External apps open in a
   new tab; internal ones hand their icon's center point to the
   shell so the app can zoom out of the icon like iOS. */

export interface HomeApp {
  label: string;
  icon: string; // /public/icons/<name>.png
  href?: string; // internal route
  external?: string; // external URL
}

const GRID_APPS: HomeApp[] = [
  { label: "About", icon: "contact", href: "/about" },
  { label: "Projects", icon: "projects", href: "/projects" },
  { label: "Skills", icon: "skills", href: "/skills" },
  { label: "DSA", icon: "xcode", href: "/dsa" },
  { label: "Notes", icon: "notes", href: "/notes" },
  { label: "Uses", icon: "settings", href: "/uses" },
  { label: "GitHub", icon: "github", external: "https://github.com/shajith240" },
  { label: "LinkedIn", icon: "linkedin", external: "https://www.linkedin.com/in/shajith240" },
  { label: "LeetCode", icon: "leetcode", external: "https://leetcode.com/shajith240" },
  { label: "Mail", icon: "contact", external: "mailto:shajith240@gmail.com" },
];

const DOCK_APPS: HomeApp[] = [
  { label: "About", icon: "contact", href: "/about" },
  { label: "Projects", icon: "projects", href: "/projects" },
  { label: "Skills", icon: "skills", href: "/skills" },
  { label: "Notes", icon: "notes", href: "/notes" },
];

const LIQUID_GLASS: React.CSSProperties = {
  background: "rgba(255,255,255,0.14)",
  backdropFilter: "blur(20px) saturate(180%)",
  WebkitBackdropFilter: "blur(20px) saturate(180%)",
  border: "1px solid rgba(255,255,255,0.18)",
  boxShadow:
    "inset 0 1px 1px rgba(255,255,255,0.35), inset 0 4px 6px rgba(0,0,0,0.08), inset 0 -1px 2px rgba(0,0,0,0.22), 0 10px 30px rgba(0,0,0,0.3)",
};

function AppIcon({
  app,
  size,
  showLabel,
  onOpen,
}: {
  app: HomeApp;
  size: number;
  showLabel: boolean;
  onOpen: (app: HomeApp, center: { x: number; y: number }) => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      transition={{ type: "spring", stiffness: 700, damping: 24 }}
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        onOpen(app, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
      }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "5px",
        background: "transparent",
        border: "none",
        padding: 0,
        width: `${size}px`,
      }}
    >
      <img
        src={`/icons/${app.icon}.png`}
        alt=""
        draggable={false}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: `${Math.round(size * 0.225)}px`, // Apple's superellipse ratio ≈ 22.4%
          objectFit: "cover",
          boxShadow: "0 4px 10px rgba(0,0,0,0.28)",
        }}
      />
      {showLabel && (
        <span
          style={{
            fontSize: "11px",
            fontWeight: 500,
            color: "#ffffff",
            textShadow: "0 2px 4px rgba(0,0,0,0.5)",
            maxWidth: `${size + 14}px`,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {app.label}
        </span>
      )}
    </motion.button>
  );
}

export default function HomeScreen({
  onOpenApp,
}: {
  onOpenApp: (app: HomeApp, center: { x: number; y: number }) => void;
}) {
  const { openSearch } = useLayout();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 1.06 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: [0, 0, 0.58, 1] }}
      style={{ position: "fixed", inset: 0, zIndex: 5, display: "flex", flexDirection: "column" }}
    >
      {/* Icon grid */}
      <div
        style={{
          marginTop: "max(64px, calc(env(safe-area-inset-top, 44px) + 20px))",
          padding: "0 20px",
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          justifyItems: "center",
          rowGap: "24px",
          flex: 1,
          alignContent: "start",
        }}
      >
        {GRID_APPS.map((app) => (
          <AppIcon key={app.label} app={app} size={60} showLabel onOpen={onOpenApp} />
        ))}
      </div>

      {/* Search pill — the REAL Spotlight trigger, like iOS 18+ */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "14px" }}>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={openSearch}
          style={{
            ...LIQUID_GLASS,
            height: "36px",
            padding: "0 16px",
            borderRadius: "18px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            color: "rgba(255,255,255,0.85)",
            fontSize: "14px",
            fontWeight: 500,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
            <circle cx="6" cy="6" r="4.6" stroke="rgba(255,255,255,0.85)" strokeWidth="1.5" />
            <path d="M9.6 9.6L13 13" stroke="rgba(255,255,255,0.85)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Search
        </motion.button>
      </div>

      {/* Dock */}
      <div style={{ padding: "0 16px", marginBottom: "max(12px, env(safe-area-inset-bottom, 12px))" }}>
        <div
          style={{
            ...LIQUID_GLASS,
            borderRadius: "34px",
            padding: "12px 0",
            display: "flex",
            justifyContent: "space-evenly",
            alignItems: "center",
          }}
        >
          {DOCK_APPS.map((app) => (
            <AppIcon key={`dock-${app.label}`} app={app} size={56} showLabel={false} onOpen={onOpenApp} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
