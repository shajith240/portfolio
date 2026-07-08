"use client";

import type { CSSProperties } from "react";
import { motion } from "framer-motion";
import { SONGS, WALLPAPERS, MOTIVATION_IMAGES, ICON_CREDITS, FONT_CREDITS, WALLPAPER_NOTE } from "@/data/credits";

/* Rendered directly inside a Window body (see Window.tsx, kind
   "credits") — never an iframe of a real route, same treatment as
   FinderApp. Fills 100% of the window's content area rather than a
   full page's viewport, so none of the sidebar-margin/useShellMetrics
   plumbing the standalone pages need applies here. */

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0, 0, 0.58, 1] as const } },
};

function prettify(filename: string) {
  return filename
    .replace(/^mobile\//, "")
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

const sectionLabelStyle: CSSProperties = {
  margin: "0 0 16px 0",
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "rgba(255, 255, 255, 0.54)",
  fontFamily: "system-ui, -apple-system, sans-serif",
};

const rowStyle: CSSProperties = {
  display: "flex",
  flexDirection: "row",
  alignItems: "baseline",
  gap: "16px",
  padding: "10px 0",
  borderBottom: "1px solid var(--border)",
};

const nameStyle: CSSProperties = {
  margin: 0,
  fontSize: "13px",
  fontWeight: 600,
  color: "var(--text-primary)",
  fontFamily: "system-ui, -apple-system, sans-serif",
  minWidth: "200px",
  flexShrink: 0,
};

const descStyle: CSSProperties = {
  margin: 0,
  fontSize: "12.5px",
  color: "var(--text-muted)",
  fontFamily: "system-ui, -apple-system, sans-serif",
  lineHeight: 1.5,
};

const noteStyle: CSSProperties = {
  margin: "0 0 16px 0",
  fontSize: "12.5px",
  color: "var(--text-dim)",
  fontFamily: "system-ui, -apple-system, sans-serif",
  lineHeight: 1.6,
};

export default function CreditsApp() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        overflowY: "auto",
        background: "var(--bg-page)",
        padding: "32px 40px 56px",
        boxSizing: "border-box",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        style={{ marginBottom: "36px" }}
      >
        <h1
          style={{
            margin: "0 0 6px 0",
            fontSize: "26px",
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "-0.02em",
            lineHeight: 1.15,
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          Credits
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: "13px",
            color: "var(--text-dim)",
            fontFamily: "system-ui, -apple-system, sans-serif",
            lineHeight: 1.5,
          }}
        >
          This is a personal, non-commercial portfolio. Music, artwork, wallpapers, and icons
          used throughout the site remain the property of their original creators and rights
          holders, listed here in full.
        </p>
      </motion.div>

      <motion.div variants={container} initial="hidden" animate="show" style={{ display: "flex", flexDirection: "column", gap: "36px" }}>
        {SONGS.length > 0 && (
          <motion.div variants={item}>
            <p style={sectionLabelStyle}>Music</p>
            <p style={noteStyle}>
              Every track playable from the Now Playing widget, with title, artist, cover art,
              and lyrics credited to their original artists and labels. Used here for personal
              expression only — no commercial use, all rights reserved by the respective owners.
            </p>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {SONGS.map((s) => (
                <div key={s.src} style={rowStyle}>
                  <p style={nameStyle}>{s.title}</p>
                  <p style={descStyle}>{s.artist || "Unknown artist"}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {WALLPAPERS.length > 0 && (
          <motion.div variants={item}>
            <p style={sectionLabelStyle}>Wallpapers</p>
            <p style={noteStyle}>{WALLPAPER_NOTE}</p>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {WALLPAPERS.map((w) => (
                <div key={w} style={{ ...rowStyle, gap: 0 }}>
                  <p style={nameStyle}>{prettify(w)}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {MOTIVATION_IMAGES.length > 0 && (
          <motion.div variants={item}>
            <p style={sectionLabelStyle}>Motivation quote cards</p>
            <p style={noteStyle}>
              Quote-card images shown in the widgets on this site were sourced from publicly
              circulated collections online; original creators are credited where known and
              rights remain with them.
            </p>
          </motion.div>
        )}

        <motion.div variants={item}>
          <p style={sectionLabelStyle}>Icons</p>
          <p style={noteStyle}>
            Dock, app, and skill icons represent third-party tools, languages, and platforms.
            Each logo is a trademark of its respective company; no affiliation with or
            endorsement by these companies is claimed.
          </p>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {ICON_CREDITS.map((ic) => (
              <div key={ic.name} style={rowStyle}>
                <p style={nameStyle}>{ic.name}</p>
                <p style={descStyle}>{ic.owner}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div variants={item}>
          <p style={sectionLabelStyle}>Fonts</p>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {FONT_CREDITS.map((fc) => (
              <div key={fc.name} style={rowStyle}>
                <p style={nameStyle}>{fc.name}</p>
                <p style={descStyle}>
                  {fc.owner} — {fc.license}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
