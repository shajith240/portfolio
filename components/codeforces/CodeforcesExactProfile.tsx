"use client"

import { useEffect, useMemo, useState } from 'react'

/* A faithful visual clone of the REAL codeforces.com profile page —
   white background, the site's own nav chrome, sidebar panels, and
   table styling — for handle "shajith240". This is deliberately NOT
   restyled into this portfolio's dark Liquid Glass language: the
   user asked for the exact look of the real site, not an adaptation
   of it (that's what the LeetCode/Codeforces dark tabs already do
   elsewhere on this page).

   Everything computable from the public Codeforces API is REAL data
   (handle, rating, rank, rating history, solved/streak stats,
   activity heatmap, next contest countdown). The public API has no
   endpoint for the "Top rated"/"Top contributors" global leaderboard
   (that's server-rendered HTML on the real site, not exposed via
   api/*) — those two tables use real, publicly-known Codeforces
   handles as decorative chrome, matching the real page's structure
   without fabricating data about the profile owner. */

interface CFUser {
  handle: string
  firstName?: string
  lastName?: string
  rating?: number
  maxRating?: number
  rank?: string
  maxRank?: string
  contribution: number
  avatar?: string
  titlePhoto?: string
  registrationTimeSeconds?: number
  lastOnlineTimeSeconds?: number
  friendOfCount?: number
}

interface CFExactData {
  user: CFUser | null
  solvedAllTime?: number
  solvedLastYear?: number
  solvedLastMonth?: number
  streaks?: { allTime: number; lastYear: number; lastMonth: number }
  activity?: Record<string, number>
  ratingHistory?: { name: string; time: number; rating: number; rank: number }[]
  nextContest?: { name: string; startTimeSeconds: number } | null
  error?: boolean
}

const RANK_COLOR: Record<string, string> = {
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

function cfColor(rank?: string) {
  return RANK_COLOR[(rank ?? '').toLowerCase()] ?? '#808080'
}

function timeAgo(unixSeconds?: number) {
  if (!unixSeconds) return '—'
  const diff = Date.now() / 1000 - unixSeconds
  const mins = Math.floor(diff / 60)
  if (mins < 60) return `${Math.max(1, mins)} minute${mins === 1 ? '' : 's'} ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`
  const months = Math.floor(days / 30)
  if (months < 24) return `${months} month${months === 1 ? '' : 's'} ago`
  return `${Math.floor(months / 12)} year${Math.floor(months / 12) === 1 ? '' : 's'} ago`
}

const LINK = { color: '#1a5b9e', textDecoration: 'none', cursor: 'pointer' }
const PANEL_BORDER = '1px solid #e1e1e1'

function SidebarPanel({ title, tint, children }: { title: string; tint?: string; children: React.ReactNode }) {
  return (
    <div style={{ border: PANEL_BORDER, borderRadius: 2, marginBottom: 12, background: tint ?? '#fff' }}>
      <div style={{ padding: '8px 12px', fontWeight: 700, fontSize: 13, color: '#1a5b9e', borderBottom: PANEL_BORDER }}>
        → {title}
      </div>
      <div style={{ padding: 12 }}>{children}</div>
    </div>
  )
}

function Countdown({ targetSeconds }: { targetSeconds: number }) {
  const [now, setNow] = useState(() => Date.now() / 1000)
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now() / 1000), 1000)
    return () => clearInterval(id)
  }, [])
  const remaining = Math.max(0, Math.floor(targetSeconds - now))
  const h = Math.floor(remaining / 3600)
  const m = Math.floor((remaining % 3600) / 60)
  const s = remaining % 60
  return (
    <span style={{ fontWeight: 700, fontSize: 15 }}>
      {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  )
}

// Real, publicly-known Codeforces handles/approximate ratings — the
// public API has no leaderboard endpoint, so this decorative sidebar
// (present on every real profile page) mirrors its STRUCTURE using
// real community handles rather than inventing fictional ones.
const TOP_RATED = [
  { handle: 'jiangly', rating: 3728 },
  { handle: 'tourist', rating: 3439 },
  { handle: 'Um_nik', rating: 3376 },
  { handle: 'Benq', rating: 3336 },
  { handle: 'ksun48', rating: 3313 },
  { handle: 'Radewoosh', rating: 3293 },
  { handle: 'ecnerwala', rating: 3256 },
  { handle: 'maroonrk', rating: 3248 },
  { handle: 'Petr', rating: 3234 },
  { handle: 'ainta', rating: 3210 },
]
const TOP_CONTRIBUTORS = [
  { handle: 'Qingyu', contrib: 163 },
  { handle: 'Um_nik', contrib: 145 },
  { handle: 'adamant', contrib: 142 },
  { handle: 'Dominater069', contrib: 137 },
  { handle: 'chromate00', contrib: 133 },
  { handle: 'DNR', contrib: 133 },
  { handle: 'cry', contrib: 132 },
  { handle: 'maspy', contrib: 132 },
  { handle: 'maroonrk', contrib: 131 },
  { handle: 'Proof_by_QED', contrib: 131 },
]
// Rank guess for the decorative names above — cosmetic only (color
// on the leaderboard), not asserted as their live current rank.
function decorRankColor(rating: number) {
  if (rating >= 3000) return RANK_COLOR['legendary grandmaster']
  if (rating >= 2400) return RANK_COLOR.grandmaster
  return RANK_COLOR.master
}

const NAV_ITEMS = ['HOME', 'TOP', 'CATALOG', 'CONTESTS', 'GYM', 'PROBLEMSET', 'GROUPS', 'RATING', 'EDU', 'API', 'CALENDAR', 'HELP']
const SUB_TABS = ['SETTINGS', 'LISTS', 'BLOG', 'TEAMS', 'SUBMISSIONS', 'CONTESTS']

function CFLogo() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span style={{ display: 'inline-flex', gap: 2 }}>
        <span style={{ width: 7, height: 22, background: '#3378bd', display: 'inline-block' }} />
        <span style={{ width: 7, height: 22, background: '#c23636', display: 'inline-block', marginTop: 4 }} />
        <span style={{ width: 7, height: 22, background: '#e0a92e', display: 'inline-block', marginTop: 8 }} />
      </span>
      <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em' }}>
        <span style={{ color: '#1a1a1a' }}>Code</span>
        <span style={{ color: '#3378bd' }}>Forces</span>
      </span>
    </span>
  )
}

/* Rating chart: banded background exactly like the real one (gray
   <1200, green 1200-1400, cyan 1400-1600, blue 1600-1900, violet
   1900-2100, orange 2100-2400, red 2400+), a polyline through the
   contest history, dot + rating label per contest. */
function RatingChart({ history }: { history: NonNullable<CFExactData['ratingHistory']> }) {
  const W = 900
  const H = 220
  const PAD_L = 46
  const PAD_R = 16
  const PAD_T = 16
  const PAD_B = 16
  const ratings = history.map((h) => h.rating)
  const dataMin = Math.min(...ratings, 400)
  const dataMax = Math.max(...ratings, 1200)
  const min = Math.max(0, Math.floor((dataMin - 150) / 100) * 100)
  const max = Math.ceil((dataMax + 150) / 100) * 100
  const span = max - min
  const x = (i: number) => (history.length === 1 ? (W + PAD_L - PAD_R) / 2 : PAD_L + (i / (history.length - 1)) * (W - PAD_L - PAD_R))
  const y = (r: number) => H - PAD_B - ((r - min) / span) * (H - PAD_T - PAD_B)

  const bands = [
    { from: 0, to: 1200, color: '#cccccc' },
    { from: 1200, to: 1400, color: '#b3ffb3' },
    { from: 1400, to: 1600, color: '#b3ffec' },
    { from: 1600, to: 1900, color: '#b3d1ff' },
    { from: 1900, to: 2100, color: '#e0b3ff' },
    { from: 2100, to: 2400, color: '#ffd9b3' },
    { from: 2400, to: 4000, color: '#ffb3b3' },
  ]
  const ticks = []
  for (let t = Math.ceil(min / 200) * 200; t <= max; t += 200) ticks.push(t)

  return (
    <div style={{ border: PANEL_BORDER, borderRadius: 2, padding: 16, background: '#fff' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        {bands.map((b) => {
          const top = Math.max(y(Math.min(b.to, max)), PAD_T)
          const bottom = Math.min(y(Math.max(b.from, min)), H - PAD_B)
          if (bottom <= top) return null
          return <rect key={b.from} x={PAD_L} y={top} width={W - PAD_L - PAD_R} height={bottom - top} fill={b.color} opacity={0.55} />
        })}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD_L} x2={W - PAD_R} y1={y(t)} y2={y(t)} stroke="#999" strokeWidth={0.5} />
            <text x={PAD_L - 6} y={y(t) + 4} fontSize="11" fill="#333" textAnchor="end">{t}</text>
          </g>
        ))}
        <polyline
          points={history.map((h, i) => `${x(i)},${y(h.rating)}`).join(' ')}
          fill="none"
          stroke="#3378bd"
          strokeWidth={1.5}
        />
        {history.map((h, i) => (
          <circle key={h.time} cx={x(i)} cy={y(h.rating)} r={3.5} fill="#3378bd" stroke="#fff" strokeWidth={1} />
        ))}
        <rect x={W - 130} y={6} width={10} height={10} fill="#3378bd" />
        <text x={W - 116} y={15} fontSize="12" fill="#1a1a1a">shajith240</text>
      </svg>
    </div>
  )
}

const CF_HEATMAP_COLOR = ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39']
function cfHeatmapLevel(c: number) {
  return c === 0 ? 0 : c <= 2 ? 1 : c <= 5 ? 2 : c <= 9 ? 3 : 4
}

function ActivityHeatmap({ activity }: { activity: Record<string, number> }) {
  const WEEKS = 53
  const CELL = 11
  const GAP = 3
  const today = new Date()
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - start.getUTCDay() - (WEEKS - 1) * 7)

  const cols = useMemo(() => {
    const out: { key: string; count: number; date: Date }[][] = []
    for (let w = 0; w < WEEKS; w++) {
      const col: { key: string; count: number; date: Date }[] = []
      for (let d = 0; d < 7; d++) {
        const day = new Date(start)
        day.setUTCDate(start.getUTCDate() + w * 7 + d)
        if (day.getTime() > end.getTime()) break
        const key = `${day.getUTCFullYear()}-${String(day.getUTCMonth() + 1).padStart(2, '0')}-${String(day.getUTCDate()).padStart(2, '0')}`
        col.push({ key, count: activity[key] ?? 0, date: day })
      }
      out.push(col)
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [WEEKS])

  // Month label appears above the first week-column that starts a
  // new month (skipping ones too close to the previous label).
  const monthLabels: { weekIndex: number; label: string }[] = []
  let lastMonth = -1
  let lastLabelWeek = -10
  cols.forEach((col, i) => {
    const first = col[0]
    if (!first) return
    const month = first.date.getUTCMonth()
    if (month !== lastMonth && i - lastLabelWeek > 2) {
      monthLabels.push({ weekIndex: i, label: first.date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }) })
      lastLabelWeek = i
    }
    lastMonth = month
  })

  const gridWidth = cols.length * (CELL + GAP)

  return (
    <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: GAP, paddingTop: 16, fontSize: 10, color: '#666', flexShrink: 0 }}>
        <span style={{ height: CELL }} />
        <span style={{ height: CELL, lineHeight: `${CELL}px` }}>Mon</span>
        <span style={{ height: CELL }} />
        <span style={{ height: CELL, lineHeight: `${CELL}px` }}>Wed</span>
        <span style={{ height: CELL }} />
        <span style={{ height: CELL, lineHeight: `${CELL}px` }}>Fri</span>
        <span style={{ height: CELL }} />
      </div>
      <div style={{ position: 'relative', width: gridWidth }}>
        <div style={{ position: 'relative', height: 14 }}>
          {monthLabels.map((m) => (
            <span key={m.weekIndex} style={{ position: 'absolute', left: m.weekIndex * (CELL + GAP), top: 0, fontSize: 10, color: '#666' }}>
              {m.label}
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: GAP }}>
          {cols.map((col, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: GAP }}>
              {col.map((c) => (
                <div
                  key={c.key}
                  title={`${c.key}: ${c.count} submission${c.count === 1 ? '' : 's'}`}
                  style={{ width: CELL, height: CELL, borderRadius: 2, background: CF_HEATMAP_COLOR[cfHeatmapLevel(c.count)] }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function CodeforcesExactProfile({ data, loading }: { data: CFExactData | null; loading: boolean }) {
  const [handleInput, setHandleInput] = useState('')

  if (loading) {
    return (
      <div style={{ background: '#fff', minHeight: '100%', padding: 40, display: 'flex', justifyContent: 'center' }}>
        <div style={{ color: '#999', fontSize: 13 }}>Loading codeforces.com/profile/shajith240 …</div>
      </div>
    )
  }
  if (!data || data.error || !data.user) {
    return (
      <div style={{ background: '#fff', minHeight: '100%', padding: 40, display: 'flex', justifyContent: 'center' }}>
        <div style={{ color: '#999', fontSize: 13 }}>Could not reach the Codeforces API right now.</div>
      </div>
    )
  }

  const { user } = data
  const color = cfColor(user.rank)
  const photo = user.titlePhoto || user.avatar

  return (
    <div style={{ background: '#fff', color: '#000', fontFamily: 'Verdana, Geneva, sans-serif', fontSize: 13, minHeight: '100%' }}>
      {/* ── top bar ─────────────────────────────────────────── */}
      <div style={{ borderBottom: '1px solid #ddd', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <CFLogo />
          <span style={{ fontSize: 11, color: '#999' }}>Sponsored by <b style={{ color: '#333' }}>TON</b></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
          <span style={a}>{user.handle}</span> | <span style={a}>Logout</span>
        </div>
      </div>
      {/* ── nav row ─────────────────────────────────────────── */}
      <div style={{ borderBottom: '1px solid #ddd', padding: '8px 20px', display: 'flex', gap: 18, fontSize: 12, fontWeight: 700, color: '#1a1a1a' }}>
        {NAV_ITEMS.map((n) => (
          <span key={n} style={{ cursor: 'pointer' }}>{n}</span>
        ))}
      </div>
      {/* ── profile sub-tabs ────────────────────────────────── */}
      <div style={{ borderBottom: '1px solid #ddd', padding: '8px 20px', display: 'flex', gap: 16, fontSize: 12 }}>
        <span style={{ ...a, fontWeight: 700, background: '#eee', padding: '2px 8px', borderRadius: 3 }}>{user.handle.toUpperCase()}</span>
        {SUB_TABS.map((t) => (
          <span key={t} style={a}>{t}</span>
        ))}
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 20px 60px', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {/* ── main column ───────────────────────────────────── */}
        <div style={{ flex: '1 1 620px', minWidth: 320 }}>
          <div style={{ display: 'flex', gap: 24, marginBottom: 20 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, color, marginBottom: 2, textTransform: 'capitalize' }}>{user.rank ?? 'Unrated'}</div>
              <div style={{ fontSize: 26, fontWeight: 700, color, marginBottom: 6 }}>{user.handle}</div>
              {(user.firstName || user.lastName) && (
                <div style={{ color: '#555', marginBottom: 4 }}>
                  {user.firstName} {user.lastName}
                </div>
              )}
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                <li>Contest rating: <b>{user.rating ?? '—'}</b> {user.maxRating != null && <span style={{ color: '#777' }}>(max. {(user.maxRank ?? '').toLowerCase()}, {user.maxRating})</span>}</li>
                <li>Contribution: <b>{user.contribution >= 0 ? `+${user.contribution}` : user.contribution}</b></li>
                {user.friendOfCount != null && <li>Friend of: {user.friendOfCount} users</li>}
                <li><span style={a}>My friends</span></li>
                <li><span style={a}>Change settings</span></li>
                <li>Last visit: {timeAgo(user.lastOnlineTimeSeconds)}</li>
                <li>Registered: {timeAgo(user.registrationTimeSeconds)}</li>
                <li><span style={a}>Blog entries (0)</span>, <span style={a}>comments</span></li>
                <li><span style={a}>Write new entry</span></li>
                <li><span style={a}>View my talks</span></li>
              </ul>
            </div>
            <div style={{ width: 160, flexShrink: 0 }}>
              <div style={{ border: PANEL_BORDER, borderRadius: 2, width: 160, height: 200, overflow: 'hidden', background: '#f4f4f4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {photo ? (
                  // Codeforces serves avatar images without CORS headers
                  // needed for next/image optimization — a plain <img> is
                  // the correct choice here regardless.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo.startsWith('http') ? photo : `https:${photo}`} alt={user.handle} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: 48, color: '#bbb' }}>{user.handle[0]?.toUpperCase()}</span>
                )}
              </div>
              <div style={{ fontSize: 11, marginTop: 6, textAlign: 'center' }}>
                <span style={a}>Change photo</span> | <span style={a}>Unset photo</span>
              </div>
            </div>
          </div>

          {data.ratingHistory && data.ratingHistory.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <RatingChart history={data.ratingHistory} />
            </div>
          )}

          <div style={{ marginBottom: 16, fontSize: 12, color: '#555', display: 'flex', gap: 8, alignItems: 'center' }}>
            <span>What activity will be shown to other users:</span>
            <select style={selectStyle}><option>All</option></select>
            <select style={selectStyle}><option>Choose year ▾</option></select>
          </div>

          <div style={{ marginBottom: 20, overflowX: 'auto' }}>
            <ActivityHeatmap activity={data.activity ?? {}} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 16, marginBottom: 20 }}>
            <Stat value={data.solvedAllTime ?? 0} label="problems solved for all time" />
            <Stat value={data.solvedLastYear ?? 0} label="problems solved for the last year" />
            <Stat value={data.solvedLastMonth ?? 0} label="problems solved for the last month" />
            <Stat value={data.streaks?.allTime ?? 0} label="days in a row max." />
            <Stat value={data.streaks?.lastYear ?? 0} label="days in a row for the last year" />
            <Stat value={data.streaks?.lastMonth ?? 0} label="days in a row for the last month" />
          </div>
        </div>

        {/* ── sidebar ───────────────────────────────────────── */}
        <div style={{ width: 280, flexShrink: 0 }}>
          {data.nextContest && (
            <SidebarPanel title="Pay attention" tint="#fdf6d8">
              <div>Before contest</div>
              <div style={a}>{data.nextContest.name}</div>
              <div style={{ marginTop: 6 }}>
                <Countdown targetSeconds={data.nextContest.startTimeSeconds} />
              </div>
            </SidebarPanel>
          )}

          <SidebarPanel title="Streams">
            <div style={a}>CF Round Discussion</div>
            <div style={{ fontSize: 11, color: '#e0a92e', marginTop: 2 }}>By community</div>
            <div style={{ textAlign: 'right', marginTop: 8 }}>
              <span style={a}>View all →</span>
            </div>
          </SidebarPanel>

          <SidebarPanel title={user.handle}>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div>Rating: {user.rating ?? '—'}</div>
                <div style={{ marginBottom: 6 }}>Contribution: {user.contribution}</div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <li><span style={a}>Settings</span></li>
                  <li><span style={a}>Blog</span></li>
                  <li><span style={a}>Teams</span></li>
                  <li><span style={a}>Submissions</span></li>
                  <li><span style={a}>Talks</span></li>
                  <li><span style={a}>Contests</span></li>
                </ul>
              </div>
              {photo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo.startsWith('http') ? photo : `https:${photo}`} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 2, border: PANEL_BORDER }} />
              )}
            </div>
          </SidebarPanel>

          <SidebarPanel title="Top rated">
            <RankTable rows={TOP_RATED.map((r) => ({ handle: r.handle, value: r.rating }))} valueLabel="Rating" />
            <div style={{ marginTop: 8, fontSize: 11, color: '#555', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span style={a}>Countries</span> | <span style={a}>Cities</span> | <span style={a}>Organizations</span>
              <span style={{ marginLeft: 'auto' }}><span style={a}>View all →</span></span>
            </div>
          </SidebarPanel>

          <SidebarPanel title="Top contributors">
            <RankTable rows={TOP_CONTRIBUTORS.map((r) => ({ handle: r.handle, value: r.contrib }))} valueLabel="Contrib." />
          </SidebarPanel>

          <SidebarPanel title="Find user">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (handleInput.trim()) window.open(`https://codeforces.com/profile/${encodeURIComponent(handleInput.trim())}`, '_blank', 'noopener,noreferrer')
              }}
              style={{ display: 'flex', gap: 6, alignItems: 'center' }}
            >
              <label style={{ fontSize: 12 }}>Handle:</label>
              <input
                value={handleInput}
                onChange={(e) => setHandleInput(e.target.value)}
                style={{ flex: 1, border: '1px solid #ccc', borderRadius: 2, padding: '3px 6px', fontSize: 12 }}
              />
            </form>
          </SidebarPanel>
        </div>
      </div>
    </div>
  )
}

const a: React.CSSProperties = LINK
const selectStyle: React.CSSProperties = { fontSize: 12, border: '1px solid #ccc', borderRadius: 2, padding: '2px 4px' }

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 11, color: '#777' }}>{label}</div>
    </div>
  )
}

function RankTable({ rows, valueLabel }: { rows: { handle: string; value: number }[]; valueLabel: string }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
      <thead>
        <tr style={{ borderBottom: PANEL_BORDER, color: '#777', textAlign: 'left' }}>
          <th style={{ fontWeight: 400, padding: '2px 0' }}>#</th>
          <th style={{ fontWeight: 400 }}>User</th>
          <th style={{ fontWeight: 400, textAlign: 'right' }}>{valueLabel}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.handle} style={{ borderBottom: '1px solid #f0f0f0' }}>
            <td style={{ padding: '3px 0', color: '#999' }}>{i + 1}</td>
            <td style={{ color: decorRankColor(r.value), fontWeight: 600 }}>{r.handle}</td>
            <td style={{ textAlign: 'right' }}>{r.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
