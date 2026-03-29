import { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'
import { categories } from './CategoryBadge'

export default function ExpenseForm({ expense, onSave, onClose }) {
  const [formData, setFormData] = useState({
    amount: '',
    category: 'other',
    description: '',
    date: new Date().toISOString().split('T')[0],
  })
  
  const [loading, setLoading] = useState(false)

  // Populate if editing
  useEffect(() => {
    if (expense) {
      let dateStr = new Date().toISOString().split('T')[0]
      if (expense.date?.seconds) {
        // Handle Firestore timestamp
        dateStr = new Date(expense.date.seconds * 1000).toISOString().split('T')[0]
      } else if (typeof expense.date === 'string' || typeof expense.date === 'number') {
        dateStr = new Date(expense.date).toISOString().split('T')[0]
      }

      setFormData({
        amount: expense.amount,
        category: expense.category || 'other',
        description: expense.description || '',
        date: dateStr,
      })
    }
  }, [expense])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    // Parse numeric amount
    const parsedAmount = parseFloat(formData.amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Please enter a valid amount greater than 0.')
      setLoading(false)
      return
    }

    // Convert date string to timestamp for indexing/sorting
    const expenseData = {
      ...formData,
      amount: parsedAmount,
      date: new Date(formData.date + 'T12:00:00Z').getTime() // Store as epoch ms so frontend handles it easily
    }

    await onSave(expenseData)
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-surface-900/60 dark:bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg glass-card p-6 shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-heading">
            {expense ? 'Edit Expense' : 'Add New Expense'}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 -mr-2 text-surface-400 hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-white/10 dark:hover:text-white transition-colors rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-surface-700 dark:text-white/80 mb-1.5">
                Amount ($)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 font-semibold">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="input-field pl-8 font-mono"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-surface-700 dark:text-white/80 mb-1.5">
                Date
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-surface-700 dark:text-white/80 mb-1.5">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="input-field appearance-none"
            >
              {Object.entries(categories).map(([key, cat]) => (
                <option key={key} value={key}>{cat.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-surface-700 dark:text-white/80 mb-1.5">
              Description
            </label>
            <input
              type="text"
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input-field"
              placeholder="e.g. AWS Invoice / Domain renewal / Team lunch"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-medium text-surface-600 dark:text-white/70 hover:bg-surface-100 dark:hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-gradient-to-r from-primary-500 to-purple-600 text-white font-medium rounded-xl hover:from-primary-400 hover:to-purple-500 transition-all duration-300 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-primary-500/25"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {expense ? 'Save Changes' : 'Create Expense'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
