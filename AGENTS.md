# AGENTS.md — Portfolio (Apple / Liquid Glass identity)

> This portfolio's visual identity is being rebuilt around Apple's design language — specifically the Liquid Glass material system (WWDC 2025 / iOS 26 / macOS Tahoe) — navigated via a macOS-style Dock. It started as a pixel-perfect kalyp.so clone; that spec is retired (see git history).

## Read before frontend work

Don't load all of these every session — read whichever matches what you're building:

| Doc | Read it when you're... |
|---|---|
| [`docs/design-system/README.md`](docs/design-system/README.md) | starting any design-system work — index of the docs below |
| [`docs/design-system/materials-glass.md`](docs/design-system/materials-glass.md) | touching any floating/glass surface |
| [`docs/design-system/typography.md`](docs/design-system/typography.md) | setting font-size, weight, or tracking |
| [`docs/design-system/motion.md`](docs/design-system/motion.md) | writing a Framer Motion transition |
| [`docs/design-system/layout.md`](docs/design-system/layout.md) | spacing, breakpoints, responsive behavior |

## Hard rules (still true)

- No component libraries (shadcn, MUI, Chakra, etc.) — build from Tailwind + Framer Motion
- Framer Motion for all animation — no CSS keyframes except simple color/opacity transitions
- This is a portfolio *inspired by* Apple's design language, not a literal Apple product — never claim Apple trademarks/branding
- Every claim in the design-system docs is flagged `[HIG-sourced]` or `[Web adaptation]` — keep that discipline when extending them

## Retracted rules (do not follow these anymore)

- ~~No gradients / no shadows anywhere~~ — Liquid Glass materials use real shadows, highlights, and tint gradients by design; see `materials-glass.md`
- ~~Desktop-first, no responsive breakpoints~~ — this site is fully responsive; see `layout.md` for the exact breakpoint tiers
- ~~Only font-weight 400 or 700~~ — Apple's own Headline style is Semibold (600); see `typography.md`
- ~~Fixed right-hand nav panel~~ — navigation is moving to a macOS-style Dock (in progress)

## Local development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). There is no `serve.mjs` in this repo — use the Next.js dev server directly. `screenshot.mjs` (Puppeteer) exists for manual visual comparison against localhost; don't hardcode machine-specific paths into it.

## Personal content

This is Shajith Bathina's personal developer portfolio — GitHub/LeetCode/LinkedIn handle `shajith240`. Content lives in `data/` and the page components; don't reintroduce placeholder/template content.
