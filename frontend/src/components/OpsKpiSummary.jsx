import { BarChart3, Shield, Gauge, Clock3 } from 'lucide-react'

function computeDeploymentHealth(deployments) {
  const namespaces = ['dev', 'staging', 'production']
  const latest = {}
  for (const item of deployments || []) {
    if (!item?.namespace) continue
    const current = latest[item.namespace]
    if (!current || (item.timestamp || 0) > (current.timestamp || 0)) {
      latest[item.namespace] = item
    }
  }
  const healthy = namespaces.filter((ns) => latest[ns]?.status === 'SUCCESS').length
  return `${healthy}/${namespaces.length}`
}

function freshnessLabel(ts) {
  if (!ts) return 'n/a'
  const diffSec = Math.max(Math.floor((Date.now() - ts) / 1000), 0)
  if (diffSec < 60) return `${diffSec}s`
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m`
  return `${Math.floor(diffSec / 3600)}h`
}

export default function OpsKpiSummary({
  analytics,
  testResults,
  deployments,
  pipelineLastUpdated,
}) {
  const successRate = Number(analytics?.successRate || 0)
  const avgDurationSec = Math.round(Number(analytics?.avgDurationMs || 0) / 1000)
  const passRate = Number(testResults?.passRate || 0)
  const deploymentHealth = computeDeploymentHealth(deployments)

  const cards = [
    { label: 'Pipeline SLA', value: `${successRate.toFixed(2)}%`, icon: Shield },
    { label: 'Test Pass Rate', value: `${passRate.toFixed(2)}%`, icon: BarChart3 },
    { label: 'Deploy Health', value: deploymentHealth, icon: Gauge },
    { label: 'Pipeline Freshness', value: freshnessLabel(pipelineLastUpdated), icon: Clock3 },
    { label: 'Avg Build Duration', value: `${avgDurationSec}s`, icon: Clock3 },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
      {cards.map((card) => (
        <div key={card.label} className="glass-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wide text-muted">{card.label}</span>
            <card.icon className="w-4 h-4 text-primary-500 dark:text-primary-300" />
          </div>
          <p className="text-xl font-bold text-heading">{card.value}</p>
        </div>
      ))}
    </div>
  )
}
