'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useLayout } from '@/contexts/LayoutContext'
import BottomToolbar from '@/components/ui/BottomToolbar'

/* ── Data ─────────────────────────────────────────────────── */

const CATEGORIES = [
  {
    label: 'Languages',
    icons: [
      { name: 'JavaScript', file: 'javascript', search: 'javascript js' },
      { name: 'TypeScript', file: 'typescript', search: 'typescript ts' },
      { name: 'Python',     file: 'python',     search: 'python py' },
      { name: 'C',          file: 'c',           search: 'c' },
      { name: 'Java',       file: 'java',        search: 'java' },
      { name: 'HTML',       file: 'html',        search: 'html' },
      { name: 'CSS',        file: 'css',         search: 'css' },
    ],
  },
  {
    label: 'Frameworks',
    icons: [
      { name: 'React',       file: 'react',        search: 'react' },
      { name: 'Node.js',     file: 'nodejs',       search: 'node nodejs' },
      { name: 'Antigravity', file: 'anitigravity',  search: 'antigravity animation ui' },
    ],
  },
  {
    label: 'Tools & DevOps',
    icons: [
      { name: 'Git',     file: 'git',    search: 'git' },
      { name: 'GitHub',  file: 'github', search: 'github' },
      { name: 'VS Code', file: 'vscode', search: 'vscode vs code editor' },
      { name: 'Docker',  file: 'docker', search: 'docker container devops' },
      { name: 'Linux',   file: 'linux',  search: 'linux ubuntu' },
      { name: 'N8N',     file: 'N8N',    search: 'n8n workflow automation' },
    ],
  },
  {
    label: 'Databases',
    icons: [
      { name: 'MongoDB',    file: 'mongodb',  search: 'mongodb mongo nosql database' },
      { name: 'PostgreSQL', file: 'postgres', search: 'postgresql postgres sql database' },
    ],
  },
  {
    label: 'AI Tools',
    icons: [
      { name: 'ChatGPT', file: 'chatgpt',       search: 'chatgpt openai gpt ai' },
      { name: 'Claude',  file: 'claude',        search: 'claude anthropic ai' },
      { name: 'Gemini',  file: 'gemini_google', search: 'gemini google ai' },
    ],
  },
]

/* ── AppIcon ─────────────────────────────────────────────── */

function AppIcon({
  name,
  file,
  dimmed,
  index,
  isPhone,
}: {
  name: string
  file: string
  dimmed: boolean
  index: number
  isPhone: boolean
}) {
  const iconSize = isPhone ? 60 : 80
  const wrapSize = isPhone ? 72 : 96

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.65 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        delay: index * 0.025,
        type: 'spring',
        stiffness: 360,
        damping: 28,
      }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 7,
        width: wrapSize,
      }}
    >
      <motion.div
        whileHover={dimmed ? {} : { scale: 1.15, y: -6 }}
        whileTap={dimmed  ? {} : { scale: 0.88 }}
        transition={{
          type: 'spring',
          stiffness: 580,
          damping: 38,
          mass: 0.75,
        }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 7,
          cursor: dimmed ? 'default' : 'pointer',
          userSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
          width: '100%',
          opacity: dimmed ? 0.18 : 1,
          transition: 'opacity 0.18s ease',
        }}
      >
        <img
          src={`/icons/${file}.png`}
          alt={name}
          draggable={false}
          style={{
            borderRadius: isPhone ? 14 : 18,
            width: iconSize,
            height: iconSize,
            display: 'block',
            objectFit: 'cover',
          }}
        />
        <span
          style={{
            fontSize: 11,
            color: 'var(--text-secondary)',
            textAlign: 'center',
            width: '100%',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            textShadow: 'var(--icon-text-shadow)',
            fontWeight: 400,
            letterSpacing: '0.01em',
          }}
        >
          {name}
        </span>
      </motion.div>
    </motion.div>
  )
}

/* ── Page ────────────────────────────────────────────────── */

export default function SkillsPage() {
  const { isSidebarOpen, isNavOpen, isMobileLayout, isTabletLayout } = useLayout()
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  const ml = !isMobileLayout && isSidebarOpen ? 280 : 0
  const mr = !isMobileLayout && isNavOpen ? 260 : 0
  const q = search.toLowerCase().trim()
  const isPhone = isMobileLayout && !isTabletLayout

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setSearch(''); return }
      if (
        e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey &&
        document.activeElement !== searchRef.current
      ) {
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  let iconIndex = 0

  return (
    <>
      <BottomToolbar />

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
              maxWidth: 860,
              margin: '0 auto',
              padding: `0 clamp(16px, 4vw, 48px) 80px`,
            }}
          >
            {/* Search bar — glass style matching macOS App Library */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              style={{ display: 'flex', justifyContent: 'center', marginTop: 32, marginBottom: 48 }}
            >
              <div style={{ position: 'relative', width: 'min(280px, calc(100vw - 64px))', isolation: 'isolate' }}>
                <svg
                  width={14} height={14} viewBox="0 0 14 14"
                  fill="none"
                  stroke="var(--search-glass-icon)"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    position: 'absolute', left: 12, top: '50%',
                    transform: 'translateY(-50%)', pointerEvents: 'none',
                    zIndex: 1,
                  }}
                >
                  <circle cx="6" cy="6" r="4.5" />
                  <line x1="9.5" y1="9.5" x2="13" y2="13" />
                </svg>
                <input
                  ref={searchRef}
                  autoFocus={!isPhone}
                  type="text"
                  placeholder="Search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    width: '100%',
                    height: 36,
                    background: 'var(--search-glass-bg)',
                    border: '1px solid var(--search-glass-border)',
                    borderRadius: 10,
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    color: 'var(--text-primary)',
                    fontSize: 14,
                    padding: '0 12px 0 36px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'system-ui, -apple-system, Helvetica Neue, sans-serif',
                    transition: 'background 0.22s ease, border-color 0.22s ease',
                  }}
                />
              </div>
            </motion.div>

            {/* Categories */}
            {CATEGORIES.map((cat) => (
              <div key={cat.label} style={{ marginBottom: 44 }}>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.14em',
                    fontWeight: 500,
                    marginBottom: 20,
                  }}
                >
                  {cat.label}
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '24px 4px',
                  }}
                >
                  {cat.icons.map((icon) => {
                    const matches =
                      !q ||
                      icon.name.toLowerCase().includes(q) ||
                      icon.search.includes(q)
                    const idx = iconIndex++
                    return (
                      <AppIcon
                        key={icon.file}
                        name={icon.name}
                        file={icon.file}
                        dimmed={!!q && !matches}
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

      <style>{`
        input::placeholder { color: var(--text-dim); }
      `}</style>
    </>
  )
}
