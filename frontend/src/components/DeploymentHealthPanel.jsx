import { ShieldCheck, AlertTriangle, Rocket } from 'lucide-react'

const environments = ['dev', 'staging', 'production']

function classForStatus(status) {
  if (!status) return 'status-pending'
  if (status === 'SUCCESS') return 'status-success'
  if (status === 'IN_PROGRESS') return 'status-running'
  return 'status-failure'
}

function freshness(ts) {
  if (!ts) return 'never'
  const diffSec = Math.max(Math.floor((Date.now() - ts) / 1000), 0)
  if (diffSec < 60) return `${diffSec}s ago`
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
  return `${Math.floor(diffSec / 3600)}h ago`
}

export default function DeploymentHealthPanel({ deployments }) {
  const list = deployments || []
  const byEnv = Object.fromEntries(environments.map((env) => [env, null]))

  list.forEach((item) => {
    if (!item?.namespace) return
    const existing = byEnv[item.namespace]
    if (!existing || (item.timestamp || 0) > (existing.timestamp || 0)) {
      byEnv[item.namespace] = item
    }
  })

  const hasFailure = environments.some((env) => {
    const s = byEnv[env]?.status
    return s === 'FAILURE' || s === 'ABORTED'
  })

  return (
    <div className="glass-card p-5 min-h-[340px]">
      <div className="flex items-center gap-2 mb-4">
        {hasFailure ? (
          <AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-400" />
        ) : (
          <ShieldCheck className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
        )}
        <h2 className="text-lg font-semibold text-heading">Environment Deployment Health</h2>
      </div>

      <div className="space-y-3">
        {environments.map((env) => {
          const deployment = byEnv[env]
          const status = deployment?.status || 'PENDING'
          return (
            <div key={env} className="inner-card flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-surface-100 dark:bg-white/10 flex items-center justify-center">
                  <Rocket className="w-4 h-4 text-primary-500 dark:text-primary-300" />
                </div>
                <div>
                  <p className="font-semibold text-heading uppercase tracking-wide text-sm">{env}</p>
                  <p className="text-xs text-muted">
                    {deployment ? `Build #${deployment.buildNumber} | ${freshness(deployment.timestamp)}` : 'No deployment events'}
                  </p>
                </div>
              </div>
              <span className={classForStatus(status)}>{status}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
