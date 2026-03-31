"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useLayout } from "@/contexts/LayoutContext";

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
  const { isMobileLayout, isTabletLayout } = useLayout();
  const isPhone = isMobileLayout && !isTabletLayout;
  const isHome = pathname === "/";
  const label = LABELS[pathname] ?? "";

  const fontSize = isPhone ? "14px" : "11px";

  // Phone: dock handles navigation — breadcrumb is redundant
  if (isPhone) return null;

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
            top: isPhone ? "0px" : "28px",
            left: isPhone ? "0px" : "28px",
            right: isPhone ? "0px" : "auto",
            zIndex: 60,
            display: "flex",
            alignItems: "center",
            gap: "7px",
            fontFamily: "system-ui, -apple-system, sans-serif",
            userSelect: "none",
            padding: isPhone ? "14px 16px" : undefined,
            background: isPhone ? "var(--bg-page)" : undefined,
            borderBottom: isPhone ? "1px solid var(--border)" : undefined,
            minHeight: isPhone ? 44 : undefined,
            transition: "background 0.22s ease, border-color 0.22s ease",
          }}
        >
          <Link
            href="/"
            onMouseEnter={() => setLinkHovered(true)}
            onMouseLeave={() => setLinkHovered(false)}
            style={{
              fontSize,
              fontWeight: 600,
              color: linkHovered ? "var(--breadcrumb-link-hover)" : "var(--breadcrumb-link)",
              textDecoration: "none",
              letterSpacing: "0.09em",
              textTransform: "uppercase",
              transition: "color 0.15s ease",
              padding: isPhone ? "8px 0" : undefined,
            }}
          >
            Back to Home
          </Link>
          <span style={{ color: "var(--breadcrumb-sep)", fontSize, fontWeight: 400, transition: "color 0.22s ease" }}>/</span>
          <span style={{
            fontSize,
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
