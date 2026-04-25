import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import api from '../api/axios'
import PipelineStatusPanel from '../components/PipelineStatusPanel'
import BuildHistoryTable from '../components/BuildHistoryTable'
import TestResultsSummary from '../components/TestResultsSummary'
import DockerStatusPanel from '../components/DockerStatusPanel'
import KubernetesPanel from '../components/KubernetesPanel'
import SystemMetricsPanel from '../components/SystemMetricsPanel'
import BuildAnalytics from '../components/BuildAnalytics'

function SkeletonCard({ className = '' }) {
  return (
    <div className={`glass-card p-6 animate-pulse ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-surface-200 dark:bg-white/10 rounded-lg" />
        <div className="h-4 w-32 bg-surface-200 dark:bg-white/10 rounded" />
      </div>
      <div className="space-y-3">
        <div className="h-3 w-full bg-surface-200 dark:bg-white/10 rounded" />
        <div className="h-3 w-3/4 bg-surface-200 dark:bg-white/10 rounded" />
        <div className="h-3 w-1/2 bg-surface-200 dark:bg-white/10 rounded" />
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* KPI Cards skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="glass-card p-5 animate-pulse" style={{ animationDelay: `${i * 100}ms` }}>
            <div className="flex items-center justify-between mb-3">
              <div className="h-3 w-16 bg-surface-200 dark:bg-white/10 rounded" />
              <div className="w-8 h-8 bg-surface-200 dark:bg-white/10 rounded-lg" />
            </div>
            <div className="h-7 w-20 bg-surface-200 dark:bg-white/10 rounded" />
          </div>
        ))}
      </div>
      {/* Pipeline skeleton */}
      <SkeletonCard className="h-32" />
      {/* Metrics row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonCard className="min-h-[220px]" />
        <SkeletonCard className="min-h-[220px]" />
      </div>
      {/* Docker + K8s row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonCard className="h-[300px]" />
        <SkeletonCard className="h-[300px]" />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const pageSize = 40
  const [data, setData] = useState({
    pipelineStatus: [],
    metrics: {},
    testResults: {},
    dockerStatus: {},
    k8sStatus: {},
    buildAnalytics: {},
  })
  const [buildHistory, setBuildHistory] = useState([])
  const [buildsCursor, setBuildsCursor] = useState(null)
  const [hasMoreBuilds, setHasMoreBuilds] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyLoadingMore, setHistoryLoadingMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [connectionStatus, setConnectionStatus] = useState('connecting')

  const fetchBuildPage = async (cursor = null, append = false) => {
    if (append) {
      setHistoryLoadingMore(true)
    } else {
      setHistoryLoading(true)
    }
    try {
      const response = await api.get('/dashboard/builds', {
        params: { limit: pageSize, ...(cursor ? { cursor } : {}) }
      })
      const payload = response.data?.data || {}
      const builds = Array.isArray(payload.builds) ? payload.builds : []
      const nextCursor = payload.nextCursor || null
      setBuildHistory((prev) => (append ? [...prev, ...builds] : builds))
      setBuildsCursor(nextCursor)
      setHasMoreBuilds(Boolean(nextCursor))
    } catch (error) {
      console.error('Failed to fetch build history page:', error)
      if (!append) {
        setBuildHistory([])
        setHasMoreBuilds(false)
      }
    } finally {
      if (append) setHistoryLoadingMore(false)
      else setHistoryLoading(false)
    }
  }

  const loadMoreBuilds = () => {
    if (!hasMoreBuilds || historyLoadingMore) return
    fetchBuildPage(buildsCursor, true)
  }

  useEffect(() => { fetchBuildPage(null, false) }, [])

  useEffect(() => {
    setConnectionStatus('connecting')
    const unsub = onSnapshot(doc(db, 'dashboard', 'overview'), (docSnap) => {
      if (docSnap.exists()) {
        const payload = docSnap.data()
        setData({
          pipelineStatus: payload.pipelines || [],
          metrics: payload.metrics || {},
          testResults: payload.testResults || {},
          dockerStatus: payload.dockerStatus || {},
          k8sStatus: payload.k8sStatus || {},
          buildAnalytics: payload.buildAnalytics || {},
        })
        setLastRefresh(new Date(payload.lastUpdated || Date.now()))
        setConnectionStatus('connected')
        setLoading(false)
      } else {
        setConnectionStatus('no-data')
        setLoading(false)
      }
    }, (error) => {
      console.error("Firebase real-time stream error:", error)
      setConnectionStatus('error')
      setLoading(false)
    })
    return () => unsub()
  }, [])

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 transition-colors duration-300">
      {/* ─── Header ─── */}
      <Navbar lastRefresh={lastRefresh} />

      {/* ─── Dashboard Content ─── */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        {loading ? (
          <DashboardSkeleton />
        ) : (
          <>
            {/* Row 1: Build Analytics KPI Cards */}
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
            <BuildHistoryTable
              builds={buildHistory}
              loading={historyLoading}
              hasMore={hasMoreBuilds}
              loadingMore={historyLoadingMore}
              onLoadMore={loadMoreBuilds}
            />
          </>
        )}
      </main>
    </div>
  )
}
