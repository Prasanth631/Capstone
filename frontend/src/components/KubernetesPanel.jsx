import { useState } from 'react'
import { Server, Box, Scaling } from 'lucide-react'

export default function KubernetesPanel({ status }) {
  const [activeNs, setActiveNs] = useState('production')

  const namespaces = status?.namespaces || [
    { namespace: 'dev', pods: { running: 2, total: 2 }, replicaHealth: 'healthy', lastRollout: '10 minutes ago' },
    { namespace: 'staging', pods: { running: 2, total: 2 }, replicaHealth: 'healthy', lastRollout: '1 hour ago' },
    { namespace: 'production', pods: { running: 3, total: 3 }, replicaHealth: 'healthy', lastRollout: '3 hours ago',
      hpa: { minReplicas: 2, maxReplicas: 10, currentReplicas: 3, targetCpuUtilization: 60 } },
  ]

  const active = namespaces.find(n => n.namespace === activeNs) || namespaces[0]

  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-2 mb-5">
        <Server className="w-5 h-5 text-primary-400" />
        <h2 className="text-lg font-semibold text-white">Kubernetes Cluster</h2>
      </div>

      {/* Namespace Tabs */}
      <div className="flex gap-2 mb-5">
        {namespaces.map(ns => (
          <button
            key={ns.namespace}
            onClick={() => setActiveNs(ns.namespace)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeNs === ns.namespace
                ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                : 'bg-white/5 text-white/50 border border-white/10 hover:border-white/20'
            }`}
          >
            {ns.namespace}
          </button>
        ))}
      </div>

      {/* Namespace Details */}
      <div className="space-y-4">
        {/* Pod Grid */}
        <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
          <Box className="w-5 h-5 text-primary-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-white">Pods</p>
            <p className="text-xs text-white/40">{active.pods?.running}/{active.pods?.total} running</p>
          </div>
          <div className="flex gap-1.5">
            {Array.from({ length: active.pods?.total || 0 }, (_, i) => (
              <div key={i} className={`w-4 h-4 rounded ${
                i < (active.pods?.running || 0) ? 'bg-emerald-500' : 'bg-red-500'
              }`} />
            ))}
          </div>
        </div>

        {/* Replica Health */}
        <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
          <div className={`w-3 h-3 rounded-full ${active.replicaHealth === 'healthy' ? 'bg-emerald-400' : 'bg-red-400'}`} />
          <div className="flex-1">
            <p className="text-sm text-white">Replica Status: <span className={active.replicaHealth === 'healthy' ? 'text-emerald-400' : 'text-red-400'}>{active.replicaHealth}</span></p>
            <p className="text-xs text-white/40">Last rollout: {active.lastRollout}</p>
          </div>
        </div>

        {/* HPA (production only) */}
        {active.hpa && (
          <div className="flex items-center gap-4 p-4 rounded-xl bg-purple-500/5 border border-purple-500/15">
            <Scaling className="w-5 h-5 text-purple-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-white">HorizontalPodAutoscaler</p>
              <p className="text-xs text-white/40">
                {active.hpa.currentReplicas} pods ({active.hpa.minReplicas}–{active.hpa.maxReplicas} range) · Target CPU: {active.hpa.targetCpuUtilization}%
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
