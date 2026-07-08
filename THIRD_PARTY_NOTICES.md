# Third-Party Notices

This is a personal, non-commercial portfolio. It uses third-party media
(music, wallpapers, icons, fonts) that is not owned by the site's author.
All such material remains the property of its original creators and
rights holders. Nothing here is monetized.

The user-facing version of this list lives in the Credits window (open
`Credits.rtf` from Finder — see
[components/window/CreditsApp.tsx](components/window/CreditsApp.tsx),
a native window kind rather than a routed page), sourced from
[data/credits.ts](data/credits.ts).

## Music (`public/songs/`)

Song title/artist metadata is auto-extracted from each audio file's own
tags by `scripts/generate-content.mjs` into
`data/generated/content.ts` (`GENERATED_SONGS`). Cover art and lyrics
(`.lrc`) files that ship alongside a track are credited to the same
artist(s) unless noted otherwise. Used for personal expression only —
no commercial use, no redistribution beyond this site.

## Wallpapers (`public/wallpapers/`, `public/wallpapers/mobile/`)

Auto-listed via `GENERATED_WALLPAPERS` / `GENERATED_MOBILE_WALLPAPERS`.
Sourced from publicly available wallpaper collections; includes stock
photography, brand imagery (e.g. car and consumer-electronics
marketing wallpapers), and characters from copyrighted media. None of
it is original artwork by this site's author.

## Motivation quote cards (`public/motivation_quotes/`)

Auto-listed via `GENERATED_MOTIVATION_IMAGES`. Quote-card images
sourced from publicly circulated collections online.

## Icons (`public/icons/`)

Dock, app, and skill icons represent third-party tools, languages, and
platforms (see `ICON_CREDITS` in `data/credits.ts` for the full
per-logo owner list — ChatGPT/OpenAI, Claude/Anthropic, Docker/Docker
Inc., GitHub/Microsoft, React/Meta, etc.). Each logo is a trademark of
its respective company; no affiliation with or endorsement by these
companies is claimed or implied.

## Fonts

- **VG5000** — see `vg5000-master/LICENSE.txt`.

## Maintenance

Songs, wallpapers, and motivation images require no manual updates
here or in the Credits window — dropping a file into the relevant `public/`
folder (or removing one) is picked up automatically by
`scripts/generate-content.mjs` on the next `npm run dev` / `npm run
build`. Only `ICON_CREDITS` and `FONT_CREDITS` in `data/credits.ts`
need a manual one-line addition when a new brand/tech icon or font is
introduced.
