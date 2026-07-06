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

export async function GET() {
  try {
    const [userRes, statusRes, ratingRes] = await Promise.all([
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
    ])

    const [userData, statusData, ratingData] = await Promise.all([
      userRes.json(),
      statusRes.json(),
      ratingRes.json(),
    ])

    // Distinct solved problems + difficulty buckets + tag counts +
    // per-day submission activity — everything the tab's chart,
    // split, tags and heatmap blocks need, computed server-side so
    // the client never downloads the raw 2000-submission payload.
    const solved = new Set<string>()
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
        if (solved.has(key)) continue
        solved.add(key)

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

    return Response.json({
      user: userData.result?.[0] ?? null,
      problemsSolved: solved.size,
      buckets,
      topTags,
      activity,
      ratingHistory,
    })
  } catch {
    return Response.json({ error: true }, { status: 500 })
  }
}
