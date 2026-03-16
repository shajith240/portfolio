# Portfolio

A pixel-perfect personal portfolio built from the ground up — dark, minimal, and fast.

---

## Overview

This project is a developer portfolio cloned from the design language of [kalyp.so](https://kalyp.so), rebuilt as a personal portfolio. Every layout decision, spacing value, animation curve, and color is deliberate. Nothing is decorative for its own sake.

The interface runs as a fixed-panel desktop layout with a persistent left sidebar, a collapsible right navigation, and a central canvas that responds to both. Pages transition through the canvas without disrupting the shell.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Animation | Framer Motion 12 |
| Command Palette | cmdk |
| Runtime | React 19 |

---

## Design System

All visual decisions derive from a fixed token set. Nothing is invented at the component level.

```
Background page      #1a1a1a
Background card      #242424
Background hover     #2c2c2c
Border               #333333
Accent               #FF4500
Text primary         #FFFFFF
Text muted           #888888
Text dim             #555555
Transition speed     150ms ease
Sidebar width        280px
Nav panel width      260px
Card border-radius   10px
Card padding         16px – 20px
```

No gradients. No shadows. No filled buttons. No component libraries.

---

## Project Structure

```
app/
  about/        About page
  notes/        Notes page
  projects/     Projects page
  shop/         Shop page
  signin/       Sign-in page
  tools/        Tools page
  layout.tsx    Root layout, mounts AppShell
  page.tsx      Home, draggable project card stack

components/
  cards/
    InfoCard.tsx        Sidebar bento card
    MusicCard.tsx       Now-playing card with progress bar
    ProjectCard.tsx     Full-bleed project image card
  layout/
    AppShell.tsx        Global shell, sidebar + nav + palette
    LeftSidebar.tsx     280px fixed left sidebar
    MainCanvas.tsx      Central content area
    RightNav.tsx        Collapsible right navigation
    ScrollDots.tsx      Vertical dot strip position indicator
  ui/
    BottomToolbar.tsx   Fixed bottom icon row and command trigger
    CloseButton.tsx     Rotate-on-hover close button
    CommandPalette.tsx  cmdk-powered search overlay
    DragPill.tsx        Horizontal drag strip
    MenuButton.tsx      Top-right menu toggle
    NavItem.tsx         Right nav item with orange superscript
    SplitText.tsx       Character-split text animation

contexts/
  LayoutContext.tsx     Sidebar, nav, and search open state

data/
  nav.ts                Navigation link definitions
```

---

## Animation Principles

All animations use Framer Motion. Only `transform` and `opacity` are animated — never layout properties.

```
Page load — sidebar cards     staggerChildren 0.1   y 16→0        opacity 0→1   duration 0.5
Page load — nav items         staggerChildren 0.05  x 20→0        opacity 0→1   duration 0.4
Page load — project cards     staggerChildren 0.15  scale 0.95→1  opacity 0→1   duration 0.5
Nav item hover                x 0→8   spring stiffness 400  damping 30
Project card hover            scale 1→1.02  spring stiffness 300  damping 25
Close button hover            rotate 0→90   duration 0.2
Command palette open          scale 0.96→1  y 8→0  opacity 0→1   duration 0.15
```

Spring physics for interactions. `easeOut` for entrance animations.

---

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Constraints

These rules are enforced throughout the codebase without exception.

- No gradients, anywhere
- No box-shadows, anywhere
- No filled or outlined buttons — CTAs are text with an arrow glyph only
- No color used as accent other than `#FF4500`
- No Google Fonts — system-ui / Helvetica Neue stack only
- No `transition-all`, ever
- No responsive breakpoints — desktop-first fixed-panel layout
- No component libraries (shadcn, MUI, Chakra, etc.)
- All images carry `filter: grayscale(100%)`
- Main canvas scrollbar hidden

---

## License

MIT
