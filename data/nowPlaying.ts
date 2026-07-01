export interface NowPlayingTrack {
  title: string
  artist: string
  src: string
  artwork: string | null
  lyricsSrc: string | null
}

export const NOW_PLAYING: NowPlayingTrack = {
  title: 'Someone You Loved',
  artist: 'Lewis Capaldi',
  src: '/songs/someone-you-loved.m4a',
  artwork: '/songs/someone-you-loved-cover.webp',
  lyricsSrc: '/songs/Lewis-Capaldi-Someone-You-Loved-(Official-Audio).lrc',
}
