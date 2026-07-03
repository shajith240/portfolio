"use client";

import { useRef, useCallback } from "react";

// Matches iOS's own jiggle-mode threshold.
const LONG_PRESS_MS = 500;
// Any pointer movement past this (px) before the timer fires cancels
// the long-press — a drag/scroll gesture shouldn't also trigger edit
// mode.
const MOVE_CANCEL_THRESHOLD = 10;

export function useLongPress(onLongPress: () => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const firedRef = useRef(false);

  const clear = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    startPos.current = null;
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      firedRef.current = false;
      startPos.current = { x: e.clientX, y: e.clientY };
      timerRef.current = setTimeout(() => {
        firedRef.current = true;
        onLongPress();
      }, LONG_PRESS_MS);
    },
    [onLongPress]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!startPos.current) return;
      const dx = e.clientX - startPos.current.x;
      const dy = e.clientY - startPos.current.y;
      if (Math.hypot(dx, dy) > MOVE_CANCEL_THRESHOLD) clear();
    },
    [clear]
  );

  const onPointerUp = useCallback(() => clear(), [clear]);
  const onPointerLeave = useCallback(() => clear(), [clear]);

  // Suppresses the click that follows a completed long-press, so
  // holding an interactive child (e.g. NowPlayingWidget's play
  // button) enters edit mode instead of also firing that child's own
  // click action — matches real iOS: a hold enters jiggle mode, only
  // a short tap activates the element.
  const onClickCapture = useCallback((e: React.MouseEvent) => {
    if (firedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      firedRef.current = false;
    }
  }, []);

  return { onPointerDown, onPointerMove, onPointerUp, onPointerLeave, onClickCapture };
}
