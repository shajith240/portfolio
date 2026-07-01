export interface MotivationImage {
  src: string
  alt: string
  width: number
  height: number
}

// Real dimensions of the source file (736x864, portrait) — used to size
// the widget frame to the image's own aspect ratio exactly, so it can
// render at object-fit: contain with zero letterboxing and zero
// cropping, per an explicit no-crop requirement.
export const MOTIVATION_IMAGE: MotivationImage = {
  src: '/motivation_quotes/levi.webp',
  alt: 'Motivation',
  width: 736,
  height: 864,
}
