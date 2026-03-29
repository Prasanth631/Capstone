import { Edit, Trash2, Calendar, Receipt } from 'lucide-react'
import CategoryBadge from './CategoryBadge'

export default function ExpenseList({ expenses, onEdit, onDelete }) {
  if (!expenses || expenses.length === 0) {
    return (
      <div className="glass-card p-6 h-full min-h-[400px] flex flex-col items-center justify-center text-center">
        <Receipt className="w-12 h-12 text-surface-300 dark:text-white/20 mb-4" />
        <h3 className="text-lg font-bold text-heading mb-2">No Expenses Found</h3>
        <p className="text-muted text-sm max-w-sm">
          You haven't recorded any expenses yet. Click the "Add Expense" button to get started.
        </p>
      </div>
    )
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0)
  }

  const formatDate = (val) => {
    if (!val) return 'Unknown'
    try {
      if (val.seconds) { // Firestore Timestamp
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

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-5 border-b border-surface-200 dark:border-white/10 flex items-center justify-between">
        <h3 className="text-lg font-bold text-heading">Transaction History</h3>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-surface-100 dark:bg-white/5 text-surface-600 dark:text-white/60">
          {expenses.length} Records
        </span>
      </div>
      
      <div className="overflow-x-auto">
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
            {expenses.map((exp) => (
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
      </div>
    </div>
  )
}
