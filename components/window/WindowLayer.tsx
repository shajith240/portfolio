"use client";

import { AnimatePresence } from "framer-motion";
import { useWindowManager } from "@/contexts/WindowManagerContext";
import Window from "@/components/window/Window";

export default function WindowLayer() {
  const { windows } = useWindowManager();
  const visible = windows.filter((w) => !w.minimized);
  const topZIndex = visible.length ? Math.max(...visible.map((w) => w.zIndex)) : -1;

  return (
    <AnimatePresence>
      {visible.map((w) => (
        <Window key={w.id} win={w} active={w.zIndex === topZIndex} />
      ))}
    </AnimatePresence>
  );
}
