"use client";

import { useRef } from "react";
import { Mascot, type MascotHandle } from "@/components/mascot/Mascot";
import { DOCK_BOTTOM, DOCK_REST_HEIGHT, DOCK_REST_WIDTH } from "@/components/ui/Dock";
import { useMascotBrain } from "@/lib/useMascotBrain";

/* The chibi mascot, parked above the left end of the Dock.

   Deliberately a plain fixed-position box, NOT a child of the Dock or
   the widget canvas: both of those animate/transform their contents
   (magnification, entrance springs, widget drag/jiggle), and the
   mascot aims its head from its own on-screen position — an animated
   ancestor would throw that aim off. See MASCOT.md §2 "Placement".

   Mascot.tsx itself is a vendored file from the mascot kit — never
   edit its motion code; drive it through the ref instead (the brain
   in lib/useMascotBrain.ts does exactly that). */

const DESKTOP_SIZE = 160;
const PHONE_SIZE = 140;

// Sits right on the Dock's top edge. The sheet cells carry ~16px of
// transparent space under the hoodie, so the box dips into the Dock
// by that much for the drawing itself to touch it. A magnified Dock
// icon passes in front (Dock is zIndex 90), like macOS layering.
const SPRITE_FOOT_SPACE = 16;
const DESKTOP_BOTTOM = DOCK_BOTTOM + DOCK_REST_HEIGHT - SPRITE_FOOT_SPACE;

// iOS home screen stack, bottom-up (see HomeScreen.tsx): safe-area
// margin, 80px dock (12 + 56 + 12), 14px gap, 36px Search pill.
const PHONE_BOTTOM = "calc(max(12px, env(safe-area-inset-bottom, 12px)) + 80px + 14px + 36px + 10px)";

export default function ShellMascot({ variant }: { variant: "desktop" | "phone" }) {
  const mascotRef = useRef<MascotHandle>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const isPhone = variant === "phone";

  useMascotBrain(mascotRef, anchorRef);

  return (
    <div
      ref={anchorRef}
      style={{
        position: "fixed",
        // Desktop: the Dock is centered in the viewport, so its left
        // end sits half its resting width left of center.
        left: isPhone ? "16px" : `max(16px, calc(50% - ${DOCK_REST_WIDTH / 2}px))`,
        bottom: isPhone ? PHONE_BOTTOM : `${DESKTOP_BOTTOM}px`,
        // Above the wallpaper and the iOS home screen, below the
        // widget canvas (20) and every window (100+) — a dragged
        // widget or an open window simply covers it.
        zIndex: isPhone ? 6 : 15,
        lineHeight: 0,
      }}
    >
      <Mascot
        ref={mascotRef}
        directions="/mascots/shajith-directions-5x5.webp"
        reactions="/mascots/shajith-reactions.webp"
        grid={5}
        size={isPhone ? PHONE_SIZE : DESKTOP_SIZE}
        label="Shajith"
      />
    </div>
  );
}
