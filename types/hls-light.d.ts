// hls.js ships its light build (no subtitles/DRM) without a types entry.
// Same API as the full build, so reuse its declarations.
declare module 'hls.js/light' {
  export * from 'hls.js'
  export { default } from 'hls.js'
}
