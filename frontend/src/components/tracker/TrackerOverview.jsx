import { useState } from 'react'
import QuickStats from './QuickStats'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { formatCurrency } from '../../utils/formatters'
import { getCategoryColorHex, defaultCategories } from '../../utils/constants'
import { ArrowRight, Receipt } from 'lucide-react'
import CategoryBadge from './CategoryBadge'

export default function TrackerOverview({ 
  transactions, 
  filteredTransactions, 
  stats, 
  budget, 
  onTabChange 
}) {
  
  // Bar Chart Data (Income vs Expense over recent months)
  // For simplicity, we just look at the last 6 months of data we have
  const monthlyData = transactions.reduce((acc, t) => {
    let m = ''
    if (t.date?.seconds) m = new Date(t.date.seconds * 1000).toISOString().slice(0, 7)
    else if (t.date) m = new Date(t.date).toISOString().slice(0, 7)
    
    if (!m) return acc
    if (!acc[m]) acc[m] = { name: m, income: 0, expense: 0 }
    
    if (t.type === 'income') acc[m].income += (t.amount || 0)
    else acc[m].expense += (t.amount || 0)
    return acc
  }, {})

  const barChartData = Object.values(monthlyData)
    .sort((a, b) => a.name.localeCompare(b.name)) // chronological
    .slice(-6) // last 6 months
    .map(d => {
      // Format '2023-10' to 'Oct'
      const [y, m] = d.name.split('-')
      const name = new Date(parseInt(y), parseInt(m) - 1).toLocaleString('default', { month: 'short' })
      return { ...d, name }
    })

  // Donut Chart Data (Categories from current filtered stats)
  const donutData = Object.keys(stats.categoryTotals || {})
    .map(key => ({
      name: defaultCategories[key]?.label || 'Other',
      value: stats.categoryTotals[key],
      fill: getCategoryColorHex(key)
    }))
    .sort((a, b) => b.value - a.value)

  // Recent Transactions Data
  const recentTransactions = [...filteredTransactions]
    .sort((a, b) => {
      const aVal = a.date?.seconds || a.date || 0
      const bVal = b.date?.seconds || b.date || 0
      return bVal - aVal
    })
    .slice(0, 5)

  // Custom tooltips
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface-900 border border-surface-700 p-3 rounded-lg shadow-xl text-white">
          <p className="text-xs font-bold mb-1 tracking-wider text-surface-400 uppercase">{payload[0].payload.name}</p>
          {payload.map(entry => (
             <div key={entry.name} className="flex items-center gap-2 text-sm justify-between">
               <span style={{ color: entry.fill }} className="font-semibold">{entry.name}:</span>
               <span className="font-mono font-bold">{formatCurrency(entry.value)}</span>
             </div>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <QuickStats stats={stats} budget={budget} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Cash Flow Timeline */}
        <div className="lg:col-span-2 glass-card p-5">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-heading">Cash Flow Trends</h3>
              <p className="text-xs text-muted">Income vs Expenses over the last 6 active months</p>
            </div>
            <button
               onClick={() => onTabChange('reports')}
               className="text-[11px] font-bold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 uppercase tracking-wider flex items-center gap-1 transition-colors"
            >
              Full Report <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          
          <div className="h-72 w-full">
            {barChartData.length === 0 ? (
              <div className="flex justify-center items-center h-full text-surface-400 text-sm">No data to display</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.1)" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#94a3b8' }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#94a3b8' }} 
                    tickFormatter={(val) => `₹${val>=1000 ? (val/1000)+'k' : val}`}
                  />
                  <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }} />
                  <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="expense" name="Expense" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Category Breakdown Donut */}
        <div className="glass-card p-5">
          <h3 className="text-base font-bold text-heading mb-6">Expense Categories</h3>
          
          <div className="h-48 relative mb-4">
            {donutData.length === 0 ? (
              <div className="flex justify-center items-center h-full text-surface-400 text-sm">No expenses yet</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {donutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                   <span className="text-[10px] text-muted uppercase font-bold tracking-widest leading-none mb-1 mt-1">Total</span>
                   <span className="text-base font-bold text-red-500 leading-none">{formatCurrency(stats.totalExpense)}</span>
                </div>
              </>
            )}
          </div>
          
          {/* Top 3 Legend */}
          <div className="space-y-2 mt-4">
            {donutData.slice(0, 4).map(item => (
              <div key={item.name} className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                   <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                   <span className="text-surface-600 dark:text-white/70 font-medium truncate max-w-[120px]">{item.name}</span>
                </div>
                <span className="font-mono text-heading">{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Transactions Widget */}
        <div className="lg:col-span-3 glass-card p-5">
           <div className="flex items-end justify-between mb-4">
             <div>
               <h3 className="text-base font-bold text-heading">Recent Activity</h3>
               <p className="text-xs text-muted">Your latest transactions across all types</p>
             </div>
             <button
               onClick={() => onTabChange('transactions')}
               className="text-[11px] font-bold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 uppercase tracking-wider flex items-center gap-1 transition-colors"
             >
               View All <ArrowRight className="w-3 h-3" />
             </button>
           </div>
           
           <div className="space-y-1">
             {recentTransactions.length === 0 ? (
               <div className="py-8 text-center text-surface-400 dark:text-white/40 text-sm flex flex-col items-center">
                 <Receipt className="w-8 h-8 opacity-20 mb-2" />
                 No recent activity found.
               </div>
             ) : (
               recentTransactions.map(t => (
                 <div key={t.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-surface-50 dark:hover:bg-white/[0.02] transition-colors border border-transparent dark:border-white/5 dark:bg-black/20 mb-2">
                   <div className="flex items-center gap-4">
                     <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                       t.type === 'income' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' 
                       : 'bg-surface-100 text-surface-500 dark:bg-white/5 dark:text-white/40'
                     }`}>
                       <Receipt className="w-5 h-5" />
                     </div>
                     <div>
                       <p className="text-sm font-semibold text-heading truncate max-w-[200px] sm:max-w-xs">{t.description}</p>
                       <div className="flex items-center gap-2 mt-0.5">
                         <CategoryBadge categoryId={t.category} type={t.type || 'expense'} />
                       </div>
                     </div>
                   </div>
                   <div className={`font-mono font-bold text-sm tracking-tight ${
                     t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-surface-900 dark:text-white'
                   }`}>
                     {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                   </div>
                 </div>
               ))
             )}
           </div>
        </div>
      </div>
    </div>
  )
}
