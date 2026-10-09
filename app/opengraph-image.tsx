import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { NAME, HEADLINE, LOCATION, HANDLE } from "@/data/profile";

// Link-preview card (Open Graph + Twitter). Text only: the mascot sheet is
// webp, which ImageResponse (satori/resvg) can't decode, so it's left out
// rather than shipping a converted copy.

export const alt = `${NAME} — ${HEADLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  // The site's own display face. ImageResponse reads woff but not woff2.
  const vg5000 = await readFile(join(process.cwd(), "public/fonts/VG5000-Regular.woff"));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          color: "#f5f5f7",
          backgroundColor: "#0b0b0e",
          backgroundImage:
            "radial-gradient(circle at 12% 0%, rgba(10,132,255,0.28), rgba(10,132,255,0) 55%), radial-gradient(circle at 100% 100%, rgba(140,90,255,0.20), rgba(140,90,255,0) 50%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ width: 16, height: 16, borderRadius: 8, background: "#ff5f57" }} />
            <div style={{ width: 16, height: 16, borderRadius: 8, background: "#febc2e" }} />
            <div style={{ width: 16, height: 16, borderRadius: 8, background: "#28c840" }} />
          </div>
          <div style={{ fontSize: 24, color: "rgba(255,255,255,0.5)", marginLeft: 12 }}>{`@${HANDLE}`}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontFamily: "VG5000", fontSize: 104, lineHeight: 1.05, letterSpacing: "-0.02em" }}>
            {NAME}
          </div>
          <div style={{ fontSize: 40, marginTop: 24, color: "rgba(255,255,255,0.78)" }}>{HEADLINE}</div>
          <div style={{ fontSize: 28, marginTop: 14, color: "rgba(255,255,255,0.5)" }}>
            {`${LOCATION.city}, ${LOCATION.region}`}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div
            style={{
              display: "flex",
              padding: "14px 28px",
              borderRadius: 999,
              fontSize: 26,
              color: "rgba(255,255,255,0.86)",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.16)",
            }}
          >
            Projects · Skills · Education
          </div>
          <div style={{ fontSize: 24, color: "rgba(255,255,255,0.45)" }}>{`github.com/${HANDLE}`}</div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "VG5000", data: vg5000, style: "normal", weight: 400 }],
    },
  );
}
