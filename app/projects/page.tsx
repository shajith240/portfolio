'use client'

import { motion, useReducedMotion } from 'framer-motion'
import Image from 'next/image'
import { PROJECTS, type Project } from '@/data/projects'
import { mascotTarget } from '@/lib/mascotTargets'

/* Projects — one featured project, then the rest as a calm list.

   Performance notes (measured, see the rules in app/globals.css):
   - No useLayout()/useShellMetrics(). Every breakpoint is a CSS media
     query, so resizing the window (a maximize spring fires a resize on
     every frame) never re-renders this page.
   - No per-card motion, shadows, will-change or hover transforms. The
     only authored motion is one fade-and-rise of the page on mount.
   - Covers are WebP at <=1600px; only the featured one preloads. */

// Staggered-entrance easing from docs/design-system/motion.md.
const EASE_OUT = [0, 0, 0.58, 1] as const

const GITHUB_PROFILE = 'https://github.com/shajith240'

/** "resume feedback community" → "Resume feedback community" */
const sentence = (text: string) => (text ? text[0].toUpperCase() + text.slice(1) : text)

/* ─────────────────────────────────────────────────────────────────
   ProjectCover — the screenshot, or (when a project has none yet) a
   designed cover tile in its place. The tile fills the exact same box
   the image would, so nothing shifts when a screenshot is added later.
   Calm by design: a near-black gradient with a faint, per-project tint
   (hue derived from the title, so it's stable across renders), a dot
   grid that fades out, the project's main stack item as a badge, and a
   centred monogram tile with the title and `sub` label beneath it.
   ───────────────────────────────────────────────────────────────── */

function titleHue(title: string) {
  let h = 0
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) % 360
  return h
}

/** "IntelliDesk" → "I", "WIFI-AUTOMATION" → "WA", "Invoice Processing System" → "IP". */
function monogram(title: string) {
  const words = title.split(/[\s\-_]+/).filter(Boolean)
  return words.slice(0, 2).map(w => w[0].toUpperCase()).join('')
}

function ProjectCover({
  project,
  sizes,
  variant,
}: {
  project: Project
  sizes: string
  variant: 'featured' | 'grid'
}) {
  if (project.image) {
    return (
      <Image
        src={project.image}
        alt={project.title}
        fill
        sizes={sizes}
        // The featured cover is the first thing on screen; everything
        // else waits until it's scrolled near.
        preload={variant === 'featured'}
        loading={variant === 'featured' ? undefined : 'lazy'}
        // Screenshots read from the top-left (logo, nav, headline), so
        // any crop to the frame's aspect trims the bottom/right instead.
        style={{ objectFit: 'cover', objectPosition: 'left top' }}
      />
    )
  }

  const hue = titleHue(project.title)
  const big = variant === 'featured'

  return (
    <div
      role="img"
      aria-label={`${project.title}: ${project.sub}`}
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: big ? '24px' : '18px',
        overflow: 'hidden',
        background: [
          `radial-gradient(120% 90% at 0% 0%, hsla(${hue}, 70%, 60%, 0.16) 0%, transparent 60%)`,
          `radial-gradient(90% 80% at 100% 100%, hsla(${(hue + 40) % 360}, 60%, 50%, 0.08) 0%, transparent 65%)`,
          'linear-gradient(160deg, #222224 0%, #18181a 55%, #141415 100%)',
        ].join(', '),
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Dot grid, fading out toward the lower left so the text sits on
          clean ground. Purely decorative. */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.07) 1px, transparent 1.2px)',
          backgroundSize: '16px 16px',
          maskImage: 'radial-gradient(90% 80% at 85% 15%, #000 0%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(90% 80% at 85% 15%, #000 0%, transparent 70%)',
        }}
      />

      {/* Main stack item, top-left like a file-type badge */}
      {project.tech[0] && (
        <span
          style={{
            position: 'absolute',
            top: big ? '20px' : '14px',
            left: big ? '20px' : '14px',
            fontSize: '11px',
            fontWeight: 500,
            color: 'rgba(255, 255, 255, 0.7)',
            background: 'rgba(255, 255, 255, 0.07)',
            border: '0.5px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '20px',
            padding: '4px 10px',
            whiteSpace: 'nowrap',
          }}
        >
          {project.tech[0]}
        </span>
      )}

      {/* Monogram squircle + title + sub label, centred like an app's
          cover art rather than a second copy of the card's text block */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          minWidth: 0,
          maxWidth: '100%',
        }}
      >
        <div
          aria-hidden
          style={{
            width: big ? '64px' : '52px',
            height: big ? '64px' : '52px',
            borderRadius: '24%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: big ? '16px' : '12px',
            fontSize: big ? '24px' : '19px',
            fontWeight: 600,
            letterSpacing: '-0.02em',
            color: 'rgba(255, 255, 255, 0.92)',
            background: `linear-gradient(145deg, hsla(${hue}, 55%, 58%, 0.55) 0%, hsla(${(hue + 30) % 360}, 50%, 34%, 0.55) 100%)`,
            boxShadow: [
              'inset 0 1px 0 rgba(255, 255, 255, 0.22)',
              'inset 0 0 0 0.5px rgba(255, 255, 255, 0.12)',
              '0 8px 24px rgba(0, 0, 0, 0.35)',
            ].join(', '),
          }}
        >
          {monogram(project.title)}
        </div>
        <div
          style={{
            fontSize: big ? '20px' : '16px',
            fontWeight: 600,
            letterSpacing: '-0.01em',
            lineHeight: 1.2,
            color: 'rgba(255, 255, 255, 0.92)',
            overflowWrap: 'anywhere',
          }}
        >
          {project.title}
        </div>
        <div
          style={{
            marginTop: '3px',
            fontSize: big ? '13px' : '12px',
            color: 'rgba(255, 255, 255, 0.5)',
          }}
        >
          {project.sub}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   Actions — Live first (recruiters want the demo), then the code.
   ───────────────────────────────────────────────────────────────── */

function Actions({ project, size }: { project: Project; size: 'lg' | 'sm' }) {
  if (!project.live && !project.github) return null
  return (
    <div className="pj-actions">
      {project.live && (
        <a
          href={project.live}
          data-mascot-link="live"
          target="_blank"
          rel="noopener noreferrer"
          className={`pj-btn pj-btn-primary pj-btn-${size}`}
          aria-label={`${project.title}: live demo (opens in a new tab)`}
        >
          Live <span aria-hidden>↗</span>
        </a>
      )}
      {project.github && (
        <a
          href={project.github}
          data-mascot-link="code"
          target="_blank"
          rel="noopener noreferrer"
          className={`pj-btn pj-btn-secondary pj-btn-${size}`}
          aria-label={`${project.title}: source code on GitHub (opens in a new tab)`}
        >
          Code
        </a>
      )}
    </div>
  )
}

const Stack = ({ tech }: { tech: string[] }) =>
  tech.length > 0 ? <p className="pj-stack">{tech.join('  ·  ')}</p> : null

/* ─────────────────────────────────────────────────────────────────
   FeaturedProject — copy, then cover; side by side on desktop
   ───────────────────────────────────────────────────────────────── */

function FeaturedProject({ project }: { project: Project }) {
  return (
    <article className="pj-featured" data-mascot={mascotTarget('project', project.title)}>
      {/* Copy first: the name, the pitch and the Live button land in the
          first screenful of a 900px window and of a phone; the cover
          follows (to the right of the copy on desktop). */}
      <div className="pj-featured-body">
        <p className="pj-eyebrow">
          <span className="pj-eyebrow-accent">Featured</span> · {sentence(project.sub)}
        </p>
        <h2 className="pj-featured-title">{project.title}</h2>
        <p className="pj-desc">{project.description}</p>
        <Stack tech={project.tech} />
        <Actions project={project} size="lg" />
      </div>
      <div className="pj-cover">
        <ProjectCover
          project={project}
          sizes="(min-width: 1024px) 640px, (min-width: 640px) 90vw, 100vw"
          variant="featured"
        />
      </div>
    </article>
  )
}

/* ─────────────────────────────────────────────────────────────────
   ProjectRow — thumbnail + copy, hairline-separated
   ───────────────────────────────────────────────────────────────── */

function ProjectRow({ project }: { project: Project }) {
  return (
    <li className="pj-row" data-mascot={mascotTarget('project', project.title)}>
      <div className="pj-cover">
        <ProjectCover
          project={project}
          sizes="(min-width: 1024px) 300px, (min-width: 640px) 240px, 100vw"
          variant="grid"
        />
      </div>
      <div className="pj-row-body">
        <p className="pj-eyebrow">{sentence(project.sub)}</p>
        <h3 className="pj-row-title">{project.title}</h3>
        <p className="pj-desc">{project.description}</p>
        <div className="pj-row-foot">
          <Stack tech={project.tech} />
          <Actions project={project} size="sm" />
        </div>
      </div>
    </li>
  )
}

/* ─────────────────────────────────────────────────────────────────
   Page
   ───────────────────────────────────────────────────────────────── */

export default function ProjectsPage() {
  const reduceMotion = useReducedMotion()
  const featured = PROJECTS.find(p => p.type === 'featured') ?? PROJECTS[0]
  const rest = PROJECTS.filter(p => p !== featured)

  return (
    <div className="pj-scroll">
      {/* One entrance for the whole page, once. Reduced motion: a plain
          150ms cross-fade, no travel. */}
      <motion.div
        className="pj-page"
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduceMotion ? { duration: 0.15 } : { duration: 0.45, ease: EASE_OUT }}
      >
        <header className="pj-header">
          <div>
            <h1 className="pj-title">Projects</h1>
            <p className="pj-lede">Work I&apos;ve shipped and open-sourced.</p>
          </div>
          <a href={GITHUB_PROFILE} target="_blank" rel="noopener noreferrer" className="pj-all">
            All repos ›
          </a>
        </header>

        {featured && <FeaturedProject project={featured} />}

        {rest.length > 0 && (
          <section aria-labelledby="pj-more">
            <h2 id="pj-more" className="pj-section-title">
              More projects
            </h2>
            <ul className="pj-list">
              {rest.map(p => (
                <ProjectRow key={p.id} project={p} />
              ))}
            </ul>
          </section>
        )}
      </motion.div>
    </div>
  )
}
