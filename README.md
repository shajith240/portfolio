# Portfolio

Shajith Bathina's developer portfolio: a macOS-style desktop in the browser, built around Apple's Liquid Glass look. Pages open as windows from a Dock, live widgets show GitHub, LeetCode, Codeforces and Claude Code activity, and an animated mascot answers questions about the work. On phones it becomes an iPhone-style home screen.

Live: https://shajith-portfolio-seven.vercel.app

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| UI | React 19, Tailwind CSS 4, Framer Motion 12 |
| Glass | Custom SVG refraction engine (`lib/liquidGlass.ts`) |
| AI | Groq (OpenAI-compatible) via `app/api/mascot` |
| Hosting | Vercel |

No component libraries. Design rules live in `docs/design-system/` and `CLAUDE.md`.

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # unit tests (lib/*.test.ts)
npm run typecheck
```

Environment variables (`.env.local` locally, Vercel project settings in production):

- `MASCOT_LLM_API_KEY`: Groq API key for the mascot chat (it shows as offline without one)
- `NEXT_PUBLIC_SITE_URL`: public URL, for metadata and the sitemap

## Where things live

```
app/                 Pages (each also opens as a desktop window) and API routes
components/layout/   Desktop shell: menu bar, wallpaper, app switcher
components/ui/       Dock, Spotlight, link and full-screen prompts
components/widgets/  Desktop widgets
components/window/   Window manager, Finder, Credits, VS Code viewer
components/mascot/   The mascot, its chat and speech bubbles
components/mobile/   iPhone-style phone layout
data/                Content: profile, projects, skills, wallpaper choice
lib/                 Glass engine, layout logic, mascot brain, helpers
scripts/             Content generation, map bake, Claude activity export
```

## Updating content

- **Profile, education, projects, skills:** edit the files in `data/`.
- **Wallpapers:** drop images into `public/wallpapers/` and restart `npm run dev`. On localhost, picking one from the desktop's right-click menu saves it to `data/wallpaper.json`; commit and push to make it the wallpaper for every visitor.
- **Claude Code widget:** run `node scripts/export-claude-activity.mjs`, then commit `data/claudeActivity.json`. It exports daily counts only, never prompts or code.
- **Location map:** `node scripts/bake-map.mjs` re-bakes `lib/mapData/rajahmundry.ts` from OpenStreetMap.

## Credits

Third-party artwork, logos, map data and fonts are listed in the site's Credits window (`data/credits.ts`). The VG5000 font is under the SIL Open Font License (`public/fonts/VG5000-LICENSE.txt`).
