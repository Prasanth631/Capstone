import { useEffect, useRef, useState } from 'react'
import { signInWithCustomToken } from 'firebase/auth'
import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
} from 'firebase/firestore'
import Navbar from '../components/Navbar'
import PipelineStatusPanel from '../components/PipelineStatusPanel'
import BuildHistoryTable from '../components/BuildHistoryTable'
import TestResultsSummary from '../components/TestResultsSummary'
import DockerStatusPanel from '../components/DockerStatusPanel'
import KubernetesPanel from '../components/KubernetesPanel'
import SystemMetricsPanel from '../components/SystemMetricsPanel'
import BuildAnalytics from '../components/BuildAnalytics'
import ConnectionStateBanner from '../components/ConnectionStateBanner'
import LiveEventStreamPanel from '../components/LiveEventStreamPanel'
import DeploymentHealthPanel from '../components/DeploymentHealthPanel'
import FailureSpotlightCard from '../components/FailureSpotlightCard'
import OpsKpiSummary from '../components/OpsKpiSummary'
import api from '../api/axios'
import { db, firebaseAuth, isFirebaseConfigured } from '../firebase'
import { useAuth } from '../context/AuthContext'

function SkeletonCard({ className = '' }) {
  return (
    <div className={`glass-card p-6 animate-pulse ${className}`}>
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
      <SkeletonCard />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="glass-card p-5 animate-pulse">
            <div className="h-3 w-16 bg-surface-200 dark:bg-white/10 rounded mb-3" />
            <div className="h-7 w-20 bg-surface-200 dark:bg-white/10 rounded" />
          </div>
        ))}
      </div>
      <SkeletonCard className="h-36" />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <SkeletonCard className="min-h-[340px]" />
        <SkeletonCard className="min-h-[340px]" />
      </div>
    </div>
  )
}

function mapBuildDoc(snapshot) {
  const data = snapshot.data() || {}
  return {
    _docId: snapshot.id,
    ...data,
    buildNumber: Number(data.buildNumber || 0),
    startTime: Number(data.startTime || 0),
    endTime: Number(data.endTime || 0),
    totalDuration: Number(data.totalDuration || 0),
  }
}

function mapSimpleDoc(snapshot) {
  const data = snapshot.data() || {}
  return { id: snapshot.id, ...data }
}

export default function DashboardPage() {
  const pageSize = 40
  const { token, user } = useAuth()

  const [data, setData] = useState({
    pipelineStatus: [],
    metrics: {},
    testResults: {},
    dockerStatus: {},
    k8sStatus: {},
    buildAnalytics: {},
    pipelineFreshness: {},
    pipelineLastUpdated: 0,
    metricsLastUpdated: 0,
  })
  const [buildHistory, setBuildHistory] = useState([])
  const [buildCursor, setBuildCursor] = useState(null)
  const [hasMoreBuilds, setHasMoreBuilds] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyLoadingMore, setHistoryLoadingMore] = useState(false)
  const [liveEvents, setLiveEvents] = useState([])
  const [deployments, setDeployments] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [connectionStatus, setConnectionStatus] = useState('authenticating')
  const [firebaseReady, setFirebaseReady] = useState(false)
  const [usingFallback, setUsingFallback] = useState(false)

  const lastGoodRef = useRef({
    data: null,
    buildHistory: [],
    liveEvents: [],
    deployments: [],
    cursor: null,
    hasMoreBuilds: true,
    lastRefresh: new Date(),
  })

  useEffect(() => {
    let active = true

    const bootstrapFirebaseSession = async () => {
      if (!token) {
        setFirebaseReady(false)
        return
      }
      if (!isFirebaseConfigured()) {
        setConnectionStatus('error')
        setLoading(false)
        return
      }

      setConnectionStatus('authenticating')
      try {
        const response = await api.get('/dashboard/firebase-token')
        const firebaseToken = response.data?.data?.token
        if (!firebaseToken) {
          throw new Error('Backend did not return Firebase token')
        }

        await signInWithCustomToken(firebaseAuth, firebaseToken)
        if (!active) return
        setFirebaseReady(true)
        setConnectionStatus('connecting')
      } catch (error) {
        console.error('Firebase auth bootstrap failed:', error)
        if (!active) return
        setFirebaseReady(false)
        setConnectionStatus('error')
        setLoading(false)
      }
    }

    bootstrapFirebaseSession()

    return () => {
      active = false
    }
  }, [token, user?.username])

  useEffect(() => {
    if (!firebaseReady) {
      return undefined
    }

    setConnectionStatus('connecting')
    setLoading(true)
    setHistoryLoading(true)

    const applyFallback = () => {
      const cached = lastGoodRef.current
      if (cached.data) setData(cached.data)
      if (cached.buildHistory) setBuildHistory(cached.buildHistory)
      if (cached.liveEvents) setLiveEvents(cached.liveEvents)
      if (cached.deployments) setDeployments(cached.deployments)
      if (cached.cursor !== undefined) setBuildCursor(cached.cursor)
      if (cached.hasMoreBuilds !== undefined) setHasMoreBuilds(cached.hasMoreBuilds)
      if (cached.lastRefresh) setLastRefresh(cached.lastRefresh)
      setLoading(false)
      setHistoryLoading(false)
      setConnectionStatus('recovering')
      setUsingFallback(true)
    }

    const overviewUnsub = onSnapshot(
      doc(db, 'dashboard', 'overview'),
      (docSnap) => {
        if (!docSnap.exists()) {
          setConnectionStatus('no-data')
          setLoading(false)
          return
        }

        const payload = docSnap.data()
        const nextState = {
          pipelineStatus: payload.pipelines || [],
          metrics: payload.metrics || {},
          testResults: payload.testResults || {},
          dockerStatus: payload.dockerStatus || {},
          k8sStatus: payload.k8sStatus || {},
          buildAnalytics: payload.buildAnalytics || {},
          pipelineFreshness: payload.pipelineFreshness || {},
          pipelineLastUpdated: Number(payload.pipelineLastUpdated || payload.lastUpdated || 0),
          metricsLastUpdated: Number(payload.metricsLastUpdated || payload.lastUpdated || 0),
        }

        setData(nextState)
        setLastRefresh(new Date(payload.lastUpdated || Date.now()))
        setConnectionStatus('connected')
        setUsingFallback(false)
        setLoading(false)

        lastGoodRef.current = {
          ...lastGoodRef.current,
          data: nextState,
          lastRefresh: new Date(payload.lastUpdated || Date.now()),
        }
      },
      (error) => {
        console.error('Dashboard overview stream error:', error)
        applyFallback()
      }
    )

    const buildsUnsub = onSnapshot(
      query(collection(db, 'builds'), orderBy('startTime', 'desc'), limit(pageSize)),
      (snapshot) => {
        const builds = snapshot.docs.map(mapBuildDoc)
        const cursor = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null

        setBuildHistory(builds)
        setBuildCursor(cursor)
        setHasMoreBuilds(snapshot.docs.length === pageSize)
        setHistoryLoading(false)
        setConnectionStatus('connected')
        setUsingFallback(false)

        lastGoodRef.current = {
          ...lastGoodRef.current,
          buildHistory: builds,
          cursor,
          hasMoreBuilds: snapshot.docs.length === pageSize,
        }
      },
      (error) => {
        console.error('Build history stream error:', error)
        applyFallback()
      }
    )

    const eventsUnsub = onSnapshot(
      query(collection(db, 'dashboardEvents'), orderBy('eventTimestamp', 'desc'), limit(50)),
      (snapshot) => {
        const events = snapshot.docs.map(mapSimpleDoc)
        setLiveEvents(events)
        setConnectionStatus('connected')
        setUsingFallback(false)
        lastGoodRef.current = { ...lastGoodRef.current, liveEvents: events }
      },
      (error) => {
        console.error('Dashboard events stream error:', error)
        applyFallback()
      }
    )

    const deploymentsUnsub = onSnapshot(
      query(collection(db, 'deployments'), orderBy('timestamp', 'desc'), limit(30)),
      (snapshot) => {
        const deploymentEvents = snapshot.docs.map(mapSimpleDoc)
        setDeployments(deploymentEvents)
        setConnectionStatus('connected')
        setUsingFallback(false)
        lastGoodRef.current = { ...lastGoodRef.current, deployments: deploymentEvents }
      },
      (error) => {
        console.error('Deployments stream error:', error)
        applyFallback()
      }
    )

    return () => {
      overviewUnsub()
      buildsUnsub()
      eventsUnsub()
      deploymentsUnsub()
    }
  }, [firebaseReady])

  const loadMoreBuilds = async () => {
    if (!hasMoreBuilds || historyLoadingMore || !buildCursor) {
      return
    }
    setHistoryLoadingMore(true)

    try {
      const cursorStartTime = buildCursor.data()?.startTime
      const nextSnapshot = await getDocs(
        query(
          collection(db, 'builds'),
          orderBy('startTime', 'desc'),
          startAfter(cursorStartTime),
          limit(pageSize)
        )
      )

      const nextBuilds = nextSnapshot.docs.map(mapBuildDoc)
      const nextCursor = nextSnapshot.docs.length > 0 ? nextSnapshot.docs[nextSnapshot.docs.length - 1] : null

      setBuildHistory((prev) => {
        const merged = [...prev]
        for (const build of nextBuilds) {
          if (!merged.some((item) => item._docId === build._docId)) {
            merged.push(build)
          }
        }
        return merged
      })
      setBuildCursor(nextCursor)
      setHasMoreBuilds(nextSnapshot.docs.length === pageSize)
    } catch (error) {
      console.error('Failed to load more Firestore builds:', error)
      setConnectionStatus('recovering')
      setUsingFallback(true)
    } finally {
      setHistoryLoadingMore(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 transition-colors duration-300">
      <Navbar lastRefresh={lastRefresh} />

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        {loading ? (
          <DashboardSkeleton />
        ) : (
          <>
            <ConnectionStateBanner
              connectionStatus={connectionStatus}
              pipelineLastUpdated={data.pipelineLastUpdated}
              metricsLastUpdated={data.metricsLastUpdated}
              usingFallback={usingFallback}
            />

            <BuildAnalytics data={data.buildAnalytics} />

            <OpsKpiSummary
              analytics={data.buildAnalytics}
              testResults={data.testResults}
              deployments={deployments}
              pipelineLastUpdated={data.pipelineLastUpdated}
            />

            <PipelineStatusPanel pipelines={data.pipelineStatus} />

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <LiveEventStreamPanel events={liveEvents} />
              <DeploymentHealthPanel deployments={deployments} />
            </div>

            <FailureSpotlightCard
              events={liveEvents}
              successRate={data.buildAnalytics?.successRate}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SystemMetricsPanel metrics={data.metrics} />
              <TestResultsSummary results={data.testResults} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DockerStatusPanel status={data.dockerStatus} />
              <KubernetesPanel status={data.k8sStatus} />
            </div>

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
