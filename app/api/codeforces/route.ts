export async function GET() {
  try {
    const [userRes, statusRes] = await Promise.all([
      fetch('https://codeforces.com/api/user.info?handles=shajith240', {
        next: { revalidate: 3600 },
      }),
      fetch(
        'https://codeforces.com/api/user.status?handle=shajith240&from=1&count=1000',
        { next: { revalidate: 3600 } }
      ),
    ])

    const [userData, statusData] = await Promise.all([
      userRes.json(),
      statusRes.json(),
    ])

    const solved = new Set<string>()
    if (statusData.status === 'OK') {
      for (const sub of statusData.result) {
        if (sub.verdict === 'OK') {
          solved.add(`${sub.problem.contestId ?? ''}-${sub.problem.index}`)
        }
      }
    }

    return Response.json({
      user: userData.result?.[0] ?? null,
      problemsSolved: solved.size,
    })
  } catch {
    return Response.json({ error: true }, { status: 500 })
  }
}
