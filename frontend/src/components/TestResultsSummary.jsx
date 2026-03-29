import { FlaskConical, CheckCircle, XCircle, MinusCircle } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

export default function TestResultsSummary({ results }) {
  const data = {
    totalTests: results?.totalTests ?? 0,
    passed: results?.passed ?? 0,
    failed: results?.failed ?? 0,
    skipped: results?.skipped ?? 0,
    passRate: results?.passRate ?? 0,
  }

  const chartData = [
    { name: 'Passed', value: data.passed, color: '#10b981' }, // Emerald
    { name: 'Failed', value: data.failed, color: '#ef4444' }, // Red
    { name: 'Skipped', value: data.skipped, color: '#f59e0b' }, // Amber
  ].filter(d => d.value > 0) // Only render slices that have data

  if (data.totalTests === 0) {
    return (
      <div className="glass-card p-6 min-h-[220px] flex flex-col">
        <div className="flex items-center gap-2 mb-5">
          <FlaskConical className="w-5 h-5 text-primary-500 dark:text-primary-400" />
          <h2 className="text-lg font-semibold text-heading">Test Results</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted text-sm">Waiting for test execution...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card p-6 min-h-[220px]">
      <div className="flex items-center gap-2 mb-8">
        <FlaskConical className="w-5 h-5 text-primary-500 dark:text-primary-400" />
        <h2 className="text-lg font-semibold text-heading">Test Results</h2>
        <span className="ml-auto text-xs text-muted font-medium bg-surface-100 dark:bg-white/5 px-2 py-1 rounded-full border border-surface-200 dark:border-white/10">
          {data.totalTests} tests run
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-8 px-4">
        {/* Donut Chart */}
        <div className="w-32 h-32 relative flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData.length ? chartData : [{ name: 'Empty', value: 1, color: '#e2e8f0' }]}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={60}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {(chartData.length ? chartData : [{ name: 'Empty', value: 1, color: '#e2e8f0' }]).map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              {chartData.length > 0 && (
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: 'var(--tooltip-bg, #0f172a)', 
                    border: '1px solid rgba(148, 163, 184, 0.2)', 
                    borderRadius: '8px', fontSize: '12px' 
                  }}
                  itemStyle={{ color: 'var(--tooltip-text, #fff)' }}
                />
              )}
            </PieChart>
          </ResponsiveContainer>
          {chartData.length > 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center -mt-0.5">
              <span className="text-xl font-bold text-heading">{Number(data.passRate).toFixed(1)}%</span>
            </div>
          )}
        </div>

        {/* Stats List */}
        <div className="flex-1 w-full space-y-2.5">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Passed</span>
            </div>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">{data.passed}</span>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-red-50 dark:bg-rose-500/10 border border-red-200 dark:border-rose-500/20">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
              <span className="text-sm font-medium text-red-700 dark:text-rose-300">Failed</span>
            </div>
            <span className="font-bold text-red-600 dark:text-rose-400">{data.failed}</span>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
              <span className="text-sm font-medium text-amber-700 dark:text-amber-300">Skipped</span>
            </div>
            <span className="font-bold text-amber-600 dark:text-amber-400">{data.skipped}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
