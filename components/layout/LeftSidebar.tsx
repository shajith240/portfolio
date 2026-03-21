"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import InfoCard from "@/components/cards/InfoCard";
import { useLayout } from "@/contexts/LayoutContext";
import { useClickSound } from "@/lib/useClickSound";

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.1 },
  },
};

const cardVariant = {
  hidden: { y: 16, opacity: 0 },
  show: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.5, ease: [0, 0, 0.58, 1] as const },
  },
};

/*
  Icon wrapper — adapts to theme via CSS variables.
  Dark: gunmetal pill with inset metallic rim.
  Light: warm off-white pill with subtle top-light shadow.
*/
const IconWrapper = ({ children }: { children: React.ReactNode }) => (
  <div style={{
    minWidth: "38px",
    height: "38px",
    background: "linear-gradient(145deg, var(--icon-bg-start) 0%, var(--icon-bg-end) 100%)",
    border: "0.5px solid var(--icon-border)",
    borderRadius: "11px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    boxShadow: "var(--icon-shadow)",
    transition: "background 0.22s ease, box-shadow 0.22s ease",
  }}>
    {children}
  </div>
);

const GithubIcon = ({ color }: { color: string }) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "stroke 0.15s ease" }}>
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

const LeetcodeIcon = ({ color }: { color: string }) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "stroke 0.15s ease" }}>
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
    <polyline points="7,11 10,8 7,5" />
    <line x1="13" y1="11" x2="17" y2="11" />
  </svg>
);

const LinkedinIcon = ({ color }: { color: string }) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "stroke 0.15s ease" }}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

// Module-level flag: entrance stagger only plays on the very first mount
let _sidebarAnimated = false;

export default function LeftSidebar() {
  const { isSidebarOpen, toggleSidebar, isSoundEnabled } = useLayout();
  const playClick = useClickSound(isSoundEnabled);
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [playEntrance] = useState(() => {
    const play = !_sidebarAnimated;
    _sidebarAnimated = true;
    return play;
  });

  return (
    <>
      {/* Toggle button — only shown on home */}
      {isHome && <motion.button
        onClick={() => { playClick(); toggleSidebar(); }}
        style={{
          position: "fixed",
          left: "32px",
          top: "32px",
          width: "32px",
          height: "32px",
          backgroundColor: "var(--sidebar-toggle-bg)",
          border: "1px solid var(--border)",
          borderRadius: "50%",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "14px",
          fontWeight: 700,
          padding: 0,
          zIndex: 50,
          fontFamily: "ui-monospace, 'SF Mono', monospace",
          transition: "background-color 0.22s ease, border-color 0.22s ease",
        }}
        animate={{
          color: isSidebarOpen ? "#FF4500" : "var(--text-dim)",
        }}
        transition={{ duration: 0.15, ease: "easeInOut" }}
        title={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
      >
        <motion.span
          animate={{ rotateY: isSidebarOpen ? 0 : 180 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          style={{ display: "inline-block", lineHeight: 1 }}
        >
          {isSidebarOpen ? "/" : "\\"}
        </motion.span>
      </motion.button>}

      <motion.aside
        initial={{ x: -400, scale: 0.97 }}
        animate={{
          x: isSidebarOpen ? 0 : -400,
          scale: isSidebarOpen ? 1 : 0.97,
        }}
        transition={
          isSidebarOpen
            ? { type: "spring", stiffness: 520, damping: 44, mass: 0.85, restDelta: 0.01 }
            : { type: "tween", duration: 0.22, ease: [0.4, 0, 1, 1] }
        }
        style={{
          position: "fixed",
          left: "20px",
          top: "20px",
          zIndex: 40,
          width: "360px",
          height: "calc(100vh - 40px)",
          background: "var(--sidebar-bg)",
          border: "1px solid var(--sidebar-border)",
          borderRadius: "24px",
          padding: "20px",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "var(--sidebar-shadow)",
          backdropFilter: "blur(32px) saturate(180%)",
          WebkitBackdropFilter: "blur(32px) saturate(180%)",
          transition: "background 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease",
        }}
      >
        <motion.div
          variants={container}
          initial={playEntrance ? "hidden" : "show"}
          animate="show"
          style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "44px", flex: 1 }}
        >
          {/* Hero text */}
          <motion.div variants={cardVariant} style={{ marginBottom: "8px", padding: "0 4px" }}>
            <p style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", margin: 0, lineHeight: 1.3, transition: "color 0.22s ease" }}>
              Hey, I&apos;m Shajith.
            </p>
            <p style={{ fontSize: "15px", fontWeight: 400, color: "var(--text-secondary)", margin: 0, lineHeight: 1.3, transition: "color 0.22s ease" }}>
              I build things people
            </p>
            <p style={{ fontSize: "15px", fontWeight: 400, color: "var(--text-secondary)", margin: 0, lineHeight: 1.3, transition: "color 0.22s ease" }}>
              want to use.
            </p>
          </motion.div>

          {/* Card 1 — Profile */}
          <motion.div variants={cardVariant}>
            <InfoCard label="SHAJITH" cta="Read more →" href="/about">
              {(hovered) => (
                <>
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <img
                      src="/photos/my_photo.jpeg"
                      alt="Shajith"
                      style={{
                        width: "250px",
                        height: "250px",
                        objectFit: "cover",
                        objectPosition: "center 10%",
                        borderRadius: "10px",
                        filter: "grayscale(100%)",
                        display: "block",
                        flexShrink: 0,
                      }}
                    />
                  </div>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: hovered ? "#FF4500" : "var(--text-primary)", margin: "10px 0 3px 0", transition: "color 0.15s ease" }}>
                    About me
                  </p>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.35, margin: 0, transition: "color 0.22s ease" }}>
                    2nd year CSE student. Building web apps, CLI tools, and more.
                  </p>
                </>
              )}
            </InfoCard>
          </motion.div>

          {/* Social cards */}
          <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "flex-start", gap: "10px" }}>

          {/* Card 2 — GitHub */}
          <motion.div variants={cardVariant}>
            <InfoCard label="GITHUB" cta="Visit →" href="https://github.com/shajith240">
              {(hovered) => (
                <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 0" }}>
                  <IconWrapper>
                    <GithubIcon color={hovered ? "#FF4500" : "var(--icon-stroke)"} />
                  </IconWrapper>
                  <div>
                    <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 2px 0", transition: "color 0.22s ease" }}>
                      @shajith240
                    </p>
                    <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: 0, transition: "color 0.22s ease" }}>
                      Open source tools &amp; experiments
                    </p>
                  </div>
                </div>
              )}
            </InfoCard>
          </motion.div>

          {/* Card 3 — LeetCode */}
          <motion.div variants={cardVariant}>
            <InfoCard label="LEETCODE" cta="Visit →" href="https://leetcode.com/shajith240">
              {(hovered) => (
                <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 0" }}>
                  <IconWrapper>
                    <LeetcodeIcon color={hovered ? "#FF4500" : "var(--icon-stroke)"} />
                  </IconWrapper>
                  <div>
                    <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 2px 0", transition: "color 0.22s ease" }}>
                      shajith240
                    </p>
                    <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: 0, transition: "color 0.22s ease" }}>
                      Solving DSA problems daily
                    </p>
                  </div>
                </div>
              )}
            </InfoCard>
          </motion.div>

          {/* Card 4 — LinkedIn */}
          <motion.div variants={cardVariant}>
            <InfoCard label="LINKEDIN" cta="Visit →" href="https://linkedin.com/in/shajith240">
              {(hovered) => (
                <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 0" }}>
                  <IconWrapper>
                    <LinkedinIcon color={hovered ? "#FF4500" : "var(--icon-stroke)"} />
                  </IconWrapper>
                  <div>
                    <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 2px 0", transition: "color 0.22s ease" }}>
                      shajith240
                    </p>
                    <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: 0, transition: "color 0.22s ease" }}>
                      Connect &amp; work experience
                    </p>
                  </div>
                </div>
              )}
            </InfoCard>
          </motion.div>

          </div>
        </motion.div>
      </motion.aside>
    </>
  );
}
