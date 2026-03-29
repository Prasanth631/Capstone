import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import ExpenseForm from '../components/expenses/ExpenseForm'
import ExpenseList from '../components/expenses/ExpenseList'
import ExpenseStats from '../components/expenses/ExpenseStats'
import { collection, query, where, onSnapshot, orderBy, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { Plus } from 'lucide-react'

export default function ExpensesPage() {
  const { user } = useAuth()
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  
  // Real-time listener for current user's expenses
  useEffect(() => {
    if (!user?.email) return
    
    // We use email instead of userId because the backend sets it in the JWT
    const q = query(
      collection(db, 'expenses'),
      where('userEmail', '==', user.email),
      orderBy('date', 'desc')
    )
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const expensesData = []
      snapshot.forEach((doc) => {
        expensesData.push({ id: doc.id, ...doc.data() })
      })
      setExpenses(expensesData)
      setLoading(false)
    }, (error) => {
      console.error('Error fetching expenses:', error)
      setLoading(false)
    })
    
    return () => unsubscribe()
  }, [user])

  const handleSaveExpense = async (expenseData) => {
    try {
      if (editingExpense) {
        await updateDoc(doc(db, 'expenses', editingExpense.id), {
          ...expenseData,
          updatedAt: serverTimestamp()
        })
      } else {
        await addDoc(collection(db, 'expenses'), {
          ...expenseData,
          userEmail: user.email,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        })
      }
      setIsFormOpen(false)
      setEditingExpense(null)
    } catch (error) {
      console.error('Error saving expense:', error)
      alert('Failed to save expense. See console for details.')
    }
  }

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return
    try {
      await deleteDoc(doc(db, 'expenses', id))
    } catch (error) {
      console.error('Error deleting expense:', error)
      alert('Failed to delete expense.')
    }
  }

  const openEditForm = (expense) => {
    setEditingExpense(expense)
    setIsFormOpen(true)
  }

  const closeForm = () => {
    setIsFormOpen(false)
    setEditingExpense(null)
  }

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 transition-colors duration-300">
      <Navbar lastRefresh={null} />
      
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-heading">Expense Tracker</h2>
            <p className="text-surface-500 dark:text-white/50 text-sm mt-1">Manage and track your project operations costs</p>
          </div>
          <button
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white rounded-xl font-medium transition-all shadow-lg shadow-primary-500/25"
          >
            <Plus className="w-5 h-5" />
            Add Expense
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              <ExpenseStats expenses={expenses} />
            </div>
            <div className="lg:col-span-2">
              <ExpenseList 
                expenses={expenses} 
                onEdit={openEditForm} 
                onDelete={handleDeleteExpense} 
              />
            </div>
          </div>
        )}
      </main>

      {/* Form Modal */}
      {isFormOpen && (
        <ExpenseForm 
          expense={editingExpense} 
          onSave={handleSaveExpense} 
          onClose={closeForm} 
        />
      )}
    </div>
  )
}
