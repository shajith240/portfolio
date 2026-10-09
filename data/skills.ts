import { PROJECTS, type Project } from './projects.ts'

export interface SkillIcon {
  name: string
  /** Official logo in public/logos (Devicon / Simple Icons; see
   *  public/logos/README.md). The Skills page draws these. */
  logo: string
  /** macOS-style app icon in public/icons (without .png), for Finder's
   *  Skills folder; omitted when there isn't one (Finder falls back). */
  file?: string
  search: string
  /** Part of the core stack: shown first, as a card with its proof. */
  core?: boolean
  /** Brand colour for the core card's glow. */
  tint?: string
  /** The labels this skill goes by in data/projects.ts `tech` (defaults
   *  to [name]) — how the Skills page finds the projects that prove it. */
  uses?: string[]
}

export interface SkillCategory {
  label: string
  /** One plain line under the label on the Skills page. */
  blurb: string
  icons: SkillIcon[]
}

// Shared by app/skills/page.tsx, FinderApp.tsx, the mascot and the site
// metadata — a single source of truth. Grouped by what the skills are
// for, not by type, because that's how a recruiter reads a stack. No
// proficiency scores anywhere: the proof is the projects each skill
// links to (projectsUsing), which come from data/projects.ts.
export const CATEGORIES: SkillCategory[] = [
  {
    label: 'Languages',
    blurb: 'What I write in.',
    icons: [
      { name: 'TypeScript', logo: '/logos/typescript.svg', tint: '#3178C6', file: 'typescript', search: 'typescript ts', core: true },
      { name: 'Python', logo: '/logos/python.svg', tint: '#3776AB', file: 'python',     search: 'python py', core: true },
      { name: 'JavaScript', logo: '/logos/javascript.svg', file: 'javascript', search: 'javascript js' },
      { name: 'Java', logo: '/logos/java.svg', file: 'java',       search: 'java' },
      { name: 'C', logo: '/logos/c.svg', file: 'c',          search: 'c' },
    ],
  },
  {
    label: 'Frontend',
    blurb: 'Interfaces, from landing pages to full apps.',
    icons: [
      { name: 'React', logo: '/logos/react.svg', tint: '#61DAFB', file: 'react', search: 'react', core: true },
      { name: 'Next.js', logo: '/logos/nextjs.svg', tint: '#A1A1AA', search: 'next nextjs next.js react framework', core: true },
      { name: 'Tailwind CSS', logo: '/logos/tailwindcss.svg', search: 'tailwind tailwindcss css', uses: ['Tailwind'] },
      { name: 'HTML', logo: '/logos/html5.svg', file: 'html', search: 'html' },
      { name: 'CSS', logo: '/logos/css3.svg', file: 'css',  search: 'css' },
    ],
  },
  {
    label: 'Backend & Data',
    blurb: 'Servers, APIs and the data behind them.',
    icons: [
      { name: 'Node.js', logo: '/logos/nodejs.svg', tint: '#5FA04E', file: 'nodejs',   search: 'node nodejs', core: true },
      { name: 'Supabase', logo: '/logos/supabase.svg', search: 'supabase postgres auth backend' },
      { name: 'PostgreSQL', logo: '/logos/postgresql.svg', file: 'postgres', search: 'postgresql postgres sql database' },
      { name: 'MongoDB', logo: '/logos/mongodb.svg', file: 'mongo_db', search: 'mongodb mongo nosql database' },
      { name: 'WebSockets', logo: '/logos/websockets.svg', search: 'websocket websockets realtime', uses: ['WebSocket'] },
    ],
  },
  {
    label: 'AI & Automation',
    blurb: 'LLM-powered agents and workflows.',
    icons: [
      { name: 'Claude API', logo: '/logos/claude.svg', file: 'claude', search: 'claude api anthropic llm ai agent', uses: ['Claude API'] },
      { name: 'Machine Learning', logo: '/logos/machine-learning.svg', search: 'machine learning ml nlp', uses: ['Machine Learning', 'NLP'] },
      { name: 'n8n', logo: '/logos/n8n.svg', file: 'N8N',    search: 'n8n workflow automation' },
    ],
  },
  {
    label: 'Tools',
    blurb: 'How the work gets built and shipped.',
    icons: [
      { name: 'Git', logo: '/logos/git.svg', file: 'git',    search: 'git' },
      { name: 'GitHub', logo: '/logos/github.svg', file: 'github', search: 'github' },
      { name: 'Docker', logo: '/logos/docker.svg', file: 'docker', search: 'docker container devops' },
      { name: 'Linux', logo: '/logos/linux.webp', file: 'linux',  search: 'linux ubuntu' },
      { name: 'VS Code', logo: '/logos/vscode.svg', file: 'vscode', search: 'vscode vs code editor' },
    ],
  },
]

/** The projects in data/projects.ts that use this skill. */
export function projectsUsing(skill: SkillIcon): Project[] {
  const labels = skill.uses ?? [skill.name]
  return PROJECTS.filter((p) => p.tech.some((t) => labels.includes(t)))
}
