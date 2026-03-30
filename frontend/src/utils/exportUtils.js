import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatCurrency, formatDate } from './formatters'

export const exportToCSV = (transactions) => {
  if (!transactions || transactions.length === 0) {
    alert('No transactions to export. Add some records first!')
    return
  }
  
  const headers = ['Date', 'Type', 'Description', 'Category', 'Amount']
  const rows = transactions.map(t => [
    formatDate(t.date),
    t.type === 'income' ? 'Income' : 'Expense',
    `"${t.description || ''}"`,
    t.category || 'Other',
    t.amount || 0
  ])
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `expenseflow_export_${new Date().toISOString().slice(0,10)}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export const exportToPDF = (transactions) => {
  if (!transactions || transactions.length === 0) {
    alert('No transactions to export. Add some records first!')
    return
  }
  
  const doc = new jsPDF()
  
  doc.setFontSize(20)
  doc.text('ExpenseFlow Transaction Report', 14, 22)
  doc.setFontSize(11)
  doc.setTextColor(100)
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30)
  
  const tableData = transactions.map(t => [
    formatDate(t.date),
    t.type === 'income' ? 'Income' : 'Expense',
    t.category || 'Other',
    t.description || '',
    formatCurrency(t.amount)
  ])

  autoTable(doc, {
    startY: 40,
    head: [['Date', 'Type', 'Category', 'Description', 'Amount']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [99, 102, 241] }, // Indigo-500
    styles: { fontSize: 9 }
  })
  
  doc.save(`expenseflow_export_${new Date().toISOString().slice(0,10)}.pdf`)
}
