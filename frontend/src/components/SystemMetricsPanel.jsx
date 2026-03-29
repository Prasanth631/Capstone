import { Cpu, MemoryStick, Activity } from 'lucide-react'

export default function SystemMetricsPanel({ metrics }) {
  const m = metrics || {}
  
  const cpuPercent = typeof m.cpuUsage === 'number'
    ? (m.cpuUsage < 1 ? m.cpuUsage * 100 : m.cpuUsage)
    : 0
  const memPercent = m.memoryUsagePercent ?? 0
  const heapPercent = m.jvmHeapUsagePercent ?? 0
  const threads = m.threadCount ?? 0

  const gaugeCards = [
    { label: 'CPU Usage', value: `${cpuPercent.toFixed(1)}%`, percent: cpuPercent, icon: Cpu, color: 'from-blue-500 to-cyan-500 dark:from-blue-500 dark:to-cyan-400' },
    { label: 'Memory', value: `${memPercent.toFixed(1)}%`, percent: memPercent, icon: MemoryStick, color: 'from-purple-500 to-indigo-500 dark:from-purple-500 dark:to-violet-400' },
    { label: 'JVM Heap', value: `${heapPercent.toFixed(1)}%`, percent: heapPercent, icon: Activity, color: 'from-emerald-500 to-teal-500 dark:from-emerald-500 dark:to-teal-400' },
  ]

  if (!metrics || Object.keys(metrics).length === 0) {
    return (
      <div className="glass-card p-6 min-h-[220px] flex flex-col">
        <div className="flex items-center gap-2 mb-5">
          <Cpu className="w-5 h-5 text-primary-500 dark:text-primary-400" />
          <h2 className="text-lg font-semibold text-heading">System Metrics</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted text-sm">Waiting for metrics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card p-6 min-h-[220px]">
      <div className="flex items-center gap-2 mb-5">
        <Cpu className="w-5 h-5 text-primary-500 dark:text-primary-400" />
        <h2 className="text-lg font-semibold text-heading">System Metrics</h2>
        <span className="ml-auto text-xs text-muted font-medium bg-surface-100 dark:bg-white/5 px-2 py-1 rounded-full border border-surface-200 dark:border-white/10">
          {threads} threads
        </span>
      </div>

      {/* Gauge Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {gaugeCards.map((g, i) => (
          <div key={i} className="inner-card flex flex-col items-center justify-center py-6">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${g.color} flex items-center justify-center shadow-lg mb-3`}>
              <g.icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-2xl font-bold text-heading">{g.value}</p>
            <p className="text-xs text-muted uppercase tracking-wider font-semibold mt-1 mb-4">{g.label}</p>
            <div className="w-full h-2 bg-surface-200 dark:bg-slate-700/50 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${g.color} transition-all duration-1000`}
                style={{ width: `${Math.min(g.percent, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
