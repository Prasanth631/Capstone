import { useState, useMemo } from 'react'
import { Edit, Trash2, Calendar, Download, Search, FileText } from 'lucide-react'
import CategoryBadge from './CategoryBadge'
import { formatCurrency, formatDate } from '../../utils/formatters'
import { exportToCSV, exportToPDF } from '../../utils/exportUtils'

export default function TransactionList({ 
  transactions, 
  onEdit, 
  onDelete 
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all') // 'all', 'income', 'expense'
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' })

  // --- DERIVED DATA ---
  const displayData = useMemo(() => {
    let result = [...transactions]

    // 1. Search
    if (searchTerm) {
      const lower = searchTerm.toLowerCase()
      result = result.filter(t => 
        t.description?.toLowerCase().includes(lower) || 
        t.notes?.toLowerCase().includes(lower) ||
        t.amount?.toString().includes(lower)
      )
    }

    // 2. Filters
    if (typeFilter !== 'all') {
      result = result.filter(t => (t.type || 'expense') === typeFilter)
    }
    
    if (categoryFilter !== 'all') {
      result = result.filter(t => t.category === categoryFilter)
    }

    // 3. Sorting
    result.sort((a, b) => {
      let aVal = a[sortConfig.key]
      let bVal = b[sortConfig.key]

      if (sortConfig.key === 'date') {
        aVal = a.date?.seconds || a.date || 0
        bVal = b.date?.seconds || b.date || 0
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [transactions, searchTerm, typeFilter, categoryFilter, sortConfig])

  // Get unique categories for the dropdown from current data
  const uniqueCategories = useMemo(() => {
    return [...new Set(transactions.map(t => t.category).filter(Boolean))]
  }, [transactions])

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  return (
    <div className="glass-card flex flex-col h-full bg-white dark:bg-surface-900 border border-surface-200 dark:border-white/10 shadow-sm rounded-xl overflow-hidden">
      
      {/* Header Controls */}
      <div className="p-4 sm:p-5 border-b border-surface-200 dark:border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        <div className="relative w-full lg:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-surface-50 dark:bg-black/20 border border-surface-200 dark:border-white/10 pl-9 pr-4 py-2 rounded-lg text-sm text-heading placeholder-surface-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          
          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-surface-50 dark:bg-black/20 border border-surface-200 dark:border-white/10 text-surface-700 dark:text-white/80 text-xs font-semibold rounded-lg p-2 pr-6"
          >
            <option value="all">All Types</option>
            <option value="income">Income Only</option>
            <option value="expense">Expenses Only</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-surface-50 dark:bg-black/20 border border-surface-200 dark:border-white/10 text-surface-700 dark:text-white/80 text-xs font-semibold rounded-lg p-2 pr-6"
          >
            <option value="all">All Categories</option>
            {uniqueCategories.map(cat => (
              <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
            ))}
          </select>

          {/* Export Buttons */}
          <div className="flex items-center gap-1 border-l border-surface-200 dark:border-white/10 pl-2 ml-1">
            <button
              onClick={() => exportToCSV(displayData)}
              className="p-2 text-surface-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-500/10 rounded-lg transition-colors"
              title="Export to CSV"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => exportToPDF(displayData)}
              className="p-2 text-surface-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
              title="Export to PDF"
            >
              <FileText className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Table Area */}
      <div className="overflow-x-auto flex-1">
        {displayData.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center h-full min-h-[300px]">
            <div className="w-16 h-16 bg-surface-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-surface-300 dark:text-white/20" />
            </div>
            <h4 className="text-lg font-bold text-heading">No results found</h4>
            <p className="text-sm text-muted max-w-sm mt-1">Try adjusting your filters or search term.</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-surface-50/50 dark:bg-white/[0.02] sticky top-0 z-10 backdrop-blur-sm border-b border-surface-200 dark:border-white/5">
              <tr>
                <th onClick={() => handleSort('date')} className="px-5 py-3.5 font-semibold text-xs tracking-wider uppercase text-surface-500 dark:text-white/50 cursor-pointer hover:text-primary-500 transition-colors">
                  Date {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-5 py-3.5 font-semibold text-xs tracking-wider uppercase text-surface-500 dark:text-white/50">
                  Transaction
                </th>
                <th onClick={() => handleSort('category')} className="px-5 py-3.5 font-semibold text-xs tracking-wider uppercase text-surface-500 dark:text-white/50 cursor-pointer hover:text-primary-500 transition-colors">
                  Category {sortConfig.key === 'category' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('amount')} className="px-5 py-3.5 font-semibold text-xs tracking-wider uppercase text-surface-500 dark:text-white/50 text-right cursor-pointer hover:text-primary-500 transition-colors">
                  Amount {sortConfig.key === 'amount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-5 py-3.5 font-semibold text-xs tracking-wider uppercase text-surface-500 dark:text-white/50 text-center">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-white/5">
              {displayData.map((t) => (
                <tr key={t.id} className="hover:bg-surface-50/50 dark:hover:bg-white/[0.02] transition-colors group">
                  <td className="px-5 py-3 font-medium text-surface-600 dark:text-white/70 flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 opacity-40" />
                    {formatDate(t.date)}
                  </td>
                  <td className="px-5 py-3">
                    <p className="font-semibold text-surface-900 dark:text-white/90">
                      {t.description || 'No description'}
                    </p>
                    {t.notes && <p className="text-[11px] text-surface-400 dark:text-white/40 truncate max-w-[200px] mt-0.5">{t.notes}</p>}
                  </td>
                  <td className="px-5 py-3">
                    <CategoryBadge categoryId={t.category} type={t.type || 'expense'} />
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className={`font-mono font-bold tracking-tight px-2 py-0.5 rounded-md ${
                      (t.type || 'expense') === 'income' 
                        ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10' 
                        : 'text-surface-900 dark:text-white/90'
                    }`}>
                      {(t.type || 'expense') === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => onEdit(t)}
                        className="p-1.5 rounded-lg hover:bg-surface-200 dark:hover:bg-white/10 text-surface-500 dark:text-white/60 transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => {
                          if (window.confirm('Delete this transaction permanently?')) onDelete(t.id)
                        }}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-rose-500/20 text-red-500 dark:text-rose-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer / Pagination stub */}
      <div className="p-3 border-t border-surface-200 dark:border-white/5 bg-surface-50/50 dark:bg-black/20 text-xs font-semibold text-surface-500 dark:text-white/50 text-center">
        Showing {displayData.length} records
      </div>
    </div>
  )
}
