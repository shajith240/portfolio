export interface AITool {
  name: string
  file: string
  url: string
}

// Real, canonical URLs — no invented links. Newest/most-used first;
// add more entries here as they come up, the widget grid wraps
// automatically rather than assuming a fixed 2x2/2x4 layout.
export const AI_TOOLS: AITool[] = [
  { name: 'Claude',      file: 'claude',        url: 'https://claude.ai' },
  { name: 'Gemini',      file: 'gemini_google', url: 'https://gemini.google.com' },
  { name: 'ChatGPT',     file: 'chatgpt',       url: 'https://chatgpt.com' },
  { name: 'Antigravity', file: 'anitigravity',  url: 'https://antigravity.google' },
  { name: 'Codex',       file: 'codex',         url: 'https://openai.com/codex' },
  { name: 'Cursor',      file: 'cursor',        url: 'https://cursor.com' },
]
