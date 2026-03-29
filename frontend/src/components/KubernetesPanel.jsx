import { useState } from 'react'
import { Server, Box, Scaling } from 'lucide-react'

export default function KubernetesPanel({ status }) {
  const [activeNs, setActiveNs] = useState('')

  const namespaces = status?.namespaces || []
  
  // Initialize active namespace if not set and namespaces exist
  if (!activeNs && namespaces.length > 0) {
     setActiveNs(namespaces[0].namespace)
  }

  const active = namespaces.find(n => n.namespace === (activeNs || (namespaces.length > 0 ? namespaces[0].namespace : '')))

  if (namespaces.length === 0) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <Server className="w-5 h-5 text-primary-500 dark:text-primary-400" />
          <h2 className="text-lg font-semibold text-heading">Kubernetes Cluster</h2>
        </div>
        <div className="flex-1 flex items-center justify-center py-8">
          <p className="text-muted text-sm">No Kubernetes data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-2 mb-5">
        <Server className="w-5 h-5 text-primary-500 dark:text-primary-400" />
        <h2 className="text-lg font-semibold text-heading">Kubernetes Cluster</h2>
      </div>

      {/* Namespace Tabs */}
      <div className="flex flex-wrap gap-2 mb-5">
        {namespaces.map(ns => (
          <button
            key={ns.namespace}
            onClick={() => setActiveNs(ns.namespace)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              (activeNs || namespaces[0].namespace) === ns.namespace
                ? 'bg-primary-100 text-primary-700 border-primary-200 dark:bg-primary-500/20 dark:text-primary-400 border dark:border-primary-500/30 shadow-sm'
                : 'bg-surface-100 text-surface-500 border-surface-200 hover:border-surface-300 dark:bg-white/5 dark:text-white/50 border dark:border-white/10 dark:hover:border-white/20'
            }`}
          >
            {ns.namespace}
          </button>
        ))}
      </div>

      {/* Namespace Details */}
      {active && (
        <div className="space-y-4">
          {/* Pod Grid */}
          <div className="flex items-center gap-4 p-4 inner-card">
            <Box className="w-5 h-5 text-primary-500 dark:text-primary-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-heading">Pods</p>
              <p className="text-xs text-muted">{active.pods?.running || 0}/{active.pods?.total || 0} running</p>
            </div>
            <div className="flex flex-wrap max-w-[120px] justify-end gap-1.5">
              {Array.from({ length: active.pods?.total || 0 }, (_, i) => (
                <div key={i} className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded ${
                  i < (active.pods?.running || 0) ? 'bg-emerald-500 dark:bg-emerald-400 shadow-sm' : 'bg-red-500 dark:bg-rose-500 shadow-sm'
                }`} />
              ))}
            </div>
          </div>

          {/* Replica Health */}
          <div className="flex items-center gap-4 p-4 inner-card">
            <div className={`w-3 h-3 rounded-full shadow-sm ${active.replicaHealth === 'healthy' ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-red-500 dark:bg-rose-400'}`} />
            <div className="flex-1">
              <p className="text-sm text-heading font-medium">Replica Status: <span className={active.replicaHealth === 'healthy' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-rose-400'}>{active.replicaHealth}</span></p>
              <p className="text-xs text-muted">Last rollout: {active.lastRollout || 'Unknown'}</p>
            </div>
          </div>

          {/* HPA (production only config typically) */}
          {active.hpa && (
            <div className="flex items-center gap-4 p-4 rounded-xl bg-purple-50 dark:bg-purple-500/5 border border-purple-200 dark:border-purple-500/15 transition-colors">
              <Scaling className="w-5 h-5 text-purple-500 dark:text-purple-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-heading">HorizontalPodAutoscaler</p>
                <p className="text-xs text-muted">
                  {active.hpa.currentReplicas} pods ({active.hpa.minReplicas}–{active.hpa.maxReplicas} range) · Target CPU: {active.hpa.targetCpuUtilization}%
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
