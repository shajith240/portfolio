// Codeforces official API → just what the desktop Codeforces widget
// draws: rating / rank (current and max), the rating history for the
// graph, and submissions per UTC day for the activity heatmap. Counted
// server-side so the client never downloads the raw submission list.

interface CFUser {
  rating?: number
  maxRating?: number
  rank?: string
  maxRank?: string
}

interface CFSubmission {
  creationTimeSeconds: number
}

interface CFRatingChange {
  contestName: string
  ratingUpdateTimeSeconds: number
  newRating: number
}

const HANDLE = 'shajith240'

export async function GET() {
  try {
    const [userRes, statusRes, ratingRes] = await Promise.all([
      fetch(`https://codeforces.com/api/user.info?handles=${HANDLE}`, {
        next: { revalidate: 3600 },
      }),
      fetch(
        `https://codeforces.com/api/user.status?handle=${HANDLE}&from=1&count=2000`,
        { next: { revalidate: 3600 } }
      ),
      fetch(`https://codeforces.com/api/user.rating?handle=${HANDLE}`, {
        next: { revalidate: 3600 },
      }),
    ])

    const [userData, statusData, ratingData] = await Promise.all([
      userRes.json(),
      statusRes.json(),
      ratingRes.json(),
    ])

    if (userData.status !== 'OK' || !userData.result?.[0]) {
      throw new Error('user.info failed')
    }
    const user = userData.result[0] as CFUser

    // Every submission counts toward activity, like CF's own heatmap.
    const activity: Record<string, number> = {}
    if (statusData.status === 'OK') {
      for (const sub of statusData.result as CFSubmission[]) {
        const day = new Date(sub.creationTimeSeconds * 1000).toISOString().slice(0, 10)
        activity[day] = (activity[day] ?? 0) + 1
      }
    }

    const ratingHistory =
      ratingData.status === 'OK'
        ? (ratingData.result as CFRatingChange[]).map((c) => ({
            name: c.contestName,
            time: c.ratingUpdateTimeSeconds,
            rating: c.newRating,
          }))
        : []

    return Response.json({
      rating: user.rating ?? null,
      maxRating: user.maxRating ?? null,
      rank: user.rank ?? null,
      maxRank: user.maxRank ?? null,
      ratingHistory,
      activity,
    })
  } catch {
    return Response.json({ error: true }, { status: 502 })
  }
}
