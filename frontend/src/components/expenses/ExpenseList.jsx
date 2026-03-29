import { useState } from 'react'
import { Edit, Trash2, Calendar, Receipt, Download } from 'lucide-react'
import CategoryBadge from './CategoryBadge'

export default function ExpenseList({ expenses, onEdit, onDelete }) {
  const [categoryFilter, setCategoryFilter] = useState('all')

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0)
  }

  const formatDate = (val) => {
    if (!val) return 'Unknown'
    try {
      if (val.seconds) {
        return new Date(val.seconds * 1000).toLocaleDateString(undefined, {
          year: 'numeric', month: 'short', day: 'numeric'
        })
      }
      return new Date(val).toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric'
      })
    } catch {
      return 'Invalid Date'
    }
  }

  const handleExportCSV = () => {
    if (!expenses || expenses.length === 0) return
    
    const headers = ['Date', 'Description', 'Category', 'Amount']
    const rows = expenses.map(exp => [
      formatDate(exp.date),
      `"${exp.description || ''}"`,
      exp.category || 'Other',
      exp.amount || 0
    ])
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `expenses_export_${new Date().toISOString().slice(0,10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const displayExpenses = categoryFilter === 'all' 
    ? expenses 
    : expenses.filter(e => e.category === categoryFilter)

  if (!expenses || expenses.length === 0) {
    return (
      <div className="glass-card p-6 h-full min-h-[400px] flex flex-col items-center justify-center text-center">
        <Receipt className="w-12 h-12 text-surface-300 dark:text-white/20 mb-4" />
        <h3 className="text-lg font-bold text-heading mb-2">No Expenses Found</h3>
        <p className="text-muted text-sm max-w-sm">
          You haven't recorded any expenses for this period yet.
        </p>
      </div>
    )
  }

  // Extract unique categories for filter
  const uniqueCategories = [...new Set(expenses.map(e => e.category).filter(Boolean))]

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-5 border-b border-surface-200 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-heading">Transaction History</h3>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-surface-100 dark:bg-white/5 text-surface-600 dark:text-white/60">
            {displayExpenses.length} Records
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {uniqueCategories.length > 0 && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-surface-50 dark:bg-white/5 border border-surface-200 dark:border-white/10 text-surface-700 dark:text-white/80 text-xs rounded-lg focus:ring-primary-500 focus:border-primary-500 p-2 transition-colors"
            >
              <option value="all">All Categories</option>
              {uniqueCategories.map(cat => (
                <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
              ))}
            </select>
          )}

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-surface-600 dark:text-white/70 bg-surface-100 dark:bg-white/10 hover:bg-surface-200 dark:hover:bg-white/20 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto min-h-[300px]">
        {displayExpenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-10 text-surface-400 dark:text-white/40">
            <p className="text-sm">No transactions match the selected category filter.</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-surface-50/50 dark:bg-white/[0.02]">
              <tr>
                <th className="px-5 py-3 font-semibold text-surface-500 dark:text-white/60">Date</th>
                <th className="px-5 py-3 font-semibold text-surface-500 dark:text-white/60">Description</th>
                <th className="px-5 py-3 font-semibold text-surface-500 dark:text-white/60">Category</th>
                <th className="px-5 py-3 font-semibold text-right text-surface-500 dark:text-white/60">Amount</th>
                <th className="px-5 py-3 font-semibold text-center text-surface-500 dark:text-white/60">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-white/5">
              {displayExpenses.map((exp) => (
                <tr 
                  key={exp.id} 
                  className="hover:bg-surface-50 dark:hover:bg-white/[0.02] transition-colors group"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2 text-surface-600 dark:text-white/70">
                      <Calendar className="w-4 h-4 opacity-50" />
                      <span>{formatDate(exp.date)}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-medium text-surface-900 dark:text-white/90">
                      {exp.description || 'No description'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <CategoryBadge categoryId={exp.category} />
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className="font-mono font-bold text-surface-900 dark:text-white/90 tracking-tight">
                      {formatCurrency(exp.amount)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => onEdit(exp)}
                        className="p-1.5 rounded-md hover:bg-surface-200 dark:hover:bg-white/10 text-surface-500 dark:text-white/60 transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => onDelete(exp.id)}
                        className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-rose-500/20 text-red-500 dark:text-rose-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
