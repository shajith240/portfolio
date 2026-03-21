"use client";

import { motion } from "framer-motion";
import BottomToolbar from "@/components/ui/BottomToolbar";
import { useLayout } from "@/contexts/LayoutContext";

export default function AboutPage() {
  const { isNavOpen, isSidebarOpen } = useLayout();

  const ml = isSidebarOpen ? 280 : 0;
  const mr = isNavOpen ? 260 : 0;

  return (
    <>
      <BottomToolbar />

      {/* Canvas */}
      <motion.div
        animate={{ left: `${ml}px`, right: `${mr}px` }}
        transition={{ type: "spring", stiffness: 520, damping: 44, mass: 0.85 }}
        style={{
          position: "fixed",
          top: 0,
          bottom: 0,
          overflow: "hidden",
          background: "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{
            width: "380px",
          }}
        >
          {/* Profile row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "24px",
            }}
          >
            <img
              src="https://placehold.co/40x40/242424/555555"
              alt="Profile"
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                filter: "grayscale(100%)",
                flexShrink: 0,
              }}
            />
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: "15px",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  lineHeight: 1.2,
                }}
              >
                Kalypso (Sachin)
              </p>
              <p
                style={{
                  margin: "2px 0 0 0",
                  fontSize: "12px",
                  color: "#FF4500",
                  lineHeight: 1.2,
                }}
              >
                Designer based in New Zealand
              </p>
            </div>
          </div>

          {/* Bio paragraphs */}
          <p
            style={{
              margin: "0 0 16px 0",
              fontSize: "14px",
              lineHeight: "1.65",
              color: "var(--text-secondary)",
            }}
          >
            Hi, I&apos;m Sachin – most people know me as Kalypso
            from{" "}
            <strong style={{ color: "var(--text-primary)" }}>@kalypsodesigns.</strong>
          </p>

          <p
            style={{
              margin: "0 0 16px 0",
              fontSize: "14px",
              lineHeight: "1.65",
              color: "var(--text-secondary)",
            }}
          >
            I help make tech easier to use. Most of my work is building apps,
            dashboards, and design systems for teams who just want things
            to work.
          </p>

          <p
            style={{
              margin: "0 0 8px 0",
              fontSize: "14px",
              lineHeight: "1.65",
              color: "var(--text-secondary)",
            }}
          >
            Some things I&apos;ve worked on:
          </p>

          <div
            style={{
              margin: "0 0 16px 0",
              fontSize: "14px",
              lineHeight: "1.8",
              color: "var(--text-secondary)",
            }}
          >
            <p style={{ margin: 0 }}>• AI-powered waste analytics app (iOS, for Method)</p>
            <p style={{ margin: 0 }}>• SaaS tools tracking millions of records</p>
            <p style={{ margin: 0 }}>• UI systems that work across products</p>
            <p style={{ margin: 0 }}>• RAG systems with custom knowledge bases</p>
          </div>

          <p
            style={{
              margin: "0 0 32px 0",
              fontSize: "14px",
              lineHeight: "1.65",
              color: "var(--text-secondary)",
            }}
          >
            I like figuring out the technical stuff, but my goal is always to
            make things simple. Always open to chat about design, AI, code,
            or anything tech.
          </p>

          {/* Social links */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontSize: "12px",
              fontWeight: 600,
              letterSpacing: "0.04em",
            }}
          >
            <a href="mailto:" style={{ color: "var(--text-primary)", textDecoration: "none", textTransform: "uppercase" }}>
              Email
            </a>
            <span style={{ color: "var(--text-dim)" }}>/</span>
            <a href="#" style={{ color: "var(--text-primary)", textDecoration: "none", textTransform: "uppercase" }}>
              LinkedIn
            </a>
            <span style={{ color: "var(--text-dim)" }}>/</span>
            <a href="#" style={{ color: "var(--text-primary)", textDecoration: "none", textTransform: "uppercase" }}>
              Github
            </a>
            <span style={{ color: "var(--text-dim)" }}>/</span>
            <a href="#" style={{ color: "var(--text-primary)", textDecoration: "none", textTransform: "uppercase" }}>
              Instagram
            </a>
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}
