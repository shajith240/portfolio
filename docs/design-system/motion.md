# Motion

> Read this before writing any Framer Motion `transition` or `variants` block.

## Apple's native spring reference values

**[HIG-sourced]** SwiftUI's system springs, for reference:

- `.spring()` (general-purpose) — `response: 0.55`, `dampingFraction: 0.825`
- `.interactiveSpring()` (gesture-driven, near-instant) — `response: 0.15`, `dampingFraction: 0.86`

Framer Motion doesn't use `response`/`dampingFraction` — it uses `stiffness`/`damping`/`mass`. There's no exact algebraic conversion between the two systems, so the presets below are tuned to *feel* equivalent, not derived by formula.

## Framer Motion presets for this codebase

**[Web adaptation]** These four presets are already in use and validated — standardize on them rather than inventing new stiffness/damping combinations per component:

```ts
export const SPRINGS = {
  // Panel/sheet entrance — settling-in feel, matches .spring()
  entrance: { type: "spring", stiffness: 520, damping: 44, mass: 0.85, restDelta: 0.01 },

  // Dock/floating-element entrance — soft bounce-in
  dockEntrance: { type: "spring", stiffness: 260, damping: 25, mass: 0.8 },

  // Tap/press feedback and hover reactions — matches .interactiveSpring()'s near-instant feel
  tapPress: { type: "spring", stiffness: 400, damping: 17 },
  iconActivate: { type: "spring", stiffness: 500, damping: 30 },

  // Shared layoutId transitions (e.g. an active-tab indicator sliding between positions)
  indicatorSlide: { type: "spring", stiffness: 350, damping: 30, mass: 0.8 },
} as const;
```

## Non-spring easing

**[HIG-sourced]** Use `easeOut` — `cubic-bezier(0, 0, 0.58, 1)` — for staggered fade/slide entrances where a spring would feel excessive (list items revealing in sequence, not a physical object settling):

```ts
transition: { duration: 0.4, ease: [0, 0, 0.58, 1] }
```

## Duration guidance

**[HIG-sourced]**

| Interaction | Duration | Curve |
|---|---|---|
| Micro (color/opacity on hover) | 150-220ms | ease |
| Sheet/overlay open | 200-340ms | spring (`entrance` or `dockEntrance`) |
| Staggered list reveal | 30-50ms delay between items | `easeOut` |

## Reduced motion

**[HIG-sourced]** `prefers-reduced-motion: reduce` → disable spring bounce/parallax/lensing entirely, replace with a plain opacity cross-fade at 150ms. Never fully remove feedback — accessibility means *no excess motion*, not *no motion at all*.

## Gesture rule

**[HIG-sourced]** Draggable elements (the project card strip) use `dragElastic` in the `0.12-0.15` range with momentum-based decay on release — never a hard stop at the drag constraint boundary.

## Sources

- [Motion — Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/motion)
- [spring(response:dampingFraction:blendDuration:) — Apple Developer Documentation](https://developer.apple.com/documentation/swiftui/animation/spring(response:dampingfraction:blendduration:))
- [interactiveSpring(response:dampingFraction:blendDuration:) — Apple Developer Documentation](https://developer.apple.com/documentation/swiftui/animation/interactivespring(response:dampingfraction:blendduration:))
