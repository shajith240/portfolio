import type { Metadata } from "next";

// Metadata only: page.tsx is a client component and can't export it.
export const metadata: Metadata = {
  title: "Projects",
  alternates: { canonical: "/projects" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
