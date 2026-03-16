"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import InfoCard from "@/components/cards/InfoCard";
import { useLayout } from "@/contexts/LayoutContext";

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

/* SVG icons wrapped in dark rounded boxes */
const IconWrapper = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      minWidth: "40px",
      height: "40px",
      backgroundColor: "#1F1F1F",
      borderRadius: "12px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    {children}
  </div>
);

const InstagramIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const GithubIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
    <line x1="10" y1="21" x2="21" y2="21" />
  </svg>
);

const LinkedinIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

// Module-level flag: entrance stagger only plays on the very first mount
let _sidebarAnimated = false;

export default function LeftSidebar() {
  const { isSidebarOpen, toggleSidebar } = useLayout();
  const [playEntrance] = useState(() => {
    const play = !_sidebarAnimated;
    _sidebarAnimated = true;
    return play;
  });

  return (
    <>
      <button
        onClick={toggleSidebar}
        style={{
          position: "fixed",
          left: "32px",
          top: "32px",
          width: "32px",
          height: "32px",
          backgroundColor: "#1C1C1C",
          border: "1px solid #333333",
          borderRadius: "50%",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "12px",
          fontWeight: 600,
          color: "#888888",
          padding: 0,
          zIndex: 50,
        }}
      >
        /
      </button>

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
          backgroundColor: "#0A0A0A",
          border: "1px solid #1F1F1F",
          borderRadius: "24px",
          padding: "20px",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <motion.div
          variants={container}
          initial={playEntrance ? "hidden" : "show"}
          animate="show"
          style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "44px", flex: 1 }}
        >
          {/* Hero text */}
          <motion.div variants={cardVariant} style={{ marginBottom: "12px", padding: "0 4px" }}>
            <p style={{ fontSize: "16px", fontWeight: 700, color: "#FFFFFF", margin: 0, lineHeight: 1.4 }}>
              Hey, I'm Kalypso.
            </p>
            <p style={{ fontSize: "15px", fontWeight: 400, color: "#CCCCCC", margin: 0, lineHeight: 1.4 }}>
              I build products people want to interact with.
            </p>
          </motion.div>

          {/* Card 1 — Profile */}
          <motion.div variants={cardVariant}>
            <InfoCard label="KALYPSO" cta="Read more →" href="/about">
              <img
                src="https://placehold.co/400x300/222222/666666"
                alt="Profile"
                style={{
                  width: "100%",
                  height: "170px",
                  objectFit: "cover",
                  objectPosition: "center",
                  borderRadius: "10px",
                  filter: "grayscale(100%)",
                  display: "block",
                }}
              />
              <p style={{ fontSize: "14px", fontWeight: 700, color: "#FFFFFF", margin: "12px 0 4px 0" }}>
                About me
              </p>
              <p style={{ fontSize: "13px", color: "#888888", lineHeight: 1.4, margin: 0 }}>
                I help make tech easier to use. Building apps, dashboards, and design systems for teams who just want things to work.
              </p>
            </InfoCard>
          </motion.div>

          {/* Card 2 — Instagram */}
          <motion.div variants={cardVariant}>
            <InfoCard label="INSTAGRAM" cta="Visit →" href="#">
              <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "4px 0" }}>
                <IconWrapper>
                  <InstagramIcon />
                </IconWrapper>
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 600, color: "#FFFFFF", margin: "0 0 2px 0" }}>
                    @kalypsodesigns
                  </p>
                  <p style={{ fontSize: "12px", color: "#888888", margin: 0 }}>
                    Design resources. 400k+ followers.
                  </p>
                </div>
              </div>
            </InfoCard>
          </motion.div>

          {/* Card 3 — GitHub */}
          <motion.div variants={cardVariant}>
            <InfoCard label="GITHUB" cta="Visit →" href="#">
              <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "4px 0" }}>
                <IconWrapper>
                  <GithubIcon />
                </IconWrapper>
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 600, color: "#FFFFFF", margin: "0 0 2px 0" }}>
                    Kalypsokichu-code
                  </p>
                  <p style={{ fontSize: "12px", color: "#888888", margin: 0 }}>
                    Open source tools &amp; experiments
                  </p>
                </div>
              </div>
            </InfoCard>
          </motion.div>

          {/* Card 4 — LinkedIn */}
          <motion.div variants={cardVariant}>
            <InfoCard label="LINKEDIN" cta="Visit →" href="#">
              <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "4px 0" }}>
                <IconWrapper>
                  <LinkedinIcon />
                </IconWrapper>
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 600, color: "#FFFFFF", margin: "0 0 2px 0" }}>
                    kalypsodesigns
                  </p>
                  <p style={{ fontSize: "12px", color: "#888888", margin: 0 }}>
                    Professional profile &amp; work experience
                  </p>
                </div>
              </div>
            </InfoCard>
          </motion.div>
        </motion.div>
      </motion.aside>
    </>
  );
}
