"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useAnimation } from "framer-motion";
import { useState, useEffect } from "react";
import { NAV_ITEMS } from "@/data/nav";
import { useLayout } from "@/contexts/LayoutContext";
import SplitText from "@/components/ui/SplitText";
import { useShellMetrics } from "@/lib/useShellMetrics";

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariant = {
  hidden: { x: 20, opacity: 0 },
  show: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.4, ease: [0, 0, 0.58, 1] as const },
  },
};

type NavItemDef = { href: string; label: string; num: string };

function NavItem({
  navItem,
  isActive,
  isNavOpen,
  navFont,
  indexFont,
  indexTop,
  indexMargin,
}: {
  navItem: NavItemDef;
  isActive: boolean;
  isNavOpen: boolean;
  navFont: number;
  indexFont: number;
  indexTop: number;
  indexMargin: number;
}) {
  return (
    <motion.li variants={itemVariant}>
      <motion.div
        whileHover="hovered"
        initial="idle"
        animate="idle"
      >
        <Link
          href={navItem.href}
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: `${navFont}px`,
            fontWeight: 700,
            lineHeight: 1.0,
            letterSpacing: "-0.03em",
            textDecoration: "none",
            fontFamily: "var(--font-geist-display), system-ui, sans-serif",
            whiteSpace: "nowrap",
          }}
        >
          <div key={String(isNavOpen)}>
            <motion.span
              variants={{
                idle: { color: isActive ? "#FF4500" : "var(--text-primary)" },
                hovered: { color: "#FF4500" },
              }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              style={{ display: "block" }}
            >
              {isNavOpen ? (
                <SplitText
                  text={navItem.label}
                  delay={30}
                  duration={0.6}
                  ease="power3.out"
                  splitType="chars"
                  from={{ opacity: 0, y: 40 }}
                  to={{ opacity: 1, y: 0 }}
                  textAlign="left"
                  tag="span"
                />
              ) : (
                navItem.label
              )}
            </motion.span>
          </div>
          <span
            style={{
              fontSize: `${indexFont}px`,
              fontWeight: 400,
              color: "#FF4500",
              position: "relative",
              top: `${indexTop}px`,
              marginLeft: `${indexMargin}px`,
              letterSpacing: "0",
              fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
            }}
          >
            {navItem.num}
          </span>
        </Link>
      </motion.div>
    </motion.li>
  );
}

let _navAnimated = false;

export default function RightNav() {
  const pathname = usePathname();
  const { isNavOpen, isMobileLayout } = useLayout();
  const metrics = useShellMetrics();
  const navFont = Math.round(Math.min(72, Math.max(50, metrics.navWidth * 0.15)));
  const indexFont = Math.round(Math.min(18, Math.max(12, navFont * 0.24)));
  const indexTop = Math.round(navFont * -0.31);
  const indexMargin = Math.round(Math.min(12, Math.max(6, navFont * 0.14)));
  const navPadding = Math.round(Math.min(48, Math.max(24, metrics.navWidth * 0.1)));
  const [playEntrance] = useState(() => {
    const play = !_navAnimated;
    _navAnimated = true;
    return play;
  });
  const controls = useAnimation();

  useEffect(() => {
    if (playEntrance) {
      controls.set("hidden");
      controls.start("show");
    } else {
      controls.set("show");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.nav
      initial={{ x: metrics.navHiddenX, scale: 0.97 }}
      animate={{
        x: isNavOpen ? 0 : metrics.navHiddenX,
        scale: isNavOpen ? 1 : 0.97,
      }}
      transition={
        isNavOpen
          ? { type: "spring", stiffness: 520, damping: 44, mass: 0.85, restDelta: 0.01 }
          : { type: "tween", duration: 0.22, ease: [0.4, 0, 1, 1] }
      }
      style={{
        position: "fixed",
        right: isMobileLayout ? "0px" : `${metrics.inset}px`,
        top: isMobileLayout ? "0px" : `${metrics.inset}px`,
        zIndex: 40,
        width: isMobileLayout ? "min(360px, 100vw)" : `${metrics.navWidth}px`,
        height: isMobileLayout ? "100dvh" : `calc(100dvh - ${metrics.inset * 2}px)`,
        backgroundColor: "var(--nav-bg)",
        borderRadius: isMobileLayout ? "20px 0 0 20px" : "24px",
        border: "1px solid var(--nav-border)",
        display: "flex",
        alignItems: "center",
        overflowY: "auto",
        willChange: "transform",
        contain: "layout style paint",
        transition: "background-color 0.22s ease, border-color 0.22s ease",
      }}
    >
      <motion.ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          paddingLeft: `${navPadding}px`,
          display: "flex",
          flexDirection: "column",
          gap: "4px",
        }}
        variants={container}
        initial={false}
        animate={controls}
      >
        {NAV_ITEMS.map((navItem) => {
          const isActive = pathname === navItem.href;
          return (
            <NavItem
              key={navItem.href}
              navItem={navItem}
              isActive={isActive}
              isNavOpen={isNavOpen}
              navFont={navFont}
              indexFont={indexFont}
              indexTop={indexTop}
              indexMargin={indexMargin}
            />
          );
        })}
      </motion.ul>
    </motion.nav>
  );
}
