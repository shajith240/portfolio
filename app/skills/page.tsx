'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useLayout } from '@/contexts/LayoutContext'
import { useShellMetrics } from '@/lib/useShellMetrics'
import { CATEGORIES } from '@/data/skills'

/* ── AppIcon ─────────────────────────────────────────────── */

function AppIcon({
  name,
  file,
  index,
  isPhone,
}: {
  name: string
  file: string
  index: number
  isPhone: boolean
}) {
  const iconSize = isPhone ? 60 : 64

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        delay: index * 0.015,
        duration: 0.35,
        ease: 'easeOut',
      }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        cursor: 'pointer',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <motion.img
        src={`/icons/${file}.png`}
        alt={name}
        draggable={false}
        whileTap={{ scale: 0.92 }}
        transition={{
          type: 'spring',
          stiffness: 360,
          damping: 28,
          mass: 0.8,
        }}
        style={{
          width: iconSize,
          height: iconSize,
          display: 'block',
          objectFit: 'contain',
        }}
      />
      <span
        style={{
          fontSize: 12,
          color: 'rgba(255, 255, 255, 0.85)',
          textAlign: 'center',
          maxWidth: iconSize + 20,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          fontWeight: 500,
          letterSpacing: 0,
        }}
      >
        {name}
      </span>
    </motion.div>
  )
}

/* ── Page ────────────────────────────────────────────────── */

export default function SkillsPage() {
  const { isMobileLayout, isTabletLayout } = useLayout()
  const metrics = useShellMetrics()

  const ml = metrics.contentLeft
  const mr = metrics.contentRight
  const isPhone = isMobileLayout && !isTabletLayout

  let iconIndex = 0

  // Responsive grid columns
  const getGridCols = () => {
    if (isPhone) return 'repeat(4, 1fr)'
    if (isTabletLayout) return 'repeat(5, 1fr)'
    return 'repeat(6, 1fr)'
  }

  return (
    <>
      {/*
        ── LAYER 0: Bloom ─────────────────────────────────────
        Very subtle warm center glow — gives the frost layer
        something to blur, creating the macOS dark glass feel.
        Covers full viewport (below sidebars at z-40).
      */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          background: 'var(--bg-page)',
          overflow: 'hidden',
          transition: 'background 0.22s ease',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse 90% 80% at 50% 50%, rgba(255,69,0,0.05) 0%, transparent 65%)',
          }}
        />
      </div>

      {/*
        ── LAYER 1: Frost glass ────────────────────────────────
        macOS App Drawer — frosted glass surface.
        backdrop-filter blurs and saturates the warm bloom above.
        Full viewport but z-1: sidebars (z-40) cover their areas.
      */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1,
          background: 'var(--frost-overlay-bg)',
          backdropFilter: 'blur(20px) saturate(150%)',
          WebkitBackdropFilter: 'blur(20px) saturate(150%)',
          transition: 'background 0.22s ease',
        }}
      />

      {/*
        ── LAYER 2: Content ────────────────────────────────────
        Constrained between the sidebars. Above the glass (z-2)
        but still below the sidebar cards (z-40).
      */}
      <motion.div
        initial={false}
        animate={{ left: `${ml}px`, right: `${mr}px` }}
        transition={{ type: 'spring', stiffness: 520, damping: 44, mass: 0.85 }}
        style={{
          position: 'fixed',
          top: 0,
          bottom: isPhone ? 72 : 0,
          zIndex: 2,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          <div
            style={{
              maxWidth: 980,
              margin: '0 auto',
              padding: `40px clamp(32px, 4vw, 40px) 80px`,
            }}
          >
            {/* Page header */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              style={{ marginBottom: 48 }}
            >
              <h1
                style={{
                  fontSize: 34,
                  fontWeight: 700,
                  color: 'rgba(255, 255, 255, 0.87)',
                  margin: 0,
                  marginBottom: 12,
                }}
              >
                Skills
              </h1>
              <p
                style={{
                  fontSize: 15,
                  color: 'rgba(255, 255, 255, 0.54)',
                  margin: 0,
                }}
              >
                Technologies and tools I work with
              </p>
            </motion.div>

            {/* Categories with Launchpad grid */}
            {CATEGORIES.map((cat) => (
              <div key={cat.label} style={{ marginBottom: 52 }}>
                <h2
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'rgba(255, 255, 255, 0.55)',
                    margin: 0,
                    marginBottom: 12,
                    textTransform: 'none',
                    letterSpacing: 0,
                  }}
                >
                  {cat.label}
                </h2>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: getGridCols(),
                    rowGap: '28px',
                    columnGap: '8px',
                  }}
                >
                  {cat.icons.map((icon) => {
                    const idx = iconIndex++
                    return (
                      <AppIcon
                        key={icon.file}
                        name={icon.name}
                        file={icon.file}
                        index={idx}
                        isPhone={isPhone}
                      />
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </>
  )
}
