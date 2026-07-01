import type { Metadata } from "next";
import { Geist, Caveat, Nunito } from "next/font/google";
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

// Real macOS/iOS Lock Screen clocks use SF Pro Rounded for the big
// numerals — a licensed Apple system font that can't be legally
// self-hosted for a public website. Nunito is the standard free
// substitute (rounded terminals, same friendly geometric weight),
// widely cited as the closest Google Fonts match.
const nunito = Nunito({
  variable: "--font-nunito",
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
      <body className={`${geistDisplay.variable} ${vg5000.variable} ${caveat.variable} ${nunito.variable} antialiased`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
