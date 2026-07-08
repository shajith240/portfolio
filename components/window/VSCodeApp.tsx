"use client";

import dynamic from "next/dynamic";

// ssr:false + dynamic import means Monaco and the whole VS Code shell add
// zero bytes to the initial page load — only fetched once this Dock icon
// is actually clicked.
const VSCodeShell = dynamic(() => import("./vscode/VSCodeShell"), {
  ssr: false,
  loading: () => <div style={{ width: "100%", height: "100%", background: "#1e1e1e" }} />,
});

export default function VSCodeApp() {
  return <VSCodeShell />;
}
