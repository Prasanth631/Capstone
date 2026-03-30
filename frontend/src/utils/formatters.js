import { format, parseISO } from 'date-fns'

export const formatCurrency = (amount, currency = 'INR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 0
  }).format(amount || 0)
}

export const formatDate = (val) => {
  if (!val) return 'Unknown Date'
  try {
    if (val.seconds) { // Firestore Timestamp
      return format(new Date(val.seconds * 1000), 'MMM dd, yyyy')
    }
    if (typeof val === 'number') { // Epoch ms
      return format(new Date(val), 'MMM dd, yyyy')
    }
    // String ISO
    return format(parseISO(val), 'MMM dd, yyyy')
  } catch {
    return 'Invalid Date'
  }
}

export const formatPercent = (value, total) => {
  if (!total || total === 0) return '0%'
  const p = (value / total) * 100
  return `${Math.min(Math.max(p, 0), 100).toFixed(1)}%`
}

// Ensure the month dropdown labels are human readable
export const formatMonthLabel = (yyyyMm) => {
  if (!yyyyMm || typeof yyyyMm !== 'string') return yyyyMm
  const [y, m] = yyyyMm.split('-')
  const date = new Date(parseInt(y), parseInt(m) - 1)
  return format(date, 'MMMM yyyy')
}
