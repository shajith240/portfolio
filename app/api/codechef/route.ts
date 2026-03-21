export async function GET() {
  try {
    const res = await fetch(
      'https://codechef-api.vercel.app/handle/shajith240',
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) {
      return Response.json({ error: true }, { status: 502 })
    }
    const data = await res.json()
    if (data?.error || typeof data?.rating === 'undefined') {
      return Response.json({ error: true }, { status: 502 })
    }
    return Response.json(data)
  } catch {
    return Response.json({ error: true }, { status: 500 })
  }
}
