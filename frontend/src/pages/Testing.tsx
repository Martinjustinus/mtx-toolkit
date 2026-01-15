import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  Play,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Terminal,
  Radio,
  Wifi,
  Activity,
  Loader2,
} from 'lucide-react'
import Card from '../components/Card'
import StatusBadge from '../components/StatusBadge'
import { healthApi } from '../services/api'
import { useLanguage } from '../i18n/LanguageContext'
import type { ProbeResult } from '../types'

export default function Testing() {
  const { t } = useLanguage()
  const [testUrl, setTestUrl] = useState('')
  const [protocol, setProtocol] = useState('rtsp')
  const [probeResult, setProbeResult] = useState<ProbeResult | null>(null)

  const probeMutation = useMutation({
    mutationFn: () => healthApi.probeUrl(testUrl, protocol),
    onSuccess: (data) => {
      setProbeResult(data)
      alert(`探測完成: ${data.is_healthy ? '健康' : '不健康'}`)
    },
    onError: (error) => {
      alert(`探測失敗: ${error}`)
    },
  })

  const testScenarios = [
    {
      id: 'testsrc',
      name: 'FFmpeg Test Source',
      description: 'Generate test pattern stream for validation',
      command: 'ffmpeg -f lavfi -i testsrc=duration=60:size=1280x720:rate=30 -f rtsp rtsp://localhost:8554/test',
      status: 'ready',
    },
    {
      id: 'black',
      name: 'Black Screen Test',
      description: 'Generate black screen to test detection',
      command: 'ffmpeg -f lavfi -i color=black:size=1280x720:rate=30 -t 30 -f rtsp rtsp://localhost:8554/black',
      status: 'ready',
    },
    {
      id: 'silence',
      name: 'Audio Silence Test',
      description: 'Test audio silence detection',
      command: 'ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo -t 30 -f rtsp rtsp://localhost:8554/silent',
      status: 'ready',
    },
    {
      id: 'lowfps',
      name: 'Low FPS Test',
      description: 'Generate low framerate stream',
      command: 'ffmpeg -f lavfi -i testsrc=duration=60:size=1280x720:rate=5 -f rtsp rtsp://localhost:8554/lowfps',
      status: 'ready',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.testing.title}</h1>
          <p className="text-gray-500 mt-1">{t.testing.subtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stream Probe */}
        <Card title={t.testing.streamProbe} subtitle={t.testing.testUrlHealthCheck}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.testing.streamUrl}
              </label>
              <input
                type="text"
                value={testUrl}
                onChange={(e) => setTestUrl(e.target.value)}
                placeholder="rtsp://localhost:8554/stream"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.testing.protocol}
              </label>
              <select
                value={protocol}
                onChange={(e) => setProtocol(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="rtsp">RTSP</option>
                <option value="rtmp">RTMP</option>
                <option value="hls">HLS</option>
                <option value="webrtc">WebRTC</option>
              </select>
            </div>

            <button
              onClick={() => probeMutation.mutate()}
              disabled={!testUrl || probeMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {probeMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {t.testing.runProbe}
            </button>
          </div>
        </Card>

        {/* Probe Result */}
        <Card title={t.testing.probeResult} subtitle="Analysis output">
          {probeResult ? (
            <div className="space-y-4">
              {/* Status */}
              <div className={`p-4 rounded-lg ${
                probeResult.is_healthy
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {probeResult.is_healthy ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-600" />
                  )}
                  <span className="font-semibold text-lg">
                    {probeResult.is_healthy ? t.testing.streamHealthy : t.testing.streamUnhealthy}
                  </span>
                </div>
                <StatusBadge status={probeResult.status} />
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">{t.streams.fps}</p>
                  <p className="text-lg font-semibold">{probeResult.fps?.toFixed(1) || '-'}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">{t.streams.bitrate}</p>
                  <p className="text-lg font-semibold">
                    {probeResult.bitrate ? `${(probeResult.bitrate / 1000).toFixed(0)} kbps` : '-'}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Resolution</p>
                  <p className="text-lg font-semibold">
                    {probeResult.width && probeResult.height
                      ? `${probeResult.width}x${probeResult.height}`
                      : '-'}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Codec</p>
                  <p className="text-lg font-semibold">{probeResult.codec || '-'}</p>
                </div>
              </div>

              {/* Issues */}
              {probeResult.issues && probeResult.issues.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">{t.testing.issuesDetected}</h4>
                  <ul className="space-y-2">
                    {probeResult.issues.map((issue, i) => (
                      <li key={i} className="flex items-center gap-2 text-yellow-700">
                        <AlertTriangle className="w-4 h-4" />
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Error */}
              {probeResult.error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700">{probeResult.error}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Radio className="w-12 h-12 mb-4" />
              <p>{t.testing.runProbeSeeResults}</p>
            </div>
          )}
        </Card>
      </div>

      {/* Test Scenarios */}
      <Card title={t.testing.testScenarios} subtitle={t.testing.preConfiguredTestStreams}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {testScenarios.map((scenario) => (
            <div
              key={scenario.id}
              className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-medium text-gray-900">{scenario.name}</h4>
                  <p className="text-sm text-gray-500">{scenario.description}</p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  scenario.status === 'running'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {scenario.status}
                </span>
              </div>

              <div className="mt-3 p-2 bg-gray-900 text-gray-300 rounded font-mono text-xs overflow-x-auto">
                {scenario.command}
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => alert('測試場景啟動功能開發中')}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary-600 text-white rounded hover:bg-primary-700"
                >
                  <Play className="w-3 h-3" />
                  {t.testing.start}
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(scenario.command)
                    alert('已複製到剪貼簿')
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 rounded hover:bg-gray-50"
                >
                  <Terminal className="w-3 h-3" />
                  {t.testing.copy}
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Integration Test Suite */}
      <Card title={t.testing.integrationTestSuite} subtitle={t.testing.automatedTestRunners}>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">{t.testing.fullIntegrationTest}</h4>
              <p className="text-sm text-gray-500">Run all tests: stream detection, remediation, recording</p>
            </div>
            <button
              onClick={() => alert('整合測試功能開發中')}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Play className="w-4 h-4" />
              {t.testing.runAllTests}
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">{t.testing.stressTest}</h4>
              <p className="text-sm text-gray-500">Simulate high load with multiple concurrent streams</p>
            </div>
            <button
              onClick={() => alert('壓力測試功能開發中')}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
            >
              <Activity className="w-4 h-4" />
              {t.testing.runStressTest}
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">{t.testing.faultInjection}</h4>
              <p className="text-sm text-gray-500">Test network issues: packet loss, latency, disconnects</p>
            </div>
            <button
              onClick={() => alert('故障注入功能開發中')}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <Wifi className="w-4 h-4" />
              {t.testing.injectFaults}
            </button>
          </div>
        </div>
      </Card>
    </div>
  )
}
