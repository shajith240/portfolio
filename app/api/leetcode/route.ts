// LeetCode's own GraphQL endpoint, queried directly — one round trip
// (~1s) instead of the slow free alfa-leetcode-api proxy. Returns only
// what the desktop LeetCode widget draws.
//
// NOTE: don't add `userCalendar` to matchedUser — LeetCode answers it
// with "no permission" and nulls out the WHOLE matchedUser object.

const USERNAME = 'shajith240'

const QUERY = `
query widget($username: String!) {
  allQuestionsCount { difficulty count }
  matchedUser(username: $username) {
    submitStatsGlobal {
      acSubmissionNum { difficulty count submissions }
      totalSubmissionNum { difficulty count submissions }
    }
    submissionCalendar
  }
  userProfileUserQuestionProgressV2(userSlug: $username) {
    numFailedQuestions { difficulty count }
    userSessionBeatsPercentage { difficulty percentage }
  }
}
`

interface DifficultyCount {
  difficulty: string
  count?: number
  submissions?: number
  percentage?: number
}

type Difficulty = 'easy' | 'medium' | 'hard'
const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']

// LeetCode spells difficulties "Easy" in some objects and "EASY" in
// others — compare case-insensitively.
function pick(list: DifficultyCount[] | undefined, difficulty: string) {
  return list?.find((d) => d.difficulty.toLowerCase() === difficulty.toLowerCase())
}

export async function GET() {
  try {
    const res = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Referer: 'https://leetcode.com',
      },
      body: JSON.stringify({ query: QUERY, variables: { username: USERNAME } }),
      next: { revalidate: 3600 },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const { data } = await res.json()
    const user = data?.matchedUser
    if (!user) throw new Error('matchedUser is null')

    const totals: DifficultyCount[] = data.allQuestionsCount ?? []
    const ac: DifficultyCount[] = user.submitStatsGlobal?.acSubmissionNum ?? []
    const all: DifficultyCount[] = user.submitStatsGlobal?.totalSubmissionNum ?? []
    const progress = data.userProfileUserQuestionProgressV2

    // Acceptance = accepted submissions / all submissions — the number
    // LeetCode's ring shows on hover (315 / 440 → 71.59%).
    const acceptedSubmissionCount = pick(ac, 'All')?.submissions ?? 0
    const submissionCount = pick(all, 'All')?.submissions ?? 0
    const acceptance =
      submissionCount > 0
        ? Math.round((acceptedSubmissionCount / submissionCount) * 10000) / 100
        : 0

    // "Attempting" = questions touched but never accepted. Prefer the
    // progress query's numFailedQuestions; fall back to
    // (questions submitted − questions accepted).
    const attempting = {} as Record<Difficulty, number>
    const beats = {} as Record<Difficulty, number | null>
    for (const d of DIFFICULTIES) {
      attempting[d] =
        pick(progress?.numFailedQuestions, d)?.count ??
        Math.max(0, (pick(all, d)?.count ?? 0) - (pick(ac, d)?.count ?? 0))
      beats[d] = pick(progress?.userSessionBeatsPercentage, d)?.percentage ?? null
    }

    let submissionCalendar: Record<string, number> = {}
    try {
      submissionCalendar = JSON.parse(user.submissionCalendar ?? '{}')
    } catch {
      submissionCalendar = {}
    }

    return Response.json({
      totalSolved: pick(ac, 'All')?.count ?? 0,
      totalQuestions: pick(totals, 'All')?.count ?? 0,
      easySolved: pick(ac, 'Easy')?.count ?? 0,
      mediumSolved: pick(ac, 'Medium')?.count ?? 0,
      hardSolved: pick(ac, 'Hard')?.count ?? 0,
      totalEasy: pick(totals, 'Easy')?.count ?? 0,
      totalMedium: pick(totals, 'Medium')?.count ?? 0,
      totalHard: pick(totals, 'Hard')?.count ?? 0,
      acceptance,
      submissionCount,
      beats,
      attempting: {
        all: attempting.easy + attempting.medium + attempting.hard,
        ...attempting,
      },
      // unix-day-seconds (UTC midnight) → submissions that day
      submissionCalendar,
    })
  } catch {
    return Response.json({ error: true }, { status: 502 })
  }
}
