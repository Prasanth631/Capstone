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
  // Show demo pipeline if none active
  const displayPipelines = pipelines?.length > 0 ? pipelines : [{
    buildNumber: 42,
    jobName: 'devops-platform',
    overallStatus: 'IN_PROGRESS',
    stages: STAGES.map((name, i) => ({
      name, order: i + 1,
      status: i < 3 ? 'SUCCESS' : i === 3 ? 'IN_PROGRESS' : 'PENDING',
      duration: i < 3 ? (5000 + Math.random() * 20000) : 0,
    })),
  }]

  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-2 mb-5">
        <Play className="w-5 h-5 text-primary-400" />
        <h2 className="text-lg font-semibold text-white">Pipeline Status</h2>
      </div>

      {displayPipelines.map((pipeline, pi) => (
        <div key={pi} className="mb-6 last:mb-0">
          <div className="flex items-center gap-3 mb-4">
            <GitBranch className="w-4 h-4 text-white/40" />
            <span className="text-sm font-medium text-white/70">{pipeline.jobName}</span>
            <span className="text-xs text-white/40">Build #{pipeline.buildNumber}</span>
            <span className={`status-${pipeline.overallStatus?.toLowerCase()?.replace('_', '-') || 'pending'}`}>
              {pipeline.overallStatus}
            </span>
          </div>

          {/* Stage Pipeline Visualization */}
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {(pipeline.stages || []).map((stage, i) => (
              <div key={i} className="flex items-center">
                <div className={`flex flex-col items-center min-w-[90px] p-2 rounded-lg border ${statusBorder[stage.status] || 'border-white/10'} bg-white/5 hover:bg-white/10 transition-all group cursor-default`}>
                  <div className={`w-3 h-3 rounded-full ${statusColors[stage.status] || 'bg-white/10'} mb-1.5`} />
                  <span className="text-[10px] text-white/60 text-center leading-tight font-medium">
                    {stage.name}
                  </span>
                  {stage.duration > 0 && (
                    <span className="text-[9px] text-white/30 mt-0.5">
                      {Math.round(stage.duration / 1000)}s
                    </span>
                  )}
                </div>
                {i < (pipeline.stages?.length || 0) - 1 && (
                  <div className={`w-4 h-0.5 ${stage.status === 'SUCCESS' ? 'bg-emerald-500/50' : 'bg-white/10'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
