import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Film,
  HardDrive,
  Archive,
  Trash2,
  Play,
  Download,
  Search,
  AlertTriangle,
  RefreshCw,
  Loader2,
} from 'lucide-react'
import Card from '../components/Card'
import StatCard from '../components/StatCard'
import Modal from '../components/Modal'
import { recordingsApi } from '../services/api'
import { useLanguage } from '../i18n/LanguageContext'
import type { Recording } from '../types'

export default function Recordings() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [segmentType, setSegmentType] = useState('')
  const [archivingId, setArchivingId] = useState<number | null>(null)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)

  // Player modal state
  const [isPlayerOpen, setIsPlayerOpen] = useState(false)
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null)
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null)
  const [loadingPlayback, setLoadingPlayback] = useState(false)

  const { data: recordings, isLoading } = useQuery({
    queryKey: ['recordings', segmentType],
    queryFn: () => recordingsApi.list({ segment_type: segmentType || undefined }),
    refetchInterval: 30000,
  })

  const { data: status } = useQuery({
    queryKey: ['retention-status'],
    queryFn: recordingsApi.getRetentionStatus,
    refetchInterval: 60000,
  })

  const archiveMutation = useMutation({
    mutationFn: (id: number) => {
      setArchivingId(id)
      return recordingsApi.archive(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recordings'] })
      alert('歸檔成功！')
    },
    onError: (error) => {
      alert(`歸檔失敗: ${error}`)
    },
    onSettled: () => {
      setArchivingId(null)
    },
  })

  const cleanupMutation = useMutation({
    mutationFn: () => recordingsApi.triggerCleanup(false),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['recordings'] })
      queryClient.invalidateQueries({ queryKey: ['retention-status'] })
      alert(`清理完成！刪除了 ${data.deleted_count || 0} 個檔案`)
    },
    onError: (error) => {
      alert(`清理失敗: ${error}`)
    },
  })

  const filteredRecordings = recordings?.recordings?.filter((rec: Recording) =>
    rec.stream_path?.toLowerCase().includes(search.toLowerCase()) ||
    rec.file_path.toLowerCase().includes(search.toLowerCase())
  ) || []

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '-'
    if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`
    if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(2)} MB`
    return `${(bytes / 1024).toFixed(2)} KB`
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const handlePlay = async (recording: Recording) => {
    setSelectedRecording(recording)
    setLoadingPlayback(true)
    setIsPlayerOpen(true)

    try {
      const data = await recordingsApi.getPlaybackUrl(recording.id)
      setPlaybackUrl(data.url || `/api/recordings/playback/${recording.id}/stream`)
    } catch (error) {
      alert(`無法取得播放連結: ${error}`)
      setIsPlayerOpen(false)
    } finally {
      setLoadingPlayback(false)
    }
  }

  const handleDownload = async (recording: Recording) => {
    setDownloadingId(recording.id)
    try {
      // Get playback URL and use it for download
      const data = await recordingsApi.getPlaybackUrl(recording.id)
      const downloadUrl = data.download_url || `/api/recordings/${recording.id}/download`

      // Create a temporary link to trigger download
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = recording.file_path.split('/').pop() || `recording_${recording.id}.mp4`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      alert('下載已開始')
    } catch (error) {
      alert(`下載失敗: ${error}`)
    } finally {
      setDownloadingId(null)
    }
  }

  const handleClosePlayer = () => {
    setIsPlayerOpen(false)
    setSelectedRecording(null)
    setPlaybackUrl(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.recordings.title}</h1>
          <p className="text-gray-500 mt-1">{t.recordings.subtitle}</p>
        </div>
        <button
          onClick={() => cleanupMutation.mutate()}
          disabled={cleanupMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          {cleanupMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
          {t.recordings.runCleanup}
        </button>
      </div>

      {/* Storage Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title={t.recordings.totalRecordings}
          value={status?.recordings.total || 0}
          icon={<Film className="w-6 h-6" />}
          color="default"
        />
        <StatCard
          title={t.recordings.totalSize}
          value={`${status?.recordings.total_size_gb || 0} GB`}
          icon={<HardDrive className="w-6 h-6" />}
          color="default"
        />
        <StatCard
          title={t.recordings.diskUsage}
          value={`${status?.disk.usage_percent || 0}%`}
          subtitle={`${status?.disk.free_gb || 0} GB ${t.recordings.free}`}
          icon={<HardDrive className="w-6 h-6" />}
          color={status?.disk.is_critical ? 'danger' : 'success'}
        />
        <StatCard
          title={t.recordings.archived}
          value={status?.recordings.archived || 0}
          icon={<Archive className="w-6 h-6" />}
          color="default"
        />
      </div>

      {/* Disk Warning */}
      {status?.disk.is_critical && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="w-6 h-6 text-red-600" />
          <div>
            <p className="font-medium text-red-800">{t.recordings.diskSpaceCritical}</p>
            <p className="text-sm text-red-600">
              {t.recordings.diskSpaceWarning.replace('{percent}', String(status.disk.usage_percent))}
            </p>
          </div>
        </div>
      )}

      {/* Recording Stats by Type */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-blue-700">{status?.recordings.by_type.continuous || 0}</p>
          <p className="text-sm text-blue-600">{t.recordings.continuous}</p>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-yellow-700">{status?.recordings.by_type.event || 0}</p>
          <p className="text-sm text-yellow-600">{t.recordings.eventTriggered}</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-purple-700">{status?.recordings.by_type.manual || 0}</p>
          <p className="text-sm text-purple-600">{t.recordings.manual}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={t.recordings.searchRecordings}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select
          value={segmentType}
          onChange={(e) => setSegmentType(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">{t.recordings.allTypes}</option>
          <option value="continuous">{t.recordings.continuous}</option>
          <option value="event">{t.recordings.eventTriggered}</option>
          <option value="manual">{t.recordings.manual}</option>
        </select>
      </div>

      {/* Recordings List */}
      <Card padding="none">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        ) : filteredRecordings.length > 0 ? (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.recordings.stream}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.recordings.type}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.recordings.startTime}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.recordings.duration}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.recordings.size}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.streams.status}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t.streams.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredRecordings.map((recording: Recording) => (
                <tr key={recording.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Film className="w-5 h-5 text-gray-400" />
                      <span className="font-medium text-gray-900">
                        {recording.stream_path || `Stream #${recording.stream_id}`}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                      recording.segment_type === 'continuous' ? 'bg-blue-100 text-blue-800' :
                      recording.segment_type === 'event' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {recording.segment_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {new Date(recording.start_time).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {formatDuration(recording.duration_seconds)}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {formatSize(recording.file_size)}
                  </td>
                  <td className="px-6 py-4">
                    {recording.is_archived ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <Archive className="w-4 h-4" />
                        {t.recordings.archived}
                      </span>
                    ) : recording.expires_at ? (
                      <span className="text-gray-500 text-sm">
                        {t.recordings.expires} {new Date(recording.expires_at).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handlePlay(recording)}
                        className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                        title="Play"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDownload(recording)}
                        disabled={downloadingId === recording.id}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                        title="Download"
                      >
                        {downloadingId === recording.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                      </button>
                      {!recording.is_archived && (
                        <button
                          onClick={() => archiveMutation.mutate(recording.id)}
                          disabled={archivingId === recording.id}
                          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50"
                          title="Archive"
                        >
                          {archivingId === recording.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Archive className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <Film className="w-12 h-12 text-gray-300 mb-4" />
            <p className="text-gray-500">{t.recordings.noRecordingsFound}</p>
          </div>
        )}
      </Card>

      {/* Pagination Info */}
      {recordings && (
        <div className="text-sm text-gray-500">
          {t.streams.showing} {filteredRecordings.length} {t.streams.of} {recordings.total} {t.recordings.title.toLowerCase()}
        </div>
      )}

      {/* Video Player Modal */}
      <Modal
        isOpen={isPlayerOpen}
        onClose={handleClosePlayer}
        title={selectedRecording?.stream_path || 'Video Player'}
        size="xl"
      >
        <div className="space-y-4">
          {loadingPlayback ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
          ) : playbackUrl ? (
            <div className="relative bg-black rounded-lg overflow-hidden">
              <video
                src={playbackUrl}
                controls
                autoPlay
                className="w-full aspect-video"
              >
                Your browser does not support the video tag.
              </video>
            </div>
          ) : (
            <div className="flex items-center justify-center py-12 text-gray-500">
              無法載入影片
            </div>
          )}

          {selectedRecording && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-gray-500">{t.recordings.startTime}</p>
                <p className="font-medium">{new Date(selectedRecording.start_time).toLocaleString()}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-gray-500">{t.recordings.duration}</p>
                <p className="font-medium">{formatDuration(selectedRecording.duration_seconds)}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-gray-500">{t.recordings.size}</p>
                <p className="font-medium">{formatSize(selectedRecording.file_size)}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-gray-500">{t.recordings.type}</p>
                <p className="font-medium">{selectedRecording.segment_type}</p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            {selectedRecording && (
              <button
                onClick={() => handleDownload(selectedRecording)}
                disabled={downloadingId === selectedRecording.id}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {downloadingId === selectedRecording.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Download
              </button>
            )}
            <button
              onClick={handleClosePlayer}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              {t.common.cancel}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
