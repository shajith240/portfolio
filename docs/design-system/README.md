# Design System — Index

This directory replaces the old `MASTER.md`. It's the detailed reference for the Apple/Liquid-Glass visual identity this portfolio is being rebuilt around. `CLAUDE.md` stays short on purpose (it loads into every message) — read the file below that matches what you're building, not all four every time.

| Doc | Read it when you're... |
|---|---|
| [`materials-glass.md`](./materials-glass.md) | touching any floating/glass surface — dock, modals, toolbars, overlays, card hover states |
| [`typography.md`](./typography.md) | setting any font-size, weight, or letter-spacing |
| [`motion.md`](./motion.md) | writing a Framer Motion `transition` or `variants` block |
| [`layout.md`](./layout.md) | setting spacing, breakpoints, corner radii, or working on responsive behavior |

## How this differs from the old spec

The project started as a pixel-perfect kalyp.so clone (see git history for the old `MASTER.md`/`CLAUDE.md`). That's retired. Current direction: an Apple/macOS-inspired visual identity built around the Liquid Glass material system, navigated via a macOS-style Dock (replacing the old always-present right-hand nav panel), fully responsive.

Two rules from the old spec are explicitly retracted, not just superseded — see the docs above for the replacement:
- ~~No responsive breakpoints~~ → `layout.md`
- ~~Only font-weight 400 or 700~~ → `typography.md`

Everything else in `CLAUDE.md`'s "Hard Rules" is still true unless a doc above says otherwise.
