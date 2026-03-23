import { Container, Heart, ImageIcon } from 'lucide-react'

export default function DockerStatusPanel({ status }) {
  const containers = status?.containers?.details || [
    { name: 'devops-backend', image: 'devops-platform:latest', status: 'running', health: 'healthy', uptime: '2h 15m' },
    { name: 'devops-frontend', image: 'devops-frontend:latest', status: 'running', health: 'healthy', uptime: '2h 15m' },
    { name: 'postgres', image: 'postgres:15-alpine', status: 'running', health: 'healthy', uptime: '2h 16m' },
    { name: 'prometheus', image: 'prom/prometheus:latest', status: 'running', health: 'healthy', uptime: '2h 14m' },
    { name: 'grafana', image: 'grafana/grafana:latest', status: 'stopped', health: 'N/A', uptime: 'N/A' },
  ]

  const running = containers.filter(c => c.status === 'running').length

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Container className="w-5 h-5 text-primary-400" />
          <h2 className="text-lg font-semibold text-white">Docker Containers</h2>
        </div>
        <span className="text-xs text-white/40">
          {running}/{containers.length} running
        </span>
      </div>

      <div className="space-y-3">
        {containers.map((c, i) => (
          <div key={i} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
            c.status === 'running'
              ? 'bg-emerald-500/5 border-emerald-500/15 hover:border-emerald-500/30'
              : 'bg-red-500/5 border-red-500/15 hover:border-red-500/30'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${c.status === 'running' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
              <div>
                <p className="text-sm font-medium text-white">{c.name}</p>
                <p className="text-[11px] text-white/40 flex items-center gap-1">
                  <ImageIcon className="w-3 h-3" />
                  {c.image}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-xs">
                <Heart className={`w-3 h-3 ${c.health === 'healthy' ? 'text-emerald-400' : 'text-white/30'}`} />
                <span className={c.health === 'healthy' ? 'text-emerald-400' : 'text-white/40'}>{c.health}</span>
              </div>
              <p className="text-[11px] text-white/30 mt-0.5">{c.uptime}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
