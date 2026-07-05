// Sentence case, never uppercase — these labels surface in real
// macOS positions (window titlebars, Dock tooltips, Spotlight rows),
// and macOS never letterspaces or capitalizes UI labels. "DSA" stays
// as-is because it's an acronym, not styling.
export const NAV_ITEMS = [
  { label: 'Home',     num: '01', href: '/' },
  { label: 'About',    num: '02', href: '/about' },
  { label: 'Projects', num: '03', href: '/projects' },
  { label: 'Skills',   num: '04', href: '/skills' },
  { label: 'DSA',      num: '05', href: '/dsa' },
  { label: 'Notes',    num: '06', href: '/notes' },
  { label: 'Uses',     num: '07', href: '/uses' },
]
