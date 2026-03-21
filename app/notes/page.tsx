"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import BottomToolbar from "@/components/ui/BottomToolbar";
import { useLayout } from "@/contexts/LayoutContext";

/* ── Data ──────────────────────────────────────────────────────────── */

const NOTES = [
  {
    id: 1,
    title: "QR Tool + MCP Server",
    excerpt: "I built a QR code generator that works two ways: as a web app with 10 custom styles and colours, and as an MCP server so AI assistants can generate QR codes directly.",
    image: "/photos/qr-note.png",
    fallback: "https://placehold.co/480x260/111111/333333",
    tag: "Tools",
    href: "#",
  },
  {
    id: 2,
    title: "Method AI: Crafting an AI-Powered Recycling Assistant for Modern Workplaces",
    excerpt: "Designed and launched Method AI—an intelligent, location-aware recycling assistant that helps office workers dispose of waste correctly in real time.",
    image: "/photos/method-note.png",
    fallback: "https://placehold.co/480x260/111111/333333",
    tag: "AI",
    href: "#",
  },
];

const ALL_TAGS = ["ALL", ...Array.from(new Set(NOTES.map((n) => n.tag)))];

/* ── Leaf icon ─────────────────────────────────────────────────────── */
const LeafIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z" />
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
  </svg>
);

/* ── Card ──────────────────────────────────────────────────────────── */
function NoteCard({ note }: { note: typeof NOTES[0] }) {
  const [imgSrc, setImgSrc] = useState(note.image);
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      animate={{ y: hovered ? -3 : 0 }}
      transition={{ type: "spring", stiffness: 340, damping: 26, mass: 0.8 }}
      style={{ display: "flex", flexDirection: "column", gap: "14px" }}
    >
      {/* Thumbnail */}
      <div style={{
        width: "100%",
        aspectRatio: "16/9",
        borderRadius: "10px",
        overflow: "hidden",
        background: "var(--bg-card)",
        flexShrink: 0,
      }}>
        <img
          src={imgSrc}
          alt={note.title}
          onError={() => setImgSrc(note.fallback)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "grayscale(100%)",
            display: "block",
            transition: "transform 0.3s ease",
            transform: hovered ? "scale(1.03)" : "scale(1)",
          }}
        />
      </div>

      {/* Text */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <h3 style={{
          margin: 0,
          fontSize: "15px",
          fontWeight: 700,
          color: "var(--text-primary)",
          lineHeight: 1.35,
          letterSpacing: "-0.01em",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}>
          {note.title}
        </h3>
        <p style={{
          margin: 0,
          fontSize: "13px",
          color: "var(--text-muted)",
          lineHeight: 1.55,
          fontFamily: "system-ui, -apple-system, sans-serif",
          maxHeight: "2.9em",
          overflow: "hidden",
        }}>
          {note.excerpt}
        </p>

        {/* Read now */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "4px" }}>
          <Link
            href={note.href}
            style={{
              fontSize: "13px",
              fontWeight: 500,
              color: hovered ? "var(--text-primary)" : "var(--text-muted)",
              textDecoration: "none",
              fontFamily: "system-ui, -apple-system, sans-serif",
              transition: "color 0.15s ease",
            }}
          >
            Read now
          </Link>
          <span style={{ color: "var(--text-dim)", transition: "color 0.15s ease" }}>
            <LeafIcon />
          </span>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Page ──────────────────────────────────────────────────────────── */
export default function NotesPage() {
  const { isSidebarOpen, isNavOpen } = useLayout();
  const [activeTag, setActiveTag] = useState("ALL");
  const [query, setQuery] = useState("");

  const ml = isSidebarOpen ? 280 : 0;
  const mr = isNavOpen ? 260 : 0;

  const filtered = NOTES.filter((n) => {
    const matchTag = activeTag === "ALL" || n.tag === activeTag;
    const matchQuery = n.title.toLowerCase().includes(query.toLowerCase());
    return matchTag && matchQuery;
  });

  return (
    <>
      <BottomToolbar />

      <div style={{
        position: "fixed",
        inset: 0,
        background: "var(--bg-page)",
        overflowY: "auto",
        scrollbarWidth: "none",
        transition: "background 0.22s ease",
      }}>
        <div style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "120px 60px 120px 60px",
        }}>

          {/* ── Header row ── */}
          <div style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: "40px",
            gap: "40px",
          }}>
            {/* Left — title + subtitle */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <h1 style={{
                margin: "0 0 8px 0",
                fontSize: "38px",
                fontWeight: 700,
                color: "var(--text-primary)",
                letterSpacing: "-0.025em",
                lineHeight: 1.1,
                fontFamily: "system-ui, -apple-system, sans-serif",
              }}>
                Notes
              </h1>
              <p style={{
                margin: 0,
                fontSize: "14px",
                color: "var(--text-dim)",
                fontFamily: "system-ui, -apple-system, sans-serif",
                lineHeight: 1.5,
              }}>
                Technical notes, tutorials, and insights on web development
              </p>
            </motion.div>

            {/* Right — search + filter */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut", delay: 0.06 }}
              style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0, paddingTop: "6px" }}
            >
              {/* Search pill */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "999px",
                padding: "7px 14px",
                transition: "background 0.22s ease, border-color 0.22s ease",
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search notes..."
                  style={{
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    fontSize: "13px",
                    color: "var(--text-muted)",
                    fontFamily: "system-ui, -apple-system, sans-serif",
                    width: "140px",
                    caretColor: "#FF4500",
                  }}
                />
              </div>

              {/* Tag filters */}
              {ALL_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setActiveTag(tag)}
                  style={{
                    background: activeTag === tag ? "var(--bg-elevated)" : "transparent",
                    border: activeTag === tag ? "1px solid var(--border)" : "1px solid transparent",
                    borderRadius: "6px",
                    padding: "6px 12px",
                    fontSize: "11px",
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    color: activeTag === tag ? "var(--text-primary)" : "var(--text-dim)",
                    cursor: "pointer",
                    fontFamily: "system-ui, -apple-system, sans-serif",
                    textTransform: "uppercase",
                    transition: "color 0.15s ease, border-color 0.15s ease, background 0.15s ease",
                  }}
                >
                  {tag}
                </button>
              ))}
            </motion.div>
          </div>

          {/* ── Card grid ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut", delay: 0.1 }}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "32px 28px",
            }}
          >
            {filtered.map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}

            {filtered.length === 0 && (
              <div style={{
                gridColumn: "1 / -1",
                padding: "80px 0",
                textAlign: "center",
                color: "var(--text-muted)",
                fontSize: "14px",
                fontFamily: "system-ui, -apple-system, sans-serif",
              }}>
                No notes found for &ldquo;{query}&rdquo;
              </div>
            )}
          </motion.div>

        </div>
      </div>
    </>
  );
}
