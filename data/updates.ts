export interface Update {
  title: string
  blurb: string
  date: string // ISO 'YYYY-MM-DD'
}

// Newest first. CurrentlyBuildingWidget always renders UPDATES[0] —
// add a new entry at the top when something changes, same maintenance
// pattern as data/projects.ts.
export const UPDATES: Update[] = [
  {
    title: 'macOS Desktop Rebuild',
    blurb: 'Rebuilding this whole site as a Liquid Glass macOS desktop — real windows, a working Finder, genie-effect minimize, the works.',
    date: '2026-07-01',
  },
]
