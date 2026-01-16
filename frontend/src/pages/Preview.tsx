import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  MonitorPlay,
  RefreshCw,
  Search,
  Grid3X3,
  LayoutGrid,
  Filter,
  Video,
  VideoOff,
  Wifi,
  WifiOff,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import Card from '../components/Card'
import HlsPlayer from '../components/HlsPlayer'
import StreamPlayerModal from '../components/StreamPlayerModal'
import StatusBadge from '../components/StatusBadge'
import { streamsApi, fleetApi } from '../services/api'
import { useLanguage } from '../i18n/LanguageContext'
import type { Stream, StreamStatus, MediaMTXNode } from '../types'

type GridSize = 'small' | 'medium' | 'large'

interface PlaybackConfig {
  hls_port: number
  nodes: Record<number, { name: string; hls_base_url: string; environment: string }>
}

const ITEMS_PER_PAGE = 24

export default function Preview() {
  const { t } = useLanguage()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StreamStatus | ''>('')
  const [nodeFilter, setNodeFilter] = useState<number | ''>('')
  const [gridSize, setGridSize] = useState<GridSize>('medium')
  const [selectedStream, setSelectedStream] = useState<Stream | null>(null)
  const [isPlayerOpen, setIsPlayerOpen] = useState(false)
  const [hoveredStreamId, setHoveredStreamId] = useState<number | null>(null)
  const [thumbnailErrors, setThumbnailErrors] = useState<Set<number>>(new Set())
  const [thumbnailKey, setThumbnailKey] = useState(Date.now())
  const [page, setPage] = useState(1)

  // Fetch streams with pagination
  const { data: streamsData, isLoading: streamsLoading, refetch } = useQuery({
    queryKey: ['streams-preview', statusFilter, nodeFilter, page],
    queryFn: () => streamsApi.list({
      status: statusFilter || undefined,
      node_id: nodeFilter || undefined,
      page,
      per_page: ITEMS_PER_PAGE,
    }),
    refetchInterval: 30000,
  })


  // Fetch playback config (HLS URLs for each node)
  const { data: playbackConfig } = useQuery<PlaybackConfig>({
    queryKey: ['playback-config'],
    queryFn: () => streamsApi.getPlaybackConfig(),
  })

  // Fetch nodes for filter
  const { data: nodesData } = useQuery({
    queryKey: ['fleet-nodes'],
    queryFn: () => fleetApi.listNodes(),
  })

  // Filter streams by search
  const filteredStreams = useMemo(() => {
    if (!streamsData?.streams) return []
    return streamsData.streams.filter((stream: Stream) =>
      stream.path.toLowerCase().includes(search.toLowerCase()) ||
      stream.name?.toLowerCase().includes(search.toLowerCase())
    )
  }, [streamsData?.streams, search])

  // Get HLS URL for a stream
  const getHlsUrl = (stream: Stream): string => {
    if (!playbackConfig?.nodes?.[stream.node_id]) {
      return ''
    }
    const nodeConfig = playbackConfig.nodes[stream.node_id]
    return `${nodeConfig.hls_base_url}/${stream.path}/index.m3u8`
  }

  // Get HLS base URL for selected stream
  const getHlsBaseUrl = (stream: Stream | null): string => {
    if (!stream || !playbackConfig?.nodes?.[stream.node_id]) {
      return ''
    }
    return playbackConfig.nodes[stream.node_id].hls_base_url
  }

  const handleStreamClick = (stream: Stream) => {
    setSelectedStream(stream)
    setIsPlayerOpen(true)
  }

  const handleClosePlayer = () => {
    setIsPlayerOpen(false)
    setSelectedStream(null)
  }

  const handleRefresh = () => {
    setThumbnailKey(Date.now())
    setThumbnailErrors(new Set())
    refetch()
  }

  const handleThumbnailError = (streamId: number) => {
    setThumbnailErrors(prev => new Set(prev).add(streamId))
  }

  // Get thumbnail URL for a stream
  const getThumbnailUrl = (streamId: number): string => {
    return `/api/streams/${streamId}/thumbnail?t=${thumbnailKey}`
  }

  // Grid size classes
  const gridClasses = {
    small: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8',
    medium: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
    large: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  }

  // Total streams from API (across all pages for current filter)
  const totalStreams = streamsData?.total || 0

  // Count streams by status on current page (for display purposes)
  const statusCounts = useMemo(() => {
    if (!streamsData?.streams) return { healthy: 0, degraded: 0, unhealthy: 0 }
    const streams = streamsData.streams as Stream[]
    return {
      healthy: streams.filter(s => s.status === 'healthy').length,
      degraded: streams.filter(s => s.status === 'degraded').length,
      unhealthy: streams.filter(s => s.status === 'unhealthy').length,
    }
  }, [streamsData?.streams])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MonitorPlay className="w-7 h-7 text-primary-600" />
            {t.preview.title}
          </h1>
          <p className="text-gray-500 mt-1">{t.preview.subtitle}</p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" />
          {t.streams.refresh}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="!p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Video className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalStreams}</p>
              <p className="text-sm text-gray-500">{t.preview.totalStreams}</p>
            </div>
          </div>
        </Card>
        <Card className="!p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Wifi className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{statusCounts.healthy}</p>
              <p className="text-sm text-gray-500">{t.streams.healthy}</p>
            </div>
          </div>
        </Card>
        <Card className="!p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Wifi className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600">{statusCounts.degraded}</p>
              <p className="text-sm text-gray-500">{t.streams.degraded}</p>
            </div>
          </div>
        </Card>
        <Card className="!p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <WifiOff className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{statusCounts.unhealthy}</p>
              <p className="text-sm text-gray-500">{t.streams.unhealthy}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={t.streams.searchStreams}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as StreamStatus | '')
              setPage(1)
            }}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">{t.streams.allStatus}</option>
            <option value="healthy">{t.streams.healthy}</option>
            <option value="degraded">{t.streams.degraded}</option>
            <option value="unhealthy">{t.streams.unhealthy}</option>
          </select>

          <select
            value={nodeFilter}
            onChange={(e) => {
              setNodeFilter(e.target.value ? Number(e.target.value) : '')
              setPage(1)
            }}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">{t.preview.allNodes}</option>
            {nodesData?.nodes?.map((node: MediaMTXNode) => (
              <option key={node.id} value={node.id}>
                {node.name}
              </option>
            ))}
          </select>
        </div>

        {/* Grid size toggle */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setGridSize('small')}
            className={`p-2 rounded ${gridSize === 'small' ? 'bg-white shadow' : 'hover:bg-gray-200'}`}
            title={t.preview.gridSmall}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setGridSize('medium')}
            className={`p-2 rounded ${gridSize === 'medium' ? 'bg-white shadow' : 'hover:bg-gray-200'}`}
            title={t.preview.gridMedium}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setGridSize('large')}
            className={`p-2 rounded ${gridSize === 'large' ? 'bg-white shadow' : 'hover:bg-gray-200'}`}
            title={t.preview.gridLarge}
          >
            <MonitorPlay className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stream Grid */}
      {streamsLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      ) : filteredStreams.length > 0 ? (
        <div className={`grid gap-4 ${gridClasses[gridSize]}`}>
          {filteredStreams.map((stream: Stream) => {
            const hlsUrl = getHlsUrl(stream)
            const isHovered = hoveredStreamId === stream.id
            const isHealthy = stream.status === 'healthy'
            const hasThumbnailError = thumbnailErrors.has(stream.id)
            const thumbnailUrl = getThumbnailUrl(stream.id)

            return (
              <Card
                key={stream.id}
                padding="none"
                className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary-500 transition-all"
                onClick={() => handleStreamClick(stream)}
                onMouseEnter={() => setHoveredStreamId(stream.id)}
                onMouseLeave={() => setHoveredStreamId(null)}
              >
                {/* Video Preview */}
                <div className="relative aspect-video bg-gray-900">
                  {/* Thumbnail background (always shown unless hovering with HLS) */}
                  {!hasThumbnailError && (
                    <img
                      src={thumbnailUrl}
                      alt={stream.path}
                      className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                        isHovered && isHealthy && hlsUrl ? 'opacity-0' : 'opacity-100'
                      }`}
                      onError={() => handleThumbnailError(stream.id)}
                    />
                  )}

                  {/* HLS Player (shown on hover for healthy streams) */}
                  {isHealthy && hlsUrl && isHovered && (
                    <HlsPlayer
                      src={hlsUrl}
                      autoPlay={true}
                      muted={true}
                      controls={false}
                      className="w-full h-full"
                    />
                  )}

                  {/* Fallback when no thumbnail */}
                  {hasThumbnailError && !isHovered && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      {isHealthy ? (
                        <div className="flex flex-col items-center gap-2 text-gray-400">
                          <Video className="w-8 h-8" />
                          <span className="text-xs">{t.preview.hoverToPlay}</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-gray-500">
                          <VideoOff className="w-8 h-8" />
                          <span className="text-xs">{t.preview.streamOffline}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Status indicator */}
                  <div className="absolute top-2 right-2">
                    <StatusBadge status={stream.status} size="sm" />
                  </div>

                  {/* Live indicator */}
                  {isHealthy && isHovered && (
                    <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 bg-red-600 rounded text-white text-xs">
                      <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      LIVE
                    </div>
                  )}
                </div>

                {/* Stream Info */}
                <div className="p-3">
                  <h3 className="font-medium text-gray-900 truncate" title={stream.path}>
                    {stream.path}
                  </h3>
                  {stream.name && (
                    <p className="text-sm text-gray-500 truncate" title={stream.name}>
                      {stream.name}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    {stream.fps && (
                      <span>{stream.fps.toFixed(0)} fps</span>
                    )}
                    {stream.bitrate && (
                      <span>{(stream.bitrate / 1000).toFixed(0)} kbps</span>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <div className="flex flex-col items-center justify-center py-12">
            <VideoOff className="w-12 h-12 text-gray-300 mb-4" />
            <p className="text-gray-500">{t.streams.noStreamsFound}</p>
          </div>
        </Card>
      )}

      {/* Pagination */}
      {streamsData && streamsData.pages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            {t.common?.previous || 'Previous'}
          </button>
          <span className="text-sm text-gray-600">
            {t.common?.pageOf?.replace('{page}', String(page)).replace('{pages}', String(streamsData.pages)) ||
             `${page} / ${streamsData.pages}`}
          </span>
          <button
            onClick={() => setPage(p => Math.min(streamsData.pages, p + 1))}
            disabled={page === streamsData.pages}
            className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t.common?.next || 'Next'}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stream Player Modal */}
      <StreamPlayerModal
        isOpen={isPlayerOpen}
        onClose={handleClosePlayer}
        stream={selectedStream}
        hlsBaseUrl={getHlsBaseUrl(selectedStream)}
      />
    </div>
  )
}
