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
    title: 'SHARPFLOW',
    sub: 'web app',
    tech: ['Next.js', 'TypeScript', 'Tailwind', 'Framer Motion'],
    description: 'Apple-inspired agency landing page with smooth animations and a clean design system.',
    github: 'https://github.com/shajith240/SHARPFLOW',
    live: '',
    image: 'https://placehold.co/800x600/242424/555555',
  },
  {
    id: 2,
    type: 'image',
    title: 'IntelliDesk',
    sub: 'productivity app',
    tech: ['TypeScript', 'Next.js', 'Node.js'],
    description: 'Personal productivity dashboard for managing tasks and tracking focus sessions.',
    github: 'https://github.com/shajith240/intellidesk',
    live: '',
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
    title: 'linux-container-runtime',
    sub: 'systems',
    tech: ['C', 'Linux', 'Namespaces', 'cgroups'],
    description: 'Minimal container runtime built from scratch using Linux namespaces and cgroups.',
    github: 'https://github.com/shajith240/linux-container-runtime',
    live: '',
    image: 'https://placehold.co/800x600/242424/555555',
  },
]
