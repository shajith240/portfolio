/* Music card icons — use CSS variables for stroke colors */

const RepeatIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "stroke 0.22s ease" }}>
    <polyline points="17 1 21 5 17 9" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <polyline points="7 23 3 19 7 15" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </svg>
);

const HeartIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "stroke 0.22s ease" }}>
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const PlayTriangle = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="none">
    <polygon points="6,3 20,12 6,21" />
  </svg>
);

interface MusicCardProps {
  image?: string;
  title: string;
  artist: string;
  progress?: number;
}

export default function MusicCard({
  image = "https://placehold.co/360x800/1a1a1a/333333",
  title,
  artist,
  progress = 35,
}: MusicCardProps) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "var(--bg-card)",
        borderRadius: "20px",
        display: "flex",
        flexDirection: "column",
        padding: "16px",
        overflow: "hidden",
        border: "1px solid var(--border-subtle)",
        boxShadow: "var(--shadow-card)",
        transition: "background-color 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease",
      }}
    >
      {/* Album art */}
      <div style={{ flex: 1, minHeight: 0, borderRadius: "12px", overflow: "hidden" }}>
        <img
          src={image}
          alt={title}
          loading="lazy"
          decoding="async"
          draggable={false}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "grayscale(100%)",
            display: "block",
            pointerEvents: "none",
            userSelect: "none",
          }}
        />
      </div>

      {/* Bottom section */}
      <div style={{ flexShrink: 0, paddingTop: "16px" }}>
        <p style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 4px 0", transition: "color 0.22s ease" }}>
          {title}
        </p>
        <p style={{ fontSize: "14px", color: "var(--text-muted)", margin: 0, transition: "color 0.22s ease" }}>
          {artist}
        </p>

        {/* Controls row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "16px",
          }}
        >
          <RepeatIcon />
          <button
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              backgroundColor: "#FF4500",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              padding: 0,
            }}
          >
            <PlayTriangle />
          </button>
          <HeartIcon />
        </div>

        {/* Progress bar */}
        <div
          style={{
            height: "4px",
            backgroundColor: "var(--border)",
            borderRadius: "999px",
            marginTop: "12px",
            overflow: "hidden",
            transition: "background-color 0.22s ease",
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: "100%",
              backgroundColor: "#FF4500",
              borderRadius: "999px",
            }}
          />
        </div>
      </div>
    </div>
  );
}
