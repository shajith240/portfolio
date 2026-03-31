"use client";

import { motion } from "framer-motion";
import BottomToolbar from "@/components/ui/BottomToolbar";
import { useLayout } from "@/contexts/LayoutContext";

export default function AboutPage() {
  const { isNavOpen, isSidebarOpen, isMobileLayout, isTabletLayout } = useLayout();
  const isPhone = isMobileLayout && !isTabletLayout;

  const ml = !isMobileLayout && isSidebarOpen ? 280 : 0;
  const mr = !isMobileLayout && isNavOpen ? 260 : 0;

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
          bottom: isPhone ? 72 : 0,
          overflowY: "auto",
          overflowX: "hidden",
          scrollbarWidth: "none",
          background: "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          paddingTop: isPhone ? "24px" : "clamp(48px, 10dvh, 120px)",
          paddingBottom: isPhone ? "24px" : "80px",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{
            width: isPhone ? "min(380px, calc(100vw - 32px))" : "min(520px, calc(100vw - 64px))",
            textAlign: "center",
          }}
        >
          {/* Profile row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "28px",
            }}
          >
            <img
              src="/photos/my_photo.jpeg"
              alt="Shajith Bathina"
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                filter: "grayscale(100%)",
                flexShrink: 0,
                objectFit: "cover",
                objectPosition: "center 10%",
              }}
            />
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: isPhone ? "17px" : "16px",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  lineHeight: 1.2,
                }}
              >
                Shajith Bathina
              </p>
              <p
                style={{
                  margin: "4px 0 0 0",
                  fontSize: isPhone ? "14px" : "13px",
                  color: "#FF4500",
                  lineHeight: 1.2,
                }}
              >
                CS Student at IIT(ISM) Dhanbad
              </p>
            </div>
          </div>

          {/* Bio paragraphs */}
          <p
            style={{
              margin: "0 0 16px 0",
              fontSize: isPhone ? "16px" : "15px",
              lineHeight: "1.7",
              color: "var(--text-secondary)",
              textAlign: "left",
            }}
          >
            I&apos;m a second-year Computer Science student at{" "}
            <strong style={{ color: "var(--text-primary)" }}>IIT(ISM) Dhanbad.</strong>{" "}
            I lean toward practical thinking over theory — give me a real problem and I&apos;ll
            figure it out by building.
          </p>

          <p
            style={{
              margin: "0 0 16px 0",
              fontSize: isPhone ? "16px" : "15px",
              lineHeight: "1.7",
              color: "var(--text-secondary)",
              textAlign: "left",
            }}
          >
            I work across TypeScript, Python, and Java. My projects range from AI voice agents
            and automation scripts to full-stack web apps and systems-level experiments.
          </p>

          <p
            style={{
              margin: "0 0 8px 0",
              fontSize: isPhone ? "16px" : "15px",
              lineHeight: "1.7",
              color: "var(--text-secondary)",
              textAlign: "left",
            }}
          >
            Some things I&apos;ve built:
          </p>

          <div
            style={{
              margin: "0 0 16px 0",
              fontSize: isPhone ? "16px" : "15px",
              lineHeight: "1.8",
              color: "var(--text-secondary)",
              textAlign: "left",
            }}
          >
            <p style={{ margin: 0 }}>• SHARPFLOW — TypeScript agency & landing page</p>
            <p style={{ margin: 0 }}>• IntelliDesk — productivity app</p>
            <p style={{ margin: 0 }}>• WIFI-AUTOMATION — Python WiFi automation tool</p>
            <p style={{ margin: 0 }}>• linux-container-runtime — low-level systems project</p>
          </div>

          <p
            style={{
              margin: "0 0 32px 0",
              fontSize: isPhone ? "16px" : "15px",
              lineHeight: "1.7",
              color: "var(--text-secondary)",
              textAlign: "left",
            }}
          >
            Always open to collaborate on something interesting or just talk tech.
          </p>

          {/* Social links */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              fontSize: "12px",
              fontWeight: 600,
              letterSpacing: "0.04em",
            }}
          >
            <a href="mailto:shajith240@gmail.com" style={{ color: "var(--text-primary)", textDecoration: "none", textTransform: "uppercase" }}>
              Email
            </a>
            <span style={{ color: "var(--text-dim)" }}>/</span>
            <a href="https://linkedin.com/in/shajith240" target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-primary)", textDecoration: "none", textTransform: "uppercase" }}>
              LinkedIn
            </a>
            <span style={{ color: "var(--text-dim)" }}>/</span>
            <a href="https://github.com/shajith240" target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-primary)", textDecoration: "none", textTransform: "uppercase" }}>
              Github
            </a>
            <span style={{ color: "var(--text-dim)" }}>/</span>
            <a href="https://instagram.com/heyshajith" target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-primary)", textDecoration: "none", textTransform: "uppercase" }}>
              Instagram
            </a>
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}
