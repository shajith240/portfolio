# CLAUDE.md — kalyp.so Portfolio Clone

> This is a pixel-perfect clone of kalyp.so, rebuilt as a personal developer portfolio.
> Every design decision is locked. Do not improve, deviate, or add to the reference design.

---

## Always Do First (Every Session, No Exceptions)

1. **Invoke the `frontend-design` skill** before writing any frontend code.
2. **Read `MASTER.md`** — it contains the component specs, animation table, token values, and build order.
3. Confirm which Step you are on before writing a single line of code.

---

## Reference Design Rules

- This project has a **fixed reference design** (kalyp.so). Treat it as gospel.
- Match layout, spacing, typography, color, and animation **exactly**.
- Swap in personal developer portfolio content (your name, your projects, your links).
- Use `https://placehold.co/WIDTHxHEIGHT/242424/888888` for any missing images — dark placeholder to match the site's tone.
- **Do not improve the design.** Do not add sections, features, gradients, or animations not in the reference.
- Do not use "your own judgment" on visual decisions — consult `MASTER.md` first.

---

## Local Server

- **Always serve on localhost** — never screenshot a `file:///` URL.
- Start the dev server: `node serve.mjs` (serves the project root at `http://localhost:3000`)
- `serve.mjs` lives in the project root. Start it in the background before any screenshot.
- If the server is already running, do not start a second instance.

---

## Screenshot & Comparison Workflow

- Puppeteer is installed at `C:/Users/nateh/AppData/Local/Temp/puppeteer-test/`. Chrome cache at `C:/Users/nateh/.cache/puppeteer/`.
- **Always screenshot from localhost:** `node screenshot.mjs http://localhost:3000`
- Screenshots saved to `./temporary screenshots/screenshot-N.png` (auto-incremented, never overwritten).
- Optional label: `node screenshot.mjs http://localhost:3000 label` → `screenshot-N-label.png`
- `screenshot.mjs` lives in the project root. Use it as-is.
- After each screenshot, **read the PNG** from `temporary screenshots/` with the Read tool and compare visually.
- **Do a minimum of 2 comparison rounds per component** before marking it done.
- Stop only when no visible differences remain, or the user explicitly says so.

### What to Check on Every Comparison

| Category | What to verify |
|---|---|
| Colors | Exact hex — background `#1a1a1a`, cards `#242424`, borders `#333333`, accent `#FF4500` |
| Typography | Nav items are all-caps, bold, `~52px`, `tracking-[-0.02em]` |
| Superscripts | Orange (`#FF4500`), `11px`, positioned after each nav label |
| Spacing | Sidebar `280px`, nav panel `260px`, card padding `16–20px` |
| Images | All images have `filter: grayscale(100%)` applied |
| Play button | Filled `#FF4500` circle — zero border, zero shadow |
| Buttons/CTAs | Text-only with `→` glyph — no filled or outlined buttons |
| Scroll dots | Vertical dot strip, active dot is `#FF4500` |
| Shadows | None. If a shadow appears, remove it. |
| Gradients | None. If a gradient appears, remove it. |

---

## Output Defaults

- Single `index.html` file, all styles inline, unless the Step in `MASTER.md` says otherwise.
- Tailwind CSS via CDN: `<script src="https://cdn.tailwindcss.com"></script>`
- Framer Motion via CDN for animations (or npm if using Next.js build).
- Dark placeholders: `https://placehold.co/WIDTHxHEIGHT/242424/555555`
- The layout is **not mobile-first** — this is a desktop-first fixed-panel design. Do not add responsive breakpoints unless explicitly asked.

---

## Design Token Reference (Single Source of Truth)

Never invent a value. If it is not in this table, check `MASTER.md`.

```
Background page:    #1a1a1a
Background card:    #242424
Background hover:   #2c2c2c
Border:             #333333
Accent:             #FF4500  ← used in 4 places ONLY
Text primary:       #FFFFFF
Text muted:         #888888
Text dim:           #555555
Transition speed:   150ms ease
Sidebar width:      280px
Nav panel width:    260px
Card border-radius: 10px
Card padding:       16px – 20px
```

---

## Animation Rules

- **Framer Motion only** for all entrance animations and interactions.
- **Only animate `transform` and `opacity`** — never `transition-all`, never layout properties.
- Use spring physics for hover interactions. Use `easeOut` for entrance animations.
- Master animation values (copy exactly, do not tune):

```
Page load stagger — sidebar cards:   staggerChildren: 0.1,  y: 16→0,    opacity: 0→1,  duration: 0.5
Page load stagger — nav items:       staggerChildren: 0.05, x: 20→0,    opacity: 0→1,  duration: 0.4
Page load stagger — project cards:   staggerChildren: 0.15, scale: 0.95→1, opacity: 0→1, duration: 0.5
Nav item hover:                      x: 0→8,   spring stiffness: 400, damping: 30
Project card hover:                  scale: 1→1.02, spring stiffness: 300, damping: 25
Close button hover:                  rotate: 0→90, duration: 0.2
Command palette open:                scale: 0.96→1, y: 8→0, opacity: 0→1, duration: 0.15
Drag strip:                          drag="x", dragConstraints left:-800 right:0, dragElastic: 0.1
```

---

## Component Build Order

Build in this exact sequence. Do not skip ahead.

| Step | Component | Key detail |
|---|---|---|
| 0 | Scaffolding + tokens | `globals.css`, `tailwind.config.ts`, file structure |
| 1 | `<RightNav />` | Massive all-caps nav, orange superscripts, stagger entrance |
| 2 | `<LeftSidebar />` + `<InfoCard />` | Bento card system, B&W profile photo |
| 3 | `<MainCanvas />` + `<MusicCard />` + `<DragPill />` | Draggable project strip |
| 4 | `<ScrollDots />` | Fixed dot strip, active dot in `#FF4500` |
| 5 | `<CommandPalette />` | `cmdk` library, `⌘K` trigger, scale entrance |
| 6 | `<CloseButton />` + wiring | Rotate-on-hover, wire all components in `layout.tsx` |

**Session prompt template:**
```
"Read @MASTER.md and @CLAUDE.md — we are on Step [N]: [ComponentName]. Build only this component. After building, take a screenshot and compare against the reference specs in MASTER.md. Do not proceed until the comparison passes."
```

---

## Personal Portfolio Content Slots

Replace these with your actual content. Everything else stays exactly as the reference design.

```
YOUR NAME:          [Your Name]
TAGLINE:            I build products people want to use.
BIO:                [2–3 lines about you as a developer]
GITHUB HANDLE:      [your-handle]
GITHUB DESC:        Open source tools & experiments
LINKEDIN HANDLE:    [your-handle]
LINKEDIN DESC:      Professional profile & work experience
TWITTER/X HANDLE:   [your-handle]   (swap Instagram if you prefer)
PROJECT 1:          [Project name + description + tech]
PROJECT 2:          [Project name + description + tech]
PROJECT 3:          [Project name + description + tech]
```

---

## Brand Assets

- Check the `brand_assets/` folder before designing.
- If a profile photo is present, use it with `filter: grayscale(100%)`.
- If no photo is present, use `https://placehold.co/240x280/242424/555555`.
- Do not use any color from brand assets as an accent — the only accent is `#FF4500`.

---

## Hard Rules (Non-Negotiable)

- No gradients anywhere — structural or decorative
- No box-shadows anywhere — not even `shadow-sm`
- No filled or outlined buttons — CTAs are text + `→` glyph only
- No color other than `#FF4500` as an accent
- No Google Fonts — use system-ui / Helvetica Neue stack
- No `transition-all` — ever
- No responsive/mobile breakpoints unless explicitly requested
- No component libraries (shadcn, MUI, Chakra, etc.)
- No "improvements" to the reference design
- All images must have `filter: grayscale(100%)`
- Scrollbar must be hidden on the main canvas (`scrollbar-none`)
- Do not stop after one screenshot pass — minimum 2 rounds per component

---

*Read `MASTER.md` for full component specs, spacing values, and the complete animation table.*
*Last updated: March 2026*
