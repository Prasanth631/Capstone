import { ArrowUpCircle, ArrowDownCircle, Wallet, Target } from 'lucide-react'
import { formatCurrency, formatPercent } from '../../utils/formatters'

export default function QuickStats({ stats, budget }) {
  const { totalIncome = 0, totalExpense = 0, netCashFlow = 0 } = stats
  
  const budgetUsed = Math.min((totalExpense / budget) * 100, 100)
  const isOverBudget = totalExpense > budget

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      
      {/* Total Income */}
      <div className="glass-card p-5 relative overflow-hidden group">
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all duration-500" />
        <div className="flex justify-between items-start mb-4 relative z-10">
          <div>
            <p className="text-xs font-bold text-surface-500 dark:text-white/50 uppercase tracking-wider">Total Income</p>
            <h3 className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1 flex items-center">
              + {formatCurrency(totalIncome)}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-inner">
            <ArrowUpCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Total Expense */}
      <div className="glass-card p-5 relative overflow-hidden group">
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-500/10 rounded-full blur-2xl group-hover:bg-red-500/20 transition-all duration-500" />
        <div className="flex justify-between items-start mb-4 relative z-10">
          <div>
            <p className="text-xs font-bold text-surface-500 dark:text-white/50 uppercase tracking-wider">Total Expenses</p>
            <h3 className="text-2xl font-bold font-mono text-red-600 dark:text-red-400 mt-1 flex items-center">
              - {formatCurrency(totalExpense)}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center text-red-600 dark:text-red-400 shadow-inner">
            <ArrowDownCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Net Cash Flow */}
      <div className="glass-card p-5 relative overflow-hidden group">
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary-500/10 rounded-full blur-2xl group-hover:bg-primary-500/20 transition-all duration-500" />
        <div className="flex justify-between items-start mb-4 relative z-10">
          <div>
            <p className="text-xs font-bold text-surface-500 dark:text-white/50 uppercase tracking-wider">Net Cash Flow</p>
            <h3 className={`text-2xl font-bold font-mono mt-1 ${netCashFlow >= 0 ? 'text-primary-600 dark:text-primary-400' : 'text-orange-500 dark:text-orange-400'}`}>
              {netCashFlow >= 0 ? '' : '- '}
              {formatCurrency(Math.abs(netCashFlow))}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-500/20 flex items-center justify-center text-primary-600 dark:text-primary-400 shadow-inner">
            <Wallet className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Budget Health */}
      <div className="glass-card p-5 relative overflow-hidden group">
        <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full blur-2xl transition-all duration-500 ${isOverBudget ? 'bg-rose-500/10 group-hover:bg-rose-500/20' : 'bg-cyan-500/10 group-hover:bg-cyan-500/20'}`} />
        <div className="flex justify-between items-start mb-2 relative z-10">
          <div>
            <p className="text-xs font-bold text-surface-500 dark:text-white/50 uppercase tracking-wider">Budget Used</p>
            <h3 className="text-xl font-bold text-heading mt-1 leading-none font-mono">
              {formatPercent(totalExpense, budget)}
            </h3>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ${isOverBudget ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400' : 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400'}`}>
            <Target className="w-5 h-5" />
          </div>
        </div>
        <div className="w-full bg-surface-200 dark:bg-white/10 rounded-full h-1.5 mt-2 overflow-hidden relative z-10">
          <div 
            className={`h-1.5 rounded-full transition-all duration-1000 ${isOverBudget ? 'bg-rose-500' : 'bg-cyan-500'}`} 
            style={{ width: `${budgetUsed}%` }} 
          />
        </div>
        <p className="text-[10px] text-surface-500 dark:text-white/50 mt-1.5 font-medium flex justify-between">
          <span>{formatCurrency(totalExpense)}</span>
          <span>{formatCurrency(budget)}</span>
        </p>
      </div>
      
    </div>
  )
}
