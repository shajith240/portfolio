export interface NowPlayingTrack {
  title: string
  artist: string
  src: string
  artwork: string | null
}

// Placeholder track — no audio file exists yet. Swap `src`/`artwork` in
// once a real file is dropped into public/audio/; nothing in
// NowPlayingWidget.tsx needs to change to pick up the swap.
export const NOW_PLAYING: NowPlayingTrack = {
  title: 'Untitled Track',
  artist: 'Shajith Bathina',
  src: '/audio/now-playing.mp3',
  artwork: null,
}
