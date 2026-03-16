# kalyp.so Clone — Master Project Brief
> Drop this file into your project root. At the start of every Claude Code session, reference it with `@MASTER.md`. This is the single source of truth for every decision.

---

## What We Are Building

A pixel-perfect, fully animated clone of kalyp.so — the personal portfolio of Kalypso Kichu. The site is a dark, editorial, 3-panel fixed layout with a single orange accent color, massive typographic navigation, and smooth Framer Motion animations throughout.

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · Framer Motion · cmdk

---

## Absolute Rules (Never Break These)

1. **Zero component libraries** — no shadcn/ui, no MUI, no Chakra. Every component is built from scratch with Tailwind + Framer Motion only.
2. **Never hardcode a color outside of `globals.css` tokens** — always use CSS variables.
3. **Never use gradients, box-shadows, or blur** on structural elements — this design is flat.
4. **All photography is grayscale** — `filter: grayscale(100%)` on every image, always.
5. **One accent color only** — `#FF4500`. It appears in exactly 4 places: active nav item, play button, scroll indicator dot, progress bar fill.
6. **Framer Motion for all animations** — no CSS keyframes except for simple `transition` on color/opacity.
7. **Build components in the order listed in Phase 4** — each one depends on the previous.

---

## Design Tokens

Paste this into `src/styles/globals.css` before writing a single component:

```css
:root {
  /* Backgrounds */
  --bg-void:     #1a1a1a;   /* page background */
  --bg-card:     #242424;   /* card / panel surface */
  --bg-elevated: #2c2c2c;   /* hover state */

  /* Borders */
  --border:      #333333;   /* all card borders */

  /* Accent */
  --accent:      #FF4500;   /* THE only accent — use sparingly */

  /* Text */
  --text-primary: #FFFFFF;
  --text-muted:   #888888;
  --text-dim:     #555555;

  /* Motion */
  --transition:  150ms ease;

  /* Layout */
  --sidebar-w:   280px;
  --nav-w:       260px;
  --radius-card: 10px;
}
```

Tailwind config additions in `tailwind.config.ts`:
```ts
extend: {
  colors: {
    void:     '#1a1a1a',
    card:     '#242424',
    elevated: '#2c2c2c',
    border:   '#333333',
    accent:   '#FF4500',
    muted:    '#888888',
    dim:      '#555555',
  },
  borderRadius: {
    card: '10px',
  },
}
```

---

## Layout Architecture

The entire site is a **fixed 3-panel shell**. Nothing about the outer layout scrolls — only the center canvas scrolls internally.

```
┌──────────────┬───────────────────────────┬─────────────┐
│ LEFT SIDEBAR │     CENTER CANVAS         │  RIGHT NAV  │
│   280px      │     flex-1                │   260px     │
│   fixed      │   overflow-y: scroll      │   fixed     │
│   z-10       │   z-0                     │   z-10      │
└──────────────┴───────────────────────────┴─────────────┘
```

Root layout (`app/layout.tsx`):
```tsx
<div className="flex h-screen overflow-hidden bg-void text-white">
  <LeftSidebar />
  <MainCanvas>{children}</MainCanvas>
  <RightNav />
</div>
```

---

## File Structure

Create this exact structure before writing any component code:

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── [slug]/
│       └── page.tsx
├── components/
│   ├── layout/
│   │   ├── LeftSidebar.tsx
│   │   ├── RightNav.tsx
│   │   ├── MainCanvas.tsx
│   │   └── ScrollDots.tsx
│   ├── cards/
│   │   ├── InfoCard.tsx
│   │   ├── ProjectCard.tsx
│   │   └── MusicCard.tsx
│   └── ui/
│       ├── CommandPalette.tsx
│       ├── DragPill.tsx
│       └── NavItem.tsx
├── data/
│   └── nav.ts
├── lib/
│   └── utils.ts
└── styles/
    └── globals.css
```

---

## Phase 4 — Component Build Order

### Step 1 — `<RightNav />`

**This is built first.** It sets the visual identity of the entire site.

Specs:
- Position: `fixed right-0 top-0 h-screen` width `260px`, `z-10`, `bg-void`, `border-l border-[#333]`
- Nav items: all-caps, `font-bold`, white, `text-[52px]` (active), `text-[44px]` (inactive), `tracking-[-0.02em]`, `leading-none`
- Active item color: `#FF4500`
- Superscript numbers: `text-[11px] font-medium text-accent align-super ml-[3px]`
- Items: HOME 01, ABOUT 02, SHOP 03, PROJECTS 04, NOTES 05, TOOLS 06, SIGN IN 07

Framer Motion on mount — stagger each item:
```tsx
const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } }
const item = { hidden: { x: 20, opacity: 0 }, show: { x: 0, opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } } }
```

Hover behavior per item:
```tsx
whileHover={{ x: 8 }}
transition={{ type: 'spring', stiffness: 400, damping: 30 }}
```

---

### Step 2 — `<LeftSidebar />`

Specs:
- Position: `fixed left-0 top-0 h-screen` width `280px`, `z-10`, `bg-void`, `border-r border-[#333]`, `overflow-y-auto`, padding `16px`
- Gap between cards: `12px`

Contains these cards stacked vertically:

**Hero text** (no card wrapper):
- "Hey, I'm Kalypso." — `font-bold text-[18px]` white
- "I build products people want to interact with." — same size, white
- Margin bottom `24px`

**`<InfoCard />`** — reusable template for ALL sidebar cards:
```
Props: { label: string, cta?: string, href?: string, children: ReactNode }

Structure:
┌─────────────────────────────────┐
│ LABEL            cta text →     │  ← 10px uppercase #888 / 12px #888
│                                 │
│   {children}                    │  ← content area
│                                 │
└─────────────────────────────────┘
bg-card, border border-[#333], rounded-[10px], p-4
```

Cards to build using `<InfoCard>`:
1. **KALYPSO** — profile photo (B&W, rounded-[8px]) + "About me" label + bio text
2. **INSTAGRAM** — icon + `@kalypsodesigns` + "Design resources. 400k+ followers."
3. **GITHUB** — icon + `Kalypsokichu-code` + "Open source tools & experiments"
4. **LINKEDIN** — icon + `kalypsodesigns` + "Professional profile & work experience"

Framer Motion on mount — stagger each card upward:
```tsx
{ hidden: { y: 16, opacity: 0 }, show: { y: 0, opacity: 1 } }
// staggerChildren: 0.1
```

---

### Step 3 — `<MainCanvas />`

Specs:
- `flex-1`, `ml-[280px]`, `mr-[260px]`, `h-screen`, `overflow-y-scroll`, hide scrollbar
- Houses project cards in a horizontally draggable strip

**`<DragPill />`** — the "Drag or use ⬅ ➡" pill at top center:
- `position: fixed top-4 left-1/2 -translate-x-1/2`
- `bg-[#242424] border border-[#333] rounded-full px-4 py-2 text-[12px] text-muted`
- Contains left/right arrow button icons

**`<ProjectCard />`** — horizontally scrollable draggable strip:
```tsx
<motion.div
  drag="x"
  dragConstraints={{ left: -800, right: 0 }}
  className="flex gap-4 cursor-grab active:cursor-grabbing"
>
  {projects.map(p => <ProjectCard key={p.id} {...p} />)}
</motion.div>
```

Each card: `w-[320px] h-[480px] rounded-[12px] overflow-hidden relative flex-shrink-0`

**`<MusicCard />`** — the featured Spotify-style card:
- Album art fills top 60% of card
- Track title: `font-bold text-[22px]` white
- Artist: `text-[14px] text-muted`
- Play button: `w-[48px] h-[48px] rounded-full bg-accent` with filled triangle SVG
- Action icons row: repeat + heart in `#888`
- Progress bar: `h-[4px] bg-[#333] rounded-full` with inner `bg-accent` fill at 30% width
- Label below card: `text-[13px] text-muted text-center mt-2`

---

### Step 4 — `<ScrollDots />`

Specs:
- `position: fixed left-[296px] top-1/2 -translate-y-1/2`
- Array of 8–10 dots, each `w-[5px] h-[5px] rounded-full bg-[#333]`
- Active dot: `bg-accent w-[6px] h-[6px]`
- Vertical stack, `gap-[6px]`
- Animate active dot position with `framer-motion layout` transition

---

### Step 5 — `<CommandPalette />`

Specs:
- Trigger: `⌘K` / `Ctrl+K`
- Uses `cmdk` library
- `position: fixed bottom-6 left-1/2 -translate-x-1/2`
- The closed state shows just the search icon + "⌘K" pill: `bg-[#242424] border border-[#333] rounded-full px-4 py-2 text-[12px] text-muted`
- On open: modal overlay, `bg-[#242424] border border-[#333] rounded-[12px] w-[480px]`

Framer Motion entrance:
```tsx
initial={{ scale: 0.96, opacity: 0, y: 8 }}
animate={{ scale: 1, opacity: 1, y: 0 }}
transition={{ duration: 0.15, ease: 'easeOut' }}
```

---

### Step 6 — `<CloseButton />`

Top right corner, `position: fixed top-4 right-4`:
```tsx
<motion.button whileHover={{ rotate: 90 }} transition={{ duration: 0.2 }}>
  Close ✕
</motion.button>
```
`text-[13px] text-muted border border-[#333] rounded-full px-3 py-1.5 bg-card`

---

## Animation Master Reference

| Element | Framer Motion config |
|---|---|
| Page load — sidebar cards | `staggerChildren: 0.1`, `y: 16→0`, `opacity: 0→1`, `duration: 0.5` |
| Page load — nav items | `staggerChildren: 0.05`, `x: 20→0`, `opacity: 0→1`, `duration: 0.4` |
| Page load — project cards | `staggerChildren: 0.15`, `scale: 0.95→1`, `opacity: 0→1`, `duration: 0.5` |
| Nav item hover | `x: 0→8`, spring `stiffness: 400, damping: 30` |
| Project card hover | `scale: 1→1.02`, `zIndex: 0→10`, spring `stiffness: 300, damping: 25` |
| Close button hover | `rotate: 0→90`, `duration: 0.2` |
| Command palette open | `scale: 0.96→1`, `y: 8→0`, `opacity: 0→1`, `duration: 0.15` |
| Drag strip | `drag="x"`, `dragConstraints left:-800 right:0`, `dragElastic: 0.1` |

---

## Micro-Details Checklist (QA Before Committing Each Component)

- [ ] All images have `filter: grayscale(100%)`
- [ ] Nav superscript numbers are `text-accent` not white
- [ ] Active nav item is `text-accent` not white
- [ ] Card borders are exactly `#333333` — not `white/10` or `gray-700`
- [ ] Play button is a filled `bg-accent` circle — no border, no shadow
- [ ] CTA arrows use the `→` glyph — not an SVG icon
- [ ] No element uses a gradient or box-shadow
- [ ] Scrollbar is hidden on MainCanvas (`scrollbar-none` Tailwind class)
- [ ] All font weights are either `400` or `700` — no `500` or `600` on display type
- [ ] Negative letter-spacing (`-0.02em`) applied to all nav items
- [ ] Body text and label font: system-ui / Helvetica Neue stack — no Google Fonts

---

## Claude Code Session Protocol

**How to use this file in every session:**

1. Start every session: `@MASTER.md — we are working on Step [N]: <ComponentName>`
2. Claude Code builds only that one component
3. You review against the Micro-Details Checklist above
4. Fix any deviations before moving to the next step
5. Never skip a step — the build order exists for a reason

**Prompts to use per step:**

```
Step 1: "@MASTER.md — Build the RightNav component exactly per the specs. Start with the file structure, then the component, then verify the animation config matches the master animation table."

Step 2: "@MASTER.md — Build the LeftSidebar and the reusable InfoCard template. Use the InfoCard for all 4 sidebar cards."

Step 3: "@MASTER.md — Build MainCanvas with the draggable project strip, DragPill, and MusicCard."

Step 4: "@MASTER.md — Build the ScrollDots component with Framer Motion layout animation."

Step 5: "@MASTER.md — Build the CommandPalette using cmdk. Match the entrance animation exactly."

Step 6: "@MASTER.md — Build the CloseButton with the 90-degree rotation hover. Wire up all components in app/layout.tsx."
```

---

## Data File

`src/data/nav.ts`:
```ts
export const NAV_ITEMS = [
  { label: 'HOME',     num: '01', href: '/' },
  { label: 'ABOUT',    num: '02', href: '/about' },
  { label: 'SHOP',     num: '03', href: '/shop' },
  { label: 'PROJECTS', num: '04', href: '/projects' },
  { label: 'NOTES',    num: '05', href: '/notes' },
  { label: 'TOOLS',    num: '06', href: '/tools' },
  { label: 'SIGN IN',  num: '07', href: '/signin' },
]
```

---

*Last updated: March 2026 · Built for Claude Code*
