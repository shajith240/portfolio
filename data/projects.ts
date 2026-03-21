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
    title: 'Project One',
    sub: 'web app',
    tech: ['Next.js', 'TypeScript', 'Tailwind'],
    description: 'Short one line description.',
    github: 'https://github.com/shajith240/project-one',
    live: '',
    image: '',
  },
  {
    id: 2,
    type: 'image',
    title: 'Project Two',
    sub: 'cli tool',
    tech: ['Python', 'Click'],
    description: 'Short one line description.',
    github: '',
    live: '',
    image: 'https://placehold.co/800x600/242424/555555',
  },
  {
    id: 3,
    type: 'image',
    title: 'DSA Tracker',
    sub: 'problem solving',
    tech: ['React', 'LocalStorage'],
    description: 'Personal LeetCode progress tracker.',
    github: '',
    live: '',
    image: 'https://placehold.co/800x600/242424/555555',
  },
  {
    id: 4,
    type: 'image',
    title: 'This Portfolio',
    sub: 'design + dev',
    tech: ['Next.js', 'Framer Motion', 'Tailwind'],
    description: 'kalyp.so inspired personal portfolio.',
    github: '',
    live: '',
    image: 'https://placehold.co/800x600/242424/555555',
  },
]
