import { ACHIEVEMENTS } from './profile'

// Sentence case, never uppercase — these labels surface in real
// macOS positions (window titlebars, Dock tooltips, Spotlight rows),
// and macOS never letterspaces or capitalizes UI labels.
export const NAV_ITEMS = [
  { label: 'Home',     num: '01', href: '/' },
  { label: 'About',    num: '02', href: '/about' },
  { label: 'Projects', num: '03', href: '/projects' },
  { label: 'Skills',   num: '04', href: '/skills' },
  { label: 'Achievements', num: '05', href: '/achievements' },
  { label: 'Education',    num: '06', href: '/education' },
]

// Routes that exist only on the phone. Phones have no desktop widget
// grid, so "/coding" stacks the LeetCode and Codeforces widgets as an
// app instead; it's listed on the phone home screen only (never in
// NAV_ITEMS, so it stays out of the Dock, Spotlight, the menu bar,
// Finder and the sitemap), and a desktop visit is sent home, where the
// same widgets sit on the desktop (components/layout/AppShell.tsx).
export const PHONE_ONLY_ROUTES = ['/coding']

// Sections whose page would be empty right now. They stay routable
// (the page and route still exist), they just aren't advertised in the
// Dock, Spotlight, the menu bar, the phone home screen or Finder. Each
// entry is derived from the data, so adding a real entry brings the
// section back everywhere automatically.
const EMPTY_SECTIONS = new Set<string>([
  ...(ACHIEVEMENTS.length === 0 ? ['/achievements'] : []),
])

/** False for a route whose section has no content yet (see EMPTY_SECTIONS). */
export function isNavItemVisible(href: string): boolean {
  return !EMPTY_SECTIONS.has(href)
}

/** NAV_ITEMS minus any section that's currently empty. */
export const VISIBLE_NAV_ITEMS = NAV_ITEMS.filter(item => isNavItemVisible(item.href))
