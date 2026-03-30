import { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { formatCurrency, formatPercent } from '../../utils/formatters'
import { getCategoryColorHex, defaultCategories } from '../../utils/constants'
import CategoryBadge from './CategoryBadge'

export default function ReportsView({ transactions, filteredTransactions, stats }) {
  // We use filteredTransactions exclusively here since the parent already filters by "month"
  
  const { totalIncome = 0, totalExpense = 0, netCashFlow = 0 } = stats
  const savingsRate = totalIncome > 0 ? (netCashFlow / totalIncome) * 100 : 0

  // Category Pie Chart
  const categoryData = Object.keys(stats.categoryTotals || {})
    .map(key => ({
      name: defaultCategories[key]?.label || 'Other',
      value: stats.categoryTotals[key],
      fill: getCategoryColorHex(key)
    }))
    .sort((a, b) => b.value - a.value)

  // Top 5 Largest Expenses this period
  const topExpenses = useMemo(() => {
    return filteredTransactions
      .filter(t => t.type !== 'income')
      .sort((a, b) => (b.amount || 0) - (a.amount || 0))
      .slice(0, 5)
  }, [filteredTransactions])

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Executive Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <div className="glass-card p-5 bg-gradient-to-br from-indigo-50 dark:from-indigo-500/10 to-transparent">
            <h4 className="text-xs font-bold text-surface-500 uppercase tracking-widest mb-1">Savings Rate</h4>
            <div className="flex items-baseline gap-2">
               <span className="text-3xl font-mono font-bold text-heading">{savingsRate.toFixed(1)}%</span>
               <span className="text-sm text-muted hidden sm:inline">of income saved</span>
            </div>
         </div>
         <div className="glass-card p-5">
            <h4 className="text-xs font-bold text-surface-500 uppercase tracking-widest mb-1">Largest Expense</h4>
            <div className="flex items-baseline gap-2">
               <span className="text-2xl font-mono font-bold text-red-500">{formatCurrency(topExpenses[0]?.amount || 0)}</span>
            </div>
            <p className="text-xs text-muted truncate mt-1">{topExpenses[0]?.description || 'N/A'}</p>
         </div>
         <div className="glass-card p-5">
            <h4 className="text-xs font-bold text-surface-500 uppercase tracking-widest mb-1">Net Position</h4>
            <div className="flex items-baseline gap-2">
               <span className={`text-2xl font-mono font-bold ${netCashFlow >= 0 ? 'text-emerald-500' : 'text-orange-500'}`}>
                 {netCashFlow >= 0 ? '+' : ''}{formatCurrency(netCashFlow)}
               </span>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Category Breakdown Donut */}
        <div className="glass-card p-6 flex flex-col h-[400px]">
          <h3 className="text-lg font-bold text-heading mb-4">Expenditure Breakdown</h3>
          <div className="flex-1 min-h-[250px] relative">
            {categoryData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-surface-400">No data for this period</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(val) => formatCurrency(val)} />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top Expenses List */}
        <div className="glass-card p-6 flex flex-col h-[400px]">
          <h3 className="text-lg font-bold text-heading mb-4">Largest Transactions</h3>
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {topExpenses.length === 0 ? (
              <div className="flex items-center justify-center h-full text-surface-400">No expenses recorded</div>
            ) : (
              <div className="space-y-4">
                {topExpenses.map((exp, i) => (
                  <div key={exp.id} className="flex items-center justify-between p-3 rounded-xl bg-surface-50 dark:bg-white/5 border border-surface-100 dark:border-white/5">
                    <div className="flex items-center gap-4">
                      <div className="font-mono text-xl font-bold text-surface-300 dark:text-white/20 w-6">
                        {i + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-heading truncate max-w-[200px]">{exp.description || 'Unknown'}</p>
                        <div className="mt-1"><CategoryBadge categoryId={exp.category} /></div>
                      </div>
                    </div>
                    <div className="text-right">
                       <span className="font-mono font-bold text-red-500">{formatCurrency(exp.amount)}</span>
                       <div className="text-[10px] text-surface-400 font-semibold mt-1">
                         {formatPercent(exp.amount, totalExpense)} of total
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
