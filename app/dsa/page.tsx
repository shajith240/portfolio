'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLayout } from '@/contexts/LayoutContext'
import { useShellMetrics } from '@/lib/useShellMetrics'
import BottomToolbar from '@/components/ui/BottomToolbar'

interface LeetCodeUser {
  username: string
  name: string
  avatar: string | null
  ranking: number | null
  country: string | null
  school: string | null
  gitHub: string | null
  linkedIN: string | null
  reputation: number
  contributionPoint: number
}

interface DifficultyCount {
  difficulty: string
  count: number
  submissions: number
}

interface Badge {
  id: string
  displayName: string
  icon: string
  creationDate: string
}

interface SkillTag {
  tagName: string
  tagSlug: string
  problemsSolved: number
}

interface LCData {
  user: LeetCodeUser
  ranking: number | null
  totalSolved: number
  totalQuestions: number
  easySolved: number
  mediumSolved: number
  hardSolved: number
  totalEasy: number
  totalMedium: number
  totalHard: number
  totalSubmissions: DifficultyCount[]
  acceptedSubmissions: DifficultyCount[]
  submissionCalendar: Record<string, number>
  acceptanceRate: string
  contestRating: number
  contestRank: number | null
  contestTopPercentage: number | null
  contestAttend: number
  contestParticipants: number | null
  contestParticipation: Array<{
    rating: number
    ranking: number
    problemsSolved: number
    totalProblems: number
    contest: { title: string; startTime: number }
  }>
  badgesCount: number
  badges: Badge[]
  activeBadge: Badge | null
  languageProblemCount: Array<{ languageName: string; problemsSolved: number }>
  skills: {
    fundamental: SkillTag[]
    intermediate: SkillTag[]
    advanced: SkillTag[]
  }
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

type Tab = 'leetcode' | 'codeforces'
type CalendarFilter = 'current' | `${number}`

interface HeatmapDay {
  date: string
  count: number
  level: number
}

interface HeatmapMonth {
  key: string
  label: string
  weeks: Array<Array<HeatmapDay | null>>
}

const CARD: CSSProperties = {
  background: '#282828',
  border: '1px solid #343434',
  borderRadius: 6,
}

const PANEL: CSSProperties = {
  ...CARD,
  background: '#262626',
}

const LEETCODE_ORANGE = '#ffa116'
const EASY = '#00b8a3'
const MEDIUM = '#ffc01e'
const HARD = '#ff375f'
const HEATMAP_CELL = 10
const HEATMAP_GAP = 2
const HEATMAP_MONTH_GAP = 8
const MONTH_LABEL = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  timeZone: 'UTC',
})

const TABS: { id: Tab; label: string; dot: string }[] = [
  { id: 'leetcode', label: 'LeetCode', dot: LEETCODE_ORANGE },
  { id: 'codeforces', label: 'Codeforces', dot: '#318CE7' },
]

const CF_RANK_COLORS: Record<string, string> = {
  newbie: '#808080',
  pupil: '#008000',
  specialist: '#03A89E',
  expert: '#4A90E2',
  'candidate master': '#AA00AA',
  master: '#FF8C00',
  'international master': '#FF8C00',
  grandmaster: '#FF0000',
  'international grandmaster': '#FF0000',
  'legendary grandmaster': '#FF0000',
}

function cfColor(rank: string) {
  return CF_RANK_COLORS[rank?.toLowerCase()] ?? '#888888'
}

function useCountUp(target: number, delayMs = 0) {
  const [count, setCount] = useState(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    setCount(0)
    if (target === 0) return
    const timer = setTimeout(() => {
      const duration = 850
      let t0: number | null = null
      const tick = (ts: number) => {
        if (!t0) t0 = ts
        const progress = Math.min((ts - t0) / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        setCount(Math.round(target * eased))
        if (progress < 1) rafRef.current = requestAnimationFrame(tick)
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

function Block({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode
  delay?: number
  style?: CSSProperties
}) {
  return (
    <motion.div
      initial={{ y: 14, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.28, ease: 'easeOut', delay }}
      style={style}
    >
      {children}
    </motion.div>
  )
}

function formatNumber(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '-'
  return value.toLocaleString('en-US')
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function submissionCount(data: LCData, difficulty: string) {
  return data.totalSubmissions?.find((entry) => entry.difficulty === difficulty)?.count ?? 0
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function addMonths(date: Date, months: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1))
}

function startOfUtcMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
}

function endOfUtcMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0))
}

function maxDate(a: Date, b: Date) {
  return a.getTime() > b.getTime() ? a : b
}

function minDate(a: Date, b: Date) {
  return a.getTime() < b.getTime() ? a : b
}

function epochToDateKey(epochSeconds: string) {
  return new Date(Number(epochSeconds) * 1000).toISOString().slice(0, 10)
}

function countMapFromCalendar(calendar: Record<string, number>) {
  const byDate = new Map<string, number>()
  for (const [epoch, count] of Object.entries(calendar)) {
    byDate.set(epochToDateKey(epoch), count)
  }
  return byDate
}

function availableCalendarYears(calendar: Record<string, number>) {
  const years = new Set<number>()
  const currentYear = new Date().getUTCFullYear()
  years.add(currentYear)

  for (const epoch of Object.keys(calendar)) {
    years.add(new Date(Number(epoch) * 1000).getUTCFullYear())
  }

  return Array.from(years).sort((a, b) => b - a)
}

function heatmapLevel(count: number) {
  if (count <= 0) return 0
  if (count < 2) return 1
  if (count < 5) return 2
  if (count < 9) return 3
  return 4
}

function heatmapColor(level: number) {
  return ['#3b3b3b', '#1d6426', '#229b31', '#39d14a', '#a7ff9a'][level] ?? '#3b3b3b'
}

function getCalendarWindow(filter: CalendarFilter) {
  const today = new Date()
  const current = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))

  if (filter === 'current') {
    const start = addMonths(startOfUtcMonth(current), -11)
    return {
      start,
      end: current,
      months: Array.from({ length: 12 }, (_, index) => addMonths(start, index)),
      title: 'submissions in the past one year',
    }
  }

  const year = Number(filter)
  const start = new Date(Date.UTC(year, 0, 1))
  const end = new Date(Date.UTC(year, 11, 31))
  return {
    start,
    end,
    months: Array.from({ length: 12 }, (_, index) => new Date(Date.UTC(year, index, 1))),
    title: `submissions in ${year}`,
  }
}

function buildCalendarMonths(calendar: Record<string, number>, filter: CalendarFilter) {
  const byDate = countMapFromCalendar(calendar)
  const window = getCalendarWindow(filter)
  const months: HeatmapMonth[] = window.months.map((monthStart) => {
    const monthEnd = endOfUtcMonth(monthStart)
    const visibleStart = maxDate(monthStart, window.start)
    const visibleEnd = minDate(monthEnd, window.end)
    const cells: Array<HeatmapDay | null> = []
    const offset = monthStart.getUTCDay()

    for (let i = 0; i < offset; i += 1) cells.push(null)

    if (visibleEnd >= visibleStart) {
      for (let day = visibleStart; day <= visibleEnd; day = addDays(day, 1)) {
        const key = dateKey(day)
        const count = byDate.get(key) ?? 0
        cells.push({ date: key, count, level: heatmapLevel(count) })
      }
    }

    const weekCount = Math.max(1, Math.ceil(cells.length / 7))
    while (cells.length < weekCount * 7) cells.push(null)

    const weeks = Array.from({ length: weekCount }, (_, weekIndex) =>
      cells.slice(weekIndex * 7, weekIndex * 7 + 7),
    )

    return {
      key: `${monthStart.getUTCFullYear()}-${monthStart.getUTCMonth()}`,
      label: MONTH_LABEL.format(monthStart),
      weeks,
    }
  })

  return { ...window, months }
}

function calendarWidth(months: HeatmapMonth[]) {
  const weekCount = months.reduce((sum, month) => sum + month.weeks.length, 0)
  const weekGaps = months.reduce((sum, month) => sum + Math.max(0, month.weeks.length - 1), 0)
  const monthGaps = Math.max(0, months.length - 1)
  return weekCount * HEATMAP_CELL + weekGaps * HEATMAP_GAP + monthGaps * HEATMAP_MONTH_GAP
}

function selectedCalendarStats(calendar: Record<string, number>, filter: CalendarFilter) {
  const byDate = countMapFromCalendar(calendar)
  const { start, end } = getCalendarWindow(filter)
  let total = 0
  let activeDays = 0
  let maxStreak = 0
  let currentStreak = 0

  for (let day = start; day <= end; day = addDays(day, 1)) {
    const count = byDate.get(dateKey(day)) ?? 0
    total += count
    if (count > 0) {
      activeDays += 1
      currentStreak += 1
      maxStreak = Math.max(maxStreak, currentStreak)
    } else {
      currentStreak = 0
    }
  }

  return { total, activeDays, maxStreak }
}

function Icon({
  kind,
  color = '#b8b8b8',
}: {
  kind: 'pin' | 'school' | 'github' | 'linkedin' | 'eye' | 'solution' | 'chat' | 'star' | 'list'
  color?: string
}) {
  const common = {
    width: 14,
    height: 14,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  const paths = {
    pin: (
      <>
        <path d="M12 21s7-5.2 7-11a7 7 0 0 0-14 0c0 5.8 7 11 7 11Z" />
        <circle cx="12" cy="10" r="2.4" />
      </>
    ),
    school: (
      <>
        <path d="m3 8 9-4 9 4-9 4-9-4Z" />
        <path d="M6 10v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5" />
      </>
    ),
    github: (
      <>
        <path d="M9 19c-4 1.2-4-2-6-2.4" />
        <path d="M15 22v-3.5c0-1 .3-1.8.9-2.4 3-.3 6.1-1.4 6.1-6.6A5.1 5.1 0 0 0 20.6 6 4.8 4.8 0 0 0 20.5 2s-1.1-.4-3.8 1.5a13 13 0 0 0-6.8 0C7.2 1.6 6.1 2 6.1 2A4.8 4.8 0 0 0 6 6a5.1 5.1 0 0 0-1.4 3.5c0 5.2 3.1 6.3 6.1 6.6.6.5.9 1.4.9 2.4V22" />
      </>
    ),
    linkedin: (
      <>
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6Z" />
        <path d="M2 9h4v12H2z" />
        <circle cx="4" cy="4" r="2" />
      </>
    ),
    eye: (
      <>
        <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    solution: (
      <>
        <path d="M8 6h12" />
        <path d="M8 12h12" />
        <path d="M8 18h12" />
        <path d="m3 6 .8.8L6 4.6" />
        <path d="m3 12 .8.8L6 10.6" />
        <path d="m3 18 .8.8L6 16.6" />
      </>
    ),
    chat: (
      <>
        <path d="M21 12a8 8 0 0 1-8 8H7l-4 2 1.2-4A8 8 0 1 1 21 12Z" />
      </>
    ),
    star: <path d="m12 2 3 6 6.5.9-4.7 4.6 1.1 6.5L12 17l-5.9 3 1.1-6.5L2.5 8.9 9 8l3-6Z" />,
    list: (
      <>
        <path d="M8 6h13" />
        <path d="M8 12h13" />
        <path d="M8 18h13" />
        <path d="M3 6h.01" />
        <path d="M3 12h.01" />
        <path d="M3 18h.01" />
      </>
    ),
  }

  return <svg {...common}>{paths[kind]}</svg>
}

function Skeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '230px 1fr', gap: 18 }}>
      <div style={{ ...PANEL, height: 560, animation: 'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {[200, 150, 150, 360].map((height, index) => (
          <div
            key={index}
            style={{
              ...PANEL,
              height,
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
        ))}
      </div>
    </div>
  )
}

function ProfileRail({ data, compact }: { data: LCData; compact: boolean }) {
  const user = data.user
  const languages = data.languageProblemCount ?? []
  const skillGroups = [
    { label: 'Advanced', color: '#ff375f', items: data.skills?.advanced ?? [] },
    { label: 'Intermediate', color: '#ffc01e', items: data.skills?.intermediate ?? [] },
    { label: 'Fundamental', color: '#2bd576', items: data.skills?.fundamental ?? [] },
  ]

  return (
    <aside
      style={{
        ...(!compact ? { position: 'sticky', top: 28 } : {}),
        alignSelf: 'start',
        color: '#f5f5f5',
      }}
    >
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 18 }}>
        <img
          src={user.avatar || '/photos/my_photo.jpeg'}
          alt={user.username}
          style={{ width: 80, height: 80, borderRadius: 6, objectFit: 'cover', display: 'block' }}
        />
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{user.username}</span>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#5ad66f',
                display: 'inline-block',
              }}
            />
          </div>
          <div style={{ fontSize: 12, color: '#c9c9c9', marginTop: 2 }}>{user.name}</div>
          <div style={{ fontSize: 14, color: '#fff', marginTop: 14 }}>
            Rank <strong>{formatNumber(user.ranking)}</strong>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, color: '#fff', fontSize: 13, marginBottom: 12 }}>
        <span>0 Following</span>
        <span style={{ color: '#555' }}>|</span>
        <span>1 Followers</span>
      </div>

      <a
        href={`https://leetcode.com/u/${user.username}/`}
        target="_blank"
        rel="noreferrer"
        style={{
          height: 36,
          borderRadius: 4,
          background: '#17351f',
          color: '#4ade80',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 13,
          fontWeight: 700,
          marginBottom: 18,
          textDecoration: 'none',
        }}
      >
        Visit Profile
      </a>

      <RailInfo icon="pin" text={user.country || 'India'} />
      <RailInfo icon="school" text={user.school || 'Indian Institute of Technology Dhanbad'} />
      <RailInfo icon="github" text="shajith240" />
      <RailInfo icon="linkedin" text="shajith240" />

      <RailDivider />
      <RailSection title="Languages">
        {languages.map((language) => (
          <div key={language.languageName} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span
              style={{
                background: '#303030',
                borderRadius: 999,
                color: '#d6d6d6',
                fontSize: 11,
                padding: '4px 9px',
              }}
            >
              {language.languageName}
            </span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: '#fff', fontWeight: 700 }}>
              {language.problemsSolved}
            </span>
            <span style={{ fontSize: 11, color: '#b0b0b0' }}>problems solved</span>
          </div>
        ))}
      </RailSection>

      <RailDivider />
      <RailSection title="Skills">
        {skillGroups.map((group) => (
          <div key={group.label} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: group.color }} />
              <span style={{ color: '#f0f0f0', fontSize: 11, fontWeight: 700 }}>{group.label}</span>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {group.items.slice(0, compact ? 5 : 4).map((skill) => (
                <span
                  key={skill.tagSlug}
                  style={{
                    background: '#303030',
                    border: '1px solid #3a3a3a',
                    borderRadius: 999,
                    color: '#d8d8d8',
                    fontSize: 10,
                    padding: '4px 7px',
                  }}
                >
                  {skill.tagName} <span style={{ color: '#aaa' }}>x{skill.problemsSolved}</span>
                </span>
              ))}
            </div>
          </div>
        ))}
      </RailSection>
    </aside>
  )
}

function RailInfo({ icon, text }: { icon: Parameters<typeof Icon>[0]['kind']; text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#e0e0e0', fontSize: 13, marginBottom: 15 }}>
      <Icon kind={icon} color="#9a9a9a" />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{text}</span>
    </div>
  )
}

function RailDivider() {
  return <div style={{ height: 1, background: '#333', margin: '16px 0' }} />
}

function RailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 style={{ margin: '0 0 14px', color: '#fff', fontSize: 15, fontWeight: 700 }}>{title}</h3>
      {children}
    </section>
  )
}

function ContestCard({ data, compact }: { data: LCData; compact: boolean }) {
  const rating = useCountUp(data.contestRating)
  const metricGridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: compact ? 'repeat(3, minmax(0, 1fr))' : 'repeat(3, minmax(0, 1fr))',
    gap: compact ? 12 : 24,
    marginBottom: compact ? 22 : 28,
  }

  return (
    <Block delay={0}>
      <div
        style={{
          ...PANEL,
          padding: compact ? '20px 16px' : '24px 28px',
          display: compact ? 'flex' : 'grid',
          flexDirection: compact ? 'column' : undefined,
          gridTemplateColumns: compact ? undefined : '1fr 260px',
          gap: compact ? 18 : 26,
          minHeight: compact ? 'auto' : 164,
          overflow: 'hidden',
        }}
      >
        <div>
          <div style={metricGridStyle}>
            <Metric label="Contest Rating" value={formatNumber(rating)} large compact={compact} />
            <Metric label="Global Ranking" value={`${formatNumber(data.contestRank)}/${formatNumber(data.contestParticipants)}`} compact={compact} />
            <Metric label="Attended" value={String(data.contestAttend ?? 0)} compact={compact} />
          </div>
          <ContestRatingChart data={data} />
        </div>

        <div
          style={{
            borderLeft: compact ? 'none' : '1px solid #4a4a4a',
            borderTop: compact ? '1px solid #3a3a3a' : 'none',
            paddingLeft: compact ? 0 : 24,
            paddingTop: compact ? 18 : 0,
            minWidth: 0,
            overflow: 'hidden',
          }}
        >
          <Metric label="Top" value={`${data.contestTopPercentage ?? 0}%`} large compact={compact} />
          <TopPercentageChart data={data} compact={compact} />
        </div>
      </div>
    </Block>
  )
}

function contestDateLabel(seconds?: number) {
  if (!seconds) return 'Contest'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(seconds * 1000))
}

function ContestRatingChart({ data }: { data: LCData }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const svgHeight = 58
  const viewBoxHeight = 46
  const history = [...(data.contestParticipation ?? [])]
    .filter((entry) => Number.isFinite(entry.rating))
    .sort((a, b) => a.contest.startTime - b.contest.startTime)
  const fallback = {
    rating: data.contestRating,
    ranking: data.contestRank ?? 0,
    problemsSolved: 0,
    totalProblems: 0,
    contest: { title: 'Contest rating', startTime: 0 },
  }
  const pointsSource = history.length ? history : [fallback]
  const ratings = pointsSource.map((entry) => entry.rating)
  const minRating = Math.min(...ratings, 1500)
  const maxRating = Math.max(...ratings, 1700)
  const span = Math.max(1, maxRating - minRating)
  const points = pointsSource.map((entry, index) => {
    const x = pointsSource.length === 1 ? 54 : 3 + (index / (pointsSource.length - 1)) * 94
    const y = 34 - ((entry.rating - minRating) / span) * 22
    return { entry, x, y }
  })
  const selected = points[hoveredIndex ?? points.length - 1]
  const path =
    points.length === 1
      ? `M 0 ${selected.y} L 100 ${selected.y}`
      : points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
  const selectedYPx = selected.y * (svgHeight / viewBoxHeight)

  return (
    <div style={{ position: 'relative', height: 76, marginTop: 14 }}>
      <svg width="100%" height={svgHeight} viewBox={`0 0 100 ${viewBoxHeight}`} preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible' }}>
        <motion.path
          d={path}
          fill="none"
          stroke="#906404"
          strokeWidth="1.8"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        />
        {points.map((point, index) => (
          <g key={`${point.entry.contest.startTime}-${index}`}>
            <circle
              cx={point.x}
              cy={point.y}
              r={4.2}
              fill="transparent"
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          </g>
        ))}
      </svg>
      <div
        style={{
          position: 'absolute',
          left: `${selected.x}%`,
          top: `${selectedYPx - 27}px`,
          transform: 'translateX(-50%)',
          zIndex: 4,
          background: '#333',
          border: '1px solid #5f5f5f',
          borderRadius: 4,
          minWidth: 38,
          height: 21,
          padding: '0 5px',
          color: '#f0f0f0',
          fontSize: 11,
          lineHeight: '21px',
          textAlign: 'center',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        {formatNumber(Math.round(selected.entry.rating))}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: '50%',
            bottom: -4,
            width: 7,
            height: 7,
            transform: 'translateX(-50%) rotate(45deg)',
            background: '#333',
            borderRight: '1px solid #5f5f5f',
            borderBottom: '1px solid #5f5f5f',
          }}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          left: `${selected.x}%`,
          top: selectedYPx,
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: '#f2f2f2',
          border: '1px solid #777',
          transform: 'translate(-50%, -50%)',
          zIndex: 3,
          pointerEvents: 'none',
        }}
      />
      <div style={{ color: '#cfcfcf', fontSize: 12, textAlign: 'center', marginTop: 2 }}>
        {contestDateLabel(selected.entry.contest.startTime)}
      </div>
    </div>
  )
}

interface ContestTopBar {
  id: string
  rating: number
  topPercentage: number
  users: number
  height: number
  active: boolean
}

function contestTopPercentage(data: LCData) {
  if (Number.isFinite(data.contestTopPercentage)) {
    return clampNumber(data.contestTopPercentage ?? 0, 0.1, 99.9)
  }

  if (data.contestRank && data.contestParticipants) {
    return clampNumber((data.contestRank / data.contestParticipants) * 100, 0.1, 99.9)
  }

  return 50
}

function buildContestTopBars(data: LCData): ContestTopBar[] {
  const barCount = 25
  const top = contestTopPercentage(data)
  const rating = Number.isFinite(data.contestRating) ? data.contestRating : 1500
  const participants = Math.max(1, data.contestParticipants ?? 1)
  const history = (data.contestParticipation ?? [])
    .map((entry) => entry.rating)
    .filter((entryRating) => Number.isFinite(entryRating))

  const activePosition = clampNumber(0.38 + (50 - top) * 0.006 + (rating - 1500) * 0.0007, 0.26, 0.7)
  const activeIndex = Math.round(activePosition * (barCount - 1))
  const peakIndex = clampNumber(activeIndex - (1.4 + top / 36), 3, barCount - 5)
  const percentileStep = clampNumber(1.7 + top / 36, 2.1, 4.3)
  const ratingStep = clampNumber(28 + top * 0.42 + (data.contestAttend <= 1 ? 5 : 0), 30, 48)

  const raw = Array.from({ length: barCount }, (_, index) => {
    const ratingBucket = Math.round(rating + (index - activeIndex) * ratingStep)
    const percentileBucket = clampNumber(top + (index - activeIndex) * percentileStep, 0.1, 99.9)
    const distance = index - peakIndex
    const sigma = distance < 0 ? 2.55 : 4.7
    const populationSignal = Math.exp(-Math.pow(distance / sigma, 2) / 2)
    const historySignal = history.length
      ? history.reduce((sum, historyRating) => sum + Math.exp(-Math.pow((ratingBucket - historyRating) / 72, 2) / 2), 0) / history.length
      : 0
    const rankSignal = Math.exp(-Math.pow((index - activeIndex) / 3.2, 2) / 2)
    const tailFloor = 0.045 + Math.max(0, index - activeIndex) * 0.002
    const density = populationSignal * 0.76 + historySignal * 0.11 + rankSignal * 0.08 + tailFloor

    return {
      index,
      rating: ratingBucket,
      topPercentage: percentileBucket,
      density,
      active: index === activeIndex,
    }
  })

  const maxDensity = Math.max(...raw.map((bar) => bar.density), 1)
  const densityTotal = raw.reduce((sum, bar) => sum + bar.density, 0) || 1
  const windowCoverage = clampNumber(0.18 + Math.min(data.contestAttend, 10) * 0.012, 0.18, 0.3)

  return raw.map((bar) => ({
    id: `${bar.index}-${bar.rating}`,
    rating: bar.rating,
    topPercentage: bar.active ? top : bar.topPercentage,
    users: Math.max(1, Math.round((participants * windowCoverage * bar.density) / densityTotal)),
    height: Math.max(5, 5 + Math.pow(bar.density / maxDensity, 1.08) * 39),
    active: bar.active,
  }))
}

function TopPercentageChart({ data, compact = false }: { data: LCData; compact?: boolean }) {
  const [hovered, setHovered] = useState<number | null>(null)
  const bars = useMemo(() => buildContestTopBars(data), [data])
  const activeIndex = Math.max(0, bars.findIndex((bar) => bar.active))
  const selected = bars[hovered ?? activeIndex] ?? bars[activeIndex]
  const barWidth = 7
  const gap = 2.5
  const chartHeight = compact ? 54 : 60
  const baseline = compact ? 50 : 56
  const chartWidth = bars.length * barWidth + (bars.length - 1) * gap
  const selectedIndex = hovered ?? activeIndex
  const selectedXPercent = ((selectedIndex * (barWidth + gap) + barWidth / 2) / chartWidth) * 100

  return (
    <div style={{ position: 'relative', width: 'min(228px, 100%)', height: compact ? 56 : 62, margin: compact ? '26px auto 0' : '44px auto 0' }}>
      <svg
        width="100%"
        height={chartHeight}
        viewBox={`0 0 ${chartWidth} 60`}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: 'block', overflow: 'hidden' }}
        role="img"
        aria-label={`Contest top ${contestTopPercentage(data).toFixed(2)} percent distribution`}
      >
        {bars.map((bar, index) => {
          const height = bar.height
          const x = index * (barWidth + gap)
          const y = baseline - height
          const isHovered = index === hovered
          return (
            <g key={bar.id}>
              <rect
                x={x - gap / 2}
                y={6}
                width={barWidth + gap}
                height={chartHeight - 6}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHovered(index)}
                onMouseLeave={() => setHovered(null)}
              />
              <motion.rect
                x={x}
                y={y}
                width={barWidth}
                height={height}
                rx={1.5}
                fill={bar.active ? LEETCODE_ORANGE : isHovered ? '#656565' : '#494949'}
                initial={{ opacity: 0, scaleY: 0 }}
                animate={{ opacity: 1, scaleY: 1 }}
                transition={{ duration: 0.38, ease: 'easeOut', delay: index * 0.012 }}
                style={{ pointerEvents: 'none', transformBox: 'fill-box', transformOrigin: '50% 100%' }}
              >
                <title>{bar.active ? `Top ${bar.topPercentage.toFixed(2)}%` : `~Top ${bar.topPercentage.toFixed(1)}%`}</title>
              </motion.rect>
            </g>
          )
        })}
      </svg>
      {hovered != null && (
        <div
          style={{
            position: 'absolute',
            left: `${selectedXPercent}%`,
            top: 0,
            transform: 'translate(-50%, 0)',
            background: '#3b3b3b',
            border: '1px solid #606060',
            borderRadius: 4,
            color: '#ededed',
            fontSize: 11,
            padding: '4px 7px',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          {selected.active
            ? `Top ${selected.topPercentage.toFixed(2)}%`
            : `${formatNumber(selected.users)} users near ${formatNumber(selected.rating)}`}
        </div>
      )}
    </div>
  )
}

function Metric({
  label,
  value,
  large = false,
  compact = false,
}: {
  label: string
  value: string
  large?: boolean
  compact?: boolean
}) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ color: '#bdbdbd', fontSize: compact ? 10 : 11, marginBottom: compact ? 7 : 8 }}>{label}</div>
      <div
        style={{
          color: '#fff',
          fontSize: large ? (compact ? 25 : 27) : compact ? 12 : 13,
          fontWeight: 400,
          lineHeight: 1.1,
          overflowWrap: 'anywhere',
        }}
      >
        {value}
      </div>
    </div>
  )
}

function SolvedAndBadges({ data, compact, tiny }: { data: LCData; compact: boolean; tiny: boolean }) {
  const solvedCardPadding = compact ? (tiny ? 16 : 18) : 22

  return (
    <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr', gap: 14, alignItems: 'stretch' }}>
      <Block delay={0.05} style={{ height: '100%' }}>
        <div
          style={{
            ...PANEL,
            padding: solvedCardPadding,
            minHeight: compact ? (tiny ? 198 : 214) : 194,
            height: '100%',
            display: 'grid',
            gridTemplateColumns: compact ? `minmax(0, 1fr) ${tiny ? 78 : 92}px` : '1fr 92px',
            gap: compact ? (tiny ? 10 : 14) : 16,
            alignItems: 'center',
            overflow: 'hidden',
          }}
        >
          <ProblemWheel data={data} compact={compact} tiny={tiny} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <DifficultyMini label="Easy" solved={data.easySolved} total={data.totalEasy} color={EASY} compact={compact} tiny={tiny} />
            <DifficultyMini label="Med." solved={data.mediumSolved} total={data.totalMedium} color={MEDIUM} compact={compact} tiny={tiny} />
            <DifficultyMini label="Hard" solved={data.hardSolved} total={data.totalHard} color={HARD} compact={compact} tiny={tiny} />
          </div>
        </div>
      </Block>

      <Block delay={0.08} style={{ height: '100%' }}>
        <div
          style={{
            ...PANEL,
            padding: compact ? 22 : 22,
            minHeight: compact ? 202 : 194,
            height: '100%',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div>
            <div style={{ color: '#d2d2d2', fontSize: 12 }}>Badges</div>
            <div style={{ color: '#fff', fontSize: 28, marginTop: 4 }}>{data.badgesCount}</div>
            <div style={{ position: 'absolute', left: 22, bottom: 22 }}>
              <div style={{ color: '#bdbdbd', fontSize: 11, marginBottom: 4 }}>Most Recent Badge</div>
              <div style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>{data.activeBadge?.displayName ?? 'No badge yet'}</div>
            </div>
          </div>
          <a
            href={`https://leetcode.com/u/${data.user.username}/`}
            target="_blank"
            rel="noreferrer"
            aria-label="Open LeetCode profile"
            style={{
              position: 'absolute',
              right: 20,
              top: 20,
              width: 34,
              height: 34,
              borderRadius: 8,
              display: 'grid',
              placeItems: 'center',
              color: '#b8b8b8',
              textDecoration: 'none',
            }}
          >
            <svg width="25" height="25" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 12h13" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
              <path d="m13 6 6 6-6 6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              display: 'grid',
              placeItems: 'center',
              pointerEvents: 'none',
            }}
          >
            {data.activeBadge?.icon && (
              <img
                src={normalizeBadgeIcon(data.activeBadge.icon)}
                alt={data.activeBadge.displayName}
                style={{ width: 86, height: 86, objectFit: 'contain' }}
              />
            )}
          </div>
        </div>
      </Block>
    </div>
  )
}

function normalizeBadgeIcon(icon: string) {
  if (icon.startsWith('http')) return icon
  return `https://assets.leetcode.com${icon}`
}

function polarPoint(cx: number, cy: number, radius: number, angle: number) {
  const radians = ((angle - 90) * Math.PI) / 180
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  }
}

function arcPath(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const delta = ((endAngle - startAngle) % 360 + 360) % 360
  const start = polarPoint(cx, cy, radius, startAngle)
  const end = polarPoint(cx, cy, radius, endAngle)
  const largeArc = delta > 180 ? 1 : 0
  return `M ${start.x.toFixed(3)} ${start.y.toFixed(3)} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x.toFixed(3)} ${end.y.toFixed(3)}`
}

function progressArcEnd(startAngle: number, endAngle: number, solved: number, total: number, minVisibleDegrees: number) {
  const span = ((endAngle - startAngle) % 360 + 360) % 360
  const ratio = total > 0 ? Math.max(0, Math.min(1, solved / total)) : 0
  if (ratio === 0) return startAngle
  return startAngle + Math.min(span, Math.max(minVisibleDegrees, span * ratio))
}

function ProblemWheel({ data, compact, tiny }: { data: LCData; compact: boolean; tiny: boolean }) {
  const solved = useCountUp(data.totalSolved, 120)
  const total = data.totalQuestions || data.totalEasy + data.totalMedium + data.totalHard
  const attempting = Math.max(0, submissionCount(data, 'All') - data.totalSolved)
  const size = tiny ? 152 : compact ? 166 : 170
  const center = size / 2
  const radius = tiny ? 65 : compact ? 71 : 73
  const strokeWidth = 5
  const easyTotal = Math.max(0, data.totalEasy)
  const mediumTotal = Math.max(0, data.totalMedium)
  const hardTotal = Math.max(0, data.totalHard)
  const difficultyTotal = easyTotal + mediumTotal + hardTotal
  const easyRatio = difficultyTotal > 0 ? easyTotal / difficultyTotal : 0.24
  const mediumRatio = difficultyTotal > 0 ? mediumTotal / difficultyTotal : 0.52
  const hardRatio = difficultyTotal > 0 ? hardTotal / difficultyTotal : 0.24
  const topGapDegrees = 8
  const bottomTextGapDegrees = 78
  const drawableDegrees = 360 - bottomTextGapDegrees - topGapDegrees * 2
  const mediumSpan = drawableDegrees * mediumRatio
  const easySpan = drawableDegrees * easyRatio
  const hardSpan = drawableDegrees * hardRatio
  const mediumEnd = mediumSpan / 2
  const mediumStart = 360 - mediumEnd
  const hardStart = mediumEnd + topGapDegrees
  const hardEnd = hardStart + hardSpan
  const easyEnd = mediumStart - topGapDegrees
  const easyStart = easyEnd - easySpan
  const segments = [
    {
      key: 'medium',
      label: 'Medium',
      start: mediumStart,
      end: mediumEnd,
      solved: data.mediumSolved,
      total: data.totalMedium,
      color: MEDIUM,
      track: '#5b4712',
      minVisibleDegrees: 7,
    },
    {
      key: 'easy',
      label: 'Easy',
      start: easyStart,
      end: easyEnd,
      solved: data.easySolved,
      total: data.totalEasy,
      color: EASY,
      track: '#1b5d5b',
      minVisibleDegrees: 5.25,
    },
    {
      key: 'hard',
      label: 'Hard',
      start: hardStart,
      end: hardEnd,
      solved: data.hardSolved,
      total: data.totalHard,
      color: HARD,
      track: '#5a252c',
      minVisibleDegrees: 3,
    },
  ]

  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }} aria-hidden="true">
        {segments.map((segment, index) => (
          <g key={`${segment.key}-track`}>
            <motion.path
              d={arcPath(center, center, radius, segment.start, segment.end)}
              fill="none"
              stroke={segment.track}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.78 }}
              transition={{ duration: 0.25, ease: 'easeOut', delay: 0.08 + index * 0.05 }}
            />
            <motion.path
              d={arcPath(
                center,
                center,
                radius,
                segment.start,
                progressArcEnd(segment.start, segment.end, segment.solved, segment.total, segment.minVisibleDegrees),
              )}
              fill="none"
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.56, ease: 'easeOut', delay: 0.18 + index * 0.08 }}
            >
              <title>{`${segment.label}: ${segment.solved}/${segment.total}`}</title>
            </motion.path>
          </g>
        ))}
      </svg>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: tiny ? 49 : compact ? 52 : 54,
          transform: 'translateX(-50%)',
          color: '#fff',
          fontSize: tiny ? 29 : compact ? 31 : 32,
          fontWeight: 500,
          lineHeight: 1,
          letterSpacing: 0,
          whiteSpace: 'nowrap',
        }}
      >
        {solved}<span style={{ color: '#f2f2f2', fontSize: tiny ? 12 : 13, fontWeight: 600, marginLeft: 1, verticalAlign: 'baseline' }}>/{total}</span>
      </div>
      <div
        className="problem-wheel-solved"
        style={{
          position: 'absolute',
          left: '50%',
          top: tiny ? 83 : compact ? 88 : 90,
          transform: 'translateX(-50%)',
          color: '#f2f2f2',
          fontSize: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 3,
          whiteSpace: 'nowrap',
        }}
      >
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M2.4 6.3 4.8 8.7 9.8 3.4" stroke="#2bd576" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="solved-label" style={{ fontSize: tiny ? 12 : 13 }}>Solved</span>
      </div>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: tiny ? 116 : compact ? 124 : 128,
          transform: 'translateX(-50%)',
          color: '#a7a7a7',
          fontSize: tiny ? 12 : 13,
          lineHeight: 1,
          whiteSpace: 'nowrap',
        }}
      >
        {attempting} Attempting
      </div>
      <div className="problem-wheel-legacy-center" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
        <div>
          <div style={{ color: '#fff', fontSize: 31, fontWeight: 500, lineHeight: 1, letterSpacing: 0 }}>
            {solved}<span style={{ color: '#f2f2f2', fontSize: 13, fontWeight: 600, marginLeft: 1 }}>/{total}</span>
          </div>
          <div className="problem-wheel-solved" style={{ color: '#f2f2f2', fontSize: 0, marginTop: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M2.4 6.3 4.8 8.7 9.8 3.4" stroke="#2bd576" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="solved-label" style={{ fontSize: 13 }}>Solved</span>
            <span style={{ color: '#5ad66f', marginRight: 4 }}>✓</span>Solved
          </div>
          <div style={{ color: '#a7a7a7', fontSize: 13, marginTop: 18 }}>{attempting} Attempting</div>
        </div>
      </div>
    </div>
  )
}

function DifficultyMini({
  label,
  solved,
  total,
  color,
  compact,
  tiny,
}: {
  label: string
  solved: number
  total: number
  color: string
  compact: boolean
  tiny: boolean
}) {
  return (
    <div style={{ background: '#333', borderRadius: 5, padding: compact ? (tiny ? '7px 5px' : '8px 8px') : '8px 10px', textAlign: 'center' }}>
      <div style={{ color, fontSize: tiny ? 11 : 12, fontWeight: 700 }}>{label}</div>
      <div style={{ color: '#fff', fontSize: tiny ? 11 : 12, fontWeight: 700 }}>{solved}/{total}</div>
    </div>
  )
}

function CalendarCard({ data, compact }: { data: LCData; compact: boolean }) {
  const yearOptions = useMemo(() => availableCalendarYears(data.submissionCalendar), [data.submissionCalendar])
  const [filter, setFilter] = useState<CalendarFilter>('current')
  const heatmap = useMemo(() => buildCalendarMonths(data.submissionCalendar, filter), [data.submissionCalendar, filter])
  const stats = useMemo(() => selectedCalendarStats(data.submissionCalendar, filter), [data.submissionCalendar, filter])
  const heatmapWidth = useMemo(() => calendarWidth(heatmap.months), [heatmap.months])

  return (
    <Block delay={0.12}>
      <div style={{ ...PANEL, padding: compact ? '16px 14px 18px' : '16px 16px 18px', overflow: 'hidden' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: compact ? 'column' : 'row',
            alignItems: compact ? 'stretch' : 'center',
            gap: compact ? 12 : 12,
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <div style={{ color: '#fff', fontSize: compact ? 17 : 18, minWidth: 0 }}>
              <strong>{stats.total}</strong> <span style={{ fontSize: compact ? 13 : 14 }}>{heatmap.title}</span>
            </div>
            <span style={{ width: 14, height: 14, border: '1px solid #777', color: '#999', borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 10, flexShrink: 0 }}>i</span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ color: '#cfcfcf', fontSize: 12, display: 'flex', gap: compact ? 12 : 18, flexWrap: 'wrap' }}>
              <span>Total active days: <strong style={{ color: '#fff' }}>{stats.activeDays}</strong></span>
              <span>Max streak: <strong style={{ color: '#fff' }}>{stats.maxStreak}</strong></span>
            </div>
            <div style={{ position: 'relative', flexShrink: 0, marginLeft: compact ? 0 : 'auto' }}>
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value as CalendarFilter)}
              aria-label="Filter submission calendar"
              style={{
                appearance: 'none',
                WebkitAppearance: 'none',
                border: 0,
                outline: 'none',
                background: '#3a3a3a',
                color: '#fff',
                borderRadius: 5,
                padding: '8px 30px 8px 13px',
                fontSize: 12,
                fontFamily: 'system-ui, -apple-system, Helvetica Neue, sans-serif',
                cursor: 'pointer',
              }}
            >
              <option value="current">Current</option>
              {yearOptions.map((year) => (
                <option key={year} value={String(year)}>
                  {year}
                </option>
              ))}
            </select>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
              }}
            >
              <path d="m6 9 6 6 6-6" stroke="#bdbdbd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            </div>
          </div>
        </div>
        <div
          className="leetcode-calendar"
          style={{
            overflowX: 'auto',
            overflowY: 'hidden',
            scrollbarWidth: 'none',
            paddingBottom: 2,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: HEATMAP_MONTH_GAP,
              width: 'max-content',
              minWidth: heatmapWidth,
            }}
          >
            {heatmap.months.map((month) => (
              <div key={month.key} style={{ flex: '0 0 auto' }}>
                <div style={{ display: 'flex', gap: HEATMAP_GAP, height: 75 }}>
                  {month.weeks.map((week, weekIndex) => (
                    <div key={weekIndex} style={{ display: 'grid', gridTemplateRows: `repeat(7, ${HEATMAP_CELL}px)`, gap: HEATMAP_GAP }}>
                      {week.map((day, dayIndex) => (
                        <div
                          key={`${weekIndex}-${dayIndex}`}
                          title={day ? `${day.count} submissions on ${day.date}` : undefined}
                          style={{
                            width: HEATMAP_CELL,
                            height: HEATMAP_CELL,
                            borderRadius: 2,
                            background: day ? heatmapColor(day.level) : 'transparent',
                          }}
                        />
                      ))}
                    </div>
                  ))}
                </div>
                <div style={{ color: '#cfcfcf', fontSize: 14, textAlign: 'center', marginTop: 9 }}>
                  {month.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Block>
  )
}

function LeetCodeProfile({
  data,
  loading,
  compact,
  tiny,
}: {
  data: LCData | null
  loading: boolean
  compact: boolean
  tiny: boolean
}) {
  if (loading) return <Skeleton compact={compact} />
  if (!data || data.error) return <ErrorCard platform="LeetCode" />

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: compact ? '1fr' : '230px minmax(0, 1fr)',
        gap: 18,
        alignItems: 'start',
      }}
    >
      <ProfileRail data={data} compact={compact} />
      <main style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
        <ContestCard data={data} compact={compact} />
        <SolvedAndBadges data={data} compact={compact} tiny={tiny} />
        <CalendarCard data={data} compact={compact} />
      </main>
    </div>
  )
}

function ErrorCard({ platform }: { platform: string }) {
  return (
    <div style={{ ...PANEL, padding: 48, textAlign: 'center', color: '#bbb' }}>
      {platform} profile data is unavailable right now.
    </div>
  )
}

function CodeforcesTab({ data, loading, compact }: { data: CFData | null; loading: boolean; compact: boolean }) {
  const ratingCount = useCountUp(data?.user?.rating ?? 0)
  const solvedCount = useCountUp(data?.problemsSolved ?? 0, 120)

  if (loading) return <Skeleton compact={compact} />
  if (!data || data.error || !data.user) return <ErrorCard platform="Codeforces" />

  const { user, problemsSolved } = data
  const color = cfColor(user.rank)

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Block delay={0}>
        <div
          style={{
            ...PANEL,
            borderColor: `${color}55`,
            padding: compact ? 24 : 36,
            display: 'flex',
            flexDirection: compact ? 'column' : 'row',
            alignItems: compact ? 'flex-start' : 'center',
            justifyContent: 'space-between',
            gap: compact ? 20 : undefined,
          }}
        >
          <div>
            <div style={{ fontSize: compact ? 56 : 72, fontWeight: 700, color, letterSpacing: '-0.04em', lineHeight: 1 }}>{ratingCount}</div>
            <div style={{ fontSize: 16, color, marginTop: 8, textTransform: 'capitalize' }}>{user.rank}</div>
            <div style={{ fontSize: 12, color: '#777', marginTop: 5 }}>Max: {user.maxRating} / {user.maxRank}</div>
          </div>
          <div style={{ background: `${color}22`, border: `1px solid ${color}55`, borderRadius: 8, color, padding: '16px 24px', textTransform: 'capitalize' }}>
            {user.rank}
          </div>
        </div>
      </Block>
      <Block delay={0.08}>
        <div
          style={{
            ...PANEL,
            padding: compact ? 24 : 30,
            display: 'flex',
            flexDirection: compact ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: compact ? 'flex-start' : 'center',
            gap: compact ? 18 : undefined,
          }}
        >
          <div>
            <div style={{ fontSize: compact ? 40 : 48, color: '#fff', fontWeight: 700 }}>{solvedCount}</div>
            <div style={{ color: '#999', fontSize: 13 }}>unique problems solved</div>
          </div>
          <div style={{ textAlign: compact ? 'left' : 'right' }}>
            <div style={{ fontSize: 32, color: '#fff' }}>{user.contribution >= 0 ? `+${user.contribution}` : user.contribution}</div>
            <div style={{ color: '#777', fontSize: 11, textTransform: 'uppercase' }}>Contribution</div>
          </div>
        </div>
      </Block>
    </div>
  )
}

export default function DsaPage() {
  const { isMobileLayout, isTabletLayout } = useLayout()
  const metrics = useShellMetrics()
  const isPhone = isMobileLayout && !isTabletLayout
  const isTinyPhone = isPhone && metrics.viewportWidth < 370
  const availableWidth = metrics.viewportWidth - metrics.contentLeft - metrics.contentRight
  const compactProfile = availableWidth < 980

  const [activeTab, setActiveTab] = useState<Tab>('leetcode')
  const [leetcode, setLeetcode] = useState<LCData | null>(null)
  const [codeforces, setCodeforces] = useState<CFData | null>(null)
  const [loading, setLoading] = useState({ lc: true, cf: true })

  useEffect(() => {
    fetch('/api/leetcode')
      .then((r) => r.json())
      .then((d) => {
        setLeetcode(d)
        setLoading((p) => ({ ...p, lc: false }))
      })
      .catch(() => {
        setLeetcode({ error: true } as LCData)
        setLoading((p) => ({ ...p, lc: false }))
      })

    fetch('/api/codeforces')
      .then((r) => r.json())
      .then((d) => {
        setCodeforces(d)
        setLoading((p) => ({ ...p, cf: false }))
      })
      .catch(() => {
        setCodeforces({ error: true } as CFData)
        setLoading((p) => ({ ...p, cf: false }))
      })
  }, [])

  return (
    <>
      <BottomToolbar />
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: '#1a1a1a' }}>
        <motion.div
          animate={{ left: `${metrics.contentLeft}px`, right: `${metrics.contentRight}px` }}
          transition={{ type: 'spring', stiffness: 520, damping: 44, mass: 0.85 }}
          style={{
            position: 'absolute',
            top: 0,
            bottom: isPhone ? 72 : 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          <div
            style={{
              width: isPhone ? '100%' : 'min(1160px, calc(100vw - 56px))',
              margin: '0 auto',
              boxSizing: 'border-box',
              padding: `${isPhone ? 24 : 28}px ${isPhone ? 16 : 24}px ${isPhone ? 128 : 112}px`,
            }}
          >
            <PlatformTabs activeTab={activeTab} onChange={setActiveTab} compact={isPhone} />

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -10, opacity: 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
                {activeTab === 'leetcode' && (
                  <LeetCodeProfile
                    data={leetcode}
                    loading={loading.lc}
                    compact={compactProfile || isPhone}
                    tiny={isTinyPhone}
                  />
                )}
                {activeTab === 'codeforces' && (
                  <CodeforcesTab data={codeforces} loading={loading.cf} compact={isPhone} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 0.32; }
            50% { opacity: 0.68; }
          }

          .leetcode-calendar::-webkit-scrollbar {
            display: none;
          }

          .problem-wheel-solved > span:not(.solved-label) {
            display: none;
          }

          .problem-wheel-legacy-center {
            display: none !important;
          }
        `}</style>
      </div>
    </>
  )
}

function PlatformTabs({
  activeTab,
  onChange,
  compact,
}: {
  activeTab: Tab
  onChange: (tab: Tab) => void
  compact: boolean
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: compact ? 18 : 20 }}>
      <div
        style={{
          ...CARD,
          background: '#282828',
          borderRadius: 999,
          padding: 5,
          display: 'inline-flex',
          gap: 4,
          maxWidth: compact ? '100%' : undefined,
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              border: 0,
              borderRadius: 999,
              padding: compact ? '8px 16px' : '8px 24px',
              background: activeTab === tab.id ? '#333' : 'transparent',
              color: activeTab === tab.id ? '#fff' : '#9a9a9a',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: compact ? 13 : 14,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: tab.dot }} />
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}
