import { TrendingUp, TrendingDown, Hash, Clock, CheckCircle, XCircle } from 'lucide-react'

export default function BuildAnalytics({ data }) {
  const cards = [
    {
      label: 'Total Builds',
      value: data.totalBuilds ?? 0,
      icon: Hash,
      color: 'from-blue-500 to-cyan-400',
      glow: 'shadow-blue-500/20',
    },
    {
      label: 'Success Rate',
      value: `${data.successRate ?? 0}%`,
      icon: data.successRate >= 80 ? TrendingUp : TrendingDown,
      color: data.successRate >= 80 ? 'from-emerald-500 to-green-400' : 'from-red-500 to-orange-400',
      glow: data.successRate >= 80 ? 'shadow-emerald-500/20' : 'shadow-red-500/20',
    },
    {
      label: 'Passed',
      value: data.successCount ?? 0,
      icon: CheckCircle,
      color: 'from-emerald-500 to-teal-400',
      glow: 'shadow-emerald-500/20',
    },
    {
      label: 'Failed',
      value: data.failureCount ?? 0,
      icon: XCircle,
      color: 'from-red-500 to-pink-400',
      glow: 'shadow-red-500/20',
    },
    {
      label: 'Avg Duration',
      value: data.avgDurationMs ? `${Math.round(data.avgDurationMs / 1000)}s` : '0s',
      icon: Clock,
      color: 'from-purple-500 to-violet-400',
      glow: 'shadow-purple-500/20',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((card, i) => (
        <div key={i} className={`glass-card-hover p-5 animate-slide-up ${card.glow} shadow-lg`}
             style={{ animationDelay: `${i * 80}ms` }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-white/50 uppercase tracking-wider">{card.label}</span>
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center`}>
              <card.icon className="w-4 h-4 text-white" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{card.value}</p>
        </div>
      ))}
    </div>
  )
}
