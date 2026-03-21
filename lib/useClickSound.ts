'use client'
import { useCallback, useRef } from 'react'

export function useClickSound(enabled: boolean = true) {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const play = useCallback(() => {
    if (!enabled) return;
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio('/sounds/click.wav')
        // Apple HIG: UI sounds sit at 20% volume — quiet, unobtrusive, never startling
        audioRef.current.volume = 0.45
      }
      // Reset before play — handles rapid repeated clicks cleanly
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => {
        // Silently ignore if browser blocks autoplay before first gesture
      })
    } catch {
      // Sound is enhancement only — never break the UI
    }
  }, [enabled])

  return play
}
