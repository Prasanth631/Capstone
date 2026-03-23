import { FlaskConical, CheckCircle, XCircle, MinusCircle } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

export default function TestResultsSummary({ results }) {
  const data = {
    totalTests: results.totalTests ?? 156,
    passed: results.passed ?? 148,
    failed: results.failed ?? 5,
    skipped: results.skipped ?? 3,
    passRate: results.passRate ?? 94.87,
  }

  const chartData = [
    { name: 'Passed', value: data.passed, color: '#10b981' },
    { name: 'Failed', value: data.failed, color: '#ef4444' },
    { name: 'Skipped', value: data.skipped, color: '#f59e0b' },
  ]

  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-2 mb-5">
        <FlaskConical className="w-5 h-5 text-primary-400" />
        <h2 className="text-lg font-semibold text-white">Test Results</h2>
      </div>

      <div className="flex items-center gap-6">
        {/* Donut Chart */}
        <div className="w-40 h-40 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={65}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }}
                itemStyle={{ color: '#fff' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold text-white">{data.passRate}%</span>
            <span className="text-[10px] text-white/40">Pass Rate</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-emerald-300">Passed</span>
            </div>
            <span className="font-semibold text-emerald-400">{data.passed}</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-400" />
              <span className="text-sm text-red-300">Failed</span>
            </div>
            <span className="font-semibold text-red-400">{data.failed}</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex items-center gap-2">
              <MinusCircle className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-yellow-300">Skipped</span>
            </div>
            <span className="font-semibold text-yellow-400">{data.skipped}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
