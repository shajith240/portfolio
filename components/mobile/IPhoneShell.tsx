"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import IOSStatusBar from "@/components/mobile/IOSStatusBar";
import LockScreen from "@/components/mobile/LockScreen";
import HomeScreen, { type HomeApp } from "@/components/mobile/HomeScreen";
import IOSControlCenter from "@/components/mobile/IOSControlCenter";

/* The iPhone experience orchestrator (phones only — desktop keeps
   the macOS shell). State machine:

     boot → LOCK SCREEN → HOME SCREEN ⇄ APP (route pages)

   - Lock shows once per browser session (sessionStorage), exactly
     like a phone that stays unlocked until you put it away.
   - "/" renders the HomeScreen icon grid instead of the desktop
     home page; any other route is an APP: it zooms out of the
     tapped icon's position (transform-origin trick — the honest web
     approximation of iOS's shared-element zoom) and zooms back on
     close. The home indicator is the close control: tap or swipe up.
   - Control Center: swipe DOWN from the top-right corner region,
     same gesture as the real thing. */

export default function IPhoneShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === "/";

  // null = not yet known (SSR-safe); lock only on the session's
  // first visit.
  const [locked, setLocked] = useState<boolean | null>(null);
  const [ccOpen, setCcOpen] = useState(false);
  // The tapped icon's viewport center — the app's zoom origin.
  const [appOrigin, setAppOrigin] = useState<{ x: number; y: number } | null>(null);
  const ccTouchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setLocked(window.sessionStorage.getItem("ios-unlocked") !== "1");
  }, []);

  const unlock = () => {
    window.sessionStorage.setItem("ios-unlocked", "1");
    setLocked(false);
  };

  const openApp = (app: HomeApp, center: { x: number; y: number }) => {
    if (app.external) {
      window.open(app.external, "_blank", "noopener,noreferrer");
      return;
    }
    if (app.href) {
      setAppOrigin(center);
      router.push(app.href);
    }
  };

  if (locked === null) return null;

  return (
    <>
      {/* Control Center gesture hotspot — top-right corner strip.
          A downward swipe of 40px+ opens the panel. Only the corner
          region, so it never fights page scrolling. */}
      {!locked && (
        <div
          onPointerDown={(e) => {
            ccTouchStart.current = { x: e.clientX, y: e.clientY };
          }}
          onPointerMove={(e) => {
            const s = ccTouchStart.current;
            if (s && e.clientY - s.y > 40) {
              ccTouchStart.current = null;
              setCcOpen(true);
            }
          }}
          onPointerUp={() => {
            ccTouchStart.current = null;
          }}
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            width: "45%",
            height: "34px",
            zIndex: 950,
            touchAction: "none",
          }}
        />
      )}

      {!locked && <IOSStatusBar variant="default" />}

      {/* Home vs app: the shell owns this swap so the zoom plays. */}
      {!locked && isHome && <HomeScreen onOpenApp={openApp} />}

      <AnimatePresence>
        {!locked && !isHome && (
          <motion.div
            key={pathname}
            initial={{
              scale: 0.08,
              opacity: 0.3,
              borderRadius: "40px",
            }}
            animate={{ scale: 1, opacity: 1, borderRadius: "0px" }}
            exit={{ scale: 0.08, opacity: 0, borderRadius: "40px" }}
            transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 20,
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
              background: "var(--bg-page)",
              transformOrigin: appOrigin ? `${appOrigin.x}px ${appOrigin.y}px` : "50% 60%",
              paddingTop: "max(52px, env(safe-area-inset-top, 44px))",
              paddingBottom: "40px",
              overflow: "hidden auto",
            }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Home indicator — inside an app it's the way home (tap or
          swipe up), on the home screen it's presentational. */}
      {!locked && (
        <div
          onClick={() => {
            if (!isHome) router.push("/");
          }}
          onPointerDown={(e) => {
            const startY = e.clientY;
            const onUp = (ev: PointerEvent) => {
              if (startY - ev.clientY > 30 && !isHome) router.push("/");
              window.removeEventListener("pointerup", onUp);
            };
            window.addEventListener("pointerup", onUp);
          }}
          style={{
            position: "fixed",
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "170px",
            height: "26px",
            zIndex: 940,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            paddingBottom: "8px",
            touchAction: "none",
          }}
        >
          <div
            style={{
              width: "135px",
              height: "5px",
              borderRadius: "10px",
              background: isHome ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.7)",
            }}
          />
        </div>
      )}

      <AnimatePresence>{locked && <LockScreen onUnlock={unlock} />}</AnimatePresence>

      <IOSControlCenter open={ccOpen} onClose={() => setCcOpen(false)} />
    </>
  );
}
