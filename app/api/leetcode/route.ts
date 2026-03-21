export async function GET() {
  try {
    const [profileRes, solvedRes, contestRes] = await Promise.all([
      fetch('https://alfa-leetcode-api.onrender.com/shajith240', {
        next: { revalidate: 3600 },
      }),
      fetch('https://alfa-leetcode-api.onrender.com/shajith240/solved', {
        next: { revalidate: 3600 },
      }),
      fetch('https://alfa-leetcode-api.onrender.com/shajith240/contest', {
        next: { revalidate: 3600 },
      }),
    ])

    const [profile, solved, contest] = await Promise.all([
      profileRes.json(),
      solvedRes.json(),
      contestRes.json(),
    ])

    const totalSubmissions =
      solved?.totalSubmissionNum?.find((d: any) => d.difficulty === 'All')
        ?.submissions ?? 0
    const acceptedSubmissions =
      solved?.acSubmissionNum?.find((d: any) => d.difficulty === 'All')
        ?.submissions ?? 0
    const acceptanceRate =
      totalSubmissions > 0
        ? ((acceptedSubmissions / totalSubmissions) * 100).toFixed(1)
        : '0.0'

    return Response.json({
      ranking: profile?.ranking ?? null,
      totalSolved: solved?.solvedProblem ?? 0,
      easySolved: solved?.easySolved ?? 0,
      mediumSolved: solved?.mediumSolved ?? 0,
      hardSolved: solved?.hardSolved ?? 0,
      // approximate LeetCode problem pool — updates slowly
      totalEasy: 876,
      totalMedium: 1829,
      totalHard: 808,
      acceptanceRate,
      contestRating: Math.round(contest?.contestRating ?? 0),
      contestRank: contest?.contestGlobalRanking ?? null,
      contestTopPercentage: contest?.contestTopPercentage ?? null,
    })
  } catch {
    return Response.json({ error: true }, { status: 500 })
  }
}
