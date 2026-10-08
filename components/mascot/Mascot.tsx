'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { CSSProperties } from 'react'

const REACTIONS = [
  'blink',
  'heart',
  'sparkle',
  'surprised',
  'wink',
  'bashful',
  'sleepy',
  'dizzy',
  'delighted',
] as const

type Reaction = (typeof REACTIONS)[number]

/** The nine expressions, in sheet order. `wink` is drawn as star eyes on the default set. */
export type Expression = Reaction

// The pointer sets a target; a spring pulls the aim toward it. The aim is a vector whose
// length runs 0 (looking at you) to 1 (fully turned), so the centre is a gradient rather
// than a hard dead zone: the head eases back to facing you as the pointer comes close.
const NEAR = 40
const FAR = 170
// Which frame to show is a ring (how far the head is turned) and one of eight directions.
// A 3x3 sheet has one ring of full turns; a 5x5 sheet adds an inner ring of small glances,
// so the head passes centre -> glance -> full turn instead of jumping straight across.
// Ring edges are aim lengths; each holds until the aim is well past it, so the head does
// not flicker between two frames when the pointer rests on a boundary.
const RINGS: Record<number, number[]> = { 1: [0.36], 2: [0.3, 0.68] }
const RING_HYSTERESIS = 0.05
// Clockwise from the right, matching atan2 with y pointing down.
const COMPASS = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
] as const
const SECTOR = (Math.PI * 2) / COMPASS.length
const SECTOR_HYSTERESIS = 0.12
const STIFFNESS = 140
const DAMPING = 19 // a touch under critical (2 * sqrt(140) = 23.7), for a small settle
const REST = 0.0015
const MAX_STEP = 1 / 30

// The continuous part of the motion. Frames only change at cell edges, so a lean that
// tracks the aim every frame is what keeps the head from ever looking still and then
// jumping. Pixel offsets are at the default 140px and scale with size.
const LEAN_DEG = 4
const LEAN_X = 3
const LEAN_Y = 2
const FADE_MS = 90
const REACTION_IN_MS = 60
const REACTION_OUT_MS = 140
const BREATH_MS = 3600
const SLEEP_BREATH_RATE = 0.5
const APPEAR_MS = 220

// Expressions are drawn facing the viewer, so the head turns to the front before one shows.
// If the turn has not landed by this point, show it anyway rather than keep anyone waiting.
const FACE_TIMEOUT_MS = 350
const REACT_MS = 900
const WAKE_MS = 520
// A tap has no hover to follow, so the head looks at it for a moment and then comes back.
const TAP_HOLD_MS = 2500

const PAYOFFS: Reaction[] = ['heart', 'sparkle', 'delighted']
const BOOP_PAYOFF = 120
const BOOP_END = 560
const SQUASH_MS = 420
const DIZZY_AFTER = 4
const DIZZY_WINDOW = 1600
const DIZZY_END = 1100

const SQUASH: Keyframe[] = [
  { transform: 'scale(1, 1)', easing: 'ease-in' },
  { transform: 'scale(1.10, 0.86)', offset: 0.18, easing: 'ease-out' },
  { transform: 'scale(0.95, 1.08)', offset: 0.45, easing: 'ease-in-out' },
  { transform: 'scale(1.03, 0.97)', offset: 0.72, easing: 'ease-in-out' },
  { transform: 'scale(1, 1)' },
]

const BREATH: Keyframe[] = [{ transform: 'scale(1, 1)' }, { transform: 'scale(1.008, 1.016)' }]

// background-size n*100% makes each cell a clean step of 100/(n-1)% on both axes.
function position(index: number, n = 3) {
  const step = 100 / (n - 1)
  return `${(index % n) * step}% ${Math.floor(index / n) * step}%`
}

function cell(index: number, n = 3): CSSProperties {
  return { backgroundPosition: position(index, n) }
}

function wrap(angle: number) {
  return Math.atan2(Math.sin(angle), Math.cos(angle))
}

function smoothstep(from: number, to: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - from) / (to - from)))
  return t * t * (3 - 2 * t)
}

function layer(n = 3): CSSProperties {
  return {
    position: 'absolute',
    inset: 0,
    backgroundSize: `${n * 100}% ${n * 100}%`,
    backgroundRepeat: 'no-repeat',
  }
}

const fill: CSSProperties = {
  position: 'relative',
  display: 'block',
  width: '100%',
  height: '100%',
}

export type MascotProps = {
  /** The sheet of head directions, looking straight out from its centre cell. A served
   * path, or an imported image. */
  directions: string
  /** The 3x3 sheet of expressions. */
  reactions: string
  /** Cells per side of the directions sheet. 3: the centre and eight full turns. 5: the
   * same full turns on the outer ring's corners and edge midpoints, plus eight small
   * glances on the inner ring, so turning steps through a half-way frame. */
  grid?: 3 | 5
  size?: number
  className?: string
  /** What a screen reader calls it. */
  label?: string
}

/** Something to look at: an element (its centre, followed as the page scrolls) or a point
 * in viewport coordinates. */
export type LookTarget = Element | { x: number; y: number }

/** Commands for driving the mascot from the page, through a ref. */
export type MascotHandle = {
  /** Look at a target instead of the pointer, until release() or another lookAt(). */
  lookAt(target: LookTarget): void
  /** Go back to following the pointer, or facing the viewer if there is none. */
  release(): void
  /** Turn to face the viewer, then show an expression for `ms` (default 900). Wakes it. */
  react(expression: Expression, ms?: number): void
  /** Face the viewer and doze, breathing slowly, until wake(), react() or a click. */
  sleep(): void
  /** Wake with a short surprised look. Does nothing if it is not asleep. */
  wake(): void
  isSleeping(): boolean
}

type Step = readonly [Reaction, number]

type Engine = {
  hold(facing: boolean): void
  whenFacing(run: () => void): void
  focus(target: LookTarget | null): void
  breathRate(rate: number): void
}

export const Mascot = forwardRef<MascotHandle, MascotProps>(function Mascot(props, ref) {
  const { directions, reactions, grid = 3, size = 140, className, label = 'mascot' } = props

  const buttonRef = useRef<HTMLButtonElement>(null)
  const squashRef = useRef<HTMLSpanElement>(null)
  const breathRef = useRef<HTMLSpanElement>(null)
  const leanRef = useRef<HTMLSpanElement>(null)
  const baseRef = useRef<HTMLSpanElement>(null)
  const topRef = useRef<HTMLSpanElement>(null)
  const sizeRef = useRef(size)
  const engineRef = useRef<Engine | null>(null)
  const timersRef = useRef<number[]>([])
  const playRef = useRef(0)
  const sleepingRef = useRef(false)
  const boopsRef = useRef({ count: 0, at: 0 })
  const [reaction, setReaction] = useState<Reaction | null>(null)
  const [loaded, setLoaded] = useState<string | null>(null)
  const sheets = `${directions}\n${reactions}`
  const ready = loaded === sheets

  useEffect(() => {
    sizeRef.current = size
  }, [size])

  // Fade in once both sheets are decoded, so the mascot never appears half drawn and the
  // first click never waits on the expressions sheet.
  useEffect(() => {
    let cancelled = false
    const decode = (src: string) => {
      const image = new Image()
      image.src = src
      return image.decode().catch(() => undefined)
    }
    void Promise.all([decode(directions), decode(reactions)]).then(() => {
      if (!cancelled) {
        setLoaded(sheets)
      }
    })
    return () => {
      cancelled = true
    }
  }, [directions, reactions, sheets])

  useEffect(() => {
    const lean = leanRef.current
    const base = baseRef.current
    const top = topRef.current
    const button = buttonRef.current
    if (!lean || !base || !top || !button) {
      return
    }

    const fine = window.matchMedia('(hover: hover) and (pointer: fine)')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')

    let pointer: { x: number; y: number } | null = null
    let focus: LookTarget | null = null
    let holding = false
    let visible = true
    let waiting: Array<() => void> = []
    const aim = { x: 0, y: 0, vx: 0, vy: 0 }
    const target = { x: 0, y: 0 }
    let frame = -1
    let lastTime = 0
    const half = (grid - 1) / 2
    const centre = (grid * grid - 1) / 2
    let shown = centre
    // The frame actually on screen: during a fade `shown` is the one arriving, `landed`
    // the one still visible underneath. An expression waits until the front has landed.
    let landed = centre
    const edges = RINGS[half]
    let ring = 0
    let sector = 0
    let fadeTimer = 0
    let tapTimer = 0
    let faceTimer = 0
    let rate = 1

    base.style.backgroundPosition = position(centre, grid)
    top.style.backgroundPosition = position(centre, grid)

    const flush = () => {
      window.clearTimeout(faceTimer)
      const run = waiting
      waiting = []
      run.forEach((fn) => fn())
    }

    // The incoming frame fades in over the outgoing one, which stays fully opaque
    // underneath. Fading both at once would dip the shared body to ~75% opacity
    // mid-swap and the mascot would flicker.
    const land = (index: number) => {
      landed = index
      if (index === centre && waiting.length) {
        flush()
      }
    }

    const show = (index: number) => {
      if (index === shown) {
        return
      }
      shown = index
      window.clearTimeout(fadeTimer)

      if (reduced.matches) {
        base.style.backgroundPosition = position(index, grid)
        land(index)
        return
      }

      // A swap mid-fade: settle the base on whatever the top was fading toward first.
      if (top.style.opacity === '1') {
        base.style.backgroundPosition = top.style.backgroundPosition
      }
      top.style.transition = 'none'
      top.style.opacity = '0'
      top.style.backgroundPosition = position(index, grid)
      void top.offsetWidth
      top.style.transition = `opacity ${FADE_MS}ms linear`
      top.style.opacity = '1'

      fadeTimer = window.setTimeout(() => {
        base.style.backgroundPosition = position(index, grid)
        top.style.transition = 'none'
        top.style.opacity = '0'
        land(index)
      }, FADE_MS + 20)
    }

    const pick = () => {
      const strength = Math.hypot(aim.x, aim.y)
      while (ring < edges.length && strength > edges[ring] + RING_HYSTERESIS) {
        ring++
      }
      while (ring > 0 && strength < edges[ring - 1] - RING_HYSTERESIS) {
        ring--
      }

      // Hold the current direction until the aim is well past its sector's edge.
      const angle = Math.atan2(aim.y, aim.x)
      if (Math.abs(wrap(angle - sector * SECTOR)) > SECTOR / 2 + SECTOR_HYSTERESIS) {
        sector = (Math.round(angle / SECTOR) + COMPASS.length) % COMPASS.length
      }

      const [dx, dy] = COMPASS[sector]
      show((half + dy * ring) * grid + (half + dx * ring))
    }

    const pose = () => {
      if (reduced.matches) {
        lean.style.transform = ''
        return
      }
      const k = sizeRef.current / 140
      lean.style.transform =
        `translate3d(${(aim.x * LEAN_X * k).toFixed(2)}px, ${(aim.y * LEAN_Y * k).toFixed(2)}px, 0) ` +
        `rotate(${(aim.x * LEAN_DEG).toFixed(3)}deg)`
    }

    // Holding to face the viewer beats a lookAt target, which beats the pointer.
    const goal = (): { x: number; y: number } | null => {
      if (holding) {
        return null
      }
      if (focus instanceof Element) {
        if (!focus.isConnected) {
          focus = null
        } else {
          const box = focus.getBoundingClientRect()
          return { x: box.left + box.width / 2, y: box.top + box.height / 2 }
        }
      }
      return focus ?? pointer
    }

    const retarget = () => {
      const point = goal()
      if (!point) {
        target.x = target.y = 0
        return
      }
      const box = button.getBoundingClientRect()
      const dx = point.x - (box.left + box.width / 2)
      const dy = point.y - (box.top + box.height / 2)
      const distance = Math.hypot(dx, dy)
      const strength = smoothstep(NEAR, FAR, distance)
      target.x = distance ? (dx / distance) * strength : 0
      target.y = distance ? (dy / distance) * strength : 0
    }

    const tick = (now: number) => {
      const dt = Math.min(MAX_STEP, (now - lastTime) / 1000 || MAX_STEP)
      lastTime = now

      if (reduced.matches) {
        aim.x = target.x
        aim.y = target.y
        aim.vx = aim.vy = 0
      } else {
        // Semi-implicit Euler: stable at these stiffnesses for any frame time under MAX_STEP.
        aim.vx += (STIFFNESS * (target.x - aim.x) - DAMPING * aim.vx) * dt
        aim.vy += (STIFFNESS * (target.y - aim.y) - DAMPING * aim.vy) * dt
        aim.x += aim.vx * dt
        aim.y += aim.vy * dt
      }

      pose()
      pick()

      const settled =
        Math.abs(target.x - aim.x) < REST &&
        Math.abs(target.y - aim.y) < REST &&
        Math.abs(aim.vx) < REST &&
        Math.abs(aim.vy) < REST

      // Nothing is scheduled once the aim has settled, so a still page costs nothing. Off
      // screen it stops where it is; update() picks it up again when it scrolls back.
      frame = settled || !visible ? -1 : window.requestAnimationFrame(tick)
    }

    const run = () => {
      if (frame === -1) {
        lastTime = performance.now()
        frame = window.requestAnimationFrame(tick)
      }
    }

    const update = () => {
      retarget()
      // Off screen there is nothing to see, so the loop stays asleep until it scrolls back.
      if (visible) {
        run()
      }
    }

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') {
        return
      }
      pointer = { x: event.clientX, y: event.clientY }
      update()
    }

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && fine.matches) {
        return
      }
      pointer = { x: event.clientX, y: event.clientY }
      update()
      window.clearTimeout(tapTimer)
      tapTimer = window.setTimeout(() => {
        pointer = null
        update()
      }, TAP_HOLD_MS)
    }

    let breath: Animation | undefined
    const breathe = () => {
      breath?.cancel()
      breath = reduced.matches
        ? undefined
        : breathRef.current?.animate(BREATH, {
            duration: BREATH_MS,
            iterations: Infinity,
            direction: 'alternate',
            easing: 'ease-in-out',
          })
      breath?.updatePlaybackRate(rate)
      if (!visible) {
        breath?.pause()
      }
    }

    const onReducedChange = () => {
      breathe()
      pose()
    }

    const observer =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting
            if (visible) {
              breath?.play()
              update()
            } else {
              breath?.pause()
            }
          })
    observer?.observe(button)

    breathe()

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerdown', onPointerDown, { passive: true })
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update, { passive: true })
    reduced.addEventListener('change', onReducedChange)

    engineRef.current = {
      hold(facing) {
        holding = facing
        update()
      },
      whenFacing(fn) {
        if (shown === centre && landed === centre) {
          fn()
          return
        }
        waiting.push(fn)
        window.clearTimeout(faceTimer)
        faceTimer = window.setTimeout(flush, FACE_TIMEOUT_MS)
      },
      focus(next) {
        focus = next
        update()
      },
      breathRate(next) {
        rate = next
        breath?.updatePlaybackRate(next)
      },
    }

    return () => {
      engineRef.current = null
      observer?.disconnect()
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      reduced.removeEventListener('change', onReducedChange)
      window.cancelAnimationFrame(frame)
      window.clearTimeout(fadeTimer)
      window.clearTimeout(tapTimer)
      window.clearTimeout(faceTimer)
      breath?.cancel()
    }
  }, [grid])

  useEffect(() => {
    return () => {
      timersRef.current.forEach(window.clearTimeout)
    }
  }, [])

  // Every command reaches state only through refs and setReaction, which are stable, so
  // one set of commands, made on the first render, stays correct for the component's life.
  const [{ control, play }] = useState(() => {
    const clearTimers = () => {
      timersRef.current.forEach(window.clearTimeout)
      timersRef.current = []
    }

    // Turn to the front, then run the expressions in order. A newer play cancels an older
    // one, including one still waiting for the head to come round.
    const play = (steps: Step[], forever = false) => {
      clearTimers()
      const id = ++playRef.current
      const engine = engineRef.current
      engine?.hold(true)

      const start = () => {
        if (id !== playRef.current) {
          return
        }
        let at = 0
        steps.forEach(([next, ms], index) => {
          const show = () => setReaction(next)
          if (index === 0) {
            show()
          } else {
            timersRef.current.push(window.setTimeout(show, at))
          }
          at += ms
        })
        if (!forever) {
          timersRef.current.push(
            window.setTimeout(() => {
              setReaction(null)
              engineRef.current?.hold(false)
            }, at),
          )
        }
      }

      if (engine) {
        engine.whenFacing(start)
      } else {
        start()
      }
    }

    const rouse = () => {
      sleepingRef.current = false
      engineRef.current?.breathRate(1)
    }

    const control: MascotHandle = {
      lookAt(target) {
        engineRef.current?.focus(target)
      },
      release() {
        engineRef.current?.focus(null)
      },
      react(expression, ms = REACT_MS) {
        rouse()
        play([[expression, ms]])
      },
      sleep() {
        if (sleepingRef.current) {
          return
        }
        sleepingRef.current = true
        engineRef.current?.breathRate(SLEEP_BREATH_RATE)
        play([['sleepy', 0]], true)
      },
      wake() {
        if (!sleepingRef.current) {
          return
        }
        rouse()
        play([['surprised', WAKE_MS]])
      },
      isSleeping() {
        return sleepingRef.current
      },
    }

    return { control, play }
  })

  useImperativeHandle(ref, () => control, [control])

  const boop = () => {
    if (sleepingRef.current) {
      control.wake()
    } else {
      const now = Date.now()
      const boops = boopsRef.current
      boops.count = now - boops.at < DIZZY_WINDOW ? boops.count + 1 : 1
      boops.at = now

      if (boops.count >= DIZZY_AFTER) {
        boops.count = 0
        play([['dizzy', DIZZY_END]])
      } else {
        play([
          ['blink', BOOP_PAYOFF],
          [PAYOFFS[(boops.count - 1) % PAYOFFS.length], BOOP_END - BOOP_PAYOFF],
        ])
      }
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }

    // Per-keyframe easing with the effect itself linear: an easing on the effect
    // would reinterpret every offset and front-load the whole bounce.
    squashRef.current?.animate(SQUASH, { duration: SQUASH_MS, easing: 'linear' })
  }

  const facing = cell((grid * grid - 1) / 2, grid)

  // Inline styles so the file drops into any project without a CSS framework.
  // The two direction layers are positioned imperatively by the motion loop; their JSX
  // background-position never changes, so React never overwrites it on a re-render.
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={boop}
      aria-label={`Boop the ${label}`}
      className={className}
      style={{
        position: 'relative',
        display: 'block',
        flexShrink: 0,
        width: size,
        height: size,
        padding: 0,
        border: 0,
        background: 'transparent',
        appearance: 'none',
        cursor: 'pointer',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        opacity: ready ? 1 : 0,
        transition: `opacity ${APPEAR_MS}ms ease-out`,
      }}
    >
      <span ref={squashRef} style={{ ...fill, transformOrigin: '50% 78%' }}>
        <span ref={breathRef} style={{ ...fill, transformOrigin: '50% 100%' }}>
          <span ref={leanRef} style={{ ...fill, transformOrigin: '50% 85%', willChange: 'transform' }}>
            <span ref={baseRef} style={{ ...layer(grid), backgroundImage: `url(${directions})`, ...facing }} />
            <span
              ref={topRef}
              style={{ ...layer(grid), backgroundImage: `url(${directions})`, ...facing, opacity: 0 }}
            />
            <span
              style={{
                ...layer(),
                backgroundImage: `url(${reactions})`,
                ...cell(REACTIONS.indexOf(reaction ?? 'blink')),
                opacity: reaction ? 1 : 0,
                transition: `opacity ${reaction ? REACTION_IN_MS : REACTION_OUT_MS}ms ease-out`,
              }}
            />
          </span>
        </span>
      </span>
    </button>
  )
})
