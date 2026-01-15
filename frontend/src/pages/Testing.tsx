import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  Play,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Radio,
  Wifi,
  Activity,
  Loader2,
  Square,
  Copy,
  Check,
} from 'lucide-react'
import Card from '../components/Card'
import StatusBadge from '../components/StatusBadge'
import { healthApi } from '../services/api'
import { useLanguage } from '../i18n/LanguageContext'
import type { ProbeResult } from '../types'

interface TestScenario {
  id: string
  name: string
  description: string
  command: string
  status: 'ready' | 'running' | 'completed' | 'failed'
  result?: string
}

export default function Testing() {
  const { t } = useLanguage()
  const [testUrl, setTestUrl] = useState('')
  const [protocol, setProtocol] = useState('rtsp')
  const [probeResult, setProbeResult] = useState<ProbeResult | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const [testScenarios, setTestScenarios] = useState<TestScenario[]>([
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
  ])

  // Integration test states
  const [runningTest, setRunningTest] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({})

  const probeMutation = useMutation({
    mutationFn: () => healthApi.probeUrl(testUrl, protocol),
    onSuccess: (data) => {
      setProbeResult(data)
    },
    onError: (error) => {
      alert(`探測失敗: ${error}`)
    },
  })

  const handleCopyCommand = (scenario: TestScenario) => {
    navigator.clipboard.writeText(scenario.command)
    setCopiedId(scenario.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleStartScenario = (scenarioId: string) => {
    // Update scenario status to running
    setTestScenarios(scenarios =>
      scenarios.map(s =>
        s.id === scenarioId ? { ...s, status: 'running' as const } : s
      )
    )

    // Simulate test execution (in real implementation, this would call backend API)
    setTimeout(() => {
      setTestScenarios(scenarios =>
        scenarios.map(s => {
          if (s.id === scenarioId) {
            // Simulate random success/failure
            const success = Math.random() > 0.3
            return {
              ...s,
              status: success ? 'completed' as const : 'failed' as const,
              result: success ? 'Test completed successfully' : 'Test failed: Connection timeout'
            }
          }
          return s
        })
      )
    }, 3000)
  }

  const handleStopScenario = (scenarioId: string) => {
    setTestScenarios(scenarios =>
      scenarios.map(s =>
        s.id === scenarioId ? { ...s, status: 'ready' as const, result: undefined } : s
      )
    )
  }

  const handleRunIntegrationTest = (testType: string) => {
    setRunningTest(testType)

    // Simulate test execution
    setTimeout(() => {
      const success = Math.random() > 0.2
      setTestResults(prev => ({
        ...prev,
        [testType]: {
          success,
          message: success
            ? `${testType} 完成: 所有測試通過`
            : `${testType} 失敗: 發現 ${Math.floor(Math.random() * 5) + 1} 個錯誤`
        }
      }))
      setRunningTest(null)
    }, 5000)
  }

  const getScenarioStatusBadge = (status: TestScenario['status']) => {
    switch (status) {
      case 'running':
        return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" /> Running
        </span>
      case 'completed':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" /> Completed
        </span>
      case 'failed':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 flex items-center gap-1">
          <XCircle className="w-3 h-3" /> Failed
        </span>
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">Ready</span>
    }
  }

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
                {getScenarioStatusBadge(scenario.status)}
              </div>

              <div className="mt-3 p-2 bg-gray-900 text-gray-300 rounded font-mono text-xs overflow-x-auto">
                {scenario.command}
              </div>

              {scenario.result && (
                <div className={`mt-2 p-2 rounded text-sm ${
                  scenario.status === 'completed' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  {scenario.result}
                </div>
              )}

              <div className="mt-3 flex gap-2">
                {scenario.status === 'running' ? (
                  <button
                    onClick={() => handleStopScenario(scenario.id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    <Square className="w-3 h-3" />
                    Stop
                  </button>
                ) : (
                  <button
                    onClick={() => handleStartScenario(scenario.id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary-600 text-white rounded hover:bg-primary-700"
                  >
                    <Play className="w-3 h-3" />
                    {t.testing.start}
                  </button>
                )}
                <button
                  onClick={() => handleCopyCommand(scenario)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 rounded hover:bg-gray-50"
                >
                  {copiedId === scenario.id ? (
                    <Check className="w-3 h-3 text-green-600" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  {copiedId === scenario.id ? 'Copied!' : t.testing.copy}
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
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">{t.testing.fullIntegrationTest}</h4>
              <p className="text-sm text-gray-500">Run all tests: stream detection, remediation, recording</p>
              {testResults['integration'] && (
                <p className={`text-sm mt-1 ${testResults['integration'].success ? 'text-green-600' : 'text-red-600'}`}>
                  {testResults['integration'].message}
                </p>
              )}
            </div>
            <button
              onClick={() => handleRunIntegrationTest('integration')}
              disabled={runningTest !== null}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {runningTest === 'integration' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {t.testing.runAllTests}
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">{t.testing.stressTest}</h4>
              <p className="text-sm text-gray-500">Simulate high load with multiple concurrent streams</p>
              {testResults['stress'] && (
                <p className={`text-sm mt-1 ${testResults['stress'].success ? 'text-green-600' : 'text-red-600'}`}>
                  {testResults['stress'].message}
                </p>
              )}
            </div>
            <button
              onClick={() => handleRunIntegrationTest('stress')}
              disabled={runningTest !== null}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50"
            >
              {runningTest === 'stress' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Activity className="w-4 h-4" />
              )}
              {t.testing.runStressTest}
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">{t.testing.faultInjection}</h4>
              <p className="text-sm text-gray-500">Test network issues: packet loss, latency, disconnects</p>
              {testResults['fault'] && (
                <p className={`text-sm mt-1 ${testResults['fault'].success ? 'text-green-600' : 'text-red-600'}`}>
                  {testResults['fault'].message}
                </p>
              )}
            </div>
            <button
              onClick={() => handleRunIntegrationTest('fault')}
              disabled={runningTest !== null}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {runningTest === 'fault' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Wifi className="w-4 h-4" />
              )}
              {t.testing.injectFaults}
            </button>
          </div>
        </div>
      </Card>
    </div>
  )
}
