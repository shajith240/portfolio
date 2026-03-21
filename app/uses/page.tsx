'use client'

import { motion } from 'framer-motion'
import { useLayout } from '@/contexts/LayoutContext'
import BottomToolbar from '@/components/ui/BottomToolbar'

const USES = [
  {
    category: 'Editors',
    items: [
      {
        name: 'VS Code',
        description: 'Primary editor for TypeScript, Python, and web work. Vim keybindings on.',
      },
      {
        name: 'IntelliJ IDEA',
        description: 'For Java projects and anything that needs serious refactoring support.',
      },
    ],
  },
  {
    category: 'Operating System',
    items: [
      {
        name: 'Ubuntu',
        description: 'Main dev environment. Everything runs cleaner on Linux.',
      },
      {
        name: 'Windows',
        description: 'Secondary machine. Mostly for things that refuse to cooperate on Linux.',
      },
    ],
  },
  {
    category: 'Apps & Tools',
    items: [
      {
        name: 'Antigravity',
        description: 'Productivity tool that keeps distractions in check while working.',
      },
      {
        name: 'Git + GitHub',
        description: 'Version control and open source home base. @shajith240.',
      },
      {
        name: 'Terminal',
        description: 'bash on Ubuntu. Most things live here.',
      },
    ],
  },
  {
    category: 'Languages I reach for',
    items: [
      {
        name: 'TypeScript',
        description: 'Default for any web or full-stack project.',
      },
      {
        name: 'Python',
        description: 'For automation, scripting, and quick prototypes.',
      },
      {
        name: 'Java',
        description: 'Backend and systems work, mostly from coursework and personal projects.',
      },
    ],
  },
]

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
}

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0, 0, 0.58, 1] as const } },
}

export default function UsesPage() {
  const { isSidebarOpen, isNavOpen } = useLayout()
  const ml = isSidebarOpen ? 280 : 0
  const mr = isNavOpen ? 260 : 0

  return (
    <>
      <BottomToolbar />
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--bg-page)',
        overflowY: 'auto',
        scrollbarWidth: 'none',
        transition: 'background 0.22s ease',
      }}>
        <motion.div
          animate={{ paddingLeft: `${ml + 60}px`, paddingRight: `${mr + 60}px` }}
          transition={{ type: 'spring', stiffness: 520, damping: 44, mass: 0.85 }}
          style={{
            maxWidth: '760px',
            margin: '0 auto',
            padding: '100px 60px 120px',
          }}
        >
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            style={{ marginBottom: '56px' }}
          >
            <h1 style={{
              margin: '0 0 8px 0',
              fontSize: '38px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.025em',
              lineHeight: 1.1,
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}>
              Uses
            </h1>
            <p style={{
              margin: 0,
              fontSize: '14px',
              color: 'var(--text-dim)',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              lineHeight: 1.5,
            }}>
              Tools, software, and gear I reach for daily.
            </p>
          </motion.div>

          {/* Categories */}
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}
          >
            {USES.map((section) => (
              <motion.div key={section.category} variants={item}>
                <p style={{
                  margin: '0 0 20px 0',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: '#FF4500',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                }}>
                  {section.category}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                  {section.items.map((tool) => (
                    <div
                      key={tool.name}
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: '20px',
                        padding: '14px 0',
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      <p style={{
                        margin: 0,
                        fontSize: '14px',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                        minWidth: '160px',
                        flexShrink: 0,
                        transition: 'color 0.22s ease',
                      }}>
                        {tool.name}
                      </p>
                      <p style={{
                        margin: 0,
                        fontSize: '13px',
                        color: 'var(--text-muted)',
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                        lineHeight: 1.5,
                        transition: 'color 0.22s ease',
                      }}>
                        {tool.description}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </>
  )
}
