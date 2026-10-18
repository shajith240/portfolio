'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import type Hls from 'hls.js'

/* HlsVideo — a click-to-play, adaptive-bitrate video, self-hosted.

   Why HLS instead of one MP4: the source is 1080p60 at ~5 Mbps. A single
   file plays sharp on fast connections and stalls on slow ones. The HLS
   ladder (public/video/<name>/, built by scripts/encode-hls.sh) has
   three renditions with identical keyframes, so the player picks the
   best one the connection can sustain and switches mid-play without a
   hiccup. The top rung is a stream copy of the original: no quality
   lost.

   Cost on page load: nothing but the poster image. hls.js (light build,
   no subtitles/DRM) is a dynamic import, warmed on hover/focus and only
   fetched for real on the first press of Play. Safari without Media
   Source Extensions (older iPhones) plays the same playlist natively. */

const EASE_OUT = [0, 0, 0.58, 1] as const

type Props = {
  /** Master playlist, e.g. /video/autopilot-v9/master.m3u8 */
  src: string
  poster: string
  /** Accessible name: what the video is. */
  title: string
  /** Shown on the play button, e.g. "1:06". */
  duration?: string
}

let hlsModule: Promise<typeof import('hls.js/light')> | null = null
const loadHls = () => (hlsModule ??= import('hls.js/light'))

export default function HlsVideo({ src, poster, title, duration }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const warmed = useRef(false)
  const [started, setStarted] = useState(false)
  const [failed, setFailed] = useState(false)
  const reduceMotion = useReducedMotion()

  // Hover/focus on Play: fetch the player code and the master playlist
  // ahead of the click, so playback starts as soon as it's pressed.
  const warm = useCallback(() => {
    if (warmed.current) return
    warmed.current = true
    void loadHls()
    void fetch(src).catch(() => {})
  }, [src])

  const start = useCallback(async () => {
    const video = videoRef.current
    if (!video || started) return
    setStarted(true)

    const { default: HlsCtor } = await loadHls()
    if (HlsCtor.isSupported()) {
      const hls = new HlsCtor({
        // Start from a measured guess (~6 Mbps, a typical broadband/4G
        // link) instead of hls.js's conservative 0.5 Mbps default, so the
        // first seconds aren't blurry; the ABR drops a rung if it's wrong.
        abrEwmaDefaultEstimate: 6_000_000,
        // Clarity first: don't cap the rendition to the element's size.
        // The video's captions are small; a 640px player on a 1x screen
        // would otherwise be served 480p.
        capLevelToPlayerSize: false,
        startFragPrefetch: true,
      })
      hlsRef.current = hls
      let mediaRecoveries = 0
      hls.on(HlsCtor.Events.ERROR, (_e, data) => {
        if (!data.fatal) return
        if (data.type === HlsCtor.ErrorTypes.NETWORK_ERROR) {
          hls.startLoad()
        } else if (data.type === HlsCtor.ErrorTypes.MEDIA_ERROR && mediaRecoveries++ < 2) {
          hls.recoverMediaError()
        } else {
          hls.destroy()
          hlsRef.current = null
          setFailed(true)
        }
      })
      hls.loadSource(src)
      hls.attachMedia(video)
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src
    } else {
      setFailed(true)
      return
    }

    // The click is the user gesture, so play with sound is allowed.
    video.play().catch(() => {
      // Autoplay policy refused (rare once a click happened): the native
      // controls are showing now, so the visitor can press play there.
    })
  }, [src, started])

  // A closed window unmounts this page: stop downloading.
  useEffect(
    () => () => {
      hlsRef.current?.destroy()
      hlsRef.current = null
    },
    [],
  )

  return (
    <div className="hv-root">
      <video
        ref={videoRef}
        className="hv-video"
        poster={poster}
        preload="none"
        playsInline
        controls={started}
        aria-label={title}
        onError={() => setFailed(true)}
      />

      <AnimatePresence>
        {!started && (
          <motion.button
            key="play"
            type="button"
            className="hv-play"
            onClick={start}
            onPointerEnter={warm}
            onFocus={warm}
            aria-label={`Play video: ${title}${duration ? ` (${duration})` : ''}`}
            initial={false}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.1 : 0.25, ease: EASE_OUT }}
          >
            <span className="hv-play-pill">
              <svg aria-hidden width="14" height="16" viewBox="0 0 14 16">
                <path d="M1.5 1.6v12.8c0 .8.9 1.3 1.6.9l10.4-6.4c.6-.4.6-1.3 0-1.7L3.1.7C2.4.3 1.5.8 1.5 1.6Z" fill="currentColor" />
              </svg>
              <span>Watch{duration ? ` · ${duration}` : ''}</span>
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {failed && (
        <p className="hv-error" role="status">
          The video couldn&apos;t load. Try refreshing the page.
        </p>
      )}
    </div>
  )
}
