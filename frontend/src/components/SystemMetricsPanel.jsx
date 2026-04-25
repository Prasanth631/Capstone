import { Cpu, MemoryStick, Activity } from 'lucide-react'

function getBarColor(percent) {
  if (percent >= 85) return 'from-red-500 to-rose-500 dark:from-red-500 dark:to-rose-400'
  if (percent >= 60) return 'from-amber-500 to-yellow-500 dark:from-amber-500 dark:to-yellow-400'
  return 'from-emerald-500 to-teal-500 dark:from-emerald-500 dark:to-teal-400'
}

export default function SystemMetricsPanel({ metrics }) {
  const m = metrics || {}
  
  const cpuPercent = typeof m.cpuUsage === 'number'
    ? (m.cpuUsage < 1 ? m.cpuUsage * 100 : m.cpuUsage)
    : 0
  const memPercent = m.memoryUsagePercent ?? 0
  const heapPercent = m.jvmHeapUsagePercent ?? 0
  const threads = m.threadCount ?? 0
  const uptimeMs = m.uptimeMs ?? 0

  const formatUptime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  const gaugeCards = [
    { label: 'CPU Usage', value: `${cpuPercent.toFixed(1)}%`, percent: cpuPercent, icon: Cpu },
    { label: 'Memory', value: `${memPercent.toFixed(1)}%`, percent: memPercent, icon: MemoryStick },
    { label: 'JVM Heap', value: `${heapPercent.toFixed(1)}%`, percent: heapPercent, icon: Activity },
  ]

  if (!metrics || Object.keys(metrics).length === 0) {
    return (
      <div className="glass-card p-6 min-h-[220px] flex flex-col">
        <div className="flex items-center gap-2 mb-5">
          <Cpu className="w-5 h-5 text-primary-500 dark:text-primary-400" />
          <h2 className="text-lg font-semibold text-heading">System Metrics</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-3 border-primary-200 dark:border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-muted text-sm">Connecting to backend...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card p-6 min-h-[220px]">
      <div className="flex items-center gap-2 mb-5">
        <Cpu className="w-5 h-5 text-primary-500 dark:text-primary-400" />
        <h2 className="text-lg font-semibold text-heading">System Metrics</h2>
        <div className="ml-auto flex items-center gap-2">
          {uptimeMs > 0 && (
            <span className="text-xs text-muted font-medium bg-surface-100 dark:bg-white/5 px-2 py-1 rounded-full border border-surface-200 dark:border-white/10">
              ⏱ {formatUptime(uptimeMs)}
            </span>
          )}
          <span className="text-xs text-muted font-medium bg-surface-100 dark:bg-white/5 px-2 py-1 rounded-full border border-surface-200 dark:border-white/10">
            {threads} threads
          </span>
        </div>
      </div>

      {/* Gauge Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {gaugeCards.map((g, i) => {
          const barColor = getBarColor(g.percent)
          return (
            <div key={i} className="inner-card flex flex-col items-center justify-center py-6">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${barColor} flex items-center justify-center shadow-lg mb-3 transition-all duration-500`}>
                <g.icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-heading">{g.value}</p>
              <p className="text-xs text-muted uppercase tracking-wider font-semibold mt-1 mb-4">{g.label}</p>
              <div className="w-full h-2 bg-surface-200 dark:bg-slate-700/50 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-1000 ease-out`}
                  style={{ width: `${Math.min(g.percent, 100)}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
