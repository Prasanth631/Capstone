import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { LogOut, Cpu, Activity } from 'lucide-react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
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

  useEffect(() => {
    // Listen directly to the aggregated dashboard document in Firestore in real-time
    const unsub = onSnapshot(doc(db, 'dashboard', 'overview'), (docSnap) => {
      if (docSnap.exists()) {
        const payload = docSnap.data()
        setData({
          builds: payload.recentBuilds || [],
          pipelineStatus: payload.pipelines || [],
          metrics: payload.metrics || {},
          testResults: payload.testResults || {},
          dockerStatus: payload.dockerStatus || {},
          k8sStatus: payload.k8sStatus || {},
          buildAnalytics: payload.buildAnalytics || {},
        })
        setLastRefresh(new Date(payload.lastUpdated || Date.now()))
        setLoading(false)
      } else {
        setLoading(false)
      }
    }, (error) => {
      console.error("Firebase real-time stream error:", error)
      setLoading(false)
    })

    return () => unsub()
  }, [])

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
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <Activity className="w-3 h-3 animate-pulse" />
              <span>Live Stream Connected</span>
              <span className="text-white/40 ml-2">· Updated {lastRefresh.toLocaleTimeString()}</span>
            </div>
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
