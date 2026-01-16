import { useState } from 'react'
import Modal from './Modal'
import HlsPlayer from './HlsPlayer'
import StatusBadge from './StatusBadge'
import { useLanguage } from '../i18n/LanguageContext'
import type { Stream } from '../types'
import {
  Activity,
  Gauge,
  Clock,
  MonitorPlay,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react'

interface StreamPlayerModalProps {
  isOpen: boolean
  onClose: () => void
  stream: Stream | null
  hlsBaseUrl: string
}

export default function StreamPlayerModal({
  isOpen,
  onClose,
  stream,
  hlsBaseUrl,
}: StreamPlayerModalProps) {
  const { t } = useLanguage()
  const [copied, setCopied] = useState(false)
  const [isReady, setIsReady] = useState(false)

  if (!stream) return null

  const hlsUrl = `${hlsBaseUrl}/${stream.path}/index.m3u8`

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(hlsUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API not available
    }
  }

  const handleOpenExternal = () => {
    window.open(hlsUrl, '_blank')
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <MonitorPlay className="w-5 h-5 text-primary-600" />
          <span>{t.streams.preview}: {stream.path}</span>
        </div>
      }
      size="lg"
    >
      <div className="space-y-4">
        {/* Video Player */}
        <div className="bg-black rounded-lg overflow-hidden">
          <HlsPlayer
            src={hlsUrl}
            autoPlay={true}
            muted={false}
            controls={true}
            className="aspect-video"
            onReady={() => setIsReady(true)}
          />
        </div>

        {/* Stream Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Activity className="w-4 h-4" />
              {t.streams.status}
            </div>
            <StatusBadge status={stream.status} />
          </div>

          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Gauge className="w-4 h-4" />
              {t.streams.fps}
            </div>
            <p className="font-semibold text-gray-900">
              {stream.fps ? `${stream.fps.toFixed(1)} fps` : '-'}
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Activity className="w-4 h-4" />
              {t.streams.bitrate}
            </div>
            <p className="font-semibold text-gray-900">
              {stream.bitrate ? `${(stream.bitrate / 1000).toFixed(0)} kbps` : '-'}
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Clock className="w-4 h-4" />
              {t.streams.latency}
            </div>
            <p className="font-semibold text-gray-900">
              {stream.latency_ms ? `${stream.latency_ms} ms` : '-'}
            </p>
          </div>
        </div>

        {/* HLS URL */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">HLS URL</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyUrl}
                className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-green-600" />
                    <span className="text-green-600">{t.streams.copied}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    {t.streams.copyUrl}
                  </>
                )}
              </button>
              <button
                onClick={handleOpenExternal}
                className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                {t.streams.openExternal}
              </button>
            </div>
          </div>
          <code className="block text-xs bg-gray-100 p-2 rounded text-gray-700 break-all">
            {hlsUrl}
          </code>
        </div>

        {/* Stream Details */}
        {stream.name && (
          <div className="text-sm text-gray-500">
            <span className="font-medium">{t.streams.streamName}:</span> {stream.name}
          </div>
        )}

        {/* Connection Status */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">{t.streams.connectionStatus}</span>
          <span className={`flex items-center gap-1 ${isReady ? 'text-green-600' : 'text-yellow-600'}`}>
            <span className={`w-2 h-2 rounded-full ${isReady ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
            {isReady ? t.streams.connected : t.streams.connecting}
          </span>
        </div>
      </div>
    </Modal>
  )
}
