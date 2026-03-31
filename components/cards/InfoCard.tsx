"use client";

import { ReactNode, useState, useCallback, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform, useMotionTemplate } from "framer-motion";

interface InfoCardProps {
  label: string;
  cta?: string;
  href?: string;
  children: ReactNode | ((hovered: boolean) => ReactNode);
}

/*
  Apple card hover anatomy — adapts to light/dark via CSS variables:
  1. A moving specular highlight follows the cursor (useMotionValue — zero re-renders)
  2. The card tilts toward the cursor in 3D (perspective tilt)
  3. The card lifts slightly (y -3px, scale 1.018) using spring physics
  4. Shadow deepens on hover
  5. The CTA brightens to accent on hover
*/

const TILT_SPRING = { stiffness: 600, damping: 30, mass: 0.5 };

export default function InfoCard({ label, cta, href, children }: InfoCardProps) {
  const [hovered, setHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Motion values — update DOM directly, zero React re-renders during mousemove
  const spotX = useMotionValue(50);
  const spotY = useMotionValue(50);
  const rawRx = useMotionValue(0);
  const rawRy = useMotionValue(0);

  // Spring-smoothed tilt for a physical feel
  const rx = useSpring(rawRx, TILT_SPRING);
  const ry = useSpring(rawRy, TILT_SPRING);

  // Build radial-gradient string from motion values — no re-render needed
  const specularBg = useMotionTemplate`radial-gradient(circle at ${spotX}% ${spotY}%, var(--specular-hover) 0%, transparent 52%)`;

  const handleMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    spotX.set(x * 100);
    spotY.set(y * 100);
    rawRx.set((y - 0.5) * -5);
    rawRy.set((x - 0.5) * 4);
  }, [spotX, spotY, rawRx, rawRy]);

  const handleLeave = useCallback(() => {
    setHovered(false);
    rawRx.set(0);
    rawRy.set(0);
  }, [rawRx, rawRy]);

  return (
    <motion.div
      ref={cardRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleLeave}
      onMouseMove={handleMove}
      animate={{
        scale: hovered ? 1.018 : 1,
        y: hovered ? -3 : 0,
      }}
      transition={{
        scale: { type: "spring", stiffness: 340, damping: 26, mass: 0.8 },
        y:     { type: "spring", stiffness: 340, damping: 26, mass: 0.8 },
      }}
      style={{
        rotateX: rx,
        rotateY: ry,
        transformPerspective: 700,
        borderRadius: "16px",
        padding: "12px",
        cursor: "default",
        position: "relative",
        background: "var(--card-gradient)",
        border: "1px solid var(--card-border)",
        boxShadow: hovered ? "var(--card-shadow-hover)" : "var(--card-shadow-rest)",
        transition: "box-shadow 0.22s ease, border-color 0.22s ease",
        willChange: "transform",
        contain: "layout style paint",
      }}
    >
      {/* Specular overlay — driven by motion values, zero re-renders */}
      <motion.div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "16px",
          background: specularBg,
          opacity: hovered ? 1 : 0,
          pointerEvents: "none",
          transition: "opacity 0.2s ease",
        }}
      />

      {/* Label row */}
      <div style={{
        position: "relative",
        zIndex: 1,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "10px",
      }}>
        <span style={{
          fontSize: "10px",
          fontWeight: 600,
          color: "var(--text-ghost)",
          letterSpacing: "0.10em",
          textTransform: "uppercase",
          fontFamily: "system-ui, sans-serif",
          userSelect: "none",
          transition: "color 0.22s ease",
        }}>
          {label}
        </span>

        {cta && (
          <a
            href={href || "#"}
            target={href?.startsWith("http") ? "_blank" : undefined}
            rel={href?.startsWith("http") ? "noreferrer" : undefined}
            style={{
              fontSize: "11px",
              color: hovered ? "#FF4500" : "var(--text-ghost)",
              textDecoration: "none",
              fontFamily: "system-ui, sans-serif",
              letterSpacing: "-0.01em",
              transition: "color 0.18s ease",
            }}
          >
            {cta}
          </a>
        )}
      </div>

      {/* Content slot */}
      <div style={{ position: "relative", zIndex: 1 }}>
        {typeof children === "function" ? children(hovered) : children}
      </div>
    </motion.div>
  );
}
