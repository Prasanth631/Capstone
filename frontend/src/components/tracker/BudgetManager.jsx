import { useState } from 'react'
import { Target, Save, AlertTriangle, Info } from 'lucide-react'
import { formatCurrency, formatPercent } from '../../utils/formatters'
import CategoryBadge from './CategoryBadge'

export default function BudgetManager({ budget, setMonthlyBudget, stats }) {
  const [newBudget, setNewBudget] = useState(budget)
  const [isEditing, setIsEditing] = useState(false)
  
  const totalExpense = stats.totalExpense || 0
  const budgetUsed = Math.min((totalExpense / budget) * 100, 100)
  const isOverBudget = totalExpense > budget

  const handleSaveBudget = () => {
    const val = parseFloat(newBudget)
    if (!isNaN(val) && val > 0) {
      setMonthlyBudget(val)
      setIsEditing(false)
    }
  }

  // Generate category specific progress
  // Wait, right now we only have a global budget. A future iteration can hold per-category budgets.
  // For now we'll show category expense as a % of the TOTAL budget, to see where money goes.
  const categoryBreakdown = Object.entries(stats.categoryTotals || {})
    .sort(([, a], [, b]) => b - a)
    .map(([key, val]) => ({
      key,
      amount: val,
      percentOfTotal: formatPercent(val, totalExpense),
      percentOfBudget: (val / budget) * 100 // raw percentage
    }))

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-6 border-b-4 border-b-cyan-500">
        <div>
          <h2 className="text-xl font-bold text-heading flex items-center gap-2">
            <Target className="w-6 h-6 text-cyan-500" /> Monthly Budget Goal
          </h2>
          <p className="text-sm text-surface-500 mt-1">Set a global spending limit to keep your finances in check.</p>
        </div>

        {isEditing ? (
          <div className="flex items-center gap-3">
             <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 font-semibold">₹</span>
                <input
                  type="number"
                  value={newBudget}
                  onChange={(e) => setNewBudget(e.target.value)}
                  className="input-field pl-8 max-w-[140px] font-mono"
                  autoFocus
                />
             </div>
             <button
                onClick={handleSaveBudget}
                className="p-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl transition-all shadow-lg shadow-cyan-500/25"
             >
               <Save className="w-5 h-5" />
             </button>
          </div>
        ) : (
          <div className="flex items-center gap-4">
             <div className="text-right">
                <div className="text-xs font-bold text-surface-400 tracking-wider uppercase">Current Target</div>
                <div className="font-mono text-2xl font-bold text-heading">{formatCurrency(budget)}</div>
             </div>
             <button
               onClick={() => setIsEditing(true)}
               className="px-4 py-2 bg-surface-100 hover:bg-surface-200 dark:bg-white/5 dark:hover:bg-white/10 text-surface-700 dark:text-white rounded-lg text-sm font-semibold transition-colors"
             >
               Edit
             </button>
          </div>
        )}
      </div>

      <div className="glass-card p-6">
        <h3 className="text-lg font-bold text-heading mb-6">Budget Utilization</h3>
        
        {/* Main Progress Bar */}
        <div className="mb-8">
           <div className="flex justify-between items-end mb-2">
              <span className="font-semibold text-surface-600 dark:text-white/70">Total Expenses</span>
              <div className="text-right">
                 <span className={`text-2xl font-bold font-mono tracking-tight mr-2 ${isOverBudget ? 'text-red-500' : 'text-cyan-500 dark:text-cyan-400'}`}>
                   {formatCurrency(totalExpense)}
                 </span>
                 <span className="text-sm text-surface-400 font-mono tracking-tight">/ {formatCurrency(budget)}</span>
              </div>
           </div>
           
           <div className="h-4 w-full bg-surface-100 dark:bg-white/10 rounded-full overflow-hidden shadow-inner relative">
              <div 
                className={`h-full rounded-full transition-all duration-1000 relative ${isOverBudget ? 'bg-red-500' : 'bg-gradient-to-r from-cyan-400 to-blue-500'}`}
                style={{ width: `${budgetUsed}%` }}
              >
                <div className="absolute inset-0 bg-white/20 w-full animate-pulse-slow" />
              </div>
           </div>
           
           <div className="flex justify-between items-center mt-2 text-sm">
             <span className="font-semibold text-surface-500">{formatPercent(totalExpense, budget)} Used</span>
             {isOverBudget ? (
               <span className="text-red-500 font-semibold flex items-center gap-1">
                 <AlertTriangle className="w-4 h-4" /> Over Budget by {formatCurrency(totalExpense - budget)}
               </span>
             ) : (
               <span className="text-emerald-500 font-semibold flex items-center gap-1">
                 <Info className="w-4 h-4" /> {formatCurrency(budget - totalExpense)} remaining
               </span>
             )}
           </div>
        </div>

        <hr className="border-surface-200 dark:border-white/10 mb-8" />

        {/* Categories breakdown vs total budget */}
        <h4 className="text-base font-bold text-heading mb-4">Top Spending Categories</h4>
        <div className="space-y-5">
           {categoryBreakdown.length === 0 ? (
             <p className="text-sm text-surface-400 p-4 text-center bg-surface-50 dark:bg-black/20 rounded-xl">
               Record expenses to see category breakdown against your budget.
             </p>
           ) : (
             categoryBreakdown.map((cat, i) => (
                <div key={cat.key} className="flex flex-col sm:flex-row sm:items-center gap-3">
                   <div className="w-40 shrink-0">
                     <CategoryBadge categoryId={cat.key} />
                   </div>
                   
                   <div className="flex-1 flex items-center gap-4">
                     <div className="h-2 flex-1 bg-surface-100 dark:bg-white/5 rounded-full overflow-hidden">
                       <div 
                         className="h-full rounded-full bg-surface-400 dark:bg-surface-600 transition-all duration-700"
                         style={{ width: `${Math.min(cat.percentOfBudget, 100)}%` }}
                       />
                     </div>
                     <div className="w-24 text-right">
                       <div className="text-sm font-bold font-mono text-heading leading-tight">{formatCurrency(cat.amount)}</div>
                       <div className="text-[10px] font-semibold text-surface-500">{cat.percentOfTotal} of expenses</div>
                     </div>
                   </div>
                </div>
             ))
           )}
        </div>
      </div>
    </div>
  )
}
