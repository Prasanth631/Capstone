import { Cpu, MemoryStick, Activity } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function SystemMetricsPanel({ metrics }) {
  const cpuPercent = typeof metrics.cpuUsage === 'number'
    ? (metrics.cpuUsage < 1 ? metrics.cpuUsage * 100 : metrics.cpuUsage)
    : 0
  const memPercent = metrics.memoryUsagePercent ?? 0
  const heapPercent = metrics.jvmHeapUsagePercent ?? 0
  const threads = metrics.threadCount ?? 0

  // Generate demo time-series data for chart
  const chartData = Array.from({ length: 20 }, (_, i) => ({
    time: `${20 - i}m ago`,
    cpu: Math.max(5, cpuPercent + (Math.random() - 0.5) * 20),
    memory: Math.max(30, memPercent + (Math.random() - 0.5) * 10),
    heap: Math.max(20, heapPercent + (Math.random() - 0.5) * 15),
  })).reverse()

  const gaugeCards = [
    { label: 'CPU Usage', value: `${cpuPercent.toFixed(1)}%`, percent: cpuPercent, icon: Cpu, color: 'from-blue-500 to-cyan-400', ring: 'text-blue-500' },
    { label: 'Memory', value: `${memPercent.toFixed(1)}%`, percent: memPercent, icon: MemoryStick, color: 'from-purple-500 to-violet-400', ring: 'text-purple-500' },
    { label: 'JVM Heap', value: `${heapPercent.toFixed(1)}%`, percent: heapPercent, icon: Activity, color: 'from-emerald-500 to-teal-400', ring: 'text-emerald-500' },
  ]

  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-2 mb-5">
        <Cpu className="w-5 h-5 text-primary-400" />
        <h2 className="text-lg font-semibold text-white">System Metrics</h2>
        <span className="ml-auto text-xs text-white/30">{threads} threads</span>
      </div>

      {/* Gauge Cards */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {gaugeCards.map((g, i) => (
          <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
            <div className={`w-8 h-8 mx-auto rounded-lg bg-gradient-to-br ${g.color} flex items-center justify-center mb-2`}>
              <g.icon className="w-4 h-4 text-white" />
            </div>
            <p className="text-lg font-bold text-white">{g.value}</p>
            <p className="text-[10px] text-white/40 uppercase tracking-wider">{g.label}</p>
            <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${g.color} transition-all duration-1000`}
                style={{ width: `${Math.min(g.percent, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Area Chart */}
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="heapGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} axisLine={false} tickLine={false} domain={[0, 100]} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px' }}
              itemStyle={{ color: '#fff' }}
            />
            <Area type="monotone" dataKey="cpu" stroke="#3b82f6" fill="url(#cpuGrad)" strokeWidth={2} name="CPU %" />
            <Area type="monotone" dataKey="memory" stroke="#8b5cf6" fill="url(#memGrad)" strokeWidth={2} name="Memory %" />
            <Area type="monotone" dataKey="heap" stroke="#10b981" fill="url(#heapGrad)" strokeWidth={2} name="JVM Heap %" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
