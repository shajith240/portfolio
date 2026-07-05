'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useLayout } from '@/contexts/LayoutContext'
import { useShellMetrics } from '@/lib/useShellMetrics'
import { PROJECTS, type Project } from '@/data/projects'

/* ─────────────────────────────────────────────────────────────────
   Apple Editorial Motion — fade + rise, butter easing
   ───────────────────────────────────────────────────────────────── */

const EASE_APPLE = [0.32, 0.72, 0, 1] as const

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
}

const cardVariant = {
  hidden: { y: 12, opacity: 0 },
  show: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.5, ease: EASE_APPLE },
  },
}

const headerVariant = {
  hidden: { y: 12, opacity: 0 },
  show: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.5, ease: EASE_APPLE },
  },
}

/* ─────────────────────────────────────────────────────────────────
   TechChip — Apple pill style, sentence case, frosted background
   ───────────────────────────────────────────────────────────────── */

function TechChip({ label }: { label: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: '11px',
        fontWeight: 500,
        color: 'rgba(255, 255, 255, 0.65)',
        background: 'rgba(255, 255, 255, 0.08)',
        border: 'none',
        borderRadius: '20px',
        padding: '4px 12px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        transition: 'background 0.22s ease, color 0.22s ease',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  )
}

/* ─────────────────────────────────────────────────────────────────
   FeaturedCard — 50/50 editorial split, content left / image right
   Border only on hover, no card scale
   ───────────────────────────────────────────────────────────────── */

function FeaturedCard({ project, isMobile }: { project: Project; isMobile: boolean }) {
  const [hovered, setHovered] = useState(false)

  return (
    <motion.div
      variants={cardVariant}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        background: '#2a2a2a',
        border: `1px solid ${hovered ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.08)'}`,
        borderRadius: '18px',
        overflow: 'hidden',
        minHeight: 'clamp(280px, 40vw, 380px)',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
        transition: 'border-color 0.15s ease-out',
      }}
    >
      {/* Left — content */}
      <div
        style={{
          padding: isMobile ? '28px' : '32px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          borderRight: isMobile ? 'none' : `1px solid rgba(255, 255, 255, 0.08)`,
          borderBottom: isMobile ? `1px solid rgba(255, 255, 255, 0.08)` : 'none',
          transition: 'border-color 0.22s ease',
        }}
      >
        {/* Top */}
        <div>
          {/* Category line (clean, no index/decorator) */}
          <div
            style={{
              fontSize: '13px',
              color: 'rgba(255, 255, 255, 0.54)',
              marginBottom: '12px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontWeight: 400,
              letterSpacing: 0,
              transition: 'color 0.22s ease',
            }}
          >
            {project.sub}
          </div>

          {/* Title */}
          <h2
            style={{
              margin: '0 0 16px 0',
              fontSize: '28px',
              fontWeight: 700,
              color: 'white',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              fontFamily: 'system-ui, -apple-system, sans-serif',
              transition: 'color 0.22s ease',
            }}
          >
            {project.title}
          </h2>

          {/* Description */}
          <p
            style={{
              margin: 0,
              fontSize: '15px',
              color: 'rgba(255, 255, 255, 0.54)',
              lineHeight: 1.5,
              fontFamily: 'system-ui, -apple-system, sans-serif',
              maxWidth: '65ch',
              transition: 'color 0.22s ease',
            }}
          >
            {project.description}
          </p>
        </div>

        {/* Bottom — tech + CTAs */}
        <div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              marginBottom: '20px',
            }}
          >
            {project.tech.map(t => (
              <TechChip key={t} label={t} />
            ))}
          </div>

          <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            {project.github && (
              <a
                href={project.github}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#0a84ff',
                  textDecoration: 'none',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  transition: 'opacity 0.15s ease',
                }}
              >
                GitHub ›
              </a>
            )}
            {project.live && (
              <a
                href={project.live}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#0a84ff',
                  textDecoration: 'none',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  transition: 'opacity 0.15s ease',
                }}
              >
                Live ↗
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Right — full-bleed image */}
      <div
        style={{
          overflow: 'hidden',
          background: '#1c1c1c',
          position: 'relative',
          minHeight: isMobile ? '200px' : 'clamp(280px, 40vw, 380px)',
        }}
      >
        <img
          src={project.image || 'https://placehold.co/800x600/141414/222222'}
          alt={project.title}
          loading="lazy"
          decoding="async"
          style={{
            width: 'calc(100% - 24px)',
            height: 'calc(100% - 24px)',
            objectFit: 'cover',
            display: 'block',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            margin: '12px',
          }}
        />
      </div>
    </motion.div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   GridCard — image top, content bottom, border brightens on hover
   ───────────────────────────────────────────────────────────────── */

function GridCard({ project }: { project: Project }) {
  const [hovered, setHovered] = useState(false)

  return (
    <motion.div
      variants={cardVariant}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#2a2a2a',
        border: `1px solid ${hovered ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.08)'}`,
        borderRadius: '18px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
        transition: 'border-color 0.15s ease-out',
      }}
    >
      {/* Image */}
      <div
        style={{
          width: 'calc(100% - 20px)',
          aspectRatio: '16 / 10',
          overflow: 'hidden',
          background: '#1c1c1c',
          flexShrink: 0,
          margin: '10px',
          borderRadius: '10px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <img
          src={project.image || 'https://placehold.co/800x500/141414/222222'}
          alt={project.title}
          loading="lazy"
          decoding="async"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      </div>

      {/* Content */}
      <div
        style={{
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
        }}
      >
        {/* Category line */}
        <div
          style={{
            fontSize: '13px',
            color: 'rgba(255, 255, 255, 0.54)',
            marginBottom: '8px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontWeight: 400,
            letterSpacing: 0,
            transition: 'color 0.22s ease',
          }}
        >
          {project.sub}
        </div>

        {/* Title */}
        <h3
          style={{
            margin: '0 0 8px 0',
            fontSize: '18px',
            fontWeight: 700,
            color: 'white',
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            transition: 'color 0.22s ease',
          }}
        >
          {project.title}
        </h3>

        {/* Description */}
        <p
          style={{
            margin: '0 0 16px 0',
            fontSize: '14px',
            color: 'rgba(255, 255, 255, 0.54)',
            lineHeight: 1.5,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            flex: 1,
            transition: 'color 0.22s ease',
          }}
        >
          {project.description}
        </p>

        {/* Tech chips + overflow count */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
            marginBottom: '14px',
            alignItems: 'center',
          }}
        >
          {project.tech.slice(0, 3).map(t => (
            <TechChip key={t} label={t} />
          ))}
          {project.tech.length > 3 && (
            <span
              style={{
                fontSize: '11px',
                color: 'rgba(255, 255, 255, 0.54)',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                transition: 'color 0.22s ease',
              }}
            >
              +{project.tech.length - 3}
            </span>
          )}
        </div>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          {project.github && (
            <a
              href={project.github}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: '13px',
                fontWeight: 500,
                color: '#0a84ff',
                textDecoration: 'none',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                transition: 'opacity 0.15s ease',
              }}
            >
              GitHub ›
            </a>
          )}
          {project.live && (
            <a
              href={project.live}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: '13px',
                fontWeight: 500,
                color: '#0a84ff',
                textDecoration: 'none',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                transition: 'opacity 0.15s ease',
              }}
            >
              Live ↗
            </a>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   Page
   ───────────────────────────────────────────────────────────────── */

export default function ProjectsPage() {
  const { isMobileLayout, isTabletLayout } = useLayout()
  const metrics = useShellMetrics()
  const ml = metrics.contentLeft
  const mr = metrics.contentRight
  const isPhone = isMobileLayout && !isTabletLayout

  const featured = PROJECTS.find(p => p.type === 'featured')
  const grid = PROJECTS.filter(p => p.type !== 'featured')

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: isPhone ? 72 : 0,
          overflowY: 'auto',
          scrollbarWidth: 'none',
          background: 'var(--bg-page)',
          transition: 'background 0.22s ease',
        }}
      >
        <motion.div
          animate={{
            paddingLeft: `${ml + (isMobileLayout ? 16 : 48)}px`,
            paddingRight: `${mr + (isMobileLayout ? 16 : 48)}px`,
          }}
          transition={{ type: 'spring', stiffness: 520, damping: 44, mass: 0.85 }}
          style={{ padding: isMobileLayout ? '80px 16px 120px' : '80px 48px 120px' }}
        >

          {/* ── Header ──────────────────────────────────────────── */}
          <motion.div
            variants={headerVariant}
            initial="hidden"
            animate="show"
            style={{ marginBottom: '32px' }}
          >
            {/* Title */}
            <h1
              style={{
                margin: '0 0 8px 0',
                fontSize: '40px',
                fontWeight: 700,
                color: 'white',
                letterSpacing: '-0.02em',
                lineHeight: 1.0,
                fontFamily: 'system-ui, -apple-system, sans-serif',
                transition: 'color 0.22s ease',
              }}
            >
              Projects
            </h1>

            {/* Subtitle + GitHub link */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '20px',
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: '15px',
                  color: 'rgba(255, 255, 255, 0.54)',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  lineHeight: 1.5,
                  transition: 'color 0.22s ease',
                }}
              >
                Work I&apos;ve shipped and open-sourced.
              </p>
              <a
                href="https://github.com/shajith240"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#0a84ff',
                  textDecoration: 'none',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  transition: 'opacity 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                All repos ›
              </a>
            </div>
          </motion.div>

          {/* ── Cards ───────────────────────────────────────────── */}
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
          >
            {/* Featured — full width, editorial split (stacks on mobile) */}
            {featured && <FeaturedCard project={featured} isMobile={isPhone} />}

            {/* Grid — 3 cols desktop / 2 cols tablet / 1 col phone */}
            {grid.length > 0 && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isPhone
                    ? '1fr'
                    : isTabletLayout
                    ? 'repeat(2, 1fr)'
                    : 'repeat(3, 1fr)',
                  gap: '24px',
                }}
              >
                {grid.map(p => (
                  <GridCard key={p.id} project={p} />
                ))}
              </div>
            )}
          </motion.div>

          {/* ── Footer ──────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.9 }}
            style={{
              marginTop: '48px',
              paddingTop: '24px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <a
              href="https://github.com/shajith240"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: '13px',
                fontWeight: 500,
                color: '#0a84ff',
                textDecoration: 'none',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                transition: 'opacity 0.15s ease',
              }}
            >
              View all repos on GitHub ›
            </a>
          </motion.div>

        </motion.div>
      </div>
    </>
  )
}
