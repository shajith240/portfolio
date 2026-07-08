import { NextRequest, NextResponse } from "next/server";
import { isLikelyBinary, MAX_TEXT_FILE_BYTES } from "@/lib/vscodeSource";

const REPO = "shajith240/portfolio";
const BRANCH = "main";

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path");
  if (!path) {
    return NextResponse.json({ error: "missing_path" }, { status: 400 });
  }

  if (isLikelyBinary(path)) {
    return NextResponse.json({ binary: true });
  }

  const res = await fetch(
    `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${path}`,
    { next: { revalidate: 300 } }
  );

  if (!res.ok) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const contentLength = Number(res.headers.get("content-length") ?? 0);
  if (contentLength > MAX_TEXT_FILE_BYTES) {
    return NextResponse.json({ binary: true });
  }

  const content = await res.text();
  if (content.length > MAX_TEXT_FILE_BYTES) {
    return NextResponse.json({ binary: true });
  }

  return NextResponse.json({ content });
}
