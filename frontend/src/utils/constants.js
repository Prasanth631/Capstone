export const defaultCategories = {
  // Income
  salary: { label: 'Salary', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30', type: 'income', icon: 'wallet' },
  freelance: { label: 'Freelance', color: 'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-400 border-teal-200 dark:border-teal-500/30', type: 'income', icon: 'briefcase' },
  investments: { label: 'Investments', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-400 border-cyan-200 dark:border-cyan-500/30', type: 'income', icon: 'trending-up' },
  refunds: { label: 'Refunds/Bonuses', color: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 border-green-200 dark:border-green-500/30', type: 'income', icon: 'gift' },
  
  // Expenses
  food: { label: 'Food & Dining', color: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400 border-orange-200 dark:border-orange-500/30', type: 'expense', icon: 'coffee' },
  transport: { label: 'Transportation', color: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border-blue-200 dark:border-blue-500/30', type: 'expense', icon: 'car' },
  utilities: { label: 'Cloud & Utils', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30', type: 'expense', icon: 'zap' },
  software: { label: 'Software/SaaS', color: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400 border-purple-200 dark:border-purple-500/30', type: 'expense', icon: 'box' },
  marketing: { label: 'Marketing', color: 'bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-400 border-pink-200 dark:border-pink-500/30', type: 'expense', icon: 'megaphone' },
  hardware: { label: 'Hardware', color: 'bg-slate-200 text-slate-800 dark:bg-slate-500/20 dark:text-slate-300 border-slate-300 dark:border-slate-500/30', type: 'expense', icon: 'monitor' },
  office: { label: 'Office Supplies', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/30', type: 'expense', icon: 'paperclip' },
  entertainment: { label: 'Entertainment', color: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 border-rose-200 dark:border-rose-500/30', type: 'expense', icon: 'film' },
  other: { label: 'Other', color: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-500/20 dark:text-zinc-400 border-zinc-200 dark:border-zinc-500/30', type: 'expense', icon: 'help-circle' }
}

export const hexColors = {
  emerald: '#10b981',
  teal: '#14b8a6',
  cyan: '#06b6d4',
  green: '#22c55e',
  orange: '#f97316',
  blue: '#3b82f6',
  indigo: '#6366f1',
  purple: '#a855f7',
  pink: '#ec4899',
  slate: '#64748b',
  yellow: '#eab308',
  rose: '#f43f5e',
  zinc: '#71717a'
}

export const getCategoryColorHex = (key) => {
  const mapping = {
    salary: hexColors.emerald,
    freelance: hexColors.teal,
    investments: hexColors.cyan,
    refunds: hexColors.green,
    food: hexColors.orange,
    transport: hexColors.blue,
    utilities: hexColors.indigo,
    software: hexColors.purple,
    marketing: hexColors.pink,
    hardware: hexColors.slate,
    office: hexColors.yellow,
    entertainment: hexColors.rose,
    other: hexColors.zinc
  }
  return mapping[key] || hexColors.zinc
}

export const APP_DEFAULTS = {
  currency: 'INR',
  currencySymbol: '₹',
  budget: 50000 // Rs 50,000 as default target
}
