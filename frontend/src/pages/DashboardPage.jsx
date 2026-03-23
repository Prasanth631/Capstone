import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import { LogOut, Cpu, RefreshCw, Activity } from 'lucide-react'
import PipelineStatusPanel from '../components/PipelineStatusPanel'
import BuildHistoryTable from '../components/BuildHistoryTable'
import TestResultsSummary from '../components/TestResultsSummary'
import DockerStatusPanel from '../components/DockerStatusPanel'
import KubernetesPanel from '../components/KubernetesPanel'
import SystemMetricsPanel from '../components/SystemMetricsPanel'
import BuildAnalytics from '../components/BuildAnalytics'

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const [data, setData] = useState({
    builds: [],
    pipelineStatus: [],
    metrics: {},
    testResults: {},
    dockerStatus: {},
    k8sStatus: {},
    buildAnalytics: {},
  })
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const fetchAll = useCallback(async () => {
    try {
      const [builds, pipeline, metrics, tests, docker, k8s, analytics] = await Promise.allSettled([
        api.get('/dashboard/builds?limit=20'),
        api.get('/dashboard/pipeline-status'),
        api.get('/dashboard/metrics'),
        api.get('/dashboard/test-results'),
        api.get('/dashboard/docker-status'),
        api.get('/dashboard/k8s-status'),
        api.get('/dashboard/build-analytics'),
      ])

      setData({
        builds: builds.status === 'fulfilled' ? builds.value.data.data || [] : [],
        pipelineStatus: pipeline.status === 'fulfilled' ? pipeline.value.data.data || [] : [],
        metrics: metrics.status === 'fulfilled' ? metrics.value.data.data || {} : {},
        testResults: tests.status === 'fulfilled' ? tests.value.data.data || {} : {},
        dockerStatus: docker.status === 'fulfilled' ? docker.value.data.data || {} : {},
        k8sStatus: k8s.status === 'fulfilled' ? k8s.value.data.data || {} : {},
        buildAnalytics: analytics.status === 'fulfilled' ? analytics.value.data.data || {} : {},
      })
      setLastRefresh(new Date())
    } catch (err) {
      console.error('Dashboard fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, 30000)
    return () => clearInterval(interval)
  }, [fetchAll])

  return (
    <div className="min-h-screen bg-surface-900">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-card rounded-none border-x-0 border-t-0">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">DevOps Intelligence</h1>
              <p className="text-xs text-white/40">Real-time Monitoring Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-white/40">
              <Activity className="w-3 h-3 text-emerald-400 animate-pulse" />
              <span>Live</span>
              <span>· Updated {lastRefresh.toLocaleTimeString()}</span>
            </div>
            <button onClick={fetchAll} className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-400 to-purple-500 flex items-center justify-center text-[10px] font-bold text-white">
                {user?.username?.[0]?.toUpperCase() || 'U'}
              </div>
              <span className="text-sm text-white/70">{user?.username}</span>
            </div>
            <button onClick={logout} className="p-2 rounded-lg hover:bg-red-500/20 transition-colors text-white/60 hover:text-red-400" title="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Dashboard Grid */}
      <main className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Row 1: Build Analytics Cards */}
            <BuildAnalytics data={data.buildAnalytics} />

            {/* Row 2: Pipeline Status */}
            <PipelineStatusPanel pipelines={data.pipelineStatus} />

            {/* Row 3: System Metrics + Test Results */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SystemMetricsPanel metrics={data.metrics} />
              <TestResultsSummary results={data.testResults} />
            </div>

            {/* Row 4: Docker + Kubernetes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DockerStatusPanel status={data.dockerStatus} />
              <KubernetesPanel status={data.k8sStatus} />
            </div>

            {/* Row 5: Build History Table */}
            <BuildHistoryTable builds={data.builds} />
          </>
        )}
      </main>
    </div>
  )
}
