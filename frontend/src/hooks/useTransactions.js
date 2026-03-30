import { useState, useEffect, useMemo, useCallback } from 'react'
import { db } from '../firebase'
import { collection, query, onSnapshot, orderBy, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'

export function useTransactions() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  // Current selected month filter (YYYY-MM). Default is 'all'
  const currentMonthYear = new Date().toISOString().slice(0, 7)
  const [selectedMonth, setSelectedMonth] = useState(currentMonthYear)

  // Settings
  const [budget, setBudget] = useState(50000) // Default 50k INR

  useEffect(() => {
    if (!user?.email) {
      setTransactions([])
      setLoading(false)
      return
    }

    // New SaaS Database structure: expense_tracker/{email}/transactions
    const transRef = collection(db, 'expense_tracker', user.email, 'transactions')
    const q = query(transRef, orderBy('date', 'desc'))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = []
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }))
      setTransactions(data)
      setLoading(false)
    }, (error) => {
      console.error("Firebase Snapshot Error:", error)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user])

  // --- DERIVED STATE / FILTERING ---
  const filteredTransactions = useMemo(() => {
    if (selectedMonth === 'all') return transactions
    
    return transactions.filter(t => {
      let expMonth = ''
      if (t.date?.seconds) {
        expMonth = new Date(t.date.seconds * 1000).toISOString().slice(0, 7)
      } else if (t.date) {
        expMonth = new Date(t.date).toISOString().slice(0, 7)
      }
      return expMonth === selectedMonth
    })
  }, [transactions, selectedMonth])

  // --- STATISTICS FOR FILTERED DATA ---
  const stats = useMemo(() => {
    let totalIncome = 0
    let totalExpense = 0
    const categoryTotals = {}

    filteredTransactions.forEach(t => {
      const amt = t.amount || 0
      if (t.type === 'income') {
        totalIncome += amt
      } else {
        totalExpense += amt
        const cat = t.category || 'other'
        categoryTotals[cat] = (categoryTotals[cat] || 0) + amt
      }
    })

    return {
      totalIncome,
      totalExpense,
      netCashFlow: totalIncome - totalExpense,
      categoryTotals,
      count: filteredTransactions.length
    }
  }, [filteredTransactions])

  // --- DROPDOWN MONTH OPTIONS ---
  const availableMonths = useMemo(() => {
    const months = new Set()
    transactions.forEach(t => {
      if (t.date?.seconds) {
        months.add(new Date(t.date.seconds * 1000).toISOString().slice(0, 7))
      } else if (t.date) {
        months.add(new Date(t.date).toISOString().slice(0, 7))
      }
    })
    
    const arr = [...months].sort().reverse()
    if (!arr.includes(currentMonthYear)) arr.unshift(currentMonthYear)
    return arr
  }, [transactions, currentMonthYear])

  // --- CRUD ACTIONS ---
  const addTransaction = useCallback(async (data) => {
    if (!user?.email) throw new Error("Unauthenticated")
    const ref = collection(db, 'expense_tracker', user.email, 'transactions')
    return await addDoc(ref, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
  }, [user])

  const editTransaction = useCallback(async (id, data) => {
    if (!user?.email) throw new Error("Unauthenticated")
    const docRef = doc(db, 'expense_tracker', user.email, 'transactions', id)
    return await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    })
  }, [user])

  const deleteTransaction = useCallback(async (id) => {
    if (!user?.email) throw new Error("Unauthenticated")
    const docRef = doc(db, 'expense_tracker', user.email, 'transactions', id)
    return await deleteDoc(docRef)
  }, [user])

  const setMonthlyBudget = useCallback(async (amount) => {
    // Keeping it local state for this demo, or could push to settings
    setBudget(amount)
  }, [])

  return {
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
  }
}
