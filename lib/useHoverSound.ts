'use client'

import { useCallback, useRef } from 'react'

/**
 * Generates an Apple-style UI hover tick using the Web Audio API.
 * Sine wave at ~1100Hz with a downward frequency sweep and
 * exponential decay — matches the character of macOS Spotlight
 * item selection feedback.
 */
export function useHoverSound(enabled: boolean = true) {
  const ctxRef = useRef<AudioContext | null>(null)

  const play = useCallback(() => {
    if (!enabled) return
    try {
      if (!ctxRef.current) {
        ctxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      }
      const ctx = ctxRef.current
      if (ctx.state === 'suspended') ctx.resume()

      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.connect(gain)
      gain.connect(ctx.destination)

      // Apple HIG hover tick parameters (reverse-engineered from macOS Big Sur):
      // Sine wave, 1100→850 Hz sweep, ~50ms, peak gain 0.035 (very quiet)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(1100, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(850, ctx.currentTime + 0.04)

      // Attack: 1.5ms  |  Decay: exponential over 50ms
      gain.gain.setValueAtTime(0, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(0.035, ctx.currentTime + 0.0015)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.055)

      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.06)
    } catch {
      // Sound is enhancement only — never break the UI
    }
  }, [enabled])

  return play
}
