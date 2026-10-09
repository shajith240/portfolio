'use client'

import { motion } from 'framer-motion'
import { TIER_DIMENSIONS } from '@/lib/widgetSizeTiers'
import { WIDGET_TARGETS } from '@/lib/mascotTargets'
import LeetCodeWidget from '@/components/widgets/LeetCodeWidget'
import CodeforcesWidget from '@/components/widgets/CodeforcesWidget'

/* Phone-only "Coding" app (data/nav.ts PHONE_ONLY_ROUTES). Phones have
   no desktop widget grid, so the LeetCode and Codeforces widgets are
   stacked here at their medium size instead. On desktop they live on
   the home screen and AppShell sends /coding back to "/". */

const MEDIUM = TIER_DIMENSIONS.medium

const WIDGETS = [
  { id: 'leetcode', Widget: LeetCodeWidget },
  { id: 'codeforces', Widget: CodeforcesWidget },
] as const

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
}

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0, 0, 0.58, 1] as const } },
}

export default function CodingPage() {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'var(--bg-page)',
      overflowY: 'auto',
      scrollbarWidth: 'none',
      transition: 'background 0.22s ease',
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 'clamp(48px, 8vw, 100px)',
        // Clears the home indicator and the safe-area inset.
        paddingBottom: 'calc(clamp(60px, 10vw, 120px) + env(safe-area-inset-bottom, 0px))',
      }}>
        {/* Header, aligned with the widgets' left edge */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          style={{ width: `min(${MEDIUM.width}px, 100% - 32px)`, marginBottom: '28px' }}
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
            Coding
          </h1>
          <p style={{
            margin: 0,
            fontSize: '16px',
            color: 'var(--text-dim)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            lineHeight: 1.5,
          }}>
            My LeetCode and Codeforces stats, live.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', width: '100%' }}
        >
          {WIDGETS.map(({ id, Widget }) => (
            // Sized like the desktop's medium widget frame; the widget
            // fills it, exactly as inside WidgetFrame.
            <motion.div
              key={id}
              variants={item}
              data-mascot={WIDGET_TARGETS[id]}
              data-mascot-hover-only
              style={{ width: `min(${MEDIUM.width}px, 100% - 32px)`, height: `${MEDIUM.height}px`, position: 'relative' }}
            >
              <Widget size="medium" />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
