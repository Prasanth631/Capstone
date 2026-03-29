import { DollarSign, Receipt, CreditCard } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts'
import { categories } from './CategoryBadge'

export default function ExpenseStats({ expenses }) {
  if (!expenses || expenses.length === 0) {
    return (
      <div className="glass-card p-6 min-h-[400px] flex items-center justify-center text-center">
        <div>
          <DollarSign className="w-10 h-10 mx-auto text-surface-300 dark:text-white/20 mb-3" />
          <h3 className="text-lg font-bold text-heading">Analytics Pending</h3>
          <p className="text-sm text-muted mt-2">Add expenses to see detailed analytics.</p>
        </div>
      </div>
    )
  }

  // Calculate generic stats
  const totalSpent = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0)
  const averageSpent = expenses.length > 0 ? totalSpent / expenses.length : 0

  // Aggregate by category for donut chart
  const categoryTotals = expenses.reduce((acc, exp) => {
    const cat = exp.category || 'other'
    acc[cat] = (acc[cat] || 0) + (exp.amount || 0)
    return acc
  }, {})

  // Map into Recharts format
  // Example color mapping
  const colorMap = {
    food: '#fb923c', // orange-400
    transport: '#60a5fa', // blue-400
    utilities: '#818cf8', // indigo-400
    software: '#c084fc', // purple-400
    marketing: '#f472b6', // pink-400
    hardware: '#94a3b8', // slate-400
    other: '#a1a1aa' // zinc-400
  }

  const chartData = Object.keys(categoryTotals)
    .map(key => ({
      name: categories[key]?.label || 'Other',
      value: categoryTotals[key],
      color: colorMap[key] || colorMap.other
    }))
    .sort((a, b) => b.value - a.value)

  const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)

  return (
    <div className="space-y-6">
      {/* Total Spent Card */}
      <div className="glass-card p-6 bg-gradient-to-br from-primary-50 dark:from-white/5 to-surface-50 dark:to-surface-950 border-primary-100 dark:border-white/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 dark:bg-primary-500/20 rounded-full blur-3xl -mr-16 -mt-16" />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-primary-700 dark:text-primary-300 mb-1">Total Spent</p>
            <h2 className="text-3xl font-bold font-mono text-heading tracking-tight">
              {formatCurrency(totalSpent)}
            </h2>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-primary-100 dark:bg-primary-500/20 flex items-center justify-center shadow-inner">
            <DollarSign className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="glass-card p-4">
          <p className="text-xs font-semibold text-surface-500 dark:text-white/50 uppercase tracking-wider mb-2">Transactions</p>
          <div className="flex items-end justify-between">
            <h3 className="text-xl font-bold font-mono text-heading">{expenses.length}</h3>
            <Receipt className="w-5 h-5 text-emerald-500 dark:text-emerald-400 mb-0.5" />
          </div>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs font-semibold text-surface-500 dark:text-white/50 uppercase tracking-wider mb-2">Avg / Item</p>
          <div className="flex items-end justify-between">
            <h3 className="text-xl font-bold font-mono text-heading leading-none -mb-[1px]">
              {formatCurrency(averageSpent)}
            </h3>
            <CreditCard className="w-5 h-5 text-purple-500 dark:text-purple-400 mb-0.5" />
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold text-heading mb-6">Spending Analysis</h3>
        <div className="h-64 relative -mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={85}
                paddingAngle={4}
                dataKey="value"
                strokeWidth={0}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <RechartsTooltip 
                formatter={(val) => formatCurrency(val)}
                contentStyle={{ 
                  backgroundColor: 'var(--tooltip-bg, #0f172a)', 
                  border: '1px solid rgba(148, 163, 184, 0.2)', 
                  borderRadius: '12px', fontSize: '12px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
                }}
                itemStyle={{ color: '#fff', fontWeight: 600, fontFamily: 'monospace' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center mt-3">
             <span className="text-[10px] text-muted uppercase font-bold tracking-widest leading-none mb-1">Categories</span>
             <span className="text-lg font-bold text-heading leading-none">{chartData.length}</span>
          </div>
        </div>
        
        {/* Custom Legend */}
        <div className="mt-2 space-y-2">
          {chartData.map(item => (
            <div key={item.name} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-surface-700 dark:text-white/80 font-medium">{item.name}</span>
              </div>
              <span className="font-mono font-semibold text-surface-900 dark:text-white/90">{formatCurrency(item.value)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
