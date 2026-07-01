"use client";

import { useWindowManager } from "@/contexts/WindowManagerContext";
import Window from "@/components/window/Window";

export default function WindowLayer() {
  const { windows } = useWindowManager();

  return (
    <>
      {windows
        .filter((w) => !w.minimized)
        .map((w) => (
          <Window key={w.id} win={w} />
        ))}
    </>
  );
}
