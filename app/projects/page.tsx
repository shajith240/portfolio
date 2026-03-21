'use client'

import { motion } from 'framer-motion'
import { useLayout } from '@/contexts/LayoutContext'
import BottomToolbar from '@/components/ui/BottomToolbar'

export default function ProjectsPage() {
  const { isSidebarOpen, isNavOpen } = useLayout()
  const ml = isSidebarOpen ? 280 : 0
  const mr = isNavOpen ? 260 : 0

  return (
    <>
      <BottomToolbar />
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: 'var(--bg-page)', transition: 'background 0.22s ease' }}>
        <motion.div
          animate={{ left: `${ml}px`, right: `${mr}px` }}
          transition={{ type: 'spring', stiffness: 520, damping: 44, mass: 0.85 }}
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <p
              style={{
                fontSize: 11,
                color: 'var(--text-dim)',
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                marginBottom: 8,
              }}
            >
              coming soon
            </p>
            <h1
              style={{
                fontSize: 32,
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
                margin: 0,
              }}
            >
              Projects
            </h1>
          </div>
        </motion.div>
      </div>
    </>
  )
}
