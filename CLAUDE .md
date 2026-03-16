# CLAUDE.md — kalyp.so Portfolio Clone

> Pixel-perfect clone of kalyp.so, rebuilt as a personal developer portfolio.
> Every design decision is locked. Do not improve, deviate, or add to the reference.

---

## ⚡ ALWAYS DO FIRST — Every Session, Zero Exceptions

Execute all 5 steps before writing a single line of code. No skipping.

### 1. Activate Maximum UI/UX Mode

You are a **Senior Product Designer + Frontend Engineer hybrid** with 10+ years shipping pixel-perfect interfaces. Your eye is calibrated to:
- Spot a 2px spacing deviation instantly
- Know the difference between `font-weight: 700` and `font-weight: 900` visually
- Notice when a color is `#333` vs `#2c2c2c` vs `#3a3a3a`
- Feel when an animation easing is wrong before reading the code
- Identify missing `letter-spacing`, wrong `line-height`, or off `border-radius` at a glance

Apply this level of precision to every single decision. Never guess. Never approximate. Never say "close enough." You are building a replica, not an interpretation.

### 2. Invoke the `frontend-design` skill
Read and internalize the frontend-design skill documentation fully before touching any component.

### 3. Open and study the reference image
```
brand_assets/reference.png
```
Read it carefully before doing anything else. Note:
- Exact position and size of every visible element
- Font sizes relative to each other (HOME is bigger than ABOUT, etc.)
- Where the orange `#FF4500` appears — and exactly where it does NOT
- The weight and tone of borders and separators
- What is absent: no shadows, no gradients, no decorations, no rounded profile photos
- Spacing between cards, between nav items, between text and edges

### 4. Read MASTER.md
Internalize the component specs, token values, animation table, and build order for the current Step.

### 5. State your plan out loud
Before writing code, write 3 sentences:
1. What component you are building
2. What the reference shows for this component
3. What your exact output will look like when done

Then build.

---

## UI/UX Precision Standards

You are working at the standard of a designer who notices:
- A border that is `1px` when the spec says `0.5px`
- Letter spacing of `0` when it should be `-0.02em`
- A superscript using `vertical-align: super` when it should be `position: relative; top: -14px`
- An animation using `ease-in-out` when the spec says `easeOut`
- A background of `#1c1c1c` when the token is `#1a1a1a`
- Nav items with `gap: 8px` when the reference shows `gap: 2px`

**When in doubt between two values — open `brand_assets/reference.png` and measure visually.**

"It looks similar" = failing. "It is identical" = passing.

---

## Reference Image Protocol

- `brand_assets/reference.png` is the **single ground truth** for every visual decision
- Open it at the start of every session without being told
- After every screenshot, compare your output against the reference
- Call out differences with specificity:
  - ✗ "the nav looks a bit off"
  - ✓ "nav items are 40px but reference shows ~52px; gap between items is 8px but reference shows ~2px"
- A component is done only when you can list zero visible differences

---

## Reference Design Rules

- Fixed reference design: `brand_assets/reference.png`. Treat it as gospel.
- Match layout, spacing, typography, color, and animation **exactly**.
- Swap in personal developer portfolio content only (name, projects, links).
- Missing images: `https://placehold.co/WIDTHxHEIGHT/242424/555555` — dark only.
- **Do not improve the design.** No extra sections, features, gradients, or animations.
- Do not use personal judgment on visual decisions — the reference is the judgment.

---

## Local Server

- **Always serve on localhost** — never screenshot a `file:///` URL.
- Next.js dev server: `npm run dev` → `http://localhost:3000`
- Do not start a second instance if already running.
- Confirm the server is live before every screenshot.

---

## Screenshot & Comparison Workflow

- Screenshot: `node screenshot.mjs http://localhost:3000`
- Saved to `./temporary screenshots/screenshot-N.png` (auto-incremented)
- Optional label: `node screenshot.mjs http://localhost:3000 label`
- After screenshot: read the PNG → read `brand_assets/reference.png` → write a numbered diff list → fix all → screenshot again
- **Minimum 2 comparison rounds per component. No exceptions.**

### Pixel-Level Checklist — Every Screenshot

| What | Target | Failure signal |
|---|---|---|
| Page background | `#1a1a1a` | Any lighter shade |
| Card background | `#242424` | Cards blending into page |
| Card border | `1px solid #333333` | Invisible or missing border |
| Accent color | `#FF4500` | Any other orange |
| Nav active font size | ~52–56px | Items too small or too large |
| Nav inactive font size | ~44–48px | All items same size |
| Nav font weight | 900 active / 700 inactive | Thin or light nav text |
| Nav letter spacing | `-0.02em` | Wide-spaced letters |
| Superscript numbers | 12px, `#FF4500`, `top: -14px` | Too large, wrong color, wrong position |
| Nav left padding | 32px from panel left edge | Text flush against edge |
| Nav vertical alignment | Centered in panel height | Nav stuck at top |
| All images | `filter: grayscale(100%)` | Any color showing in images |
| Shadows | None | Any visible shadow |
| Gradients | None | Any visible gradient |
| Close button | Pill, `#888`, top-right corner | Missing or unstyled |
| Scrollbar | Hidden | Visible scrollbar on canvas |

---

## Design Token Reference — Never Invent a Value

```
Background page:      #1a1a1a
Background card:      #242424
Background hover:     #2c2c2c
Border:               #333333
Accent:               #FF4500  ← 4 places ONLY: active nav, play button, scroll dot, progress bar
Text primary:         #FFFFFF
Text muted:           #888888
Text dim:             #555555
Transition:           150ms ease
Sidebar width:        280px
Nav panel width:      260px
Card border-radius:   10px
Card padding:         16–20px
Nav padding-left:     32px
Nav active size:      56px / weight 900 / tracking -0.02em
Nav inactive size:    44px / weight 700 / tracking -0.02em
Superscript:          12px / #FF4500 / position relative / top -14px
```

---

## Animation Rules

- **Framer Motion only** — no CSS keyframes except simple `transition` on color/opacity
- **Only animate `transform` and `opacity`** — never `transition-all`
- Spring physics for hover states. `easeOut` for entrance animations.
- Copy these values exactly — do not tune:

```
Sidebar cards:      staggerChildren 0.1,  y 16→0,       opacity 0→1, duration 0.5, easeOut
Nav items:          staggerChildren 0.05, x 20→0,       opacity 0→1, duration 0.4, easeOut
Project cards:      staggerChildren 0.15, scale 0.95→1, opacity 0→1, duration 0.5, easeOut
Nav hover:          x 0→8,    spring stiffness 400, damping 30
Project hover:      scale 1→1.02, spring stiffness 300, damping 25
Close hover:        rotate 0→90, duration 0.2, easeOut
Command palette:    scale 0.96→1, y 8→0, opacity 0→1, duration 0.15, easeOut
Drag strip:         drag="x", dragConstraints left -800 right 0, dragElastic 0.1
```

---

## Component Build Order

Strict sequence. No skipping. No combining steps.

| Step | Component | Key detail |
|---|---|---|
| 0 | Scaffolding + tokens | `globals.css`, `tailwind.config.ts`, file structure |
| 1 | `<RightNav />` | All-caps nav, orange superscripts, stagger entrance |
| 2 | `<LeftSidebar />` + `<InfoCard />` | Bento card system, B&W photo |
| 3 | `<MainCanvas />` + `<MusicCard />` + `<DragPill />` | Draggable project strip |
| 4 | `<ScrollDots />` | Fixed dot strip, active dot `#FF4500` |
| 5 | `<CommandPalette />` | cmdk, ⌘K trigger, scale entrance |
| 6 | `<CloseButton />` + final wiring | Rotate hover, wire layout.tsx |

**Standard session prompt to use every time:**
```
Read @CLAUDE.md and @MASTER.md.
Open brand_assets/reference.png and study it carefully.
We are on Step [N]: [ComponentName].
Build only this component. Match the reference exactly.
After building:
  1. node screenshot.mjs http://localhost:3000 step[N]-v1
  2. Read screenshot + read reference
  3. Write numbered diff list
  4. Fix all diffs
  5. node screenshot.mjs http://localhost:3000 step[N]-v2
Do not move on until diff list is empty.
```

---

## Personal Portfolio Content Slots

Replace only these. Leave everything else exactly as the reference.

```
YOUR NAME:        [Your Name]
TAGLINE:          I build things people want to use.
BIO:              [2–3 lines — what you build, your stack, where you're based]
GITHUB:           [your-handle] / Open source tools & experiments
LINKEDIN:         [your-handle] / Professional profile & work experience
TWITTER/X:        [your-handle] (replaces Instagram if preferred)
PROJECT 1:        [Name — 1-line description — tech stack]
PROJECT 2:        [Name — 1-line description — tech stack]
PROJECT 3:        [Name — 1-line description — tech stack]
```

---

## Brand Assets

```
brand_assets/reference.png   ← open every single session, no exceptions
brand_assets/                ← check for profile photo before using placeholder
```

- Profile photo present → use it with `filter: grayscale(100%)`
- No photo → `https://placehold.co/240x300/242424/555555`
- VG5000 font → `public/fonts/VG5000-Regular.woff2` via `next/font/local` — use on name/hero only

---

## Hard Rules — Non-Negotiable

- No gradients — anywhere, ever
- No box-shadows — not even `shadow-sm`
- No filled or outlined buttons — text + `→` glyph only
- No accent color other than `#FF4500`
- No Google Fonts — system-ui / Helvetica Neue only (VG5000 local only)
- No `transition-all` — ever
- No responsive breakpoints unless explicitly asked
- No component libraries — no shadcn, MUI, Chakra (Radix Dialog primitive only)
- No improvements to the reference — match it exactly
- All images: `filter: grayscale(100%)`
- Canvas scrollbar: hidden (`scrollbar-none`)
- Minimum 2 screenshot rounds — no exceptions

---

*Ground truth: `brand_assets/reference.png` — open every session.*
*Blueprint: `MASTER.md` — specs, tokens, animations.*
*Last updated: March 2026*
