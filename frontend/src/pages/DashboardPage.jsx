import { useCallback, useEffect, useRef, useState } from 'react'
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
import SecurityScanPanel from '../components/SecurityScanPanel'
import PrometheusMetricsPanel from '../components/PrometheusMetricsPanel'
import api from '../api/axios'
import { db, firebaseAuth, isFirebaseConfigured } from '../firebase'

const API_POLL_INTERVAL_MS = 10000

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
  const normalized = normalizeBuildRecord(data, snapshot.id)
  return {
    ...normalized,
    _docId: snapshot.id,
  }
}

function normalizeBuildRecord(record, fallbackId) {
  const data = record || {}
  const buildNumber = Number(data.buildNumber || 0)
  const startTime = Number(data.startTime || 0)
  const endTime = Number(data.endTime || 0)
  const totalDuration = Number(data.totalDuration || 0)
  const idFromData = data._docId
  const safeId = idFromData || `${data.jobName || 'job'}-${buildNumber}-${startTime}-${fallbackId || 'build'}`

  return {
    ...data,
    _docId: safeId,
    buildNumber,
    startTime,
    endTime,
    totalDuration,
    stages: Array.isArray(data.stages) ? data.stages : [],
  }
}

function mapSimpleDoc(snapshot) {
  const data = snapshot.data() || {}
  return { id: snapshot.id, ...data }
}

function latestStageFromBuild(build) {
  const stages = Array.isArray(build?.stages) ? build.stages : []
  let latest = null

  for (const stage of stages) {
    if (!stage || stage.status === 'PENDING') continue
    if (!latest || Number(stage.order || 0) >= Number(latest.order || 0)) {
      latest = stage
    }
  }

  return latest
}

function deriveLiveEventsFromBuilds(builds) {
  return (builds || [])
    .slice(0, 30)
    .map((build) => {
      const stage = latestStageFromBuild(build)
      return {
        id: `api-event-${build._docId}`,
        jobName: build.jobName,
        buildNumber: build.buildNumber,
        eventSequence: 0,
        eventTimestamp: Number(build.endTime || build.startTime || Date.now()),
        stageOrder: stage?.order || 0,
        stage: stage?.name || 'Pipeline',
        stageStatus: stage?.status || build.overallStatus || 'PENDING',
        overallStatus: build.overallStatus || 'PENDING',
        jenkinsUrl: build.jenkinsUrl,
      }
    })
}

function deriveDeploymentsFromK8sStatus(k8sStatus) {
  const namespaces = Array.isArray(k8sStatus?.namespaces) ? k8sStatus.namespaces : []
  const now = Date.now()

  return namespaces.map((ns, index) => {
    const health = String(ns?.replicaHealth || '').toLowerCase()
    let status = 'PENDING'
    if (health === 'healthy') status = 'SUCCESS'
    if (health === 'degraded' || health === 'unhealthy' || health === 'failed') status = 'FAILURE'

    return {
      id: `api-deploy-${ns?.namespace || index}`,
      namespace: ns?.namespace || `env-${index}`,
      status,
      timestamp: now,
      buildNumber: 0,
      source: 'backend-api',
    }
  })
}

function mergeBuildArrays(existing, incoming) {
  const merged = new Map()

  for (const build of existing || []) {
    merged.set(build._docId, build)
  }
  for (const build of incoming || []) {
    const previous = merged.get(build._docId)
    merged.set(build._docId, previous ? { ...previous, ...build } : build)
  }

  return Array.from(merged.values()).sort(
    (a, b) => Number(b.startTime || 0) - Number(a.startTime || 0)
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
  const [connectionStatus, setConnectionStatus] = useState('connecting')
  const [firebaseReady, setFirebaseReady] = useState(false)
  const [useApiFallback, setUseApiFallback] = useState(false)
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

  const loadDashboardSnapshotFromApi = useCallback(async () => {
    try {
      const responses = await Promise.allSettled([
        api.get('/dashboard/pipeline-status'),
        api.get('/dashboard/metrics'),
        api.get('/dashboard/test-results'),
        api.get('/dashboard/docker-status'),
        api.get('/dashboard/k8s-status'),
        api.get('/dashboard/build-analytics'),
        api.get('/dashboard/builds', { params: { limit: pageSize } }),
      ])

      const fulfilledCount = responses.filter((result) => result.status === 'fulfilled').length
      if (fulfilledCount === 0) {
        throw new Error('Dashboard API requests failed')
      }

      const pickPayload = (result, fallback) => {
        if (result.status === 'fulfilled') {
          return result.value?.data?.data ?? fallback
        }
        return fallback
      }

      const pipelineStatus = pickPayload(responses[0], [])
      const metrics = pickPayload(responses[1], {})
      const testResults = pickPayload(responses[2], {})
      const dockerStatus = pickPayload(responses[3], {})
      const k8sStatus = pickPayload(responses[4], {})
      const buildAnalytics = pickPayload(responses[5], {})
      const buildPage = pickPayload(responses[6], { builds: [], nextCursor: null })

      const builds = (buildPage?.builds || []).map((build, index) =>
        normalizeBuildRecord(build, `api-${index}`)
      )
      const deployments = deriveDeploymentsFromK8sStatus(k8sStatus)
      const liveEvents = deriveLiveEventsFromBuilds(builds)

      const now = Date.now()
      const pipelineLastUpdated = Math.max(
        ...pipelineStatus.map((pipeline) => Number(pipeline?.endTime || pipeline?.startTime || 0)),
        ...builds.map((build) => Number(build?.endTime || build?.startTime || 0)),
        0
      ) || now

      const nextData = {
        pipelineStatus,
        metrics,
        testResults,
        dockerStatus,
        k8sStatus,
        buildAnalytics,
        pipelineFreshness: {},
        pipelineLastUpdated,
        metricsLastUpdated: now,
      }

      setData(nextData)
      setBuildHistory(builds)
      setBuildCursor(buildPage?.nextCursor ?? null)
      setHasMoreBuilds(Boolean(buildPage?.nextCursor))
      setLiveEvents(liveEvents)
      setDeployments(deployments)
      setLastRefresh(new Date(now))
      setConnectionStatus('api-fallback')
      setUsingFallback(true)
      setLoading(false)
      setHistoryLoading(false)

      lastGoodRef.current = {
        data: nextData,
        buildHistory: builds,
        liveEvents,
        deployments,
        cursor: buildPage?.nextCursor ?? null,
        hasMoreBuilds: Boolean(buildPage?.nextCursor),
        lastRefresh: new Date(now),
      }
    } catch (error) {
      console.error('Dashboard API fallback failed:', error)
      const cached = lastGoodRef.current

      if (cached.data) {
        setData(cached.data)
        setBuildHistory(cached.buildHistory || [])
        setLiveEvents(cached.liveEvents || [])
        setDeployments(cached.deployments || [])
        setBuildCursor(cached.cursor ?? null)
        setHasMoreBuilds(Boolean(cached.hasMoreBuilds))
        setLastRefresh(cached.lastRefresh || new Date())
      }

      setConnectionStatus('error')
      setUsingFallback(true)
      setLoading(false)
      setHistoryLoading(false)
    }
  }, [pageSize])

  useEffect(() => {
    let active = true

    const bootstrapFirebaseSession = async () => {
      if (!isFirebaseConfigured()) {
        setConnectionStatus('api-fallback')
        setUseApiFallback(true)
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
        setUseApiFallback(false)
        setUsingFallback(false)
        setConnectionStatus('connecting')
      } catch (error) {
        console.warn('Firebase auth bootstrap failed, switching to API fallback:', error.message)
        if (!active) return
        setFirebaseReady(false)
        setConnectionStatus('api-fallback')
        setUseApiFallback(true)
      }
    }

    bootstrapFirebaseSession()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!useApiFallback) {
      return undefined
    }

    let cancelled = false

    const pollApiSnapshot = async () => {
      if (cancelled) return
      await loadDashboardSnapshotFromApi()
    }

    pollApiSnapshot()
    const intervalId = setInterval(pollApiSnapshot, API_POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(intervalId)
    }
  }, [loadDashboardSnapshotFromApi, useApiFallback])

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

    const switchToApiFallback = () => {
      setFirebaseReady(false)
      setUseApiFallback(true)
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
        setUseApiFallback(false)
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
        switchToApiFallback()
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
        setUseApiFallback(false)
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
        switchToApiFallback()
      }
    )

    const eventsUnsub = onSnapshot(
      query(collection(db, 'dashboardEvents'), orderBy('eventTimestamp', 'desc'), limit(50)),
      (snapshot) => {
        const events = snapshot.docs.map(mapSimpleDoc)
        setLiveEvents(events)
        setConnectionStatus('connected')
        setUseApiFallback(false)
        setUsingFallback(false)
        lastGoodRef.current = { ...lastGoodRef.current, liveEvents: events }
      },
      (error) => {
        console.error('Dashboard events stream error:', error)
        applyFallback()
        switchToApiFallback()
      }
    )

    const deploymentsUnsub = onSnapshot(
      query(collection(db, 'deployments'), orderBy('timestamp', 'desc'), limit(30)),
      (snapshot) => {
        const deploymentEvents = snapshot.docs.map(mapSimpleDoc)
        setDeployments(deploymentEvents)
        setConnectionStatus('connected')
        setUseApiFallback(false)
        setUsingFallback(false)
        lastGoodRef.current = { ...lastGoodRef.current, deployments: deploymentEvents }
      },
      (error) => {
        console.error('Deployments stream error:', error)
        applyFallback()
        switchToApiFallback()
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
    if (useApiFallback) {
      if (!hasMoreBuilds || historyLoadingMore || !buildCursor) {
        return
      }

      setHistoryLoadingMore(true)
      try {
        const response = await api.get('/dashboard/builds', {
          params: {
            limit: pageSize,
            cursor: buildCursor,
          },
        })

        const page = response.data?.data || { builds: [], nextCursor: null }
        const nextBuilds = (page.builds || []).map((build, index) =>
          normalizeBuildRecord(build, `api-next-${index}`)
        )

        setBuildHistory((prev) => mergeBuildArrays(prev, nextBuilds))
        setBuildCursor(page.nextCursor || null)
        setHasMoreBuilds(Boolean(page.nextCursor))
        setConnectionStatus('api-fallback')
        setUsingFallback(true)
      } catch (error) {
        console.error('Failed to load more API builds:', error)
        setConnectionStatus('error')
        setUsingFallback(true)
      } finally {
        setHistoryLoadingMore(false)
      }
      return
    }

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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <SystemMetricsPanel metrics={data.metrics} />
              <TestResultsSummary results={data.testResults} />
              <SecurityScanPanel />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DockerStatusPanel status={data.dockerStatus} />
              <KubernetesPanel status={data.k8sStatus} />
            </div>

            <PrometheusMetricsPanel />

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
