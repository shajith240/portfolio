import type { Metadata } from "next";

// Metadata only: page.tsx is a client component and can't export it.
// Phone-only route (data/nav.ts PHONE_ONLY_ROUTES) — desktop visits go home.
export const metadata: Metadata = {
  title: "Coding",
  alternates: { canonical: "/coding" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
