"use client";

import { motion } from "framer-motion";
import { useLayout } from "@/contexts/LayoutContext";
import { useShellMetrics } from "@/lib/useShellMetrics";

// TODO: fill in with real hackathon wins, contest ranks, and
// certifications — intentionally empty rather than invented. Each
// entry: { title, org, date, description }.
const ACHIEVEMENTS: {
  title: string;
  org: string;
  date: string;
  description: string;
}[] = [];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0, 0, 0.58, 1] as const } },
};

export default function AchievementsPage() {
  const { isMobileLayout, isTabletLayout } = useLayout();
  const metrics = useShellMetrics();
  const ml = metrics.contentLeft;
  const mr = metrics.contentRight;
  const isPhone = isMobileLayout && !isTabletLayout;

  return (
    <>
      <motion.div
        animate={{ left: `${ml}px`, right: `${mr}px` }}
        transition={{ type: "spring", stiffness: 520, damping: 44, mass: 0.85 }}
        style={{
          position: "fixed",
          top: 0,
          bottom: isPhone ? 72 : 0,
          background: "var(--bg-page)",
          overflowY: "auto",
          scrollbarWidth: "none",
          transition: "background 0.22s ease",
        }}
      >
        <div
          style={{
            maxWidth: "760px",
            margin: "0 auto",
            padding: `clamp(48px, 8vw, 100px) clamp(16px, 5vw, 60px) clamp(60px, 10vw, 120px)`,
          }}
        >
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            style={{ marginBottom: "56px" }}
          >
            <h1
              style={{
                margin: "0 0 8px 0",
                fontSize: "38px",
                fontWeight: 700,
                color: "var(--text-primary)",
                letterSpacing: "-0.025em",
                lineHeight: 1.1,
                fontFamily: "system-ui, -apple-system, sans-serif",
              }}
            >
              Achievements
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: isPhone ? "16px" : "14px",
                color: "var(--text-dim)",
                fontFamily: "system-ui, -apple-system, sans-serif",
                lineHeight: 1.5,
              }}
            >
              Hackathons, contest results, and certifications.
            </p>
          </motion.div>

          {ACHIEVEMENTS.length > 0 ? (
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              style={{ display: "flex", flexDirection: "column", gap: "1px" }}
            >
              {ACHIEVEMENTS.map((a) => (
                <motion.div
                  key={a.title}
                  variants={item}
                  style={{
                    display: "flex",
                    flexDirection: isPhone ? "column" : "row",
                    alignItems: isPhone ? "flex-start" : "baseline",
                    justifyContent: "space-between",
                    gap: isPhone ? "4px" : "20px",
                    padding: "14px 0",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <div>
                    <p
                      style={{
                        margin: "0 0 4px 0",
                        fontSize: isPhone ? "16px" : "14px",
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        fontFamily: "system-ui, -apple-system, sans-serif",
                      }}
                    >
                      {a.title}
                    </p>
                    <p
                      style={{
                        margin: 0,
                        fontSize: isPhone ? "15px" : "13px",
                        color: "var(--text-muted)",
                        fontFamily: "system-ui, -apple-system, sans-serif",
                        lineHeight: 1.5,
                      }}
                    >
                      {a.org}
                      {a.description ? ` — ${a.description}` : ""}
                    </p>
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "13px",
                      color: "var(--text-dim)",
                      fontFamily: "system-ui, -apple-system, sans-serif",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {a.date}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div style={{ padding: "40px 0", textAlign: "center" }}>
              <p
                style={{
                  margin: "0 0 8px 0",
                  fontSize: "11px",
                  color: "var(--text-dim)",
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  fontFamily: "system-ui, -apple-system, sans-serif",
                }}
              >
                coming soon
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: "14px",
                  color: "var(--text-muted)",
                  fontFamily: "system-ui, -apple-system, sans-serif",
                }}
              >
                First one is on its way.
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}
