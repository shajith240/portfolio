import { GENERATED_MOTIVATION_IMAGES } from './generated/content'

// Auto-discovered from public/motivation_quotes by
// scripts/generate-content.mjs — drop an image in that folder and it
// enters the rotation on the next dev start / deploy, no code changes.
export const MOTIVATION_IMAGES: string[] = GENERATED_MOTIVATION_IMAGES

// Rotation window — one image per 5 minutes (was daily; the user
// wants the quotes to actually cycle while someone browses).
export const MOTIVATION_ROTATION_MS = 5 * 60 * 1000

// Deterministic rotation (epoch 5-minute-slot modulo count): every
// visitor sees the same image in a given window and the set advances
// automatically — the same behavior class as Apple's Photos widget
// rotation, and hydration-safe because it doesn't use Math.random().
export function motivationImageForNow(): string | null {
  if (MOTIVATION_IMAGES.length === 0) return null
  const slot = Math.floor(Date.now() / MOTIVATION_ROTATION_MS)
  return MOTIVATION_IMAGES[slot % MOTIVATION_IMAGES.length]
}

// Back-compat alias (previous daily API name).
export const motivationImageForToday = motivationImageForNow
