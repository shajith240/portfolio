# Read-only VS Code viewer — design

## Purpose

A Dock icon that opens a window looking and behaving exactly like real VS
Code, browsing this portfolio's actual source code live from GitHub
(`github.com/shajith240/portfolio`). Read-only: no editing, no terminal, no
extensions — every visible piece of chrome must be genuinely functional, since
the explicit goal is that nobody should be able to tell it's not real VS Code.
A dead/decorative icon or a fake terminal would be exactly the kind of thing
that gives it away, so anything that can't be made real is left out rather
than faked.

## Non-goals

- Not an editable IDE. No save, no terminal execution, no git operations.
- No extensions, no Run/Debug, no fake panels.
- Not a general-purpose code viewer for other repos — hardcoded to this one.

## Architecture

New window kind: `"vscode"`, following the exact same sentinel-route pattern
already established for `"finder"` and `"credits"` in
`contexts/WindowManagerContext.tsx` — never a real page, never an iframe, a
plain React component rendered directly by `components/window/Window.tsx`.

- `contexts/WindowManagerContext.tsx` — add `"vscode"` to the `kind` union,
  add `openVSCode()` mirroring `openFinder()`/`openCredits()`.
- `components/window/Window.tsx` — render `<VSCodeApp />` for that kind.
- `components/window/VSCodeApp.tsx` — the component itself, **lazy-loaded**
  via `next/dynamic({ ssr: false })` so Monaco and all VS Code chrome add zero
  bytes to the initial page load; only fetched the moment the Dock icon is
  clicked.
- `components/ui/Dock.tsx` — new `DOCK_ITEMS` entry, `isVSCode` flag mirroring
  `isCredits`, new icon key `vscode` in `ICON_FILE` (icon file to be dropped
  into `public/icons/` by the user, same workflow as previous icon additions
  this session).

## Data flow

Two Next.js Route Handlers proxy GitHub's REST API server-side, each with a
5-minute `revalidate` (Next.js fetch cache) — shared across all visitors, not
per-visitor rate-limited, and still "live" (a push shows up within minutes,
no redeploy required):

- `app/api/github/tree/route.ts` → GitHub's
  `GET /repos/shajith240/portfolio/git/trees/main?recursive=1`. Server-side
  filters out `node_modules`, `.next`, `.git`, lockfiles (`package-lock.json`,
  etc.), and the large binary folders `public/icons`, `public/songs`,
  `public/wallpapers`, `public/motivation_quotes`. Returns the filtered flat
  path list; the client builds the nested tree structure from it.
- `app/api/github/file/route.ts?path=...` → GitHub's raw content endpoint for
  a single file. Files over 500KB or with a non-text extension (images,
  fonts, audio, `.icns`, etc.) return a `{ binary: true }` marker instead of
  content; the editor shows a "binary file, not shown" placeholder instead of
  attempting to render garbage.
- Client-side: an in-memory `Map<path, content>` cache for the session — a
  file already opened once, or the tree already fetched once, costs nothing
  on re-access without a full page reload.
- Also `app/api/github/commit/route.ts` → GitHub's
  `GET /repos/shajith240/portfolio/commits?per_page=1` for the Source Control
  panel and status bar (latest commit message/author/date, branch name),
  same caching approach.

## Editor

`@monaco-editor/react` (new dependency) in read-only mode
(`options: { readOnly: true }`), VS Code's real `vs-dark` theme (Monaco ships
this by name, not a re-creation), syntax highlighting from Monaco's own
language detection by file extension, real minimap enabled, real Ctrl/Cmd+P
quick-open implemented as a lightweight fuzzy-match palette over the already-
fetched file path list (not Monaco's own command palette, which pulls in
editor commands that don't apply to a read-only viewer).

## Chrome — only functional pieces

- **Activity bar**: exactly three icons — Explorer, Search, Source Control.
  No Run/Debug, no Extensions — nothing that can't be backed by real
  behavior.
- **Explorer**: expand/collapse file tree from the fetched path list, VS
  Code's exact indentation/chevron/file-icon-by-extension visual treatment.
  Clicking a file opens it in a tab.
- **Search**: real full-text search across file contents. Text files are
  lazily prefetched in the background (via `requestIdleCallback`, stopping
  early if the window closes) after the tree loads, so Search has content to
  search without blocking anything up front.
- **Source Control**: read-only panel showing the real latest commit
  (message, author, date) and branch name from the commit API above. No diff
  view — nothing is ever "modified" in a read-only viewer.
- **Tabs**: multiple simultaneously open, closeable, active-tab dot
  indicator, matching real VS Code tab behavior.
- **Status bar**: real branch name, real language mode of the active file,
  cursor position (read-only, still tracks clicks/arrow keys within Monaco).

## Error handling

- GitHub API unreachable or rate-limited → the whole window shows one clean
  "couldn't reach GitHub" state, not a half-loaded broken shell (a
  half-broken UI would be the actual tell that it's fake, more than a clean
  error state ever would).
- Empty/failed tree fetch → same treatment.
- Binary or oversized file → placeholder in the editor pane, not a crash or
  garbled render.

## Performance

- Monaco + `VSCodeApp` are dynamically imported (`next/dynamic`,
  `ssr: false`), loaded only on Dock-icon click — no impact on the initial
  page load or any other window.
- Search's file-content prefetch runs at idle priority, not blocking
  interaction, and aborts if the window is closed mid-prefetch.
- Monaco editor/model instances are disposed on tab-close and on
  window-close — no leaked instances from repeated open/close cycles.
- Both server-side (5 min revalidate) and client-side (in-memory, per
  session) caching mean repeat opens/re-clicks cost nothing.

## Testing

- Manual verification once built: open the window, confirm tree loads,
  click through several files of different languages (ts/tsx/md/json/css),
  confirm syntax highlighting, open/close multiple tabs, run a Search query,
  check Source Control shows real commit data, confirm a simulated GitHub
  API failure shows the clean error state rather than a broken shell.
- No automated test suite exists elsewhere in this codebase for UI
  components: consistent with that, no new automated tests are added here.
