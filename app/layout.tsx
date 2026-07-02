import type { Metadata } from "next";
import { Geist, Caveat, Inter } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import AppShell from "@/components/layout/AppShell";

const geistDisplay = Geist({
  variable: "--font-geist-display",
  subsets: ["latin"],
  weight: ["700", "900"],
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

// Real macOS/iOS Lock Screen clock numerals use SF Pro Display — a
// licensed Apple system font that can't be self-hosted on a public
// website. Nunito was tried first as the substitute and looked too
// round/bubbly against the reference's cleaner, more neutral
// numerals — Inter is the correct pick: independently benchmarked as
// the closest free match to SF Pro (~88% similarity), designed with
// the same "built for screens" mission Apple had for SF Pro, and it
// stays geometric/neutral at heavy weights instead of getting rounder
// the way Nunito does.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["800", "900"],
});

export const metadata: Metadata = {
  title: "Portfolio",
  description: "Personal developer portfolio",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistDisplay.variable} ${vg5000.variable} ${caveat.variable} ${inter.variable} antialiased`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
