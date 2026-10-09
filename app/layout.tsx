import type { Metadata } from "next";
import { Inter, Inter_Tight, Caveat, Borel } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
// The CSS half of the Liquid Glass material (rim light, gloss, press
// glow) — pairs with lib/liquidGlass.ts.
import "../styles/glass-system.css";
import AppShell from "@/components/layout/AppShell";
import { NAME, HANDLE, HEADLINE, LOCATION, SITE_URL } from "@/data/profile";
import { CATEGORIES } from "@/data/skills";

// SF Pro Text stand-in on Windows browsers — Inter is closest in
// metrics and rendering to Apple's system font; loaded as the base
// font-family for the entire app.
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

// Clock widget numerals — chosen directly (Nunito, then Inter, then
// Geist were all tried and replaced first) for its tighter, taller,
// slimmer digit proportions at Medium weight.
const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  weight: ["500"],
});

const vg5000 = localFont({
  src: "../public/fonts/VG5000-Regular.woff2",
  variable: "--font-vg5000",
  display: "swap",
});

// Handwritten script for the Clock widget's day name — the reference
// Lock Screen clock style pairs a casual script day label against
// heavy glass numerals; nothing already loaded in this project has
// that character.
const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["600"],
});

// Personal wordmark treatment for "Shajith" in the MenuBar app-name
// slot. Borel only ships weight 400.
const borel = Borel({
  variable: "--font-borel",
  subsets: ["latin"],
  weight: ["400"],
});

// Built only from data/profile.ts and data/skills.ts, so link previews
// and search snippets never say anything the site itself doesn't.
const DESCRIPTION = `${NAME} — ${HEADLINE}, based in ${LOCATION.city}, ${LOCATION.region}. Projects, skills, coding stats and education.`;

const SKILL_KEYWORDS = CATEGORIES.flatMap((c) => c.icons.map((i) => i.name));

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${NAME} — Developer Portfolio`,
    template: `%s · ${NAME}`,
  },
  description: DESCRIPTION,
  applicationName: `${NAME} — Portfolio`,
  authors: [{ name: NAME, url: `https://github.com/${HANDLE}` }],
  creator: NAME,
  // Each section's layout.tsx overrides this with its own path.
  alternates: { canonical: "/" },
  keywords: [NAME, HANDLE, "developer portfolio", "IIT(ISM) Dhanbad", "computer science", ...SKILL_KEYWORDS],
  openGraph: {
    type: "website",
    siteName: `${NAME} — Portfolio`,
    title: `${NAME} — Developer Portfolio`,
    description: DESCRIPTION,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: `${NAME} — Developer Portfolio`,
    description: DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${interTight.variable} ${vg5000.variable} ${caveat.variable} ${borel.variable} antialiased`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
