import { ActivitySquare, ArrowUpRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const statusClass = {
  SUCCESS: 'status-success',
  FAILURE: 'status-failure',
  IN_PROGRESS: 'status-running',
  ABORTED: 'status-failure',
  PENDING: 'status-pending',
}

function eventKey(event) {
  return `${event.jobName || 'job'}-${event.buildNumber || 0}-${event.eventSequence || 0}-${event.eventTimestamp || 0}`
}

export default function LiveEventStreamPanel({ events }) {
  const displayEvents = events || []

  return (
    <div className="glass-card p-5 min-h-[340px] flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <ActivitySquare className="w-5 h-5 text-primary-500 dark:text-primary-400" />
        <h2 className="text-lg font-semibold text-heading">Live Pipeline Event Stream</h2>
        <span className="ml-auto text-xs text-muted bg-surface-100 dark:bg-white/5 px-2 py-1 rounded-full border border-surface-200 dark:border-white/10">
          {displayEvents.length} events
        </span>
      </div>

      <div className="space-y-2.5 overflow-y-auto pr-1 flex-1">
        {displayEvents.length === 0 && (
          <p className="text-sm text-muted py-10 text-center">No live events yet.</p>
        )}

        {displayEvents.map((event) => (
          <div
            key={eventKey(event)}
            className="inner-card flex flex-wrap items-center gap-2 justify-between"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-heading truncate">
                {event.jobName} <span className="text-muted">#{event.buildNumber}</span>
              </p>
              <p className="text-xs text-muted truncate">
                Seq {event.eventSequence || 0} | Stage {event.stageOrder || '-'} | {event.stage || 'Unknown'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={statusClass[event.stageStatus] || 'status-pending'}>
                {event.stageStatus || 'PENDING'}
              </span>
              <span className={statusClass[event.overallStatus] || 'status-pending'}>
                {event.overallStatus || 'PENDING'}
              </span>
              <span
                title={new Date(event.eventTimestamp || Date.now()).toLocaleString()}
                className="text-xs text-muted whitespace-nowrap"
              >
                {event.eventTimestamp
                  ? formatDistanceToNow(new Date(event.eventTimestamp), { addSuffix: true })
                  : 'now'}
              </span>
              {event.jenkinsUrl && (
                <a
                  href={event.jenkinsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 dark:text-primary-300 hover:underline"
                  title="Open build in Jenkins"
                >
                  <ArrowUpRight className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
