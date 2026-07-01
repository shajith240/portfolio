"use client";

import { motion } from "framer-motion";

interface DesktopContextMenuProps {
  x: number;
  y: number;
  onChangeWallpaper: () => void;
  onClose: () => void;
}

/* Desktop right-click menu. Only "Change Wallpaper..." is wired to a
   real action — the rest match real macOS's desktop context menu but
   stay decorative for now, per the same "build the UI, wire behavior
   later" call already made for MenuBar. */

function MenuItem({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        background: "transparent",
        border: "none",
        padding: "6px 10px",
        borderRadius: "6px",
        fontSize: "13px",
        color: disabled ? "var(--text-dim)" : "var(--text-primary)",
        cursor: disabled ? "default" : "pointer",
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.background = "rgba(255, 69, 0, 0.18)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      {label}
    </button>
  );
}

export default function DesktopContextMenu({ x, y, onChangeWallpaper, onClose }: DesktopContextMenuProps) {
  return (
    <motion.div
      data-desktop-menu
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.12, ease: "easeOut" }}
      style={{
        position: "fixed",
        top: `${y}px`,
        left: `${x}px`,
        zIndex: 500,
        width: "220px",
        padding: "6px",
        borderRadius: "10px",
        background: "var(--glass-thick-bg)",
        border: "1px solid var(--glass-border)",
        backdropFilter: "blur(var(--glass-blur-thick)) saturate(var(--glass-saturate))",
        WebkitBackdropFilter: "blur(var(--glass-blur-thick)) saturate(var(--glass-saturate))",
        boxShadow: "0 16px 40px rgba(0, 0, 0, 0.4)",
      }}
    >
      <MenuItem label="New Folder" disabled />
      <MenuItem label="Get Info" disabled />
      <MenuItem label="Sort By ▸" disabled />
      <div style={{ height: "1px", background: "var(--glass-border)", margin: "6px 4px" }} />
      <MenuItem
        label="Change Wallpaper..."
        onClick={() => {
          onChangeWallpaper();
          onClose();
        }}
      />
    </motion.div>
  );
}
