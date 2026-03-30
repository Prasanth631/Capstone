import { useState } from 'react'
import { Plus } from 'lucide-react'
import TrackerSidebar from '../components/tracker/TrackerSidebar'
import TrackerOverview from '../components/tracker/TrackerOverview'
import TransactionList from '../components/tracker/TransactionList'
import BudgetManager from '../components/tracker/BudgetManager'
import ReportsView from '../components/tracker/ReportsView'
import SettingsPanel from '../components/tracker/SettingsPanel'
import TransactionForm from '../components/tracker/TransactionForm'
import { useTransactions } from '../hooks/useTransactions'
import { formatMonthLabel } from '../utils/formatters'

export default function ExpenseTrackerPage() {
  const [activeTab, setActiveTab] = useState('overview')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState(null)

  const {
    transactions,
    filteredTransactions,
    loading,
    stats,
    budget,
    selectedMonth,
    setSelectedMonth,
    availableMonths,
    addTransaction,
    editTransaction,
    deleteTransaction,
    setMonthlyBudget
  } = useTransactions()

  // Handlers for Form
  const handleSaveTransaction = async (data) => {
    try {
      if (editingTransaction) {
        await editTransaction(editingTransaction.id, data)
      } else {
        await addTransaction(data)
      }
      setIsFormOpen(false)
      setEditingTransaction(null)
    } catch (error) {
      console.error('Error saving transaction', error)
      alert('Failed to save. Check console.')
    }
  }

  const openEditForm = (t) => {
    setEditingTransaction(t)
    setIsFormOpen(true)
  }

  // Mobile sidebar generic toggle class (could add full slide out later)
  const renderTabContent = () => {
    if (loading) return (
      <div className="flex-1 flex justify-center items-center py-32">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
      </div>
    )

    switch(activeTab) {
      case 'overview':
        return <TrackerOverview 
                 transactions={transactions} 
                 filteredTransactions={filteredTransactions} 
                 stats={stats} 
                 budget={budget} 
                 onTabChange={setActiveTab} 
               />
      case 'transactions':
        return <TransactionList 
                 transactions={filteredTransactions} 
                 onEdit={openEditForm} 
                 onDelete={deleteTransaction} 
               />
      case 'budgets':
        return <BudgetManager 
                 budget={budget} 
                 setMonthlyBudget={setMonthlyBudget} 
                 stats={stats} 
               />
      case 'reports':
        return <ReportsView 
                 transactions={transactions} 
                 filteredTransactions={filteredTransactions} 
                 stats={stats} 
               />
      case 'settings':
        // we pass all transactions to settings for global bulk export
        return <SettingsPanel transactions={transactions} />
      default:
        return null
    }
  }

  return (
    <div className="h-screen flex bg-surface-50 dark:bg-surface-950/90 text-surface-900 dark:text-white transition-colors duration-300 overflow-hidden">
        {/* Sidebar Navigation */}
        <TrackerSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        
        {/* Main Content Area */}
        <main className="flex-1 flex flex-col h-full overflow-hidden bg-transparent">
          
          {/* Top Header Bar for Main Content */}
          <header className="flex-shrink-0 flex items-center justify-between px-6 py-4 glass-card border-x-0 border-t-0 rounded-none z-10 sticky top-0 bg-surface-50/80 dark:bg-surface-900/80">
            <div>
              <h1 className="text-xl font-bold font-mono text-heading tracking-tight capitalize">
                {activeTab}
              </h1>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Only show global month filter for specific tabs */}
              {['overview', 'transactions', 'budgets', 'reports'].includes(activeTab) && (
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-surface-100 dark:bg-surface-800 border-none text-surface-700 dark:text-white/90 text-sm font-semibold rounded-xl focus:ring-2 focus:ring-primary-500 p-2 pl-3 pr-8 shadow-sm cursor-pointer transition-colors"
                >
                  <option value="all">All Time</option>
                  {availableMonths.map(month => (
                    <option key={month} value={month}>{formatMonthLabel(month)}</option>
                  ))}
                </select>
              )}

              <button
                onClick={() => { setEditingTransaction(null); setIsFormOpen(true) }}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-primary-500/25 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" /> Add Record
              </button>
            </div>
          </header>

          {/* Scrollable Canvas for active tab */}
          <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 md:p-8 custom-scrollbar relative">
             <div className="absolute top-0 left-0 w-full h-96 bg-primary-500/5 dark:bg-primary-500/10 pointer-events-none blur-3xl rounded-[100%]" />
             <div className="relative z-10 h-full max-w-[1400px] mx-auto">
               {renderTabContent()}
             </div>
          </div>
        </main>

      {isFormOpen && (
        <TransactionForm 
          transaction={editingTransaction}
          onSave={handleSaveTransaction}
          onClose={() => { setIsFormOpen(false); setEditingTransaction(null); }}
        />
      )}
    </div>
  )
}
