'use client'

import { motion } from 'framer-motion'
import { useLayout } from '@/contexts/LayoutContext'
import { useShellMetrics } from '@/lib/useShellMetrics'

// TODO: fill in year of study, GPA (only if you want it shown), and
// key coursework — placeholders intentionally left out rather than
// invented. See EDUCATION.items below.
const EDUCATION = [
  {
    institution: 'Indian Institute of Technology (ISM), Dhanbad',
    degree: 'B.Tech, Computer Science',
    period: '',
    details: [] as string[],
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

export default function EducationPage() {
  const { isMobileLayout, isTabletLayout } = useLayout()
  const metrics = useShellMetrics()
  const ml = metrics.contentLeft
  const mr = metrics.contentRight
  const isPhone = isMobileLayout && !isTabletLayout

  return (
    <>
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: isPhone ? 72 : 0,
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
            padding: `clamp(48px, 8vw, 100px) clamp(16px, 5vw, 60px) clamp(60px, 10vw, 120px)`,
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
              Education
            </h1>
            <p style={{
              margin: 0,
              fontSize: isPhone ? '16px' : '14px',
              color: 'var(--text-dim)',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              lineHeight: 1.5,
            }}>
              Where I studied, and what I studied.
            </p>
          </motion.div>

          {/* Institutions */}
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}
          >
            {EDUCATION.map((entry) => (
              <motion.div key={entry.institution} variants={item}>
                <div style={{
                  display: 'flex',
                  flexDirection: isPhone ? 'column' : 'row',
                  alignItems: isPhone ? 'flex-start' : 'baseline',
                  justifyContent: 'space-between',
                  gap: isPhone ? '4px' : '20px',
                  padding: '14px 0',
                  borderBottom: '1px solid var(--border)',
                }}>
                  <div>
                    <p style={{
                      margin: '0 0 4px 0',
                      fontSize: isPhone ? '17px' : '15px',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                    }}>
                      {entry.institution}
                    </p>
                    <p style={{
                      margin: 0,
                      fontSize: isPhone ? '15px' : '13px',
                      color: 'var(--text-muted)',
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      lineHeight: 1.5,
                    }}>
                      {entry.degree}
                    </p>
                  </div>
                  {entry.period && (
                    <p style={{
                      margin: 0,
                      fontSize: '13px',
                      color: 'var(--text-dim)',
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      whiteSpace: 'nowrap',
                    }}>
                      {entry.period}
                    </p>
                  )}
                </div>
                {entry.details.length > 0 && (
                  <ul style={{ margin: '12px 0 0 0', paddingLeft: '18px' }}>
                    {entry.details.map((d) => (
                      <li key={d} style={{
                        fontSize: '13px',
                        color: 'var(--text-muted)',
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                        lineHeight: 1.6,
                      }}>
                        {d}
                      </li>
                    ))}
                  </ul>
                )}
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </>
  )
}
