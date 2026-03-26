import { GitBranch, Play } from 'lucide-react'

const STAGES = [
  'Checkout', 'Build', 'Unit & Integration Tests', 'Static Analysis',
  'API Tests', 'Docker Build & Push', 'Deploy to Dev', 'Smoke Test',
  'Deploy to Staging', 'Manual Approval', 'Deploy to Production'
]

const statusColors = {
  SUCCESS: 'bg-emerald-500',
  FAILURE: 'bg-red-500',
  IN_PROGRESS: 'bg-blue-500 animate-pulse',
  PENDING: 'bg-white/10',
}

const statusBorder = {
  SUCCESS: 'border-emerald-500/50',
  FAILURE: 'border-red-500/50',
  IN_PROGRESS: 'border-blue-500/50',
  PENDING: 'border-white/10',
}

export default function PipelineStatusPanel({ pipelines }) {
  const displayPipelines = pipelines || []

  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-2 mb-5">
        <Play className="w-5 h-5 text-primary-400" />
        <h2 className="text-lg font-semibold text-white">Pipeline Status</h2>
      </div>

      {displayPipelines.map((pipeline, pi) => (
        <div key={pi} className="mb-6 last:mb-0">
          <div className="flex items-center gap-3 mb-5 p-3 bg-white/[0.02] rounded-lg border border-white/[0.05]">
            <GitBranch className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-bold text-slate-200">{pipeline.jobName}</span>
            <span className="text-xs font-mono text-slate-500 bg-white/5 px-2 py-0.5 rounded">Build #{pipeline.buildNumber}</span>
            <span className={
              pipeline.overallStatus === 'SUCCESS' ? 'status-success' :
              pipeline.overallStatus === 'FAILURE' ? 'status-failure' :
              pipeline.overallStatus === 'IN_PROGRESS' ? 'status-running' : 'status-pending'
            }>
              {pipeline.overallStatus || 'PENDING'}
            </span>
          </div>

          {/* Stage Pipeline Visualization */}
          <div className="flex items-center gap-1 overflow-x-auto pb-4 custom-scrollbar">
            {(pipeline.stages || []).map((stage, i) => (
              <div key={i} className="flex items-center flex-shrink-0">
                <div className={`flex flex-col items-center justify-center min-w-[100px] h-[68px] p-2 rounded-xl border transition-all duration-300 group cursor-default shadow-sm ${
                  stage.status === 'SUCCESS' ? 'bg-emerald-500/5 border-emerald-500/30 shadow-emerald-500/10 hover:bg-emerald-500/10' :
                  stage.status === 'FAILURE' ? 'bg-rose-500/5 border-rose-500/30 shadow-rose-500/10 hover:bg-rose-500/10' :
                  stage.status === 'IN_PROGRESS' ? 'bg-blue-500/5 border-blue-500/40 shadow-blue-500/20 hover:bg-blue-500/10 animate-pulse' :
                  'bg-white/5 border-white/10 hover:bg-white/10'
                }`}>
                  <div className={`w-2.5 h-2.5 rounded-full mb-2 ${
                    stage.status === 'SUCCESS' ? 'bg-emerald-400 glow-success' :
                    stage.status === 'FAILURE' ? 'bg-rose-400 glow-danger' :
                    stage.status === 'IN_PROGRESS' ? 'bg-blue-400 animate-pulse' :
                    'bg-slate-600'
                  }`} />
                  <span className={`text-[10px] text-center leading-tight font-medium ${
                    stage.status === 'SUCCESS' ? 'text-emerald-100' :
                    stage.status === 'FAILURE' ? 'text-rose-100' :
                    stage.status === 'IN_PROGRESS' ? 'text-blue-100' :
                    'text-slate-400'
                  }`}>
                    {stage.name}
                  </span>
                  {stage.duration > 0 && (
                    <span className="text-[9px] text-slate-500 font-mono mt-1 font-semibold tracking-wider">
                      {Math.round(stage.duration / 1000)}s
                    </span>
                  )}
                </div>
                {i < (pipeline.stages?.length || 0) - 1 && (
                  <div className={`w-6 h-[2px] rounded-full mx-0.5 ${
                    stage.status === 'SUCCESS' ? 'bg-emerald-500/60' : 
                    stage.status === 'FAILURE' ? 'bg-rose-500/60' : 'bg-slate-800'
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
