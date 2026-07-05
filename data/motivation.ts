import { GENERATED_MOTIVATION_IMAGES } from './generated/content'

// Auto-discovered from public/motivation_quotes by
// scripts/generate-content.mjs — drop an image in that folder and it
// enters the rotation on the next dev start / deploy, no code changes.
export const MOTIVATION_IMAGES: string[] = GENERATED_MOTIVATION_IMAGES

// Deterministic daily rotation (day-of-year modulo count): every
// visitor sees the same image on a given day and the set advances
// automatically — the same behavior class as Apple's Photos widget
// rotation, and hydration-safe because it doesn't use Math.random().
export function motivationImageForToday(): string | null {
  if (MOTIVATION_IMAGES.length === 0) return null
  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86_400_000)
  return MOTIVATION_IMAGES[dayOfYear % MOTIVATION_IMAGES.length]
}
