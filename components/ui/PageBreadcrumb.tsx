"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const LABELS: Record<string, string> = {
  "/about":    "About",
  "/projects": "Projects",
  "/notes":    "Notes",
  "/skills":   "Skills",
  "/dsa":      "DSA",
  "/uses":     "Uses",
};

export default function PageBreadcrumb() {
  const pathname = usePathname();
  const [linkHovered, setLinkHovered] = useState(false);
  const isHome = pathname === "/";
  const label = LABELS[pathname] ?? "";

  return (
    <AnimatePresence>
      {!isHome && label && (
        <motion.nav
          key="breadcrumb"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          style={{
            position: "fixed",
            top: "28px",
            left: "28px",
            zIndex: 60,
            display: "flex",
            alignItems: "center",
            gap: "7px",
            fontFamily: "system-ui, -apple-system, sans-serif",
            userSelect: "none",
          }}
        >
          <Link
            href="/"
            onMouseEnter={() => setLinkHovered(true)}
            onMouseLeave={() => setLinkHovered(false)}
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: linkHovered ? "var(--breadcrumb-link-hover)" : "var(--breadcrumb-link)",
              textDecoration: "none",
              letterSpacing: "0.09em",
              textTransform: "uppercase",
              transition: "color 0.15s ease",
            }}
          >
            Back to Home
          </Link>
          <span style={{ color: "var(--breadcrumb-sep)", fontSize: "11px", fontWeight: 400, transition: "color 0.22s ease" }}>/</span>
          <span style={{
            fontSize: "11px",
            fontWeight: 600,
            color: "var(--breadcrumb-current)",
            letterSpacing: "0.09em",
            textTransform: "uppercase",
            transition: "color 0.22s ease",
          }}>
            {label}
          </span>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
