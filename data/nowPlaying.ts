export interface NowPlayingTrack {
  title: string
  artist: string
  src: string
  artwork: string | null
}

export const NOW_PLAYING: NowPlayingTrack = {
  title: 'Someone You Loved',
  artist: 'Lewis Capaldi',
  src: '/songs/someone-you-loved.m4a',
  artwork: '/songs/someone-you-loved-cover.webp',
}
