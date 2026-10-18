import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev-only "N" badge: keep it out of the bottom-left corner, where the
  // mascot lives (components/mascot/ShellMascot.tsx). Never shown in
  // production builds.
  devIndicators: { position: "bottom-right" },
  // The build's own timestamp, inlined into server and client bundles
  // alike, so lib/useStudyStatus.ts hydrates with exactly the year of
  // study the prerendered HTML was built with.
  env: { BUILD_DATE: new Date().toISOString() },
  // No `images.remotePatterns`: every next/image source in this app is a
  // local /public asset. (placehold.co was allowed here for project
  // placeholders; projects without a screenshot now get a drawn cover
  // tile in app/projects/page.tsx instead.)

  // Project videos (HLS ladders from scripts/encode-hls.sh). Each video
  // version gets its own folder name, so the files never change in place:
  // let browsers and the CDN keep them for a year instead of revalidating
  // every segment on every play.
  async headers() {
    return [
      {
        source: "/video/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
