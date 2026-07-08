import { NextResponse } from "next/server";
import { isExcludedPath } from "@/lib/vscodeSource";

const REPO = "shajith240/portfolio";
const BRANCH = "main";

interface GitHubTreeEntry {
  path: string;
  type: string;
}

export async function GET() {
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/git/trees/${BRANCH}?recursive=1`,
    {
      headers: { Accept: "application/vnd.github+json" },
      next: { revalidate: 300 },
    }
  );

  if (!res.ok) {
    return NextResponse.json({ error: "github_unreachable" }, { status: 502 });
  }

  const data = (await res.json()) as { tree?: GitHubTreeEntry[] };
  const paths = (data.tree ?? [])
    .filter((entry) => entry.type === "blob")
    .map((entry) => entry.path)
    .filter((path) => !isExcludedPath(path));

  return NextResponse.json({ paths });
}
