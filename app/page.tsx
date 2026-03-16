"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform, type PanInfo } from "framer-motion";
import MusicCard from "@/components/cards/MusicCard";
import ProjectCard from "@/components/cards/ProjectCard";
import DragPill from "@/components/ui/DragPill";
import ScrollDots from "@/components/layout/ScrollDots";
import BottomToolbar from "@/components/ui/BottomToolbar";
import { useLayout } from "@/contexts/LayoutContext";

interface CardData {
  id: number;
  type: "music" | "image";
  title: string;
  sub: string;
  image?: string;
}

const INITIAL_CARDS: CardData[] = [
  { id: 1, type: "music", title: "Zone mode — workout", sub: "concept" },
  { id: 2, type: "image", title: "Music player concepts", sub: "UI design", image: "https://placehold.co/800x600/242424/555555" },
  { id: 3, type: "image", title: "Dashboard UI", sub: "product design", image: "https://placehold.co/800x600/242424/555555" },
  { id: 4, type: "image", title: "Portfolio Site", sub: "web design", image: "https://placehold.co/800x600/242424/555555" },
];

const DRAG_THRESHOLD = 80;
const TOTAL_DOTS = 8;

export default function Home() {
  const { isNavOpen, isSidebarOpen } = useLayout();
  const [cards, setCards] = useState(INITIAL_CARDS);
  const [direction, setDirection] = useState(0);
  const [dotIndex, setDotIndex] = useState(0);

  const ml = isSidebarOpen ? 280 : 0;
  const mr = isNavOpen ? 260 : 0;

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
    rawDragY.set(0); // spring overshoots back to 0 → jiggle
    if (info.offset.y < -DRAG_THRESHOLD) {
      moveToEnd();
    } else if (info.offset.y > DRAG_THRESHOLD) {
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

  // Rubber band motion values — rawDragY tracks drag offset, springDragY lags behind it
  // Low damping means it overshoots on release → jiggle
  const rawDragY = useMotionValue(0);
  const springDragY = useSpring(rawDragY, { stiffness: 380, damping: 26, mass: 0.9 });
  const rubberScaleX = useTransform(springDragY, [-320, -60, 0, 60, 320], [1.04, 1.015, 1, 1.015, 1.04]);
  const rubberScaleY = useTransform(springDragY, [-320, -60, 0, 60, 320], [0.94, 0.985, 1, 0.985, 0.94]);

  const handleDrag = (_: unknown, info: PanInfo) => {
    rawDragY.set(info.offset.y);
  };

  const frontCard = cards[0];

  const cardVariants = {
    enter: (dir: number) => ({
      scaleY: 0.78,
      scaleX: 1.06,
      y: dir === 0 ? 0 : dir < 0 ? 28 : -28,
      opacity: 0,
    }),
    center: {
      scaleY: 1,
      scaleX: 1,
      y: 0,
      opacity: 1,
      zIndex: 10,
    },
    exit: (dir: number) => ({
      scaleY: 0.74,
      scaleX: 1.07,
      y: dir < 0 ? "-68%" : "68%",
      opacity: 0,
      zIndex: 0,
    }),
  };

  return (
    <>
      <DragPill ml={ml} mr={mr} />
      <ScrollDots count={TOTAL_DOTS} activeIndex={dotIndex} onDotClick={handleDotClick} ml={ml} />
      <BottomToolbar ml={ml} mr={mr} />

      {/* Canvas */}
      <motion.div
        animate={{ left: `${ml}px`, right: `${mr}px` }}
        transition={{ type: "spring", stiffness: 520, damping: 44, mass: 0.85 }}
        style={{
          position: "fixed",
          top: 0,
          bottom: 0,
          overflow: "hidden",
          backgroundColor: "#1a1a1a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          paddingTop: "20px",
          paddingBottom: "80px",
        }}
      >
        {/* Card stack container */}
        <div
          style={{
            width: "min(1050px, calc(100% - 60px))",
            height: "calc(100vh - 260px)",
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
                  borderRadius: "20px",
                  overflow: "hidden",
                  backgroundColor: "#242424",
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
                scaleY: { type: "spring", stiffness: 520, damping: 20, mass: 0.7 },
                scaleX: { type: "spring", stiffness: 520, damping: 20, mass: 0.7 },
                y:      { type: "spring", stiffness: 600, damping: 32 },
                opacity:{ duration: 0.12 },
              }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.05}
              dragTransition={{ bounceStiffness: 1100, bounceDamping: 24 }}
              onDrag={handleDrag}
              onDragEnd={handleDragEnd}
              style={{
                position: "absolute",
                inset: 0,
                cursor: "grab",
                zIndex: 10,
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

          {/* Card label below */}
          <div
            style={{
              position: "absolute",
              bottom: "-56px",
              width: "100%",
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: "16px", color: "#888888", fontWeight: 500, margin: 0 }}>
              {frontCard.title}
            </p>
            <p style={{ fontSize: "13px", color: "#555555", margin: "4px 0 0 0" }}>
              {frontCard.sub}
            </p>
          </div>
        </div>
      </motion.div>
    </>
  );
}
