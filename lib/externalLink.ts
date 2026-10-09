/* Leaving the site, gently. Every link to another website goes through
   openExternal(), which asks the top-level desktop to show the
   "Open <site>?" sheet (components/ui/ExternalLinkSheet.tsx) instead of
   throwing the visitor into a new tab mid-click. The new tab only opens
   from the sheet's own button — a real click — so popup blockers never
   swallow it (a delayed, script-initiated window.open would be blocked).

   Pages inside desktop windows are same-origin iframes: the request is
   dispatched on window.top, so the sheet always appears over the whole
   desktop, never trapped inside a window. Same-site links (e.g. the
   résumé PDF) and mailto: links open directly. */

export const EXTERNAL_LINK_EVENT = "portfolio:external-link";

/** An http(s) URL on another origin. */
export function isExternalUrl(url: string): boolean {
  try {
    const u = new URL(url, window.location.href);
    return (u.protocol === "http:" || u.protocol === "https:") && u.origin !== window.location.origin;
  } catch {
    return false;
  }
}

export function openExternal(url: string) {
  if (!isExternalUrl(url)) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  // Same-origin top (desktop shell) — or ourselves when not embedded.
  let target: Window = window;
  try {
    if (window.top && window.top.document) target = window.top;
  } catch {
    /* cross-origin parent: show it here */
  }
  // Construct the event in the target's realm so its listeners accept it.
  const Ctor = (target as Window & typeof globalThis).CustomEvent ?? CustomEvent;
  target.dispatchEvent(new Ctor(EXTERNAL_LINK_EVENT, { detail: { url } }));
}

/* Plain <a target="_blank"> links across the pages are caught here, so
   no page has to remember to call openExternal. Modified clicks
   (Cmd/Ctrl/Shift/middle) are left alone: that's a visitor deliberately
   opening a background tab. Returns the cleanup. */
export function interceptExternalAnchors(doc: Document): () => void {
  const onClick = (e: MouseEvent) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
    if (!a || a.hasAttribute("download") || !isExternalUrl(a.href)) return;
    e.preventDefault();
    openExternal(a.href);
  };
  doc.addEventListener("click", onClick, true);
  return () => doc.removeEventListener("click", onClick, true);
}
