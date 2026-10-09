import type { MetadataRoute } from "next";
import { SITE_URL } from "@/data/profile";
import { NAV_ITEMS } from "@/data/nav";

// Home plus every section route. Plain paths only — the "?__window=1"
// variants are iframe chrome, not pages.
export default function sitemap(): MetadataRoute.Sitemap {
  return NAV_ITEMS.map((item) => ({
    url: item.href === "/" ? SITE_URL : `${SITE_URL}${item.href}`,
    changeFrequency: "monthly",
    priority: item.href === "/" ? 1 : 0.8,
  }));
}
