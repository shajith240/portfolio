export interface Project {
  id: number
  type: 'featured' | 'image'
  title: string
  sub: string
  tech: string[]
  description: string
  github: string
  live: string
  image: string
}

export const PROJECTS: Project[] = [
  {
    id: 1,
    type: 'featured',
    title: 'Linted',
    sub: 'resume feedback community',
    tech: ['Next.js', 'React', 'TypeScript', 'Tailwind', 'Supabase'],
    description: 'Community app for human-powered resume feedback — upload a resume, get structured critiques from students, recruiters, and working professionals in threaded discussions, and build reviewer reputation through public profiles and a leaderboard.',
    github: 'https://github.com/shajith240/ResumeRoster',
    live: 'https://linted.space',
    image: '/project-photos/linted.png',
  },
  {
    id: 2,
    type: 'image',
    title: 'IntelliDesk',
    sub: 'productivity app',
    tech: ['TypeScript', 'Next.js', 'Node.js'],
    description: 'Personal productivity dashboard for managing tasks and tracking focus sessions.',
    github: 'https://github.com/shajith240/intellidesk',
    live: 'https://intellidesk-ten.vercel.app',
    image: 'https://placehold.co/800x600/242424/555555',
  },
  {
    id: 3,
    type: 'image',
    title: 'WIFI-AUTOMATION',
    sub: 'automation tool',
    tech: ['Python'],
    description: 'CLI tool to automate WiFi connection switching based on location and priority.',
    github: 'https://github.com/shajith240/WIFI-AUTOMATION',
    live: '',
    image: 'https://placehold.co/800x600/242424/555555',
  },
  {
    id: 4,
    type: 'image',
    title: 'Agent SLAM',
    sub: 'AI debate agent',
    tech: ['Python', 'WebSocket', 'Claude API'],
    description: 'Autonomous AI debate agent built for Agent SLAM 2026, a live competitive tournament — connects to a central WebSocket server and argues assigned topics in Finance, Marketing, and Ethics with zero human intervention once a match starts.',
    github: 'https://github.com/shajith240/Agent-slam',
    live: '',
    image: 'https://placehold.co/800x600/242424/555555',
  },
  {
    id: 5,
    type: 'image',
    title: 'Invoice Processing System',
    sub: 'ML automation',
    tech: ['Python', 'Machine Learning', 'NLP'],
    description: 'Automates extraction and categorization of information from invoices across multiple formats using machine learning and NLP — ingestion and classification phases complete, extraction and API layers in progress.',
    github: 'https://github.com/shajith240/INVOICE-SCRAPING-SYSTEM',
    live: '',
    image: 'https://placehold.co/800x600/242424/555555',
  },
  {
    id: 6,
    type: 'image',
    title: 'VetDoc',
    sub: 'landing page',
    tech: ['HTML', 'CSS', 'JavaScript'],
    description: 'Landing page for an at-home veterinary care service.',
    github: 'https://github.com/shajith240/vet_landing_page',
    live: 'https://vet-landing-page-coral.vercel.app',
    image: '/project-photos/vetlandingpage.png',
  },
]
