"use client";

import { Fragment, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { useLayout } from "@/contexts/LayoutContext";
import { useShellMetrics } from "@/lib/useShellMetrics";
import { ABOUT_BIO, ABOUT_CONTACT } from "@/lib/mascotTargets";
import { NAME, HEADLINE, LOCATION, BIO, ABOUT_PROJECTS, EMAIL, SOCIALS, RESUME_URL } from "@/data/profile";
import { fillStanding } from "@/lib/studyYear";
import { useStudyStatus } from "@/lib/useStudyStatus";

// "Rajahmundry, India" — city plus the country tail of the region.
const locationLine = `${LOCATION.city}, ${LOCATION.region.split(", ").pop()}`;

// The one inline emphasis in the bio. Kept here rather than as markup in
// BIO so the mascot's knowledge pack gets plain sentences.
const EMPHASIS = "IIT(ISM) Dhanbad.";

function emphasize(text: string): ReactNode {
  const at = text.indexOf(EMPHASIS);
  if (at === -1) return text;
  return (
    <>
      {text.slice(0, at)}
      <strong style={{ color: "var(--text-primary)" }}>{EMPHASIS}</strong>
      {text.slice(at + EMPHASIS.length)}
    </>
  );
}

// Subtle glass-free pill shared by the Copy email and Resume buttons.
const pillStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  height: "28px",
  padding: "0 12px",
  borderRadius: "999px",
  border: "0.5px solid rgba(255, 255, 255, 0.14)",
  background: "rgba(255, 255, 255, 0.06)",
  color: "var(--text-secondary)",
  fontSize: "12px",
  fontWeight: 500,
  letterSpacing: "0.01em",
  lineHeight: 1,
  textDecoration: "none",
  cursor: "pointer",
  fontFamily: "inherit",
  transition: "background 0.15s ease, color 0.15s ease",
};

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Permission denied / insecure context — fall through to the legacy path.
  }
  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    el.remove();
    return ok;
  } catch {
    return false;
  }
}

function CopyEmailButton({ reduceMotion }: { reduceMotion: boolean }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const onClick = async () => {
    if (!(await copyText(EMAIL))) return;
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1800);
  };

  const label = copied ? "Copied" : "Copy email";

  return (
    <button
      type="button"
      data-copy-email
      onClick={onClick}
      aria-label={copied ? "Email copied to clipboard" : `Copy email address ${EMAIL}`}
      style={{ ...pillStyle, color: copied ? "var(--text-primary)" : pillStyle.color }}
    >
      <svg width="11" height="11" viewBox="0 0 24 24" aria-hidden style={{ flexShrink: 0 }}>
        {copied ? (
          <path fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" d="M5 12.5l4.5 4.5L19 7.5" />
        ) : (
          <path
            fill="currentColor"
            d="M9 3h9a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-1v-2h1a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v1H6V6a3 3 0 0 1 3-3ZM6 8h9a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-7a3 3 0 0 1 3-3Zm0 2a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-7a1 1 0 0 0-1-1H6Z"
          />
        )}
      </svg>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={label}
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0 }}
          transition={{ duration: 0.12 }}
          aria-live="polite"
        >
          {label}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

export default function AboutPage() {
  const study = useStudyStatus();
  const { isMobileLayout, isTabletLayout } = useLayout();
  const metrics = useShellMetrics();
  const isPhone = isMobileLayout && !isTabletLayout;
  const reduceMotion = useReducedMotion();
  const photoSize = isPhone ? 112 : 136;

  const ml = metrics.contentLeft;
  const mr = metrics.contentRight;

  const bodyText: CSSProperties = {
    fontSize: isPhone ? "16px" : "15px",
    lineHeight: "1.7",
    color: "var(--text-secondary)",
    textAlign: "left",
  };

  return (
    <>
      {/* Canvas */}
      <motion.div
        initial={false}
        animate={{ left: `${ml}px`, right: `${mr}px` }}
        transition={{ type: "spring", stiffness: 520, damping: 44, mass: 0.85 }}
        style={{
          position: "fixed",
          top: 0,
          // Phone: run to the true screen bottom (the only thing down
          // there is IPhoneShell's 26px home-indicator strip) and pad past
          // it plus the safe-area inset so the last line is never hidden.
          bottom: 0,
          overflowY: "auto",
          overflowX: "hidden",
          scrollbarWidth: "none",
          background: "transparent",
          display: "flex",
          // Center horizontally; vertical centering comes from the child's
          // auto margins, which (unlike alignItems: center) never push the
          // top of the header out of reach when content overflows.
          alignItems: "flex-start",
          justifyContent: "center",
          // Phone: this fixed canvas sits under the iOS status bar
          // (IPhoneShell's top padding doesn't reach fixed children), so
          // clear it before the photo starts.
          paddingTop: isPhone
            ? "max(64px, calc(env(safe-area-inset-top, 44px) + 20px))"
            : "clamp(48px, 10dvh, 120px)",
          paddingBottom: isPhone ? "calc(env(safe-area-inset-bottom, 0px) + 48px)" : "80px",
        }}
      >
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{
            margin: "auto 0",
            width: isPhone ? "min(380px, calc(100vw - 32px))" : "min(520px, calc(100vw - 64px))",
            textAlign: "center",
          }}
        >
          {/* Profile header — the photo that used to sit on the desktop as a
              widget lives here now. Same squircle + tight shadow as the old
              PhotoWidget (opaque photo, not glass). Side-by-side on desktop
              and tablet, stacked and centered on phones. */}
          <header
            style={{
              display: "flex",
              flexDirection: isPhone ? "column" : "row",
              alignItems: "center",
              gap: isPhone ? "16px" : "24px",
              marginBottom: isPhone ? "28px" : "32px",
              textAlign: isPhone ? "center" : "left",
            }}
          >
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 520, damping: 44, mass: 0.85, restDelta: 0.01 }}
              style={{
                position: "relative",
                width: `${photoSize}px`,
                height: `${photoSize}px`,
                flexShrink: 0,
                borderRadius: `${Math.round(photoSize * 0.25)}px`,
                overflow: "hidden",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.28)",
              }}
            >
              <Image
                src="/photos/my_photo.jpeg"
                alt={NAME}
                fill
                priority
                sizes={`${photoSize}px`}
                style={{ objectFit: "cover", objectPosition: "center 10%" }}
              />
              {/* Hairline edge so the squircle reads against the dark canvas */}
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "inherit",
                  boxShadow: "inset 0 0 0 0.5px rgba(255, 255, 255, 0.12)",
                  pointerEvents: "none",
                }}
              />
            </motion.div>

            <div style={{ minWidth: 0 }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: isPhone ? "24px" : "28px",
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                  color: "var(--text-primary)",
                  lineHeight: 1.15,
                }}
              >
                {NAME}
              </h1>
              <p
                style={{
                  margin: "6px 0 0 0",
                  fontSize: isPhone ? "16px" : "15px",
                  color: "var(--text-secondary)",
                  lineHeight: 1.35,
                }}
              >
                {HEADLINE}
              </p>
              <p
                style={{
                  margin: "8px 0 0 0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: isPhone ? "center" : "flex-start",
                  gap: "5px",
                  fontSize: "13px",
                  color: "rgba(255, 255, 255, 0.46)",
                  lineHeight: 1.3,
                }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" aria-hidden style={{ flexShrink: 0 }}>
                  <path
                    fill="currentColor"
                    d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z"
                  />
                </svg>
                {locationLine}
              </p>
              {RESUME_URL && (
                <a
                  href={RESUME_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    ...pillStyle,
                    marginTop: "12px",
                    color: "var(--text-primary)",
                    background: "rgba(255, 255, 255, 0.1)",
                  }}
                >
                  Resume
                  <svg width="9" height="9" viewBox="0 0 24 24" aria-hidden style={{ flexShrink: 0 }}>
                    <path fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M9 7h8v8" />
                  </svg>
                </a>
              )}
            </div>
          </header>

          {/* Bio paragraphs, rendered from data/profile.ts (BIO /
              ABOUT_PROJECTS) — the same copy the mascot's knowledge reads.
              The last BIO paragraph is the sign-off, after the list. */}
          <div data-mascot={ABOUT_BIO}>
            {BIO.slice(0, -1).map((paragraph) => (
              <p key={paragraph} style={{ ...bodyText, margin: "0 0 16px 0" }}>
                {emphasize(fillStanding(paragraph, study))}
              </p>
            ))}

            <p style={{ ...bodyText, margin: "0 0 8px 0" }}>Some things I&apos;ve built:</p>

            <div style={{ ...bodyText, margin: "0 0 16px 0", lineHeight: "1.8" }}>
              {ABOUT_PROJECTS.map((project) => (
                <p key={project.name} style={{ margin: 0 }}>
                  • {project.name} — {project.blurb}
                </p>
              ))}
            </div>

            <p style={{ ...bodyText, margin: "0 0 32px 0" }}>{emphasize(BIO[BIO.length - 1])}</p>
          </div>

          {/* Social links */}
          <div
            data-mascot={ABOUT_CONTACT}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              fontSize: "12px",
              fontWeight: 600,
              letterSpacing: "0.04em",
            }}
          >
            {SOCIALS.map((social, i) => {
              const isEmail = social.url.startsWith("mailto:");
              return (
                <Fragment key={social.label}>
                  {i > 0 && <span style={{ color: "var(--text-dim)" }}>/</span>}
                  <a
                    data-mascot-link={isEmail ? "email" : "link"}
                    href={social.url}
                    {...(isEmail ? {} : { target: "_blank", rel: "noopener noreferrer" })}
                    style={{ color: "var(--text-primary)", textDecoration: "none", textTransform: "uppercase" }}
                  >
                    {social.label}
                  </a>
                </Fragment>
              );
            })}
          </div>

          <div style={{ marginTop: "14px", display: "flex", justifyContent: "center" }}>
            <CopyEmailButton reduceMotion={!!reduceMotion} />
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}
