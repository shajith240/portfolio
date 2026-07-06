interface CFSubmission {
  verdict?: string
  creationTimeSeconds: number
  problem: {
    contestId?: number
    index: string
    rating?: number
    tags?: string[]
  }
}

interface CFRatingChange {
  contestId: number
  contestName: string
  rank: number
  ratingUpdateTimeSeconds: number
  oldRating: number
  newRating: number
}

interface CFContest {
  id: number
  name: string
  phase: string
  startTimeSeconds?: number
}

const DAY_SECONDS = 86_400

// Longest run of consecutive calendar days (UTC) with activity,
// restricted to days on/after `sinceUnixSeconds` — used for the
// "X days in a row" stat at three window sizes (all-time / last
// year / last month), matching the three lines Codeforces itself
// shows on a profile page.
function longestStreak(dayKeys: string[], sinceUnixSeconds: number): number {
  const days = new Set(
    dayKeys
      .map((k) => Math.floor(Date.parse(`${k}T00:00:00Z`) / 1000))
      .filter((t) => t >= sinceUnixSeconds),
  )
  let best = 0
  for (const t of days) {
    // Only start counting from a run's first day (no day before it
    // in the set) — avoids re-walking the same run from every day
    // inside it.
    if (days.has(t - DAY_SECONDS)) continue
    let len = 1
    while (days.has(t + len * DAY_SECONDS)) len++
    if (len > best) best = len
  }
  return best
}

export async function GET() {
  try {
    const [userRes, statusRes, ratingRes, contestRes] = await Promise.all([
      fetch('https://codeforces.com/api/user.info?handles=shajith240', {
        next: { revalidate: 3600 },
      }),
      fetch(
        'https://codeforces.com/api/user.status?handle=shajith240&from=1&count=2000',
        { next: { revalidate: 3600 } }
      ),
      fetch('https://codeforces.com/api/user.rating?handle=shajith240', {
        next: { revalidate: 3600 },
      }),
      fetch('https://codeforces.com/api/contest.list?gym=false', {
        next: { revalidate: 1800 },
      }),
    ])

    const [userData, statusData, ratingData, contestData] = await Promise.all([
      userRes.json(),
      statusRes.json(),
      ratingRes.json(),
      contestRes.json(),
    ])

    // Distinct solved problems (with FIRST-solved timestamp, needed
    // for the last-year/last-month solved counts) + difficulty
    // buckets + tag counts + per-day submission activity — computed
    // server-side so the client never downloads the raw
    // 2000-submission payload.
    const firstSolvedAt = new Map<string, number>()
    const buckets = { easy: 0, medium: 0, hard: 0, unrated: 0 }
    const tagCounts = new Map<string, number>()
    const activity: Record<string, number> = {}

    if (statusData.status === 'OK') {
      for (const sub of statusData.result as CFSubmission[]) {
        // Every submission counts toward activity (like CF's own
        // profile heatmap); accepted ones toward solved/buckets/tags.
        const day = new Date(sub.creationTimeSeconds * 1000)
        const dayKey = `${day.getUTCFullYear()}-${String(day.getUTCMonth() + 1).padStart(2, '0')}-${String(day.getUTCDate()).padStart(2, '0')}`
        activity[dayKey] = (activity[dayKey] ?? 0) + 1

        if (sub.verdict !== 'OK') continue
        const key = `${sub.problem.contestId ?? ''}-${sub.problem.index}`
        const existing = firstSolvedAt.get(key)
        if (existing === undefined || sub.creationTimeSeconds < existing) {
          firstSolvedAt.set(key, sub.creationTimeSeconds)
        }
      }

      // Buckets/tags computed once per distinct problem, using the
      // LAST submission seen per key for its rating/tags (rating
      // doesn't change per-problem, so any occurrence works).
      const seenForBuckets = new Set<string>()
      for (const sub of statusData.result as CFSubmission[]) {
        if (sub.verdict !== 'OK') continue
        const key = `${sub.problem.contestId ?? ''}-${sub.problem.index}`
        if (seenForBuckets.has(key)) continue
        seenForBuckets.add(key)
        const r = sub.problem.rating
        if (r == null) buckets.unrated++
        else if (r <= 1200) buckets.easy++
        else if (r <= 1600) buckets.medium++
        else buckets.hard++
        for (const tag of sub.problem.tags ?? []) {
          tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1)
        }
      }
    }

    const nowSec = Math.floor(Date.now() / 1000)
    const yearAgoSec = nowSec - 365 * DAY_SECONDS
    const monthAgoSec = nowSec - 30 * DAY_SECONDS

    const solvedAllTime = firstSolvedAt.size
    let solvedLastYear = 0
    let solvedLastMonth = 0
    for (const t of firstSolvedAt.values()) {
      if (t >= yearAgoSec) solvedLastYear++
      if (t >= monthAgoSec) solvedLastMonth++
    }

    const activityDayKeys = Object.keys(activity)
    const streaks = {
      allTime: longestStreak(activityDayKeys, 0),
      lastYear: longestStreak(activityDayKeys, yearAgoSec),
      lastMonth: longestStreak(activityDayKeys, monthAgoSec),
    }

    const topTags = [...tagCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }))

    const ratingHistory =
      ratingData.status === 'OK'
        ? (ratingData.result as CFRatingChange[]).map((c) => ({
            name: c.contestName,
            time: c.ratingUpdateTimeSeconds,
            rating: c.newRating,
            rank: c.rank,
          }))
        : []

    // Nearest upcoming contest (phase BEFORE), soonest first — the
    // real "Before contest" panel's countdown target.
    let nextContest: { name: string; startTimeSeconds: number } | null = null
    if (contestData.status === 'OK') {
      const upcoming = (contestData.result as CFContest[])
        .filter((c) => c.phase === 'BEFORE' && typeof c.startTimeSeconds === 'number')
        .sort((a, b) => (a.startTimeSeconds ?? 0) - (b.startTimeSeconds ?? 0))
      if (upcoming[0]) {
        nextContest = { name: upcoming[0].name, startTimeSeconds: upcoming[0].startTimeSeconds! }
      }
    }

    return Response.json({
      user: userData.result?.[0] ?? null,
      problemsSolved: solvedAllTime,
      solvedAllTime,
      solvedLastYear,
      solvedLastMonth,
      streaks,
      buckets,
      topTags,
      activity,
      ratingHistory,
      nextContest,
    })
  } catch {
    return Response.json({ error: true }, { status: 500 })
  }
}
