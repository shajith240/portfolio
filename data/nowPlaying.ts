import { GENERATED_SONGS, type GeneratedTrack } from './generated/content'

export type NowPlayingTrack = GeneratedTrack

// Auto-discovered from public/songs by scripts/generate-content.mjs —
// drop in an audio file (+ optional cover image, .lrc lyrics, and
// "<name>.json" {title, artist} sidecar) and it joins the playlist on
// the next dev start / deploy, no code changes.
export const PLAYLIST: NowPlayingTrack[] = GENERATED_SONGS

// Silent placeholder so the player renders (disabled) even with an
// empty public/songs folder rather than crashing.
const EMPTY_TRACK: NowPlayingTrack = {
  title: 'No songs yet',
  artist: '',
  src: '',
  artwork: null,
  lyricsSrc: null,
}

export const NOW_PLAYING: NowPlayingTrack = PLAYLIST[0] ?? EMPTY_TRACK
