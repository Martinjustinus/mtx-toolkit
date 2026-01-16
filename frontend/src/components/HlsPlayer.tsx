import { useRef, useEffect, useState } from 'react'
import Hls from 'hls.js'
import { Loader2, AlertCircle, Volume2, VolumeX } from 'lucide-react'

interface HlsPlayerProps {
  src: string
  autoPlay?: boolean
  muted?: boolean
  controls?: boolean
  className?: string
  onError?: (error: string) => void
  onReady?: () => void
  poster?: string
}

export default function HlsPlayer({
  src,
  autoPlay = true,
  muted = true,
  controls = true,
  className = '',
  onError,
  onReady,
  poster,
}: HlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMuted, setIsMuted] = useState(muted)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !src) return

    setIsLoading(true)
    setError(null)

    // Clean up previous instance
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 600,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 10,
      })

      hlsRef.current = hls

      hls.loadSource(src)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false)
        if (autoPlay) {
          video.play().catch(() => {
            // Autoplay blocked, that's okay
          })
        }
        onReady?.()
      })

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          let errorMsg = 'Stream unavailable'
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              errorMsg = 'Network error - stream may not be active'
              break
            case Hls.ErrorTypes.MEDIA_ERROR:
              errorMsg = 'Media error - incompatible format'
              hls.recoverMediaError()
              return
            default:
              errorMsg = `Stream error: ${data.details}`
          }
          setError(errorMsg)
          setIsLoading(false)
          onError?.(errorMsg)
        }
      })
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      video.src = src
      video.addEventListener('loadedmetadata', () => {
        setIsLoading(false)
        if (autoPlay) {
          video.play().catch(() => {})
        }
        onReady?.()
      })
      video.addEventListener('error', () => {
        const errorMsg = 'Failed to load stream'
        setError(errorMsg)
        setIsLoading(false)
        onError?.(errorMsg)
      })
    } else {
      const errorMsg = 'HLS is not supported in this browser'
      setError(errorMsg)
      setIsLoading(false)
      onError?.(errorMsg)
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [src, autoPlay, onError, onReady])

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted
    }
  }, [isMuted])

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  return (
    <div className={`relative bg-black ${className}`}>
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        muted={isMuted}
        playsInline
        controls={controls && !isLoading && !error}
        poster={poster}
      />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="flex flex-col items-center gap-2 text-white">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="text-sm">Loading stream...</span>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="flex flex-col items-center gap-2 text-white text-center p-4">
            <AlertCircle className="w-8 h-8 text-red-400" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Mute toggle button (when no controls) */}
      {!controls && !isLoading && !error && (
        <button
          onClick={toggleMute}
          className="absolute bottom-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      )}
    </div>
  )
}
