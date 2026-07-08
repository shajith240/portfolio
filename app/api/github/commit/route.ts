import { NextResponse } from "next/server";

const REPO = "shajith240/portfolio";
const BRANCH = "main";

interface GitHubCommitResponse {
  sha: string;
  commit: {
    message: string;
    author?: { name?: string; date?: string };
  };
}

export async function GET() {
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/commits?sha=${BRANCH}&per_page=1`,
    {
      headers: { Accept: "application/vnd.github+json" },
      next: { revalidate: 300 },
    }
  );

  if (!res.ok) {
    return NextResponse.json({ error: "github_unreachable" }, { status: 502 });
  }

  const data = (await res.json()) as GitHubCommitResponse[];
  const latest = data[0];
  if (!latest) {
    return NextResponse.json({ error: "no_commits" }, { status: 404 });
  }

  return NextResponse.json({
    branch: BRANCH,
    message: latest.commit.message,
    author: latest.commit.author?.name ?? "unknown",
    date: latest.commit.author?.date ?? "",
    sha: latest.sha.slice(0, 7),
  });
}
