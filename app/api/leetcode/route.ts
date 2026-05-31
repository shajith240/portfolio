export async function GET() {
  try {
    const [
      userRes,
      profileRes,
      solvedRes,
      contestRes,
      badgesRes,
      languageRes,
      skillRes,
    ] = await Promise.all([
      fetch('https://alfa-leetcode-api.onrender.com/shajith240', {
        next: { revalidate: 3600 },
      }),
      fetch('https://alfa-leetcode-api.onrender.com/shajith240/profile', {
        next: { revalidate: 3600 },
      }),
      fetch('https://alfa-leetcode-api.onrender.com/shajith240/solved', {
        next: { revalidate: 3600 },
      }),
      fetch('https://alfa-leetcode-api.onrender.com/shajith240/contest', {
        next: { revalidate: 3600 },
      }),
      fetch('https://alfa-leetcode-api.onrender.com/shajith240/badges', {
        next: { revalidate: 3600 },
      }),
      fetch('https://alfa-leetcode-api.onrender.com/shajith240/language', {
        next: { revalidate: 3600 },
      }),
      fetch('https://alfa-leetcode-api.onrender.com/shajith240/skill', {
        next: { revalidate: 3600 },
      }),
    ])

    const [user, profile, solved, contest, badges, language, skill] =
      await Promise.all([
        userRes.json(),
        profileRes.json(),
        solvedRes.json(),
        contestRes.json(),
        badgesRes.json(),
        languageRes.json(),
        skillRes.json(),
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
      user: {
        username: user?.username ?? 'shajith240',
        name: user?.name ?? 'shajith240',
        avatar: user?.avatar ?? null,
        ranking: user?.ranking ?? profile?.ranking ?? null,
        country: user?.country ?? null,
        school: user?.school ?? null,
        gitHub: user?.gitHub ?? null,
        linkedIN: user?.linkedIN ?? null,
        reputation: user?.reputation ?? profile?.reputation ?? 0,
        contributionPoint:
          user?.contributionPoint ?? profile?.contributionPoint ?? 0,
      },
      ranking: profile?.ranking ?? user?.ranking ?? null,
      totalSolved: profile?.totalSolved ?? solved?.solvedProblem ?? 0,
      totalQuestions: profile?.totalQuestions ?? 0,
      easySolved: profile?.easySolved ?? solved?.easySolved ?? 0,
      mediumSolved: profile?.mediumSolved ?? solved?.mediumSolved ?? 0,
      hardSolved: profile?.hardSolved ?? solved?.hardSolved ?? 0,
      totalEasy: profile?.totalEasy ?? 0,
      totalMedium: profile?.totalMedium ?? 0,
      totalHard: profile?.totalHard ?? 0,
      totalSubmissions:
        solved?.totalSubmissionNum ?? profile?.totalSubmissions ?? [],
      acceptedSubmissions:
        solved?.acSubmissionNum ?? profile?.matchedUserStats?.acSubmissionNum ?? [],
      submissionCalendar: profile?.submissionCalendar ?? {},
      acceptanceRate,
      contestRating: Math.round(contest?.contestRating ?? 0),
      contestRank: contest?.contestGlobalRanking ?? null,
      contestTopPercentage: contest?.contestTopPercentage ?? null,
      contestAttend: contest?.contestAttend ?? 0,
      contestParticipants: contest?.totalParticipants ?? null,
      contestParticipation: contest?.contestParticipation ?? [],
      badgesCount: badges?.badgesCount ?? 0,
      badges: badges?.badges ?? [],
      activeBadge: badges?.activeBadge ?? null,
      languageProblemCount: language?.languageProblemCount ?? [],
      skills: skill ?? { fundamental: [], intermediate: [], advanced: [] },
    })
  } catch {
    return Response.json({ error: true }, { status: 500 })
  }
}
