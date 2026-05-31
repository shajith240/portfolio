"use client";

import { useState, useCallback, useEffect } from "react";
import { animate, motion, AnimatePresence, useMotionValue, type PanInfo } from "framer-motion";
import MusicCard from "@/components/cards/MusicCard";
import ProjectCard from "@/components/cards/ProjectCard";
import DragPill from "@/components/ui/DragPill";
import ScrollDots from "@/components/layout/ScrollDots";
import BottomToolbar from "@/components/ui/BottomToolbar";
import { useLayout } from "@/contexts/LayoutContext";
import { useShellMetrics } from "@/lib/useShellMetrics";
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

const TOTAL_DOTS = INITIAL_CARDS.length;
const STACK_DRAG_THRESHOLD = 30;

function getAlternatingRotation(position: number, degrees = 2) {
  if (position === 0) return 0;
  return position < 0 ? -degrees : degrees;
}

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
  const { isMobileLayout, isTabletLayout } = useLayout();
  const metrics = useShellMetrics();
  const [cards, setCards] = useState(INITIAL_CARDS);
  const [dotIndex, setDotIndex] = useState(0);
  const [showSwipeHint, setShowSwipeHint] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const dismissHint = useCallback(() => setShowSwipeHint(false), []);

  const isPhone = isMobileLayout && !isTabletLayout;
  const ml = metrics.contentLeft;
  const mr = isPhone ? metrics.contentRight : metrics.inset;
  const desktopCardGutter = Math.min(60, Math.max(32, metrics.viewportWidth * 0.032));
  const desktopAvailableWidth = Math.max(260, metrics.viewportWidth - ml - mr - desktopCardGutter);
  const desktopCardWidth = Math.floor(
    Math.max(260, Math.min(desktopAvailableWidth, 1200))
  );
  const desktopCardHeight = Math.floor(
    Math.max(320, Math.min(metrics.viewportHeight * 0.65, desktopCardWidth * 0.68, metrics.viewportHeight - 220))
  );
  const cardWidth = isPhone ? "calc(100% - 40px)" : `${desktopCardWidth}px`;
  const cardHeight = isPhone ? "min(calc(100% - 110px), 70vh)" : `${desktopCardHeight}px`;
  const stackTravel = isPhone ? 72 : 75;
  const labelTop = isPhone
    ? "calc(50% + 35vh + 16px)"
    : `calc(50% + ${desktopCardHeight / 2}px + 20px)`;

  const moveToEnd = useCallback(() => {
    setCards((prev) => {
      const [first, ...rest] = prev;
      return [...rest, first];
    });
    setDotIndex((prev) => (prev + 1) % TOTAL_DOTS);
  }, []);

  const moveToFront = useCallback(() => {
    setCards((prev) => {
      const last = prev[prev.length - 1];
      return [last, ...prev.slice(0, -1)];
    });
    setDotIndex((prev) => (prev - 1 + TOTAL_DOTS) % TOTAL_DOTS);
  }, []);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    setIsDragging(false);
    if (Math.abs(info.offset.y) > STACK_DRAG_THRESHOLD) {
      if (info.offset.y < 0) {
        moveToEnd();
      } else {
        moveToFront();
      }
    }
    animate(rawDragY, 0, {
      type: "spring",
      stiffness: 300,
      damping: 30,
      velocity: info.velocity.y,
    });
  };

  const handleDotClick = useCallback(
    (index: number) => {
      const diff = index - dotIndex;
      if (diff === 0) return;
      if (diff > 0) {
        setCards((prev) => {
          const rotated = [...prev];
          for (let i = 0; i < diff; i++) {
            rotated.push(rotated.shift()!);
          }
          return rotated;
        });
      } else {
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

  const handleDrag = () => {
    if (showSwipeHint) setShowSwipeHint(false);
  };

  const frontCard = cards[0];
  const visibleCards = [
    { ...cards[cards.length - 1], stackPosition: -1, stackKey: "prev" },
    { ...cards[0], stackPosition: 0, stackKey: "current" },
    { ...cards[1 % cards.length], stackPosition: 1, stackKey: "next" },
  ];

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
            width: "100%",
            height: "100%",
            position: "relative",
          }}
        >
          <motion.div
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragDirectionLock
            dragElastic={0.3}
            dragMomentum={false}
            dragTransition={{ bounceStiffness: 300, bounceDamping: 30 }}
            onDrag={handleDrag}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={handleDragEnd}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 10,
              cursor: isDragging ? "grabbing" : "grab",
              touchAction: "none",
              userSelect: "none",
              y: rawDragY,
            }}
          >
            {visibleCards.map((card) => {
              const isActive = card.stackPosition === 0;
              return (
                <motion.div
                  key={`${card.id}-${card.stackKey}`}
                  initial={isActive ? { opacity: 1, y: 20, scale: 1, filter: "blur(4px)", rotate: 0 } : false}
                  animate={{
                    y: `${card.stackPosition * stackTravel}vh`,
                    scale: isActive ? 1 : 0.85,
                    opacity: isActive ? 1 : 0.3,
                    filter: isActive ? "blur(0px)" : "blur(4px)",
                    rotate: getAlternatingRotation(card.stackPosition, 2),
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0 }}
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: isActive ? 10 : 1,
                    pointerEvents: isActive ? "auto" : "none",
                  }}
                >
                  <div
                    style={{
                      width: cardWidth,
                      height: cardHeight,
                      pointerEvents: "none",
                    }}
                  >
                    {card.type === "music" ? (
                      <MusicCard
                        image={card.image}
                        title={card.title}
                        artist={card.sub}
                        progress={35}
                      />
                    ) : (
                      <ProjectCard image={card.image} />
                    )}
                  </div>
                </motion.div>
              );
            })}

            {/* Card label below */}
            <div
              style={{
                position: "absolute",
                top: labelTop,
                width: "100%",
                textAlign: "center",
                pointerEvents: "none",
              }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={frontCard.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.05 }}
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
          </motion.div>

          {/* Swipe hint — phones only, renders above card, auto-dismisses */}
          <AnimatePresence>
            {isPhone && showSwipeHint && <SwipeHint onDismiss={dismissHint} />}
          </AnimatePresence>

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
