"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform, type PanInfo } from "framer-motion";
import MusicCard from "@/components/cards/MusicCard";
import ProjectCard from "@/components/cards/ProjectCard";
import DragPill from "@/components/ui/DragPill";
import ScrollDots from "@/components/layout/ScrollDots";
import BottomToolbar from "@/components/ui/BottomToolbar";
import { useLayout } from "@/contexts/LayoutContext";
import { PROJECTS } from "@/data/projects";

interface CardData {
  id: number;
  type: "music" | "image";
  title: string;
  sub: string;
  image?: string;
}

const INITIAL_CARDS: CardData[] = PROJECTS.map((p) => ({
  id: p.id,
  type: p.type === "featured" ? "music" : "image",
  title: p.title,
  sub: p.sub,
  image: p.image || undefined,
}));

const TOTAL_DOTS = 8;

/* ── Mobile profile header (shown only on phones) ─────────────────── */

function MobileProfileHeader() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 28, mass: 0.8 }}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        padding: "14px 20px 12px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        background: "var(--canvas-bg)",
        borderBottom: "1px solid var(--border)",
        transition: "background 0.22s ease, border-color 0.22s ease",
      }}
    >
      <img
        src="/photos/my_photo.jpeg"
        alt="Shajith"
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          objectFit: "cover",
          objectPosition: "center 10%",
          filter: "grayscale(100%)",
          flexShrink: 0,
        }}
      />
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{
          margin: 0,
          fontSize: 16,
          fontWeight: 700,
          color: "var(--text-primary)",
          lineHeight: 1.2,
          letterSpacing: "-0.01em",
          transition: "color 0.22s ease",
        }}>
          Shajith Bathina
        </p>
        <p style={{
          margin: "3px 0 0",
          fontSize: 13,
          fontWeight: 400,
          color: "var(--text-muted)",
          lineHeight: 1.2,
          transition: "color 0.22s ease",
        }}>
          I build things people want to use.
        </p>
      </div>
    </motion.div>
  );
}

/* ── Horizontal dot indicator for mobile ──────────────────────────── */

function MobileDots({ count, activeIndex, onDotClick }: { count: number; activeIndex: number; onDotClick: (i: number) => void }) {
  return (
    <div style={{
      display: "flex",
      gap: 7,
      justifyContent: "center",
      alignItems: "center",
      padding: "10px 0",
    }}>
      {Array.from({ length: count }).map((_, i) => {
        const isActive = i === activeIndex;
        return (
          <motion.button
            key={i}
            onClick={() => onDotClick(i)}
            animate={{
              width: isActive ? 22 : 7,
              backgroundColor: isActive ? "#FF4500" : "var(--dot-inactive)",
            }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            whileTap={{ scale: 0.85 }}
            style={{
              height: 7,
              borderRadius: 4,
              border: "none",
              padding: 0,
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
            }}
          />
        );
      })}
    </div>
  );
}

/* ── Swipe hint — teaches drag gesture, auto-dismisses ───────────── */

function SwipeHint({ onDismiss }: { onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3200);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 20,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        gap: 6,
      }}
    >
      {/* Up chevron */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="18,15 12,9 6,15" />
        </svg>
      </motion.div>

      {/* Label */}
      <motion.span
        animate={{ opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: "rgba(255,255,255,0.45)",
          letterSpacing: "0.04em",
          userSelect: "none",
        }}
      >
        Swipe to browse
      </motion.span>

      {/* Down chevron */}
      <motion.div
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6,9 12,15 18,9" />
        </svg>
      </motion.div>
    </motion.div>
  );
}

export default function Home() {
  const { isNavOpen, isSidebarOpen, isMobileLayout, isTabletLayout } = useLayout();
  const [cards, setCards] = useState(INITIAL_CARDS);
  const [direction, setDirection] = useState(0);
  const [dotIndex, setDotIndex] = useState(0);
  const [showSwipeHint, setShowSwipeHint] = useState(true);
  const dismissHint = useCallback(() => setShowSwipeHint(false), []);

  const isPhone = isMobileLayout && !isTabletLayout;
  const ml = !isMobileLayout && isSidebarOpen ? 280 : 0;
  const mr = !isMobileLayout && isNavOpen ? 260 : 0;

  // Touch-optimized: lower threshold + velocity detection on phones
  const DRAG_THRESHOLD = isPhone ? 50 : 80;

  const moveToEnd = useCallback(() => {
    setDirection(-1);
    setCards((prev) => {
      const [first, ...rest] = prev;
      return [...rest, first];
    });
    setDotIndex((prev) => (prev + 1) % TOTAL_DOTS);
  }, []);

  const moveToFront = useCallback(() => {
    setDirection(1);
    setCards((prev) => {
      const last = prev[prev.length - 1];
      return [last, ...prev.slice(0, -1)];
    });
    setDotIndex((prev) => (prev - 1 + TOTAL_DOTS) % TOTAL_DOTS);
  }, []);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    rawDragY.set(0);
    // Velocity-based detection: flick gesture triggers card change even if offset is small
    const velocityThreshold = 300;
    if (info.offset.y < -DRAG_THRESHOLD || info.velocity.y < -velocityThreshold) {
      moveToEnd();
    } else if (info.offset.y > DRAG_THRESHOLD || info.velocity.y > velocityThreshold) {
      moveToFront();
    }
  };

  const handleDotClick = useCallback(
    (index: number) => {
      const diff = index - dotIndex;
      if (diff === 0) return;
      if (diff > 0) {
        setDirection(-1);
        setCards((prev) => {
          const rotated = [...prev];
          for (let i = 0; i < diff; i++) {
            rotated.push(rotated.shift()!);
          }
          return rotated;
        });
      } else {
        setDirection(1);
        setCards((prev) => {
          const rotated = [...prev];
          for (let i = 0; i < Math.abs(diff); i++) {
            rotated.unshift(rotated.pop()!);
          }
          return rotated;
        });
      }
      setDotIndex(index);
    },
    [dotIndex]
  );

  const rawDragY = useMotionValue(0);
  const springDragY = useSpring(rawDragY, { stiffness: 380, damping: isPhone ? 22 : 26, mass: 0.9 });
  const rubberScaleX = useTransform(springDragY, [-320, -60, 0, 60, 320], [1.04, 1.015, 1, 1.015, 1.04]);
  const rubberScaleY = useTransform(springDragY, [-320, -60, 0, 60, 320], [0.94, 0.985, 1, 0.985, 0.94]);

  const handleDrag = (_: unknown, info: PanInfo) => {
    rawDragY.set(info.offset.y);
    if (showSwipeHint) setShowSwipeHint(false);
  };

  const frontCard = cards[0];

  const cardVariants = {
    enter: (dir: number) => ({
      scale: 0.94,
      y: dir === 0 ? 0 : dir < 0 ? 36 : -36,
      opacity: 0,
    }),
    center: {
      scale: 1,
      y: 0,
      opacity: 1,
      zIndex: 10,
    },
    exit: (dir: number) => ({
      scale: 0.94,
      y: dir < 0 ? "-65%" : "65%",
      opacity: 0,
      zIndex: 0,
    }),
  };

  return (
    <>
      {/* Phone: inline profile header at top */}
      {isPhone && <MobileProfileHeader />}

      {/* DragPill + ScrollDots + BottomToolbar: hidden on phone (tab bar handles it) */}
      {!isPhone && <DragPill ml={ml} mr={mr} onNext={moveToEnd} onPrev={moveToFront} />}
      <ScrollDots count={TOTAL_DOTS} activeIndex={dotIndex} onDotClick={handleDotClick} ml={ml} />
      {!isPhone && <BottomToolbar />}

      {/* Canvas */}
      <motion.div
        animate={{ left: `${ml}px`, right: `${mr}px` }}
        transition={{ type: "spring", stiffness: 520, damping: 44, mass: 0.85 }}
        style={{
          position: "fixed",
          top: isPhone ? 76 : 0,
          bottom: isPhone ? 72 : 0,
          overflow: "hidden",
          background: "var(--canvas-bg)",
          transition: "background 0.22s ease",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          paddingTop: isPhone ? 0 : 20,
          paddingBottom: isPhone ? 0 : 80,
        }}
      >
        {/* Card stack container */}
        <div
          style={{
            width: isPhone ? "calc(100% - 40px)" : "min(1050px, calc(100% - 60px))",
            height: isPhone ? "calc(100% - 110px)" : "clamp(320px, calc(100dvh - 200px), calc(100dvh - 200px))",
            position: "relative",
          }}
        >
          {/* Cards behind (invisible until transition) */}
          {cards.slice(1, 3).map((card, i) => {
            const offset = i + 1;
            return (
              <div
                key={card.id}
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: isPhone ? 20 : 20,
                  overflow: "hidden",
                  backgroundColor: "var(--stack-card-bg)",
                  transform: `scale(${1 - offset * 0.03}) translateY(${offset * 12}px)`,
                  zIndex: 10 - offset,
                  opacity: 0,
                }}
              />
            );
          })}

          {/* Active card with drag */}
          <AnimatePresence mode="popLayout" custom={direction}>
            <motion.div
              key={frontCard.id}
              custom={direction}
              variants={cardVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                scale:  { type: "spring", stiffness: 480, damping: 30, mass: 0.7 },
                y:      { type: "spring", stiffness: 520, damping: 32 },
                opacity:{ duration: 0.14 },
              }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={isPhone ? 0.15 : 0.05}
              dragTransition={{ bounceStiffness: isPhone ? 800 : 1100, bounceDamping: 24 }}
              onDrag={handleDrag}
              onDragEnd={handleDragEnd}
              style={{
                position: "absolute",
                inset: 0,
                cursor: "grab",
                zIndex: 10,
                touchAction: "none",
                scaleX: rubberScaleX,
                scaleY: rubberScaleY,
              }}
            >
              {frontCard.type === "music" ? (
                <MusicCard
                  title={frontCard.title}
                  artist={frontCard.sub}
                  progress={35}
                />
              ) : (
                <ProjectCard image={frontCard.image} />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Swipe hint — phones only, renders above card, auto-dismisses */}
          <AnimatePresence>
            {isPhone && showSwipeHint && <SwipeHint onDismiss={dismissHint} />}
          </AnimatePresence>

          {/* Card label below */}
          <div
            style={{
              position: "absolute",
              bottom: isPhone ? -52 : -56,
              width: "100%",
              textAlign: "center",
            }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={frontCard.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
              >
                <p style={{
                  fontSize: isPhone ? 16 : 16,
                  color: "var(--card-label-primary)",
                  fontWeight: 600,
                  margin: 0,
                  letterSpacing: "-0.01em",
                  transition: "color 0.22s ease",
                }}>
                  {frontCard.title}
                </p>
                <p style={{
                  fontSize: isPhone ? 13 : 13,
                  color: "var(--card-label-sub)",
                  fontWeight: 400,
                  margin: "3px 0 0 0",
                  transition: "color 0.22s ease",
                }}>
                  {frontCard.sub}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Mobile horizontal dots */}
        {isPhone && (
          <div style={{ marginTop: 60 }}>
            <MobileDots count={TOTAL_DOTS} activeIndex={dotIndex} onDotClick={handleDotClick} />
          </div>
        )}
      </motion.div>
    </>
  );
}
