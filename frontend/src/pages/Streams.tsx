import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Radio,
  RefreshCw,
  Play,
  Settings,
  Plus,
  Search,
  Wrench,
  Loader2,
} from 'lucide-react'
import Card from '../components/Card'
import StatusBadge from '../components/StatusBadge'
import { streamsApi, healthApi } from '../services/api'
import { useLanguage } from '../i18n/LanguageContext'
import type { Stream, StreamStatus } from '../types'

export default function Streams() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StreamStatus | ''>('')
  const [probingId, setProbingId] = useState<number | null>(null)
  const [remediatingId, setRemediatingId] = useState<number | null>(null)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['streams', statusFilter],
    queryFn: () => streamsApi.list({ status: statusFilter || undefined }),
    refetchInterval: 30000,
  })

  const probeMutation = useMutation({
    mutationFn: (streamId: number) => {
      setProbingId(streamId)
      return healthApi.probeStream(streamId)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['streams'] })
      alert(`Probe 完成: ${data.status} - FPS: ${data.fps || 'N/A'}`)
    },
    onError: (error) => {
      alert(`Probe 失敗: ${error}`)
    },
    onSettled: () => {
      setProbingId(null)
    },
  })

  const remediateMutation = useMutation({
    mutationFn: (streamId: number) => {
      setRemediatingId(streamId)
      return streamsApi.remediate(streamId)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['streams'] })
      alert(`修復${data.success ? '成功' : '失敗'}: ${data.total_attempts} 次嘗試`)
    },
    onError: (error) => {
      alert(`修復失敗: ${error}`)
    },
    onSettled: () => {
      setRemediatingId(null)
    },
  })

  const filteredStreams = data?.streams?.filter((stream: Stream) =>
    stream.path.toLowerCase().includes(search.toLowerCase()) ||
    stream.name?.toLowerCase().includes(search.toLowerCase())
  ) || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.streams.title}</h1>
          <p className="text-gray-500 mt-1">{t.streams.subtitle}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            {t.streams.refresh}
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
            <Plus className="w-4 h-4" />
            {t.streams.addStream}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={t.streams.searchStreams}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StreamStatus | '')}
          className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">{t.streams.allStatus}</option>
          <option value="healthy">{t.streams.healthy}</option>
          <option value="degraded">{t.streams.degraded}</option>
          <option value="unhealthy">{t.streams.unhealthy}</option>
          <option value="unknown">{t.streams.unknown}</option>
        </select>
      </div>

      {/* Stream List */}
      <Card padding="none">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        ) : filteredStreams.length > 0 ? (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.streams.stream}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.streams.status}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.streams.fps}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.streams.bitrate}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.streams.latency}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.streams.lastCheck}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t.streams.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredStreams.map((stream: Stream) => (
                <tr key={stream.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Radio className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">{stream.path}</p>
                        {stream.name && (
                          <p className="text-sm text-gray-500">{stream.name}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={stream.status} />
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {stream.fps ? `${stream.fps.toFixed(1)} fps` : '-'}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {stream.bitrate ? `${(stream.bitrate / 1000).toFixed(0)} kbps` : '-'}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {stream.latency_ms ? `${stream.latency_ms} ms` : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {stream.last_check
                      ? new Date(stream.last_check).toLocaleTimeString()
                      : t.streams.never}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => probeMutation.mutate(stream.id)}
                        disabled={probingId === stream.id}
                        className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg disabled:opacity-50"
                        title="Probe Stream"
                      >
                        {probingId === stream.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </button>
                      {stream.auto_remediate && (
                        <button
                          onClick={() => remediateMutation.mutate(stream.id)}
                          disabled={remediatingId === stream.id}
                          className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg disabled:opacity-50"
                          title="Remediate"
                        >
                          {remediatingId === stream.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Wrench className="w-4 h-4" />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => alert(`設定 ${stream.path} (功能開發中)`)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                        title="Settings"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <Radio className="w-12 h-12 text-gray-300 mb-4" />
            <p className="text-gray-500">{t.streams.noStreamsFound}</p>
          </div>
        )}
      </Card>

      {/* Summary */}
      {data && (
        <div className="text-sm text-gray-500">
          {t.streams.showing} {filteredStreams.length} {t.streams.of} {data.total} streams
        </div>
      )}
    </div>
  )
}
