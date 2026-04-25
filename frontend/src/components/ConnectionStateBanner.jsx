import { AlertTriangle, CheckCircle2, RefreshCw, WifiOff, ShieldCheck, Radio, Zap } from 'lucide-react'

const STATUS_STYLES = {
  authenticating: {
    icon: ShieldCheck,
    text: 'Authenticating realtime session…',
    className: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300',
    hide: false,
  },
  connecting: {
    icon: RefreshCw,
    text: 'Connecting to live Firestore streams…',
    className: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300',
    hide: false,
  },
  connected: {
    icon: Zap,
    text: 'Live — Firestore realtime stream active',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
    hide: true, // auto-hide after 5 seconds when healthy
  },
  'api-fallback': {
    icon: Radio,
    text: 'Live — Polling backend APIs for dashboard data',
    className: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300',
    hide: false,
  },
  recovering: {
    icon: RefreshCw,
    text: 'Reconnecting… showing cached data',
    className: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300',
    hide: false,
  },
  'no-data': {
    icon: AlertTriangle,
    text: 'Connected — waiting for first pipeline data to arrive',
    className: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-white/20 dark:bg-white/5 dark:text-slate-200',
    hide: false,
  },
  error: {
    icon: WifiOff,
    text: 'Connection lost — showing last known state',
    className: 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300',
    hide: false,
  },
}

function timeAgo(ts) {
  if (!ts) return 'n/a'
  const deltaSec = Math.max(Math.floor((Date.now() - ts) / 1000), 0)
  if (deltaSec < 5) return 'just now'
  if (deltaSec < 60) return `${deltaSec}s ago`
  if (deltaSec < 3600) return `${Math.floor(deltaSec / 60)}m ago`
  return `${Math.floor(deltaSec / 3600)}h ago`
}

export default function ConnectionStateBanner({
  connectionStatus,
  pipelineLastUpdated,
  metricsLastUpdated,
  usingFallback = false,
}) {
  const current = STATUS_STYLES[connectionStatus] || STATUS_STYLES.connecting
  const Icon = current.icon

  // Don't render the banner at all for connected state after data is flowing
  if (current.hide && connectionStatus === 'connected') {
    return null
  }

  return (
    <div className={`glass-card p-3 border ${current.className}`}>
      <div className="flex flex-wrap items-center gap-3">
        <Icon className={`w-4 h-4 flex-shrink-0 ${connectionStatus === 'recovering' || connectionStatus === 'connecting' ? 'animate-spin' : ''}`} />
        <span className="text-sm font-medium">{current.text}</span>
        <span className="ml-auto text-xs font-medium opacity-80">
          Pipeline: {timeAgo(pipelineLastUpdated)} | Metrics: {timeAgo(metricsLastUpdated)}
          {usingFallback ? ' | polling mode' : ''}
        </span>
      </div>
    </div>
  )
}
