import { ReactNode } from "react";

interface InfoCardProps {
  label: string;
  cta?: string;
  href?: string;
  children: ReactNode;
}

export default function InfoCard({ label, cta, href, children }: InfoCardProps) {
  return (
    <div
      style={{
        backgroundColor: "#161616",
        border: "1px solid #2A2A2A",
        borderRadius: "16px",
        padding: "16px",
      }}
    >
      {/* Label row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <span
          style={{
            fontSize: "11px",
            fontWeight: 500,
            color: "#888888",
            letterSpacing: "0.04em",
          }}
        >
          {label}
        </span>
        {cta && (
          <a
            href={href || "#"}
            style={{
              fontSize: "11px",
              color: "#888888",
              textDecoration: "none",
            }}
          >
             {cta}
          </a>
        )}
      </div>

      {/* Content */}
      {children}
    </div>
  );
}
