'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useLayout } from '@/contexts/LayoutContext'
import BottomToolbar from '@/components/ui/BottomToolbar'
import { PROJECTS, type Project } from '@/data/projects'

/* ─────────────────────────────────────────────────────────────────
   Animation config — matches MASTER.md exactly
   ───────────────────────────────────────────────────────────────── */

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15 } },
}

const cardVariant = {
  hidden: { scale: 0.95, opacity: 0 },
  show: {
    scale: 1,
    opacity: 1,
    transition: { duration: 0.5, ease: [0, 0, 0.58, 1] as const },
  },
}

const headerVariant = {
  hidden: { y: 16, opacity: 0 },
  show: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.5, ease: [0, 0, 0.58, 1] as const },
  },
}

/* ─────────────────────────────────────────────────────────────────
   TechChip — monospace, uppercase, muted, no fill
   ───────────────────────────────────────────────────────────────── */

function TechChip({ label }: { label: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: '9px',
        fontWeight: 700,
        letterSpacing: '0.09em',
        textTransform: 'uppercase',
        color: 'var(--text-dim)',
        background: 'var(--bg-page)',
        border: '1px solid var(--border)',
        borderRadius: '4px',
        padding: '3px 7px',
        fontFamily: 'ui-monospace, "SF Mono", monospace',
        transition: 'color 0.22s ease, background 0.22s ease, border-color 0.22s ease',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  )
}

/* ─────────────────────────────────────────────────────────────────
   FeaturedCard — 50/50 editorial split, content left / image right
   No card-level scale on hover — image zoom carries the interaction
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
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        overflow: 'hidden',
        minHeight: 'clamp(280px, 40vw, 380px)',
        boxShadow: 'var(--shadow-card)',
        transition: 'background 0.22s ease, border-color 0.22s ease',
      }}
    >
      {/* Left — content */}
      <div
        style={{
          padding: isMobile ? '24px' : '36px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          borderRight: isMobile ? 'none' : '1px solid var(--border)',
          borderBottom: isMobile ? '1px solid var(--border)' : 'none',
          transition: 'border-color 0.22s ease',
        }}
      >
        {/* Top */}
        <div>
          {/* Index / category row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '22px',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                color: 'var(--text-dim)',
                fontFamily: 'ui-monospace, "SF Mono", monospace',
                letterSpacing: '0.02em',
                transition: 'color 0.22s ease',
              }}
            >
              {String(project.id).padStart(2, '0')}
            </span>
            <span
              style={{
                width: '20px',
                height: '1px',
                background: 'var(--border)',
                flexShrink: 0,
                transition: 'background 0.22s ease',
              }}
            />
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: '#FF4500',
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
            >
              {project.sub}
            </span>
          </div>

          {/* Title */}
          <h2
            style={{
              margin: '0 0 16px 0',
              fontSize: '36px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.025em',
              lineHeight: 1.05,
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
              fontSize: isMobile ? '15px' : '13px',
              color: 'var(--text-muted)',
              lineHeight: 1.7,
              fontFamily: 'system-ui, -apple-system, sans-serif',
              maxWidth: isMobile ? 'none' : '300px',
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
              gap: '6px',
              marginBottom: '22px',
            }}
          >
            {project.tech.map(t => (
              <TechChip key={t} label={t} />
            ))}
          </div>

          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            {project.github && (
              <a
                href={project.github}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: hovered ? 'var(--text-primary)' : 'var(--text-muted)',
                  textDecoration: 'none',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  transition: 'color 0.15s ease',
                }}
              >
                GitHub →
              </a>
            )}
            {project.live && (
              <a
                href={project.live}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: hovered ? 'var(--text-primary)' : 'var(--text-muted)',
                  textDecoration: 'none',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  transition: 'color 0.15s ease',
                }}
              >
                Live →
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Right — full-bleed image */}
      <div
        style={{
          overflow: 'hidden',
          background: 'var(--bg-void)',
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
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'grayscale(100%)',
            display: 'block',
            transform: hovered ? 'scale(1.05)' : 'scale(1)',
            transition: 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          }}
        />

        {/* Subtle inner-left edge shadow to blend content/image boundary */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '40px',
            height: '100%',
            background: 'linear-gradient(to right, var(--bg-card), transparent)',
            pointerEvents: 'none',
            opacity: hovered ? 0 : 1,
            transition: 'opacity 0.4s ease',
          }}
        />
      </div>
    </motion.div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   GridCard — image top, content bottom, spring scale on hover
   ───────────────────────────────────────────────────────────────── */

function GridCard({ project }: { project: Project }) {
  const [hovered, setHovered] = useState(false)

  return (
    <motion.div
      variants={cardVariant}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-card)',
        transition: 'background 0.22s ease, border-color 0.22s ease',
      }}
    >
      {/* Image */}
      <div
        style={{
          width: '100%',
          aspectRatio: '16 / 10',
          overflow: 'hidden',
          background: 'var(--bg-void)',
          flexShrink: 0,
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
            filter: 'grayscale(100%)',
            display: 'block',
            transform: hovered ? 'scale(1.06)' : 'scale(1)',
            transition: 'transform 0.55s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          }}
        />
      </div>

      {/* Content */}
      <div
        style={{
          padding: '16px 18px 20px',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
        }}
      >
        {/* Index + category */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '10px',
          }}
        >
          <span
            style={{
              fontSize: '10px',
              color: 'var(--text-dim)',
              fontFamily: 'ui-monospace, "SF Mono", monospace',
              letterSpacing: '0.02em',
              transition: 'color 0.22s ease',
            }}
          >
            {String(project.id).padStart(2, '0')}
          </span>
          <span
            style={{
              fontSize: '9px',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: hovered ? '#FF4500' : 'var(--text-dim)',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              transition: 'color 0.15s ease',
            }}
          >
            {project.sub}
          </span>
        </div>

        {/* Divider */}
        <div
          style={{
            height: '1px',
            background: 'var(--border)',
            marginBottom: '12px',
            transition: 'background 0.22s ease',
          }}
        />

        {/* Title */}
        <h3
          style={{
            margin: '0 0 8px 0',
            fontSize: '17px',
            fontWeight: 700,
            color: 'var(--text-primary)',
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
            fontSize: '12px',
            color: 'var(--text-muted)',
            lineHeight: 1.6,
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
            gap: '5px',
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
                fontSize: '9px',
                color: 'var(--text-dim)',
                fontFamily: 'ui-monospace, "SF Mono", monospace',
                letterSpacing: '0.04em',
                transition: 'color 0.22s ease',
              }}
            >
              +{project.tech.length - 3}
            </span>
          )}
        </div>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          {project.github && (
            <a
              href={project.github}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: hovered ? 'var(--text-primary)' : 'var(--text-muted)',
                textDecoration: 'none',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                transition: 'color 0.15s ease',
              }}
            >
              GitHub →
            </a>
          )}
          {project.live && (
            <a
              href={project.live}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: hovered ? 'var(--text-primary)' : 'var(--text-muted)',
                textDecoration: 'none',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                transition: 'color 0.15s ease',
              }}
            >
              Live →
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
  const { isSidebarOpen, isNavOpen, isMobileLayout, isTabletLayout } = useLayout()
  const ml = !isMobileLayout && isSidebarOpen ? 280 : 0
  const mr = !isMobileLayout && isNavOpen ? 260 : 0
  const isPhone = isMobileLayout && !isTabletLayout

  const featured = PROJECTS.find(p => p.type === 'featured')
  const grid = PROJECTS.filter(p => p.type !== 'featured')

  return (
    <>
      <BottomToolbar />

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
            style={{ marginBottom: '36px' }}
          >
            {/* Title row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                marginBottom: '14px',
              }}
            >
              <h1
                style={{
                  margin: 0,
                  fontSize: '38px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.025em',
                  lineHeight: 1.0,
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  transition: 'color 0.22s ease',
                }}
              >
                Projects
              </h1>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--text-dim)',
                  fontFamily: 'ui-monospace, "SF Mono", monospace',
                  transition: 'color 0.22s ease',
                }}
              >
                {String(PROJECTS.length).padStart(2, '0')} selected
              </span>
            </div>

            {/* Hairline divider */}
            <div
              style={{
                height: '1px',
                background: 'var(--border)',
                marginBottom: '14px',
                transition: 'background 0.22s ease',
              }}
            />

            {/* Subtitle + GitHub link */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: '13px',
                  color: 'var(--text-dim)',
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
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  textDecoration: 'none',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  transition: 'color 0.15s ease',
                }}
              >
                All repos →
              </a>
            </div>
          </motion.div>

          {/* ── Cards ───────────────────────────────────────────── */}
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
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
                  gap: '16px',
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
              borderTop: '1px solid var(--border)',
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
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
                color: 'var(--text-dim)',
                textDecoration: 'none',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                transition: 'color 0.15s ease',
              }}
            >
              View all 19 repos on GitHub →
            </a>
          </motion.div>

        </motion.div>
      </div>
    </>
  )
}
