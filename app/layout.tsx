import type { Metadata } from "next";
import { Inter, Inter_Tight, Caveat } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import AppShell from "@/components/layout/AppShell";

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
      <body className={`${inter.variable} ${interTight.variable} ${vg5000.variable} ${caveat.variable} antialiased`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
