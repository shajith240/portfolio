# Typography

> Read this before setting any font-size, weight, or letter-spacing value.

## Font stack

**[Web adaptation]** No SF Pro web license — rely on the system font stack, which resolves to real SF Pro on every Apple device and a close system equivalent elsewhere:

```css
font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", system-ui, sans-serif;
```

## Type scale

**[HIG-sourced]** Apple's Dynamic Type scale at the default ("Large") size:

| Style | Size | Line height | Typical weight |
|---|---|---|---|
| Large Title | 34pt | 41pt | Regular (Bold only for rare hero moments) |
| Title 1 | 28pt | 34pt | Regular |
| Title 2 | 22pt | 28pt | Regular |
| Title 3 | 20pt | 25pt | Regular |
| Headline | 17pt | 22pt | Semibold |
| Body | 17pt | 22pt | Regular |
| Callout | 16pt | 21pt | Regular |
| Subhead | 15pt | 20pt | Regular |
| Footnote | 13pt | 18pt | Regular |
| Caption 1 | 12pt | 16pt | Regular |
| Caption 2 | 11pt | 13pt | Regular |

**[Web adaptation]** This site is fully responsive (not fixed-point like native iOS/macOS), so each row becomes a fluid `clamp()` custom property instead of a fixed px value — same ratios, scales with viewport instead of breaking at fixed breakpoints:

```css
:root {
  --type-large-title: clamp(1.75rem, 1.4rem + 1.5vw, 2.125rem); /* 28px → 34px */
  --type-title-1:     clamp(1.5rem, 1.25rem + 1vw, 1.75rem);    /* 24px → 28px */
  --type-title-2:     clamp(1.25rem, 1.1rem + 0.6vw, 1.375rem); /* 20px → 22px */
  --type-title-3:     clamp(1.125rem, 1rem + 0.5vw, 1.25rem);   /* 18px → 20px */
  --type-headline:    1.0625rem;  /* 17px, fixed — matches HIG legibility floor */
  --type-body:        1.0625rem;  /* 17px */
  --type-callout:     1rem;       /* 16px */
  --type-subhead:     0.9375rem;  /* 15px */
  --type-footnote:    0.8125rem;  /* 13px */
  --type-caption-1:   0.75rem;    /* 12px */
  --type-caption-2:   0.6875rem;  /* 11px */
}
```

## Weight usage

**[HIG-sourced, supersedes old rule]** The previous project rule ("only 400 or 700, never 500/600") is **retracted** — Apple's own Headline style is Semibold (600), not Bold. Correct rule:

- **Regular (400)** — body copy, captions, subheads
- **Semibold (600)** — headlines, active/emphasized states, nav labels
- **Bold (700)** — reserved for rare hero display moments (a page's single large title), not general emphasis

Never use weights outside this set (no 300, 500, 800, 900) — Apple's own interfaces don't either.

## Tracking (letter-spacing)

**[HIG-sourced]** Apple tightens tracking at large display sizes and loosens (or leaves neutral) at small sizes — never a single fixed value everywhere:

| Size range | Tracking |
|---|---|
| Large Title / Title 1 (28px+) | `-0.02em` to `-0.03em` |
| Title 2 / Title 3 (20-22px) | `-0.01em` to `-0.02em` |
| Headline / Body / Callout (16-17px) | `0` |
| Subhead / Footnote (13-15px) | `0` |
| Caption 1 / Caption 2 (11-12px) | `+0.01em` (slight opening for legibility at small size) |

## Accessibility

**[HIG-sourced]** Use `rem` units, never hardcode `px` for font-size — this respects the user's OS/browser text-size preference (the web equivalent of Dynamic Type). Never lock a component's font size below the 17px/1.0625rem Body legibility floor for primary reading content.

## Sources

- [Typography — Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/typography)
- [The details of UI typography — WWDC20](https://developer.apple.com/videos/play/wwdc2020/10175/)
