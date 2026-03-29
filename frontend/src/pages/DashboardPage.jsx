import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { Activity } from 'lucide-react'
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

const GITHUB_REPO = 'https://github.com/Prasanth631/Capstone'
const JENKINS_URL = 'http://localhost:8080'

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
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 transition-colors duration-300">
      {/* ─── Header ─── */}
      <Navbar lastRefresh={lastRefresh} />

      {/* ─── Dashboard Content ─── */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="w-12 h-12 border-4 border-primary-200 dark:border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
          </div>
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
