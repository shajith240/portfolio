// Pinned repositories for the GitHub widget's "Pinned" view — the
// projects a visitor (or recruiter) sees first on the GitHub profile.
//
// Three sources, best first, and never a throw:
// 1. GraphQL `pinnedItems`, when GITHUB_TOKEN is configured (GitHub's
//    GraphQL API needs auth);
// 2. the public profile page's HTML, which renders the pinned cards;
// 3. the public REST API's most recently pushed repos (unauthenticated:
//    60 requests/hour per IP — the hour-long cache keeps us far below).

const LOGIN = 'shajith240'
const REVALIDATE = 3600

interface PinnedRepo {
  name: string
  description: string | null
  url: string
  stars: number
  forks: number
  language: string | null
  languageColor: string | null
  forkedFrom: string | null
}

type Source = 'graphql' | 'html' | 'rest'

async function fromGraphQL(token: string): Promise<PinnedRepo[]> {
  const query = `query { user(login: "${LOGIN}") { pinnedItems(first: 6, types: REPOSITORY) { nodes {
    ... on Repository { name description url stargazerCount forkCount
      primaryLanguage { name color } parent { nameWithOwner } } } } } }`
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
    next: { revalidate: REVALIDATE },
  })
  if (!res.ok) return []
  const json = await res.json()
  const nodes = json?.data?.user?.pinnedItems?.nodes ?? []
  return nodes
    .filter((n: { name?: string }) => n?.name)
    .map((n: {
      name: string
      description: string | null
      url: string
      stargazerCount: number
      forkCount: number
      primaryLanguage: { name: string; color: string | null } | null
      parent: { nameWithOwner: string } | null
    }) => ({
      name: n.name,
      description: n.description || null,
      url: n.url,
      stars: n.stargazerCount ?? 0,
      forks: n.forkCount ?? 0,
      language: n.primaryLanguage?.name ?? null,
      languageColor: n.primaryLanguage?.color ?? null,
      forkedFrom: n.parent?.nameWithOwner ?? null,
    }))
}

const decode = (s: string) =>
  s
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()

// "1", "1,234", "1.2k" → number
function parseCount(raw: string | undefined): number {
  if (!raw) return 0
  const t = raw.trim().toLowerCase().replace(/,/g, '')
  const n = parseFloat(t)
  if (!Number.isFinite(n)) return 0
  return t.endsWith('k') ? Math.round(n * 1000) : Math.round(n)
}

// Regexes only on the stable hooks of GitHub's pinned-card markup:
// the `pinned-item-list-item-content` block, `<span class="repo">`,
// `pinned-item-desc`, `itemprop="programmingLanguage"`, the
// repo-language-color swatch, and the /stargazers + /forks links.
async function fromHTML(): Promise<PinnedRepo[]> {
  const res = await fetch(`https://github.com/${LOGIN}`, {
    headers: { Accept: 'text/html' },
    next: { revalidate: REVALIDATE },
  })
  if (!res.ok) return []
  const html = await res.text()
  const repos: PinnedRepo[] = []
  for (const chunk of html.split('pinned-item-list-item-content').slice(1)) {
    const block = chunk.slice(0, Math.max(0, chunk.indexOf('</li>')) || chunk.length)
    const name = block.match(/class="repo"[^>]*>([^<]+)</)?.[1]?.trim()
    if (!name) continue
    const href = block.match(/href="(\/[^"/]+\/[^"/]+)"[^>]*>\s*<span class="repo"/)?.[1]
    const desc = block.match(/pinned-item-desc[^>]*>([\s\S]*?)<\/p>/)?.[1]
    const stars = block.match(/\/stargazers"[\s\S]*?<\/svg>\s*([\d.,]+k?)/i)?.[1]
    const forks = block.match(/\/forks"[\s\S]*?<\/svg>\s*([\d.,]+k?)/i)?.[1]
    const forkedFrom = block.match(/Forked from\s*<a[^>]*>([^<]+)</)?.[1]?.trim()
    repos.push({
      name: decode(name),
      description: desc ? decode(desc) || null : null,
      url: `https://github.com${href ?? `/${LOGIN}/${name}`}`,
      stars: parseCount(stars),
      forks: parseCount(forks),
      language: block.match(/itemprop="programmingLanguage"[^>]*>([^<]+)</)?.[1]?.trim() ?? null,
      languageColor: block.match(/repo-language-color"\s+style="background-color:\s*([^";]+)/)?.[1]?.trim() ?? null,
      forkedFrom: forkedFrom ? decode(forkedFrom) : null,
    })
  }
  return repos.slice(0, 6)
}

async function fromREST(): Promise<PinnedRepo[]> {
  const res = await fetch(`https://api.github.com/users/${LOGIN}/repos?sort=pushed&per_page=6`, {
    headers: { Accept: 'application/vnd.github+json' },
    next: { revalidate: REVALIDATE },
  })
  if (!res.ok) return []
  const list = await res.json()
  if (!Array.isArray(list)) return []
  return list
    // The profile README repo (login/login) isn't a project.
    .filter((r: { name: string }) => r.name.toLowerCase() !== LOGIN)
    .map((r: {
      name: string
      description: string | null
      html_url: string
      stargazers_count: number
      forks_count: number
      language: string | null
    }) => ({
      name: r.name,
      description: r.description || null,
      url: r.html_url,
      stars: r.stargazers_count ?? 0,
      forks: r.forks_count ?? 0,
      language: r.language ?? null,
      languageColor: null,
      forkedFrom: null,
    }))
}

async function attempt(fn: () => Promise<PinnedRepo[]>): Promise<PinnedRepo[]> {
  try {
    return await fn()
  } catch {
    return []
  }
}

export async function GET() {
  const token = process.env.GITHUB_TOKEN
  const chain: [Source, () => Promise<PinnedRepo[]>][] = [
    ...(token ? ([['graphql', () => fromGraphQL(token)]] as [Source, () => Promise<PinnedRepo[]>][]) : []),
    ['html', fromHTML],
    ['rest', fromREST],
  ]
  for (const [source, fn] of chain) {
    const repos = await attempt(fn)
    if (repos.length > 0) return Response.json({ source, repos })
  }
  return Response.json({ error: true }, { status: 502 })
}
