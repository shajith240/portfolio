"use client";

import { ReactNode, useState, useCallback } from "react";
import { motion } from "framer-motion";

interface InfoCardProps {
  label: string;
  cta?: string;
  href?: string;
  children: ReactNode | ((hovered: boolean) => ReactNode);
}

/*
  Apple card hover anatomy — adapts to light/dark via CSS variables:
  1. A moving specular highlight follows the cursor
     Dark: warm white shimmer on gunmetal surface
     Light: warm orange-tint shimmer on white surface
  2. The card tilts toward the cursor in 3D (perspective tilt)
  3. The card lifts slightly (y -3px, scale 1.018) using spring physics
  4. Shadow deepens on hover — critical in light mode for perceived elevation
  5. The CTA brightens to accent on hover
*/
export default function InfoCard({ label, cta, href, children }: InfoCardProps) {
  const [hovered, setHovered] = useState(false);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [spot, setSpot] = useState({ x: 50, y: 50 });

  const handleMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setSpot({ x: x * 100, y: y * 100 });
    setTilt({ rx: (y - 0.5) * -5, ry: (x - 0.5) * 4 });
  }, []);

  const handleLeave = useCallback(() => {
    setHovered(false);
    setTilt({ rx: 0, ry: 0 });
  }, []);

  /*
    Specular highlight — uses CSS variable so it adapts to theme:
    Dark: rgba(255,255,255,0.05) — white light on dark metal
    Light: rgba(255,100,0,0.05)  — warm orange-tint on white card
  */
  const specularOpacity = hovered ? 1 : 0;

  return (
    <motion.div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={handleLeave}
        onMouseMove={handleMove}
        animate={{
          scale: hovered ? 1.018 : 1,
          y: hovered ? -3 : 0,
          rotateX: tilt.rx,
          rotateY: tilt.ry,
        }}
        transition={{
          scale: { type: "spring", stiffness: 340, damping: 26, mass: 0.8 },
          y:     { type: "spring", stiffness: 340, damping: 26, mass: 0.8 },
          rotateX: { duration: 0.07, ease: "linear" },
          rotateY: { duration: 0.07, ease: "linear" },
        }}
        style={{
          transformPerspective: 700,
          borderRadius: "16px",
          padding: "12px",
          cursor: "default",
          position: "relative",
          background: "var(--card-gradient)",
          border: "1px solid var(--card-border)",
          boxShadow: hovered ? "var(--card-shadow-hover)" : "var(--card-shadow-rest)",
          transition: "box-shadow 0.22s ease, border-color 0.22s ease",
        }}
      >
        {/* Specular overlay — separate element for clean opacity animation */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "16px",
            background: `radial-gradient(circle at ${spot.x}% ${spot.y}%, var(--specular-hover) 0%, transparent 52%)`,
            opacity: specularOpacity,
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
