import { DollarSign, Receipt, CreditCard, TrendingUp, AlertCircle, Target } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts'
import { categories } from './CategoryBadge'

export default function ExpenseStats({ expenses, selectedMonth }) {
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

  // Budget Engine Setup (Fixed 5000 for SaaS demo purposes)
  const monthlyBudget = 5000
  const budgetUsedPercent = Math.min((totalSpent / monthlyBudget) * 100, 100)
  const isOverBudget = totalSpent > monthlyBudget
  
  // Forecast Calculator
  let forecastedSpend = null
  let dailyRunRate = null
  const currentMonthYear = new Date().toISOString().slice(0, 7)
  
  if (selectedMonth === currentMonthYear || selectedMonth === 'all') {
    const today = new Date()
    const currentDay = today.getDate()
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
    
    // Only calculate forecast if we have > 1 day elapsed to avoid infinity
    if (currentDay > 1) {
      dailyRunRate = totalSpent / currentDay
      forecastedSpend = dailyRunRate * daysInMonth
    }
  }

  // Aggregate by category for donut chart
  const categoryTotals = expenses.reduce((acc, exp) => {
    const cat = exp.category || 'other'
    acc[cat] = (acc[cat] || 0) + (exp.amount || 0)
    return acc
  }, {})

  const colorMap = {
    food: '#fb923c', transport: '#60a5fa', utilities: '#818cf8',
    software: '#c084fc', marketing: '#f472b6', hardware: '#94a3b8', other: '#a1a1aa'
  }

  const chartData = Object.keys(categoryTotals)
    .map(key => ({
      name: categories[key]?.label || 'Other',
      value: categoryTotals[key],
      color: colorMap[key] || colorMap.other
    }))
    .sort((a, b) => b.value - a.value)

  const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val)

  return (
    <div className="space-y-6">
      {/* Total Spent Card with Budget Engine */}
      <div className="glass-card p-6 bg-gradient-to-br from-primary-50 dark:from-white/5 to-surface-50 dark:to-surface-950 border-primary-100 dark:border-white/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 dark:bg-primary-500/20 rounded-full blur-3xl -mr-16 -mt-16" />
        <div className="relative z-10 flex items-start justify-between mb-6">
          <div>
            <p className="text-sm font-semibold text-primary-700 dark:text-primary-300 mb-1">
              {selectedMonth === 'all' ? 'Total Spent (All Time)' : 'Monthly Spend'}
            </p>
            <h2 className="text-3xl font-bold font-mono text-heading tracking-tight">
              {formatCurrency(totalSpent)}
            </h2>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-primary-100 dark:bg-primary-500/20 flex items-center justify-center shadow-inner">
            <DollarSign className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
        </div>
        
        {/* Progress Bar for Budget */}
        {selectedMonth !== 'all' && (
          <div className="relative z-10 space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-surface-600 dark:text-white/60">Budget</span>
              <span className={isOverBudget ? "text-red-500" : "text-surface-600 dark:text-white/60"}>
                {formatCurrency(totalSpent)} / {formatCurrency(monthlyBudget)}
              </span>
            </div>
            <div className="h-2.5 w-full bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ease-out ${isOverBudget ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-primary-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]'}`}
                style={{ width: `${budgetUsedPercent}%` }}
              />
            </div>
            {isOverBudget ? (
              <p className="text-[11px] font-medium text-red-500 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3 h-3" /> You have exceeded your budget.
              </p>
            ) : (
              <p className="text-[11px] font-medium text-surface-500 dark:text-white/50 flex items-center gap-1 mt-1">
                <Target className="w-3 h-3" /> {formatCurrency(monthlyBudget - totalSpent)} remaining
              </p>
            )}
          </div>
        )}
      </div>

      {/* Forecast Data row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass-card p-4">
          <p className="text-[10px] font-bold text-surface-500 dark:text-white/50 uppercase tracking-widest mb-2">Transactions</p>
          <div className="flex items-end justify-between">
            <h3 className="text-xl font-bold font-mono text-heading">{expenses.length}</h3>
            <Receipt className="w-5 h-5 text-emerald-500 dark:text-emerald-400 mb-0.5" />
          </div>
        </div>
        <div className="glass-card p-4">
          <p className="text-[10px] font-bold text-surface-500 dark:text-white/50 uppercase tracking-widest mb-2">
            {forecastedSpend ? 'Est. Forecast' : 'Avg / Item'}
          </p>
          <div className="flex items-end justify-between">
            <h3 className="text-xl font-bold font-mono text-heading leading-none -mb-[1px]">
              {formatCurrency(forecastedSpend || averageSpent)}
            </h3>
            {forecastedSpend ? (
              <TrendingUp className="w-5 h-5 text-orange-500 dark:text-orange-400 mb-0.5" />
            ) : (
              <CreditCard className="w-5 h-5 text-purple-500 dark:text-purple-400 mb-0.5" />
            )}
          </div>
        </div>
      </div>

      {/* Analytics Chart */}
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
