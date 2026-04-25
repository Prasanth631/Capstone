import { AlertTriangle, CheckCircle2, RefreshCw, WifiOff, ShieldCheck } from 'lucide-react'

const STATUS_STYLES = {
  authenticating: {
    icon: ShieldCheck,
    text: 'Authenticating realtime session...',
    className: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300',
  },
  connecting: {
    icon: RefreshCw,
    text: 'Connecting to live Firestore streams...',
    className: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300',
  },
  connected: {
    icon: CheckCircle2,
    text: 'Realtime stream healthy',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
  },
  recovering: {
    icon: RefreshCw,
    text: 'Stream interrupted, auto-recovering with last known data...',
    className: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300',
  },
  'no-data': {
    icon: AlertTriangle,
    text: 'Connected but no dashboard projection has been published yet.',
    className: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-white/20 dark:bg-white/5 dark:text-slate-200',
  },
  error: {
    icon: WifiOff,
    text: 'Realtime stream failed. Showing last known state.',
    className: 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300',
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

  return (
    <div className={`glass-card p-3 border ${current.className}`}>
      <div className="flex flex-wrap items-center gap-3">
        <Icon className={`w-4 h-4 ${connectionStatus === 'recovering' ? 'animate-spin' : ''}`} />
        <span className="text-sm font-medium">{current.text}</span>
        <span className="ml-auto text-xs font-medium">
          Pipeline: {timeAgo(pipelineLastUpdated)} | Metrics: {timeAgo(metricsLastUpdated)}
          {usingFallback ? ' | fallback active' : ''}
        </span>
      </div>
    </div>
  )
}
