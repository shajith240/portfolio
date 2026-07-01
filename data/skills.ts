export interface SkillIcon {
  name: string
  file: string
  search: string
}

export interface SkillCategory {
  label: string
  icons: SkillIcon[]
}

// Shared by app/skills/page.tsx and FinderApp.tsx — a single source of
// truth so Finder's Skills folder can never drift out of sync with the
// real Skills page.
export const CATEGORIES: SkillCategory[] = [
  {
    label: 'Languages',
    icons: [
      { name: 'JavaScript', file: 'javascript', search: 'javascript js' },
      { name: 'TypeScript', file: 'typescript', search: 'typescript ts' },
      { name: 'Python',     file: 'python',     search: 'python py' },
      { name: 'C',          file: 'c',           search: 'c' },
      { name: 'Java',       file: 'java',        search: 'java' },
      { name: 'HTML',       file: 'html',        search: 'html' },
      { name: 'CSS',        file: 'css',         search: 'css' },
    ],
  },
  {
    label: 'Frameworks',
    icons: [
      { name: 'React',   file: 'react',  search: 'react' },
      { name: 'Node.js', file: 'nodejs', search: 'node nodejs' },
    ],
  },
  {
    label: 'Tools & DevOps',
    icons: [
      { name: 'Git',     file: 'git',    search: 'git' },
      { name: 'GitHub',  file: 'github', search: 'github' },
      { name: 'VS Code', file: 'vscode', search: 'vscode vs code editor' },
      { name: 'Docker',  file: 'docker', search: 'docker container devops' },
      { name: 'Linux',   file: 'linux',  search: 'linux ubuntu' },
      { name: 'N8N',     file: 'N8N',    search: 'n8n workflow automation' },
    ],
  },
  {
    label: 'Databases',
    icons: [
      { name: 'MongoDB',    file: 'mongo_db', search: 'mongodb mongo nosql database' },
      { name: 'PostgreSQL', file: 'postgres', search: 'postgresql postgres sql database' },
    ],
  },
  {
    label: 'AI Tools',
    icons: [
      { name: 'ChatGPT',     file: 'chatgpt',       search: 'chatgpt openai gpt ai' },
      { name: 'Claude',      file: 'claude',        search: 'claude anthropic ai' },
      { name: 'Gemini',      file: 'gemini_google', search: 'gemini google ai' },
      { name: 'Antigravity', file: 'anitigravity',  search: 'antigravity animation ui' },
    ],
  },
]
