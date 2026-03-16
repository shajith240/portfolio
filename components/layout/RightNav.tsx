"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { NAV_ITEMS } from "@/data/nav";
import { useLayout } from "@/contexts/LayoutContext";
import SplitText from "@/components/ui/SplitText";

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
}: {
  navItem: NavItemDef;
  isActive: boolean;
  isNavOpen: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.li variants={itemVariant}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <Link
          href={navItem.href}
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: "72px",
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
              animate={{ color: isActive ? "#FF4500" : hovered ? "#FF4500" : "#FFFFFF" }}
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
              fontSize: "18px",
              fontWeight: 400,
              color: "#FF4500",
              position: "relative",
              top: "-24px",
              marginLeft: "12px",
              letterSpacing: "0",
              fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
            }}
          >
            {navItem.num}
          </span>
        </Link>
      </div>
    </motion.li>
  );
}

let _navAnimated = false;

export default function RightNav() {
  const pathname = usePathname();
  const { isNavOpen } = useLayout();
  const [playEntrance] = useState(() => {
    const play = !_navAnimated;
    _navAnimated = true;
    return play;
  });

  return (
    <motion.nav
      initial={{ x: 520, scale: 0.97 }}
      animate={{
        x: isNavOpen ? 0 : 520,
        scale: isNavOpen ? 1 : 0.97,
      }}
      transition={
        isNavOpen
          ? { type: "spring", stiffness: 520, damping: 44, mass: 0.85, restDelta: 0.01 }
          : { type: "tween", duration: 0.22, ease: [0.4, 0, 1, 1] }
      }
      style={{
        position: "fixed",
        right: "20px",
        top: "20px",
        zIndex: 40,
        width: "480px",
        height: "calc(100vh - 40px)",
        backgroundColor: "#1a1a1a",
        borderRadius: "24px",
        border: "1px solid #333333",
        display: "flex",
        alignItems: "center",
      }}
    >
      <motion.ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          paddingLeft: "48px",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
        }}
        variants={container}
        initial={playEntrance ? "hidden" : "show"}
        animate="show"
      >
        {NAV_ITEMS.map((navItem) => {
          const isActive = pathname === navItem.href;
          return (
            <NavItem
              key={navItem.href}
              navItem={navItem}
              isActive={isActive}
              isNavOpen={isNavOpen}
            />
          );
        })}
      </motion.ul>
    </motion.nav>
  );
}
