import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allows next/image to optimize the placeholder fallback used by a
    // couple of data/projects.ts entries — everything else served
    // through next/image in this app is a local /public asset, which
    // needs no remote pattern.
    remotePatterns: [{ protocol: "https", hostname: "placehold.co" }],
  },
};

export default nextConfig;
