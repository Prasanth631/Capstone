import { useState, useEffect } from 'react'
import { GitBranch, Play, ExternalLink } from 'lucide-react'

function ElapsedTimer() {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(interval)
  }, [])
  const m = Math.floor(elapsed / 60)
  const s = elapsed % 60
  return <span className="text-[9px] text-blue-500 dark:text-blue-400 font-mono mt-1 font-semibold tracking-wider">{m > 0 ? `${m}m ${s}s` : `${s}s`}</span>
}

export default function PipelineStatusPanel({ pipelines }) {
  const displayPipelines = pipelines || []

  if (displayPipelines.length === 0) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Play className="w-5 h-5 text-primary-500 dark:text-primary-400" />
          <h2 className="text-lg font-semibold text-heading">Pipeline Status</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-8">
          <div className="w-12 h-12 rounded-xl bg-surface-100 dark:bg-white/5 flex items-center justify-center mb-3">
            <Play className="w-6 h-6 text-surface-300 dark:text-white/20" />
          </div>
          <p className="text-muted text-sm">No active pipelines</p>
          <p className="text-muted text-xs mt-1">Trigger a Jenkins build to see live status</p>
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-2 mb-5">
        <Play className="w-5 h-5 text-primary-500 dark:text-primary-400" />
        <h2 className="text-lg font-semibold text-heading">Pipeline Status</h2>
        <span className="ml-auto text-xs text-muted font-medium bg-surface-100 dark:bg-white/5 px-2 py-1 rounded-full border border-surface-200 dark:border-white/10">
          {displayPipelines.length} pipeline{displayPipelines.length !== 1 ? 's' : ''}
        </span>
      </div>

      {displayPipelines.map((pipeline, pi) => (
        <div key={pi} className="mb-6 last:mb-0">
          <div className="flex flex-wrap items-center gap-3 mb-5 p-3 inner-card">
            <GitBranch className="w-4 h-4 text-surface-400 dark:text-slate-500" />
            <span className="text-sm font-bold text-heading">{pipeline.jobName}</span>

            {pipeline.jenkinsUrl ? (
              <a href={pipeline.jenkinsUrl} target="_blank" rel="noopener noreferrer"
                 className="text-xs font-mono text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center gap-1 bg-primary-50 dark:bg-white/5 px-2 py-0.5 rounded">
                Build #{pipeline.buildNumber}
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              <span className="text-xs font-mono text-surface-500 dark:text-slate-500 bg-surface-100 dark:bg-white/5 px-2 py-0.5 rounded">
                Build #{pipeline.buildNumber}
              </span>
            )}

            <span className={
              pipeline.overallStatus === 'SUCCESS' ? 'status-success' :
              pipeline.overallStatus === 'FAILURE' ? 'status-failure' :
              pipeline.overallStatus === 'IN_PROGRESS' ? 'status-running' : 'status-pending'
            }>
              {pipeline.overallStatus || 'PENDING'}
            </span>
          </div>

          {/* Stage Pipeline Visualization */}
          <div className="flex items-center gap-1 overflow-x-auto pb-4">
            {(pipeline.stages || []).map((stage, i) => (
              <div key={i} className="flex items-center flex-shrink-0">
                <div className={`flex flex-col items-center justify-center min-w-[100px] h-[68px] p-2 rounded-xl border transition-all duration-300 group cursor-default ${
                  stage.status === 'SUCCESS'
                    ? 'bg-emerald-50 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-500/30 hover:bg-emerald-100 dark:hover:bg-emerald-500/10'
                    : stage.status === 'FAILURE'
                    ? 'bg-red-50 dark:bg-rose-500/5 border-red-200 dark:border-rose-500/30 hover:bg-red-100 dark:hover:bg-rose-500/10'
                    : stage.status === 'IN_PROGRESS'
                    ? 'bg-blue-50 dark:bg-blue-500/5 border-blue-200 dark:border-blue-500/40 hover:bg-blue-100 dark:hover:bg-blue-500/10 animate-pulse'
                    : 'bg-surface-50 dark:bg-white/5 border-surface-200 dark:border-white/10 hover:bg-surface-100 dark:hover:bg-white/10'
                }`}>
                  <div className={`w-2.5 h-2.5 rounded-full mb-2 ${
                    stage.status === 'SUCCESS' ? 'bg-emerald-500 dark:bg-emerald-400' :
                    stage.status === 'FAILURE' ? 'bg-red-500 dark:bg-rose-400' :
                    stage.status === 'IN_PROGRESS' ? 'bg-blue-500 dark:bg-blue-400 animate-pulse' :
                    'bg-surface-300 dark:bg-slate-600'
                  }`} />
                  <span className={`text-[10px] text-center leading-tight font-medium ${
                    stage.status === 'SUCCESS' ? 'text-emerald-700 dark:text-emerald-100' :
                    stage.status === 'FAILURE' ? 'text-red-700 dark:text-rose-100' :
                    stage.status === 'IN_PROGRESS' ? 'text-blue-700 dark:text-blue-100' :
                    'text-surface-500 dark:text-slate-400'
                  }`}>
                    {stage.name}
                  </span>
                  {stage.status === 'IN_PROGRESS' ? (
                    <ElapsedTimer />
                  ) : stage.duration > 0 ? (
                    <span className="text-[9px] text-surface-400 dark:text-slate-500 font-mono mt-1 font-semibold tracking-wider">
                      {Math.round(stage.duration / 1000)}s
                    </span>
                  ) : null}
                </div>
                {i < (pipeline.stages?.length || 0) - 1 && (
                  <div className={`w-6 h-[2px] rounded-full mx-0.5 ${
                    stage.status === 'SUCCESS' ? 'bg-emerald-300 dark:bg-emerald-500/60' :
                    stage.status === 'FAILURE' ? 'bg-red-300 dark:bg-rose-500/60' : 'bg-surface-200 dark:bg-slate-800'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
