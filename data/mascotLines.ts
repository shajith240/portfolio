import type { Expression } from "@/components/mascot/Mascot";

/* What the mascot says, in Shajith's own voice. Each line shows at most
   once per visit (sessionStorage), as a small glass speech bubble next
   to the mascot — see components/mascot/ShellMascot.tsx.

   Keep them short (one line at 13px, ~60 characters) and factual: a
   recruiter reads them in passing. `expression` is optional and still
   goes through the brain's 3s reaction cooldown. */

export interface MascotLine {
  text: string;
  expression?: Expression;
}

// Appended to the greeting when the AI chat is online.
export const CHAT_HINT = "Click me to ask me anything.";

// First arrival on the desktop. The mascot sits next to the Dock's
// Projects icon and looks at it while saying this.
export const GREETING_DESKTOP: MascotLine = {
  text: "Hi, I'm Shajith 👋 Start with my projects, right here.",
  expression: "delighted",
};

// First arrival on the phone home screen.
export const GREETING_PHONE: MascotLine = {
  text: "Hi, I'm Shajith 👋 Tap Projects to see what I've built.",
  expression: "delighted",
};

// The first time each section's window opens. Keyed by route. When the
// AI is online these are replaced by a line it writes from the
// section's real content (app/api/mascot, cached server-side); these
// fixed lines are the fallback and keep the expression.
export const SECTION_LINES: Record<string, MascotLine> = {
  "/projects": { text: "Things I've built. Each card links to the code.", expression: "wink" },
  "/about": { text: "That's me. My email and socials are at the bottom.", expression: "bashful" },
  "/skills": { text: "The languages and tools I work with." },
  "/achievements": { text: "A few things I'm proud of." },
  "/education": { text: "B.Tech in CS at IIT (ISM) Dhanbad." },
};

// What the mascot says when the visitor looks at (hovers / reads) each
// area, keyed by attention target id (lib/mascotTargets.ts) or its kind
// ("education"). Several lines per area: it rotates through them without
// repeating, so looking again later gets something new. Hand-written
// (instant, free, always true) for everything except project cards and
// skill groups, whose lines the AI writes from the real data.
// Keep each line short and true — a recruiter reads it in passing.
const REMARK_POOLS: Record<string, string[]> = {
  // Desktop widgets
  "widget:github": [
    "That's my GitHub heatmap, live. Every green square is a day I pushed code.",
    "Real data, straight from GitHub. The darker the green, the busier the day.",
    "My contribution graph. I try not to let it go grey for long.",
    "Live from my GitHub. The repos behind it are in Projects.",
    "Flip to Pinned to see the projects I'd show you first.",
  ],
  "widget:location": [
    "That's me: Rajahmundry, India.",
    "My local time, in case you're wondering when I'll reply.",
    "Rajahmundry time. If it's late here, I'll get back to you in the morning.",
  ],
  "widget:motivation": [
    "A few quotes I keep around for the long build days.",
    "These rotate. They're the lines that keep me going.",
    "My little wall of reminders. Pick your favourite.",
  ],
  "widget:leetcode": [
    "My LeetCode progress, pulled live from my profile.",
    "Hover the Easy, Med. and Hard cards to see the breakdown.",
    "Flip the toggle to see my recent LeetCode activity.",
  ],
  "widget:claude": [
    "That's how I work with Claude Code: I delegate whole tasks, not single questions.",
    "Each prompt I write, the agent carries about thirty steps on its own.",
    "Opus for the hard problems, Haiku for quick research. Routing matters.",
  ],
  "widget:codeforces": [
    "My Codeforces rating, coloured by rank. Still climbing.",
    "Live from Codeforces: my rating, rank and recent activity.",
    "Contest problem-solving. Every round counts toward that number.",
  ],
  // Dock
  "dock:projects": [
    "Projects is the best place to start: real things I've built.",
    "My work lives in there, with the code for every project.",
    "Open Projects to see what I've shipped.",
  ],
  "dock:about": [
    "About: who I am, and how to reach me.",
    "The short story of me is in there.",
    "Want to know me beyond the code? Open About.",
  ],
  "dock:skills": [
    "My stack, all in one place.",
    "Skills: the languages and tools I actually use.",
  ],
  "dock:achievements": [
    "Achievements. I'm still filling this one in.",
    "This one's a work in progress. More coming soon.",
  ],
  "dock:education": [
    "B.Tech in Computer Science at IIT (ISM) Dhanbad.",
    "Where I'm studying: IIT (ISM) Dhanbad.",
  ],
  "dock:github": [
    "My GitHub, where all the code lives.",
    "Opens my GitHub profile in a new tab.",
  ],
  "dock:linkedin": [
    "Let's connect on LinkedIn.",
    "My LinkedIn, if you'd like to connect.",
  ],
  "dock:leetcode": [
    "My LeetCode profile, if you like puzzles.",
    "Where I practise problem-solving.",
  ],
  "dock:resume": [
    "My resume, one click away.",
    "Opens my resume in a new tab.",
  ],
  // Inside section windows (thin on data — the AI would only drift)
  "about:bio": [
    "That's the short version. Ask me anything in the chat for the long one.",
    "Practical over theoretical: give me a real problem and I'll build my way through it.",
  ],
  "about:contact": [
    "Email is the quickest way to reach me. Always happy to collaborate or talk tech.",
    "Pick whichever you like. I do read my email.",
  ],
  education: [
    "That's where I'm studying Computer Science.",
    "IIT (ISM) Dhanbad, B.Tech in CS. Ask me about it in the chat.",
  ],
};

export const remarkPool = (target: string): string[] | null =>
  REMARK_POOLS[target] ?? REMARK_POOLS[target.split(":")[0]] ?? null;
