'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLayout } from '@/contexts/LayoutContext'
import BottomToolbar from '@/components/ui/BottomToolbar'

/* ─── Types ─────────────────────────────────────────────────── */

interface LCData {
  ranking: number | null
  totalSolved: number
  easySolved: number
  mediumSolved: number
  hardSolved: number
  totalEasy: number
  totalMedium: number
  totalHard: number
  acceptanceRate: string
  contestRating: number
  contestRank: number | null
  contestTopPercentage: number | null
  error?: boolean
}

interface CFData {
  user: {
    handle: string
    rating: number
    maxRating: number
    rank: string
    maxRank: string
    contribution: number
  } | null
  problemsSolved: number
  error?: boolean
}

interface CCData {
  rating?: number
  stars?: number
  highestRating?: number
  globalRank?: number
  countryRank?: number
  totalSolved?: number
  error?: boolean
}

type Tab = 'leetcode' | 'codeforces' | 'codechef'

/* ─── CF rank colours ────────────────────────────────────────── */

const CF_RANK_COLORS: Record<string, string> = {
  newbie:                  '#808080',
  pupil:                   '#008000',
  specialist:              '#03A89E',
  expert:                  '#4A90E2',
  'candidate master':      '#AA00AA',
  master:                  '#FF8C00',
  'international master':  '#FF8C00',
  grandmaster:             '#FF0000',
  'international grandmaster': '#FF0000',
  'legendary grandmaster': '#FF0000',
}
function cfColor(rank: string) {
  return CF_RANK_COLORS[rank?.toLowerCase()] ?? '#888888'
}

/* ─── CodeChef star colours ─────────────────────────────────── */

const CC_STAR_COLORS: Record<number, string> = {
  1: '#808080', 2: '#008000', 3: '#008000',
  4: '#0000FF', 5: '#AA00AA', 6: '#FF8C00', 7: '#FF0000',
}

/* ─── Glass card style ───────────────────────────────────────── */

const CARD: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 20,
}

const CARD_ELEVATED: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: 20,
}

/* ─── Count-up hook ─────────────────────────────────────────── */

function useCountUp(target: number, delayMs = 0) {
  const [count, setCount] = useState(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    setCount(0)
    if (target === 0) return
    const timer = setTimeout(() => {
      const dur = 900
      let t0: number | null = null
      const tick = (ts: number) => {
        if (!t0) t0 = ts
        const p = Math.min((ts - t0) / dur, 1)
        const eased = 1 - Math.pow(1 - p, 3) // easeOutCubic
        setCount(Math.round(target * eased))
        if (p < 1) rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    }, delayMs)
    return () => {
      clearTimeout(timer)
      cancelAnimationFrame(rafRef.current)
    }
  }, [target, delayMs])

  return count
}

/* ─── Block entrance wrapper ────────────────────────────────── */

function Block({
  children,
  delay = 0,
}: {
  children: React.ReactNode
  delay?: number
}) {
  return (
    <motion.div
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30, delay }}
    >
      {children}
    </motion.div>
  )
}

/* ─── Skeleton ───────────────────────────────────────────────── */

function Skeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {[140, 220, 100].map((h, i) => (
        <div
          key={i}
          style={{
            ...CARD,
            height: h,
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
      ))}
    </div>
  )
}

/* ─── Error card ─────────────────────────────────────────────── */

function ErrorCard({ platform, href }: { platform: string; href: string }) {
  return (
    <Block delay={0}>
      <div
        style={{
          ...CARD,
          padding: 'clamp(28px, 5vw, 52px) clamp(16px, 4vw, 40px)',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          borderColor: 'rgba(255,69,0,0.25)',
        }}
      >
        {/* Ghost stars for CodeChef visual echo */}
        {platform === 'CodeChef' && (
          <div
            style={{
              fontSize: 32,
              letterSpacing: 6,
              color: 'var(--border)',
              marginBottom: 4,
            }}
          >
            ★★★★★★★
          </div>
        )}
        <svg width={20} height={20} viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="8.5" stroke="#FF4500" strokeWidth="1.2" />
          <path
            d="M10 6v4.5M10 13.5v.5"
            stroke="#FF4500"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
        <div>
          <div
            style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 6 }}
          >
            {platform} API unavailable
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            The third-party data source is currently down.
          </div>
        </div>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 12, color: '#FF4500', textDecoration: 'none' }}
        >
          View on {platform} →
        </a>
      </div>
    </Block>
  )
}

/* ─── Profile link ───────────────────────────────────────────── */

function ProfileLink({ href, label }: { href: string; label: string }) {
  const [hov, setHov] = useState(false)
  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          border: `1px solid ${hov ? 'var(--border-strong)' : 'var(--border)'}`,
          borderRadius: 999,
          padding: '6px 18px',
          fontSize: 12,
          color: hov ? 'var(--text-secondary)' : 'var(--text-dim)',
          textDecoration: 'none',
          transition: 'color 150ms ease, border-color 150ms ease',
          display: 'inline-block',
          background: 'transparent',
        }}
      >
        {label} →
      </a>
    </div>
  )
}

/* ─── Fitness ring (120px SVG) ───────────────────────────────── */

function Ring({
  pct,
  color,
  solved,
  total,
  label,
  animDelay = 0,
}: {
  pct: number
  color: string
  solved: number
  total: number
  label: string
  animDelay?: number
}) {
  const R = 52
  const circ = 2 * Math.PI * R // 326.73
  const targetOffset = circ - (Math.min(pct, 100) / 100) * circ
  const centerCount = useCountUp(solved, animDelay * 1000 + 400)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <div style={{ position: 'relative', width: 120, height: 120 }}>
        {/* SVG rotated so arc starts at 12 o'clock */}
        <svg
          width={120}
          height={120}
          style={{ transform: 'rotate(-90deg)', display: 'block' }}
        >
          {/* Track */}
          <circle
            cx={60}
            cy={60}
            r={R}
            fill="none"
            style={{ stroke: 'var(--border)' }}
            strokeWidth={10}
          />
          {/* Progress arc */}
          <motion.circle
            cx={60}
            cy={60}
            r={R}
            fill="none"
            stroke={color}
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: targetOffset }}
            transition={{
              duration: 1.2,
              ease: [0.34, 1.0, 0.64, 1],
              delay: animDelay + 0.3,
            }}
          />
        </svg>

        {/* Center number */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
            }}
          >
            {centerCount}
          </span>
        </div>
      </div>

      {/* Below ring */}
      <div style={{ textAlign: 'center', lineHeight: 1 }}>
        <div
          style={{
            fontSize: 12,
            color: 'var(--text-muted)',
            fontWeight: 500,
            marginBottom: 6,
          }}
        >
          {solved} / {total}
        </div>
        <div
          style={{
            fontSize: 10,
            color,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontWeight: 600,
          }}
        >
          {label}
        </div>
      </div>
    </div>
  )
}

/* ─── Thin divider ───────────────────────────────────────────── */

const Divider = () => (
  <div
    style={{ height: 1, background: 'var(--border-subtle)', margin: '10px 0' }}
  />
)

/* ─── LeetCode tab ───────────────────────────────────────────── */

function LeetCodeTab({
  data,
  loading,
}: {
  data: LCData | null
  loading: boolean
}) {
  // Hooks must be called before any conditional return
  const heroCount = useCountUp(data?.totalSolved ?? 0)

  if (loading) return <Skeleton />
  if (!data || data.error) {
    return <ErrorCard platform="LeetCode" href="https://leetcode.com/u/shajith240" />
  }

  const easyPct = (data.easySolved / data.totalEasy) * 100
  const medPct = (data.mediumSolved / data.totalMedium) * 100
  const hardPct = (data.hardSolved / data.totalHard) * 100

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Block 1 — Hero solved card */}
      <Block delay={0}>
        <div
          style={{
            ...CARD_ELEVATED,
            padding: 'clamp(20px, 4vw, 36px) clamp(16px, 4vw, 40px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          {/* LEFT — billboard number */}
          <div>
            <div
              style={{
                fontSize: 'clamp(48px, 12vw, 72px)',
                fontWeight: 700,
                letterSpacing: '-0.04em',
                color: 'var(--text-primary)',
                lineHeight: 1,
              }}
            >
              {heroCount}
            </div>
            <div
              style={{
                fontSize: 13,
                color: 'var(--text-muted)',
                marginTop: 8,
              }}
            >
              problems solved
            </div>
          </div>

          {/* RIGHT — secondary inline stats */}
          <div style={{ textAlign: 'right', minWidth: 120 }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: 'var(--text-primary)',
                letterSpacing: '-0.01em',
              }}
            >
              {data.ranking ? `#${data.ranking.toLocaleString()}` : '—'}
            </div>
            <div
              style={{
                fontSize: 10,
                color: 'var(--text-dim)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginTop: 2,
              }}
            >
              Global rank
            </div>

            <Divider />

            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: 'var(--text-primary)',
                letterSpacing: '-0.01em',
              }}
            >
              {data.acceptanceRate}%
            </div>
            <div
              style={{
                fontSize: 10,
                color: 'var(--text-dim)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginTop: 2,
              }}
            >
              Acceptance
            </div>

            {data.contestRating > 0 && (
              <>
                <Divider />
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: 'white',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {data.contestRating}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: '#555555',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginTop: 2,
                  }}
                >
                  Contest rating
                </div>
              </>
            )}
          </div>
        </div>
      </Block>

      {/* Block 2 — Difficulty rings (the emotional centrepiece) */}
      <Block delay={0.08}>
        <div
          style={{
            ...CARD,
            padding: 'clamp(20px, 4vw, 40px)',
            display: 'flex',
            justifyContent: 'space-evenly',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 24,
          }}
        >
          <Ring
            pct={easyPct}
            color="#30D158"
            solved={data.easySolved}
            total={data.totalEasy}
            label="Easy"
            animDelay={0}
          />
          <Ring
            pct={medPct}
            color="#FF9F0A"
            solved={data.mediumSolved}
            total={data.totalMedium}
            label="Medium"
            animDelay={0.15}
          />
          <Ring
            pct={hardPct}
            color="#FF453A"
            solved={data.hardSolved}
            total={data.totalHard}
            label="Hard"
            animDelay={0.30}
          />
        </div>
      </Block>

      {/* Block 3 — Contest (only if data exists) */}
      {data.contestRating > 0 && data.contestRank != null && (
        <Block delay={0.16}>
          <div
            style={{
              ...CARD,
              padding: 'clamp(16px, 3vw, 28px) clamp(16px, 4vw, 40px)',
              display: 'flex',
              alignItems: 'center',
              gap: 0,
            }}
          >
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 'clamp(24px, 6vw, 36px)',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                }}
              >
                {data.contestRating}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: 'var(--text-dim)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginTop: 6,
                }}
              >
                Contest rating
              </div>
            </div>

            <div
              style={{
                width: 1,
                height: 40,
                background: 'var(--border)',
                marginRight: 40,
                flexShrink: 0,
              }}
            />

            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 'clamp(24px, 6vw, 36px)',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                }}
              >
                #{data.contestRank.toLocaleString()}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: 'var(--text-dim)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginTop: 6,
                }}
              >
                Global rank
              </div>
            </div>
          </div>
        </Block>
      )}

      <ProfileLink href="https://leetcode.com/u/shajith240" label="View full profile" />
    </div>
  )
}

/* ─── Codeforces tab ─────────────────────────────────────────── */

function CodeforcesTab({
  data,
  loading,
}: {
  data: CFData | null
  loading: boolean
}) {
  // Hooks before conditional returns
  const ratingCount = useCountUp(data?.user?.rating ?? 0)
  const solvedCount = useCountUp(data?.problemsSolved ?? 0, 120)

  if (loading) return <Skeleton />
  if (!data || data.error || !data.user) {
    return (
      <ErrorCard
        platform="Codeforces"
        href="https://codeforces.com/profile/shajith240"
      />
    )
  }

  const { user, problemsSolved } = data
  const color = cfColor(user.rank)
  const rankLabel =
    user.rank.charAt(0).toUpperCase() + user.rank.slice(1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Block 1 — Rating hero */}
      <Block delay={0}>
        <div
          style={{
            ...CARD_ELEVATED,
            borderColor: `${color}22`,
            padding: 'clamp(20px, 4vw, 36px) clamp(16px, 4vw, 40px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* LEFT — rating + rank */}
          <div>
            <div
              style={{
                fontSize: 'clamp(48px, 12vw, 72px)',
                fontWeight: 700,
                color,
                letterSpacing: '-0.04em',
                lineHeight: 1,
              }}
            >
              {ratingCount}
            </div>
            <div
              style={{
                fontSize: 16,
                color: color + 'b3',
                marginTop: 8,
                fontWeight: 500,
                letterSpacing: '0.02em',
                textTransform: 'capitalize',
              }}
            >
              {user.rank}
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--text-dim)',
                marginTop: 4,
              }}
            >
              Max: {user.maxRating} · {user.maxRank}
            </div>
          </div>

          {/* RIGHT — rank badge pill */}
          <div
            style={{
              background: color + '1e',
              border: `1px solid ${color}4d`,
              borderRadius: 10,
              padding: '14px 22px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color,
                textTransform: 'capitalize',
                letterSpacing: '0.01em',
              }}
            >
              {rankLabel}
            </div>
          </div>
        </div>
      </Block>

      {/* Block 2 — Problems solved */}
      <Block delay={0.08}>
        <div
          style={{
            ...CARD,
            padding: 'clamp(16px, 3vw, 28px) clamp(16px, 4vw, 40px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div
              style={{
                fontSize: 'clamp(32px, 8vw, 48px)',
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
                lineHeight: 1,
              }}
            >
              {solvedCount}
            </div>
            <div
              style={{
                fontSize: 13,
                color: 'var(--text-muted)',
                marginTop: 8,
              }}
            >
              unique problems solved
            </div>
          </div>

          {typeof user.contribution === 'number' && (
            <div style={{ textAlign: 'right' }}>
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                }}
              >
                {user.contribution >= 0
                  ? `+${user.contribution}`
                  : user.contribution}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: 'var(--text-dim)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginTop: 6,
                }}
              >
                Contribution
              </div>
            </div>
          )}
        </div>
      </Block>

      <ProfileLink
        href="https://codeforces.com/profile/shajith240"
        label="View full profile"
      />
    </div>
  )
}

/* ─── CodeChef tab ───────────────────────────────────────────── */

function CodeChefTab({
  data,
  loading,
}: {
  data: CCData | null
  loading: boolean
}) {
  const ratingCount = useCountUp(data?.rating ?? 0)

  if (loading) return <Skeleton />

  if (!data || data.error || typeof data.rating === 'undefined') {
    return (
      <ErrorCard
        platform="CodeChef"
        href="https://www.codechef.com/users/shajith240"
      />
    )
  }

  const stars = data.stars ?? 1
  const starColor = CC_STAR_COLORS[stars] ?? '#808080'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Block 1 — Star rating hero */}
      <Block delay={0}>
        <div
          style={{
            ...CARD_ELEVATED,
            borderColor: `${starColor}22`,
            padding: 'clamp(20px, 4vw, 36px) clamp(16px, 4vw, 40px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* LEFT — stars + rating */}
          <div>
            <div
              style={{
                fontSize: 'clamp(24px, 6vw, 36px)',
                letterSpacing: 4,
                lineHeight: 1,
                marginBottom: 16,
              }}
            >
              {Array(7)
                .fill(0)
                .map((_, i) => (
                  <span
                    key={i}
                    style={{
                      color: i < stars ? starColor : 'var(--border)',
                    }}
                  >
                    ★
                  </span>
                ))}
            </div>
            <div
              style={{
                fontSize: 'clamp(32px, 8vw, 48px)',
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
                lineHeight: 1,
              }}
            >
              {ratingCount}
            </div>
            <div
              style={{
                fontSize: 11,
                color: '#555555',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginTop: 6,
              }}
            >
              CodeChef rating
            </div>
          </div>

          {/* RIGHT — rank info */}
          {(data.globalRank || data.countryRank) && (
            <div style={{ textAlign: 'right' }}>
              {data.globalRank && (
                <>
                  <div
                    style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}
                  >
                    #{data.globalRank}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: '#555555',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      marginTop: 2,
                    }}
                  >
                    Global
                  </div>
                </>
              )}
              {data.countryRank && (
                <>
                  <Divider />
                  <div
                    style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}
                  >
                    #{data.countryRank}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: '#555555',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      marginTop: 2,
                    }}
                  >
                    Country
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </Block>

      <ProfileLink
        href="https://www.codechef.com/users/shajith240"
        label="View full profile"
      />
    </div>
  )
}

/* ─── Tab definitions ────────────────────────────────────────── */

const TABS: { id: Tab; label: string; dot: string }[] = [
  { id: 'leetcode',   label: 'LeetCode',   dot: '#FFA116' },
  { id: 'codeforces', label: 'Codeforces', dot: '#318CE7' },
  { id: 'codechef',   label: 'CodeChef',   dot: '#6B9FD4' },
]

/* ─── Page ───────────────────────────────────────────────────── */

export default function DsaPage() {
  const { isSidebarOpen, isNavOpen, isMobileLayout } = useLayout()

  const [activeTab, setActiveTab] = useState<Tab>('leetcode')
  const [leetcode, setLeetcode] = useState<LCData | null>(null)
  const [codeforces, setCodeforces] = useState<CFData | null>(null)
  const [codechef, setCodechef] = useState<CCData | null>(null)
  const [loading, setLoading] = useState({ lc: true, cc: true, cf: true })

  const ml = !isMobileLayout && isSidebarOpen ? 280 : 0
  const mr = !isMobileLayout && isNavOpen ? 260 : 0

  useEffect(() => {
    fetch('/api/leetcode')
      .then(r => r.json())
      .then(d => { setLeetcode(d); setLoading(p => ({ ...p, lc: false })) })
      .catch(() => {
        setLeetcode({ error: true } as any)
        setLoading(p => ({ ...p, lc: false }))
      })

    fetch('/api/codeforces')
      .then(r => r.json())
      .then(d => { setCodeforces(d); setLoading(p => ({ ...p, cf: false })) })
      .catch(() => {
        setCodeforces({ error: true } as any)
        setLoading(p => ({ ...p, cf: false }))
      })

    fetch('/api/codechef')
      .then(r => r.json())
      .then(d => { setCodechef(d); setLoading(p => ({ ...p, cc: false })) })
      .catch(() => {
        setCodechef({ error: true } as any)
        setLoading(p => ({ ...p, cc: false }))
      })
  }, [])

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
          overflowY: 'auto',
          overflowX: 'hidden',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        <div
          style={{
            maxWidth: 720,
            margin: '0 auto',
            padding: `clamp(32px, 6vw, 48px) clamp(16px, 5vw, 40px) 100px`,
          }}
        >
          {/* ── Hero identity block ─────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            style={{ marginBottom: 28 }}
          >
            <div
              style={{
                fontSize: 11,
                color: 'var(--text-dim)',
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                fontWeight: 400,
                marginBottom: 6,
              }}
            >
              Competitive Programming
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 600,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
              }}
            >
              shajith240
            </div>
          </motion.div>

          {/* Thin rule */}
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut', delay: 0.1 }}
            style={{
              height: 1,
              background: 'var(--border-subtle)',
              marginBottom: 28,
              transformOrigin: 'left',
            }}
          />

          {/* ── Tab bar ─────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut', delay: 0.15 }}
            style={{ marginBottom: 32 }}
          >
            <div
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 999,
                padding: 4,
                display: 'inline-flex',
                gap: 2,
                transition: 'background 0.22s ease, border-color 0.22s ease',
              }}
            >
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '7px 20px',
                    borderRadius: 999,
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    border: 'none',
                    outline: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    background:
                      activeTab === tab.id ? '#FF4500' : 'transparent',
                    color:
                      activeTab === tab.id
                        ? 'white'
                        : 'var(--text-muted)',
                    transition: 'background 150ms ease, color 150ms ease',
                    fontFamily:
                      'system-ui, -apple-system, Helvetica Neue, sans-serif',
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      flexShrink: 0,
                      background:
                        activeTab === tab.id
                          ? 'rgba(255,255,255,0.9)'
                          : tab.dot,
                      transition: 'background 150ms ease',
                    }}
                  />
                  {tab.label}
                </button>
              ))}
            </div>
          </motion.div>

          {/* ── Tab content ─────────────────────────────────── */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -12, opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              {activeTab === 'leetcode' && (
                <LeetCodeTab data={leetcode} loading={loading.lc} />
              )}
              {activeTab === 'codeforces' && (
                <CodeforcesTab data={codeforces} loading={loading.cf} />
              )}
              {activeTab === 'codechef' && (
                <CodeChefTab data={codechef} loading={loading.cc} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50%       { opacity: 0.65; }
        }
      `}</style>
    </div>
    </>
  )
}
