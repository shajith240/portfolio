'use client'

import { Fragment, useRef } from 'react'
import { motion, useReducedMotion, useScroll, useSpring } from 'framer-motion'
import Image from 'next/image'
import { mascotTarget } from '@/lib/mascotTargets'
// Single source shared with the mascot's knowledge pack and its
// "what is the visitor reading" ids — edit education there.
// TODO (in data/profile.ts): study period, GPA (only if you want it
// shown) and coursework are intentionally blank, not invented. Every
// optional field below renders nothing when it's empty.
import { EDUCATION, type EducationEntry } from '@/data/profile'
import { statusLine } from '@/lib/studyYear'
import { useStudyStatus } from '@/lib/useStudyStatus'
import './education.css'

/* Education — the path so far as a timeline, newest first: the current
   degree as a photo card (campus hero with the emblem, name and place
   over it, then the degree), any break between schools, then the
   schools as compact cards with their results — and the photo credit the licence asks for.

   Like the Projects page: no useLayout()/useShellMetrics(); every
   breakpoint is a CSS media query in ./education.css, so resizing the
   window never re-renders this page. */

// Staggered-entrance easing from docs/design-system/motion.md.
const EASE_OUT = [0, 0, 0.58, 1] as const

/** "2024 – 2028" → ["2024", "2028"], "2023" → ["2023", undefined]. */
const yearsOf = (period: string) => {
  const [from, to] = period.match(/\d{4}/g) ?? []
  return [from ?? '', to] as const
}

/** "https://www.iitism.ac.in/" → "iitism.ac.in" */
const hostOf = (url: string) => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')

const PinIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden style={{ flexShrink: 0 }}>
    <path
      fill="currentColor"
      d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z"
    />
  </svg>
)

/* ─────────────────────────────────────────────────────────────────
   Hero — the campus photo with a slow Ken Burns drift (transform only,
   so it's pure compositing), a scrim for legibility, and the emblem
   roundel + name + place over its lower edge.
   ───────────────────────────────────────────────────────────────── */

function Hero({ entry, reduceMotion }: { entry: EducationEntry; reduceMotion: boolean }) {
  const { photo, logo, location } = entry
  return (
    <div className="ed-hero">
      {photo && (
        <motion.div
          className="ed-hero-photo"
          initial={reduceMotion ? false : { scale: 1.08 }}
          animate={reduceMotion ? undefined : { scale: [1.08, 1.02] }}
          transition={
            reduceMotion
              ? undefined
              : { duration: 22, ease: 'easeInOut', repeat: Infinity, repeatType: 'mirror' }
          }
        >
          <Image
            src={photo.src}
            alt={photo.alt}
            fill
            preload
            sizes="(min-width: 1040px) 1024px, 100vw"
            style={{ objectFit: 'cover', objectPosition: 'center 55%' }}
          />
        </motion.div>
      )}
      <div className="ed-hero-scrim" aria-hidden />

      {photo?.caption && (
        <span className="ed-hero-badge" aria-hidden>
          {photo.caption}
        </span>
      )}

      <div className="ed-hero-id">
        {logo && (
          <motion.div
            className="ed-roundel"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={
              reduceMotion
                ? { duration: 0.15 }
                : { type: 'spring', stiffness: 260, damping: 25, mass: 0.8, delay: 0.15 }
            }
          >
            <Image src={logo.src} alt={logo.alt} width={logo.width ?? 64} height={logo.height ?? 64} unoptimized />
          </motion.div>
        )}
        <div style={{ minWidth: 0 }}>
          <h2 className="ed-name">{entry.institution}</h2>
          {location && (
            <p className="ed-place">
              <PinIcon />
              {location}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   Institution card — hero, then degree, status, period and the site
   link. Coursework and details only appear when they're filled in.
   ───────────────────────────────────────────────────────────────── */

function InstitutionCard({
  entry,
  reduceMotion,
  isCurrent,
}: {
  entry: EducationEntry
  reduceMotion: boolean
  isCurrent: boolean
}) {
  const coursework = entry.coursework ?? []
  // Only the current degree (the one with the live dot) has a status;
  // it's worked out from the date, never typed in.
  const study = useStudyStatus()
  const status = isCurrent ? statusLine(study) : ''

  return (
    <article
      className="ed-card"
      data-mascot={mascotTarget('education', entry.institution)}
    >
      <Hero entry={entry} reduceMotion={reduceMotion} />

      <div className="ed-body">
        <div style={{ minWidth: 0 }}>
          <p className="ed-eyebrow">{[entry.level, entry.period].filter(Boolean).join(' · ')}</p>
          <h3 className="ed-degree">{entry.degree}</h3>
          {status && (
            <ul className="ed-meta" aria-label="Status">
              <li className="ed-chip">
                {status}
              </li>
            </ul>
          )}
        </div>

        {entry.url && (
          <a
            className="ed-link"
            href={entry.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${entry.institution} website, ${hostOf(entry.url)} (opens in a new tab)`}
          >
            {hostOf(entry.url)} <span aria-hidden>↗</span>
          </a>
        )}

        {entry.details.length > 0 && (
          <div className="ed-details">
            <h4 className="ed-details-title">Highlights</h4>
            <ul>
              {entry.details.map(d => (
                <li key={d} className="ed-chip">
                  {d}
                </li>
              ))}
            </ul>
          </div>
        )}

        {coursework.length > 0 && (
          <div className="ed-details">
            <h4 className="ed-details-title">Coursework</h4>
            <ul>
              {coursework.map(c => (
                <li key={c} className="ed-chip">
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </article>
  )
}

/* ─────────────────────────────────────────────────────────────────
   School card — the earlier stops: no photo, just who, what, when, and
   the result set large on the right, like a stat.
   ───────────────────────────────────────────────────────────────── */

function SchoolCard({ entry }: { entry: EducationEntry }) {
  const meta = [entry.board, entry.location].filter(Boolean).join(' · ')
  return (
    <article className="ed-school" data-mascot={mascotTarget('education', entry.institution)}>
      <div className="ed-school-main">
        <p className="ed-eyebrow">{[entry.level, entry.period].filter(Boolean).join(' · ')}</p>
        <h3 className="ed-school-name">{entry.institution}</h3>
        <p className="ed-school-degree">{entry.degree}</p>
        {meta && <p className="ed-school-meta">{meta}</p>}
        {entry.details.length > 0 && (
          <ul className="ed-meta" aria-label="Highlights">
            {entry.details.map(d => (
              <li key={d} className="ed-chip">
                {d}
              </li>
            ))}
          </ul>
        )}
      </div>
      {entry.score && (
        <p className="ed-score">
          <span className="ed-score-value">{entry.score}</span>
          {entry.scoreDetail && <span className="ed-score-detail">{entry.scoreDetail}</span>}
        </p>
      )}
    </article>
  )
}

/* ─────────────────────────────────────────────────────────────────
   Page
   ───────────────────────────────────────────────────────────────── */

export default function EducationPage() {
  const reduceMotion = !!useReducedMotion()
  const credited = EDUCATION.filter(e => e.photoCredit)

  // One fade-and-rise per block, staggered. Reduced motion: a plain
  // 150ms cross-fade, no travel.
  const reveal = (i: number) => ({
    initial: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: reduceMotion ? { duration: 0.15 } : { duration: 0.45, ease: EASE_OUT, delay: i * 0.06 },
  })

  // Scroll-linked: the rail fills from the top as the timeline passes
  // through the viewport, sprung so it glides rather than ticks with
  // each wheel notch. Cards rise into view once, as they enter.
  const scrollRef = useRef<HTMLDivElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    container: scrollRef,
    target: timelineRef,
    offset: ['start 0.8', 'end 0.7'],
  })
  const railProgress = useSpring(scrollYProgress, { stiffness: 220, damping: 40, restDelta: 0.001 })
  const inView = {
    initial: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 28 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { root: scrollRef, once: true, amount: 0.2 },
    transition: reduceMotion ? { duration: 0.15 } : { duration: 0.6, ease: EASE_OUT },
  }

  return (
    <div ref={scrollRef} className="ed-scroll">
      <main className="ed-page">
        <motion.header className="ed-header" {...reveal(0)}>
          <h1 className="ed-title">Education</h1>
          <p className="ed-lede">From a government school in Rangampeta to IIT (ISM) Dhanbad.</p>
        </motion.header>

        {/* The path, newest first. Each stop is anchored by its year
            (pinned beside its card while the card scrolls past), along a
            hairline that draws itself as the visitor scrolls down it.
            The current degree gets the photo card; schools get compact
            cards; a break (the prep year) is a dashed stretch with a
            note. */}
        <div ref={timelineRef} className="ed-timeline">
        <div aria-hidden className="ed-rail">
          <motion.span className="ed-rail-fill" style={{ scaleY: reduceMotion ? 1 : railProgress }} />
        </div>
        <ol className="ed-steps">
          {EDUCATION.map((e, i) => {
            const [year, until] = yearsOf(e.period)
            return (
              <Fragment key={e.institution}>
                <motion.li className="ed-step" {...inView}>
                  <p className="ed-year">
                    <span className="ed-year-num">{year}</span>
                    {until && <span className="ed-year-sub">to {until}</span>}
                  </p>
                  {e.photo ? (
                    <InstitutionCard entry={e} reduceMotion={reduceMotion} isCurrent={i === 0} />
                  ) : (
                    <SchoolCard entry={e} />
                  )}
                </motion.li>
                {e.precededBy && (
                  <motion.li className="ed-step ed-step-break" {...inView}>
                    <span aria-hidden />
                    <p className="ed-break">
                      <span className="ed-break-label">
                        {e.precededBy.label} · {e.precededBy.period}
                      </span>
                      {e.precededBy.note && <span className="ed-break-note">{e.precededBy.note}</span>}
                    </p>
                  </motion.li>
                )}
              </Fragment>
            )
          })}
        </ol>
        </div>

        {credited.length > 0 && (
          <motion.footer {...inView}>
            {credited.map(e => {
              const c = e.photoCredit!
              return (
                <p key={e.institution} className="ed-credit">
                  Photo:{' '}
                  <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer">
                    {c.title}
                  </a>{' '}
                  by{' '}
                  {c.authorUrl ? (
                    <a href={c.authorUrl} target="_blank" rel="noopener noreferrer">
                      {c.author}
                    </a>
                  ) : (
                    c.author
                  )}
                  ,{' '}
                  {c.licenseUrl ? (
                    <a href={c.licenseUrl} target="_blank" rel="noopener noreferrer">
                      {c.license}
                    </a>
                  ) : (
                    c.license
                  )}
                  {c.via ? `, via ${c.via}` : ''}.{e.logo ? ` Emblem © ${e.institution}.` : ''}
                </p>
              )
            })}
          </motion.footer>
        )}
      </main>
    </div>
  )
}
