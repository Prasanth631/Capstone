import { useState, useEffect } from 'react'
import { X, Save, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import { defaultCategories } from '../../utils/constants'

export default function TransactionForm({ transaction, onSave, onClose }) {
  const [type, setType] = useState('expense') // 'expense' or 'income'
  const [formData, setFormData] = useState({
    amount: '',
    category: 'other',
    description: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  })
  
  const [loading, setLoading] = useState(false)

  // Populate if editing
  useEffect(() => {
    if (transaction) {
      let dateStr = new Date().toISOString().split('T')[0]
      if (transaction.date?.seconds) {
        dateStr = new Date(transaction.date.seconds * 1000).toISOString().split('T')[0]
      } else if (typeof transaction.date === 'string' || typeof transaction.date === 'number') {
        dateStr = new Date(transaction.date).toISOString().split('T')[0]
      }

      setType(transaction.type || 'expense')
      setFormData({
        amount: transaction.amount,
        category: transaction.category || 'other',
        description: transaction.description || '',
        notes: transaction.notes || '',
        date: dateStr,
      })
    }
  }, [transaction])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    const parsedAmount = parseFloat(formData.amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Please enter a valid amount greater than 0.')
      setLoading(false)
      return
    }

    const transactionData = {
      ...formData,
      type,
      amount: parsedAmount,
      date: new Date(formData.date + 'T12:00:00Z').getTime() // Epoch ms
    }

    try {
      await onSave(transactionData)
    } finally {
      setLoading(false)
    }
  }

  // Filter categories by selected type
  const availableCategories = Object.entries(defaultCategories).filter(
    ([_, cat]) => cat.type === type
  )

  // If we toggle type, reset category to first available
  useEffect(() => {
    const isCurrentCategoryValid = availableCategories.some(([key]) => key === formData.category)
    if (!isCurrentCategoryValid && availableCategories.length > 0) {
      setFormData(prev => ({ ...prev, category: availableCategories[0][0] }))
    }
  }, [type, availableCategories, formData])

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-surface-900/60 dark:bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-lg glass-card p-6 shadow-2xl animate-slide-up bg-white dark:bg-surface-900">
        <div className="flex items-center justify-between mb-6 border-b border-surface-200 dark:border-white/10 pb-4">
          <h2 className="text-xl font-bold text-heading">
            {transaction ? 'Edit Transaction' : 'New Transaction'}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 -mr-2 text-surface-400 hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-white/10 dark:hover:text-white transition-colors rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 flex flex-col items-center">
          
          {/* Type Toggle */}
          <div className="flex bg-surface-100 dark:bg-white/5 p-1 rounded-xl w-full mb-2">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
                type === 'expense' 
                  ? 'bg-white dark:bg-surface-800 text-red-600 dark:text-red-400 shadow-sm' 
                  : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
              }`}
            >
              <ArrowDownCircle className="w-4 h-4" /> Expense
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
                type === 'income' 
                  ? 'bg-white dark:bg-surface-800 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                  : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
              }`}
            >
              <ArrowUpCircle className="w-4 h-4" /> Income
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full">
            <div>
              <label className="block text-sm font-semibold text-surface-700 dark:text-white/80 mb-1.5">Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 font-semibold">₹</span>
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
              <label className="block text-sm font-semibold text-surface-700 dark:text-white/80 mb-1.5">Date</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div className="w-full">
            <label className="block text-sm font-semibold text-surface-700 dark:text-white/80 mb-1.5">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="input-field appearance-none w-full"
            >
              {availableCategories.map(([key, cat]) => (
                <option key={key} value={key}>{cat.label}</option>
              ))}
            </select>
          </div>

          <div className="w-full">
            <label className="block text-sm font-semibold text-surface-700 dark:text-white/80 mb-1.5">Title / Description</label>
            <input
              type="text"
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input-field w-full"
              placeholder={`e.g. ${type === 'income' ? 'Client Project Payment' : 'AWS Invoice'}`}
            />
          </div>

          <div className="w-full">
            <label className="block text-sm font-semibold text-surface-700 dark:text-white/80 mb-1.5">Additional Notes (Optional)</label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input-field w-full resize-none text-sm"
              placeholder="Any details to remember..."
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 w-full border-t border-surface-200 dark:border-white/10 mt-2">
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
              className={`px-5 py-2.5 text-white font-medium rounded-xl transition-all duration-300 disabled:opacity-50 flex items-center gap-2 shadow-lg ${
                type === 'income' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/25' : 'bg-primary-600 hover:bg-primary-500 shadow-primary-500/25'
              }`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {transaction ? 'Save Changes' : `Save ${type === 'income' ? 'Income' : 'Expense'}`}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
