import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";

/* Publishes the site-wide wallpaper — DEV ONLY.

   The wallpaper every visitor sees is data/wallpaper.json, a committed
   file. When the owner picks a wallpaper on their own machine (`npm run
   dev`), lib/useWallpaper.ts POSTs it here and this writes it into that
   file; committing and pushing then ships it to everyone. There is no
   database and no login: on the deployed site this route doesn't
   exist (404), so visitors can only ever change their own wallpaper. */

const WALLPAPER_DIR = path.join(process.cwd(), "public", "wallpapers");
const PUBLISHED_FILE = path.join(process.cwd(), "data", "wallpaper.json");

export async function POST(req: Request) {
  if (process.env.NODE_ENV !== "development") return new Response(null, { status: 404 });

  const body = await req.json().catch(() => null);
  const filename = body?.filename;
  // A bare file name that exists in public/wallpapers — never a path.
  if (typeof filename !== "string" || filename !== path.basename(filename) || !existsSync(path.join(WALLPAPER_DIR, filename))) {
    return Response.json({ error: "Unknown wallpaper" }, { status: 400 });
  }

  await writeFile(PUBLISHED_FILE, JSON.stringify({ published: filename }, null, 2) + "\n");
  return Response.json({ published: filename });
}
