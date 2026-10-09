'use client'

import { useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { CATEGORIES, projectsUsing, type SkillIcon } from '@/data/skills'
import { PROJECTS, type Project } from '@/data/projects'
import { AI_TOOLS } from '@/data/aiTools'
import { mascotTarget } from '@/lib/mascotTargets'

/* Skills — built for a recruiter's ten-second scan, and for the
   question that follows it: "what did they actually build with this?"

   1. Core stack: a bento of the five things I build with most. Each
      tile carries the official logo on a faint glow of the brand's own
      colour, and names the shipped projects that use it (linked to
      their code). Proof, never a self-rating: no bars, stars or %.
   2. Toolkit: every skill as an identical tile (official logo on the
      same dark squircle, so the set reads as one family), grouped by
      what it's for. A project selector above it lights up exactly the
      skills that project used and dims the rest — the stack of any
      project in one click. Names are real DOM text (ATS, search, copy).
   3. AI assistants I use day to day, as one quiet line, kept apart
      from the stack: using them isn't a skill, building with them
      (AI & Automation) is.

   Logos: public/logos (Devicon, Simple Icons; see its README). Same
   performance rules as the Projects page: breakpoints are CSS (.sk-*
   in app/globals.css); the only JS-driven motion is the entrance and
   the selector's sliding highlight. */

const EASE_OUT = [0, 0, 0.58, 1] as const

const CORE = CATEGORIES.flatMap((c) => c.icons.filter((s) => s.core).map((s) => ({ skill: s, category: c.label })))

// Projects that use at least one listed skill, in data/projects.ts order.
const SELECTABLE = PROJECTS.filter((p) => CATEGORIES.some((c) => c.icons.some((s) => projectsUsing(s).includes(p))))

/** A logo shipped in public/logos. Plain <img>: they're tiny SVGs, and
 *  next/image would rasterize them for nothing. */
const Logo = ({ skill, size }: { skill: SkillIcon; size: number }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={skill.logo} alt="" width={size} height={size} className="sk-logo" draggable={false} />
)

function CoreTile({ skill, category, wide }: { skill: SkillIcon; category: string; wide: boolean }) {
  const proof = projectsUsing(skill)
  return (
    <li
      className={`sk-bento-tile${wide ? ' is-wide' : ''}`}
      style={{ '--sk-tint': skill.tint ?? '#8e8e93' } as React.CSSProperties}
    >
      <div className="sk-bento-head">
        <Logo skill={skill} size={wide ? 52 : 44} />
        <span className="sk-bento-count">
          {proof.length} {proof.length === 1 ? 'project' : 'projects'}
        </span>
      </div>
      <div>
        <h3 className="sk-bento-name">{skill.name}</h3>
        <p className="sk-bento-cat">{category}</p>
      </div>
      {proof.length > 0 && (
        <ul className="sk-bento-proof" aria-label={`Projects built with ${skill.name}`}>
          {proof.map((p) => (
            <li key={p.id}>
              <a
                href={p.github || p.live}
                target="_blank"
                rel="noopener noreferrer"
                data-mascot-link={p.github ? 'code' : 'live'}
                className="sk-pill"
              >
                {p.title}
              </a>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

function ProjectSelector({
  selected,
  onSelect,
  reduceMotion,
}: {
  selected: Project | null
  onSelect: (p: Project | null) => void
  reduceMotion: boolean
}) {
  const options: (Project | null)[] = [null, ...SELECTABLE]
  return (
    <div className="sk-selector" role="radiogroup" aria-label="Highlight the skills used by a project">
      {options.map((p) => {
        const active = p === selected
        return (
          <button
            key={p?.id ?? 'all'}
            role="radio"
            aria-checked={active}
            className={`sk-seg${active ? ' is-active' : ''}`}
            onClick={() => onSelect(p)}
          >
            {active && (
              <motion.span
                layoutId="sk-seg-highlight"
                className="sk-seg-bg"
                transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 36, mass: 0.8 }}
              />
            )}
            <span className="sk-seg-label">{p ? p.title : 'All skills'}</span>
          </button>
        )
      })}
    </div>
  )
}

function SkillTile({ skill, state }: { skill: SkillIcon; state: 'plain' | 'on' | 'off' }) {
  const usedIn = projectsUsing(skill)
    .map((p) => p.title)
    .join(', ')
  return (
    <li className={`sk-tile is-${state}`} title={usedIn ? `Used in ${usedIn}` : undefined}>
      <span className="sk-tile-icon">
        <Logo skill={skill} size={34} />
      </span>
      <span className="sk-tile-name">{skill.name}</span>
    </li>
  )
}

export default function SkillsPage() {
  const reduceMotion = !!useReducedMotion()
  const [selected, setSelected] = useState<Project | null>(null)

  // The selected project's skills, by name.
  const lit = useMemo(() => {
    if (!selected) return null
    const names = new Set<string>()
    for (const c of CATEGORIES) for (const s of c.icons) if (projectsUsing(s).includes(selected)) names.add(s.name)
    return names
  }, [selected])

  return (
    <div className="pj-scroll">
      <motion.div
        className="pj-page sk-page"
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduceMotion ? { duration: 0.15 } : { duration: 0.45, ease: EASE_OUT }}
      >
        <header className="pj-header">
          <div>
            <h1 className="pj-title">Skills</h1>
            <p className="pj-lede">What I build with, and where you can see it.</p>
          </div>
        </header>

        <section aria-labelledby="sk-core">
          <h2 id="sk-core" className="sk-section-title">
            Core stack
          </h2>
          <ul className="sk-bento">
            {CORE.map(({ skill, category }, i) => (
              <CoreTile key={skill.name} skill={skill} category={category} wide={i < 2} />
            ))}
          </ul>
        </section>

        <section aria-labelledby="sk-all" className="sk-toolkit">
          <div className="sk-toolkit-head">
            <h2 id="sk-all" className="sk-section-title">
              Toolkit
            </h2>
            <p className="sk-hint" aria-live="polite">
              {selected
                ? `${selected.title} uses ${lit?.size ?? 0} of these.`
                : 'Pick a project to see what it was built with.'}
            </p>
          </div>

          <ProjectSelector selected={selected} onSelect={setSelected} reduceMotion={reduceMotion} />

          <div className="sk-groups">
            {CATEGORIES.map((cat) => (
              <div key={cat.label} className="sk-group" data-mascot={mascotTarget('skills', cat.label)}>
                <div>
                  <h3 className="sk-group-name">{cat.label}</h3>
                  <p className="sk-group-blurb">{cat.blurb}</p>
                </div>
                <ul className="sk-tiles">
                  {cat.icons.map((s) => (
                    <SkillTile key={s.name} skill={s} state={!lit ? 'plain' : lit.has(s.name) ? 'on' : 'off'} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {AI_TOOLS.length > 0 && (
          <p className="sk-ai">
            <span className="sk-ai-label">AI assistants I work with</span>
            {AI_TOOLS.map((t) => t.name).join(', ')}
          </p>
        )}
      </motion.div>
    </div>
  )
}
