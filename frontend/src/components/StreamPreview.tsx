import { useState, useRef, useEffect } from 'react'
import HlsPlayer from './HlsPlayer'
import { Video, VideoOff } from 'lucide-react'

interface StreamPreviewProps {
  streamPath: string
  hlsUrl: string
  isActive?: boolean
  className?: string
  onError?: () => void
}

export default function StreamPreview({
  streamPath,
  hlsUrl,
  isActive = true,
  className = '',
  onError,
}: StreamPreviewProps) {
  const [isHovering, setIsHovering] = useState(false)
  const [hasError, setHasError] = useState(false)
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [shouldLoad, setShouldLoad] = useState(false)

  // Debounce hover to avoid flickering
  const handleMouseEnter = () => {
    if (!isActive) return
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovering(true)
      setShouldLoad(true)
    }, 300) // 300ms delay before loading
  }

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
    setIsHovering(false)
    // Keep shouldLoad true to preserve the video element (avoid re-loading)
  }

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
    }
  }, [])

  const handleError = () => {
    setHasError(true)
    onError?.()
  }

  if (!isActive) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}>
        <VideoOff className="w-6 h-6 text-gray-400" />
      </div>
    )
  }

  return (
    <div
      className={`relative overflow-hidden rounded-lg cursor-pointer transition-all ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Placeholder when not hovering */}
      {!shouldLoad && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          <div className="flex flex-col items-center gap-1 text-gray-400">
            <Video className="w-6 h-6" />
            <span className="text-xs">Hover to preview</span>
          </div>
        </div>
      )}

      {/* HLS Player - rendered but hidden when not hovering */}
      {shouldLoad && (
        <div className={`${isHovering ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}>
          <HlsPlayer
            src={hlsUrl}
            autoPlay={isHovering}
            muted={true}
            controls={false}
            className="aspect-video"
            onError={handleError}
          />
        </div>
      )}

      {/* Show placeholder if loaded but not hovering */}
      {shouldLoad && !isHovering && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          <div className="flex flex-col items-center gap-1 text-gray-400">
            <Video className="w-6 h-6" />
            <span className="text-xs truncate max-w-full px-2">{streamPath}</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="flex flex-col items-center gap-1 text-gray-500">
            <VideoOff className="w-6 h-6" />
            <span className="text-xs">No stream</span>
          </div>
        </div>
      )}

      {/* Hover indicator */}
      {isHovering && !hasError && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
          <span className="text-white text-xs truncate block">{streamPath}</span>
        </div>
      )}
    </div>
  )
}
