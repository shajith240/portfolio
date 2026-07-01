import type { Metadata } from "next";
import { Geist, Caveat } from "next/font/google";
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
      <body className={`${geistDisplay.variable} ${vg5000.variable} ${caveat.variable} antialiased`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
