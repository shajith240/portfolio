"use client";

import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState, useRef } from "react";

const GLASS_STYLE = {
  background: "rgba(255, 255, 255, 0.14)",
  WebkitBackdropFilter: "blur(20px) saturate(180%)",
  backdropFilter: "blur(20px) saturate(180%)",
  border: "1px solid rgba(255, 255, 255, 0.18)",
  boxShadow:
    "inset 0 1px 1px rgba(255, 255, 255, 0.35), inset 0 4px 6px rgba(0, 0, 0, 0.08), inset 0 -1px 2px rgba(0, 0, 0, 0.22), 0 8px 24px rgba(0, 0, 0, 0.25)",
};

export default function IOSControlCenter({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [brightness, setBrightness] = useState(1);
  const [volume, setVolume] = useState(0.5);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(
    null
  );
  const [isOnline, setIsOnline] = useState(true);
  const sliderRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("cc-brightness");
    if (saved) setBrightness(parseFloat(saved));

    const saved_vol = localStorage.getItem("cc-volume");
    if (saved_vol) setVolume(parseFloat(saved_vol));
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (open) {
      const audio = document.querySelector("audio");
      setAudioElement(audio);
    }
  }, [open]);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--display-dim",
      String((1 - brightness) * 0.7)
    );
    localStorage.setItem("cc-brightness", String(brightness));
  }, [brightness]);

  useEffect(() => {
    localStorage.setItem("cc-volume", String(volume));
    const audioElements = document.querySelectorAll("audio");
    audioElements.forEach((el) => {
      el.volume = volume;
    });
  }, [volume]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const handleSliderChange = (
    newValue: number,
    type: "brightness" | "volume"
  ) => {
    const clamped = Math.max(0, Math.min(1, newValue));
    if (type === "brightness") setBrightness(clamped);
    else setVolume(clamped);
  };

  const handleSliderPointerDown = (
    e: React.PointerEvent,
    type: "brightness" | "volume"
  ) => {
    const container = sliderRefs.current[type];
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const handleMove = (moveEvent: PointerEvent) => {
      const offsetY = moveEvent.clientY - rect.top;
      const ratio = 1 - Math.max(0, Math.min(1, offsetY / rect.height));
      handleSliderChange(ratio, type);
    };

    const handleUp = () => {
      document.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerup", handleUp);
    };

    document.addEventListener("pointermove", handleMove);
    document.addEventListener("pointerup", handleUp);
  };

  if (!mounted || typeof document === "undefined") return null;

  const backdropVariants = {
    enter: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  };

  const contentVariants = {
    enter: { y: -14, opacity: 0 },
    visible: { y: 0, opacity: 1 },
    exit: { y: -14, opacity: 0 },
  };

  const easing: [number, number, number, number] = [0.32, 0.72, 0, 1];

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9999]"
          variants={backdropVariants}
          initial="enter"
          animate="visible"
          exit="exit"
          transition={{ duration: 0.28, ease: easing }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          style={{
            background: "rgba(0, 0, 0, 0.3)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            backdropFilter: "blur(20px) saturate(180%)",
          }}
        >
          <motion.div
            className="absolute top-0 left-0 right-0 mx-auto px-4 pt-4 flex flex-col gap-3"
            style={{ maxWidth: "420px" }}
            variants={contentVariants}
            initial="enter"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.28, ease: easing }}
          >
            {/* Row 1: Connectivity + Media */}
            <div className="flex gap-3">
              {/* Connectivity Card */}
              <div
                className="flex-1 h-[110px] rounded-[16px] p-3"
                style={GLASS_STYLE}
              >
                <div className="grid grid-cols-2 gap-2 h-full">
                  {/* Airplane */}
                  <button className="flex items-center justify-center rounded-full bg-white/15 hover:bg-white/20 transition">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M10.18 9L5 13.18V19h2v-4h4v4h2v-5.82L10.18 9M19 13v-2h-8V7h-2v4H3v2h16z" />
                    </svg>
                  </button>
                  {/* Cellular */}
                  <button className="flex items-center justify-center rounded-full bg-white/15 hover:bg-white/20 transition">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M19 3H5v16h14V3zm-2 14h-2v-2h2v2zm0-4h-2v-2h2v2zm-4 4h-2v-2h2v2zm0-4h-2v-2h2v2zm-4 4H7v-2h2v2zm0-4H7v-2h2v2z" />
                    </svg>
                  </button>
                  {/* WiFi */}
                  <button
                    className="flex items-center justify-center rounded-full transition"
                    style={{
                      background: isOnline
                        ? "#0a84ff"
                        : "rgba(255, 255, 255, 0.15)",
                    }}
                  >
                    <svg
                      className="w-5 h-5 text-white"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z" />
                    </svg>
                  </button>
                  {/* Bluetooth */}
                  <button className="flex items-center justify-center rounded-full bg-white/15 hover:bg-white/20 transition">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M17.71 15.71L12 21.41l-5.71-5.71c-.39-.39-.39-1.02 0-1.41l4.3-4.29L6.29 5.71c-.39-.39-.39-1.02 0-1.41c.39-.39 1.02-.39 1.41 0L12 7.59l4.3-4.29c.39-.39 1.02-.39 1.41 0c.39.39.39 1.02 0 1.41l-5.71 5.71l4.3 4.29c.39.39.39 1.02 0 1.41zm-.71-10.71l-4 4l4 4l1.41-4.71L12 3.17l5.29 5.29l1.42-4.46z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Media Card */}
              <div
                className="flex-1 h-[110px] rounded-[16px] p-3 flex items-center justify-center flex-col gap-2"
                style={GLASS_STYLE}
              >
                <div className="text-center">
                  <div className="text-xs font-semibold text-white/90">
                    Music
                  </div>
                  <div className="text-[11px] text-white/55">
                    {audioElement?.paused !== false
                      ? "Paused"
                      : "From the desktop player"}
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (audioElement) {
                      if (audioElement.paused) audioElement.play();
                      else audioElement.pause();
                    }
                  }}
                  className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/25 transition"
                >
                  {audioElement?.paused !== false ? (
                    <svg
                      className="w-5 h-5 text-white fill-current"
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5 text-white fill-current"
                      viewBox="0 0 24 24"
                    >
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Row 2: Brightness + Volume Sliders */}
            <div className="flex gap-3">
              {/* Brightness Slider */}
              <div
                className="w-full max-w-[170px] h-[200px] rounded-[40px] p-4 flex flex-col items-center justify-between relative overflow-hidden"
                style={GLASS_STYLE}
                ref={(el) => {
                  if (el) sliderRefs.current.brightness = el;
                }}
                onPointerDown={(e) => handleSliderPointerDown(e, "brightness")}
              >
                <div className="w-full flex-1 relative">
                  <div className="absolute inset-0 w-[36px] left-1/2 -translate-x-1/2 rounded-[18px] bg-white/30" />
                  <div
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[36px] rounded-[18px] bg-white/80 transition-all"
                    style={{ height: `${brightness * 100}%` }}
                  />
                </div>
                <svg
                  className="w-6 h-6 text-white/85 mb-2"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <circle cx="12" cy="12" r="5" />
                  <path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m5.08 5.08l4.24 4.24M1 12h6m6 0h6M4.22 19.78l4.24-4.24m5.08-5.08l4.24-4.24M19.78 19.78l-4.24-4.24m-5.08-5.08l-4.24-4.24" />
                </svg>
              </div>

              {/* Volume Slider */}
              <div
                className="w-full max-w-[170px] h-[200px] rounded-[40px] p-4 flex flex-col items-center justify-between relative overflow-hidden"
                style={GLASS_STYLE}
                ref={(el) => {
                  if (el) sliderRefs.current.volume = el;
                }}
                onPointerDown={(e) => handleSliderPointerDown(e, "volume")}
              >
                <div className="w-full flex-1 relative">
                  <div className="absolute inset-0 w-[36px] left-1/2 -translate-x-1/2 rounded-[18px] bg-white/30" />
                  <div
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[36px] rounded-[18px] bg-white/80 transition-all"
                    style={{ height: `${volume * 100}%` }}
                  />
                </div>
                <svg
                  className="w-6 h-6 text-white/85 mb-2"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                </svg>
              </div>
            </div>

            {/* Row 3: Action Buttons */}
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.open("https://github.com/shajith240")}
                className="w-[70px] h-[70px] rounded-full flex items-center justify-center transition hover:bg-white/20"
                style={GLASS_STYLE}
              >
                <svg
                  className="w-[26px] h-[26px] text-white fill-current"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v 3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </button>

              <button
                onClick={() => window.open("https://linkedin.com/in/shajith240")}
                className="w-[70px] h-[70px] rounded-full flex items-center justify-center transition hover:bg-white/20"
                style={GLASS_STYLE}
              >
                <svg
                  className="w-[26px] h-[26px] text-white fill-current"
                  viewBox="0 0 24 24"
                >
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path
                    d="M7 10v8M11 6.5v11.5M11 10v8M15 10v8"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    fill="none"
                  />
                  <circle cx="7" cy="7" r="1" />
                </svg>
              </button>

              <button
                onClick={() => window.open("mailto:shajith240@gmail.com")}
                className="w-[70px] h-[70px] rounded-full flex items-center justify-center transition hover:bg-white/20"
                style={GLASS_STYLE}
              >
                <svg
                  className="w-[26px] h-[26px] text-white fill-current"
                  viewBox="0 0 24 24"
                >
                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                </svg>
              </button>
            </div>

            {/* Display Dim Overlay */}
            <div
              className="fixed inset-0 pointer-events-none bg-black z-[3000]"
              style={{ opacity: "var(--display-dim, 0)" }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
