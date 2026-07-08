// Activity Bar icons — faithful outline recreations of VS Code's actual
// Explorer/Search/Source-Control glyphs (not a redistribution of the
// Codicons font/SVG assets themselves), 24x24 viewBox, stroke-based,
// colored via currentColor so the existing active/inactive color logic
// in VSCodeShell just works.

export function ExplorerIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M7 3.5h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path d="M14 3.5v4h4" stroke="currentColor" strokeWidth="1.3" />
      <path d="M9 12.5h6M9 15.5h6M9 18.5h4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

export function SearchIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M19 19l-4.35-4.35" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function SourceControlIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="7" cy="6" r="2.2" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="7" cy="18" r="2.2" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="17" cy="12" r="2.2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M7 8.2V15.8" stroke="currentColor" strokeWidth="1.3" />
      <path d="M7 8.2c0 4.5 3.5 3.8 8 3.8" stroke="currentColor" strokeWidth="1.3" fill="none" />
    </svg>
  );
}
