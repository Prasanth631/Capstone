import { AlertOctagon, CheckCircle2 } from 'lucide-react'

function isFailed(event) {
  const stageStatus = event?.stageStatus || event?.status
  const overall = event?.overallStatus
  return stageStatus === 'FAILURE' || stageStatus === 'ABORTED' || overall === 'FAILURE'
}

function formatTime(ts) {
  if (!ts) return 'n/a'
  const d = new Date(ts)
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`
}

export default function FailureSpotlightCard({ events, successRate = 0 }) {
  const latestFailure = (events || []).find((event) => isFailed(event))

  if (!latestFailure) {
    return (
      <div className="glass-card p-5 min-h-[180px] border-emerald-200 dark:border-emerald-500/20">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
          <h3 className="text-base font-semibold text-heading">Failure Spotlight</h3>
        </div>
        <p className="text-sm text-muted">No active failures in recent event window.</p>
        <p className="text-xs text-muted mt-2">Current success rate: {Number(successRate || 0).toFixed(2)}%</p>
      </div>
    )
  }

  return (
    <div className="glass-card p-5 min-h-[180px] border-red-200 dark:border-red-500/25">
      <div className="flex items-center gap-2 mb-3">
        <AlertOctagon className="w-5 h-5 text-red-500 dark:text-red-400" />
        <h3 className="text-base font-semibold text-heading">Failure Spotlight</h3>
      </div>
      <p className="text-sm text-heading font-semibold">
        {latestFailure.jobName} #{latestFailure.buildNumber}
      </p>
      <p className="text-xs text-muted mt-1">
        Stage {latestFailure.stageOrder || '-'}: {latestFailure.stage || 'Unknown'}
      </p>
      <p className="text-xs text-muted mt-1">
        {latestFailure.stageStatus || latestFailure.status} at {formatTime(latestFailure.eventTimestamp || latestFailure.timestamp)}
      </p>
    </div>
  )
}
