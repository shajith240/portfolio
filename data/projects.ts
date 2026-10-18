export interface Project {
  id: number
  type: 'featured' | 'image'
  title: string
  sub: string
  tech: string[]
  description: string
  github: string
  live: string
  /** Screenshot path under /public, or '' when there isn't one yet
   *  (the Projects page then draws a designed cover tile instead). */
  image: string
  /** Adaptive (HLS) video that replaces the cover: a master playlist and
   *  poster under /public, built by scripts/encode-hls.sh. */
  video?: { src: string; poster: string; duration: string }
  /** A visible "How I built it" line, shown under the description. */
  howBuilt?: string
  /** Extra screenshots shown beneath the featured project. */
  gallery?: { src: string; alt: string; caption: string; width: number; height: number }[]
}

export const PROJECTS: Project[] = [
  {
    id: 7,
    type: 'featured',
    title: 'Autopilot Reels',
    sub: 'a self-running Instagram studio',
    tech: ['Python', 'JavaScript', 'Cloudflare Workers', 'Durable Objects', 'systemd', 'FFmpeg', 'CLIP', 'Whisper', 'OCR', 'LLM agents', 'Instagram Graph API'],
    description: 'A system that runs my Instagram page by itself: it scripts, voices, edits and renders short videos, then posts them 3×/day from the cloud while a monitoring agent fixes failures.',
    howBuilt: 'Designed and built with AI coding agents. I architected the pipeline, directed the agents (Claude Code) and debugged it in production.',
    github: '',
    live: '',
    image: '/project-photos/autopilot-dashboard.webp',
    video: {
      src: '/video/autopilot-v9/master.m3u8',
      poster: '/video/autopilot-v9/poster.webp',
      duration: '1:06',
    },
    gallery: [
      {
        src: '/project-photos/autopilot-dashboard.webp',
        alt: 'Pixel-art studio dashboard with a desk per pipeline stage, a posting schedule and per-video progress bars',
        caption: 'The live studio dashboard. Each desk is a pipeline stage (voice, clip scouting, judging, editing, mixing, rendering, posting) and the manager watches the line; the right side shows the posting schedule and per-video progress. Titles blurred for privacy.',
        width: 1600,
        height: 1000,
      },
    ],
  },
  {
    id: 1,
    type: 'image',
    title: 'Linted',
    sub: 'resume feedback community',
    tech: ['Next.js', 'React', 'TypeScript', 'Tailwind', 'Supabase'],
    description: 'Community app for human-powered resume feedback — upload a resume, get structured critiques from students, recruiters, and working professionals in threaded discussions, and build reviewer reputation through public profiles and a leaderboard.',
    github: 'https://github.com/shajith240/ResumeRoster',
    live: 'https://linted.space',
    image: '/project-photos/linted.webp',
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
    image: '',
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
    image: '',
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
    image: '/project-photos/agent_slam.webp',
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
    image: '',
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
    image: '/project-photos/vetlandingpage.webp',
  },
]
