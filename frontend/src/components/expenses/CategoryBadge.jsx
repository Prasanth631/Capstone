export const categories = {
  food: { label: 'Food & Dining', color: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400 border-orange-200 dark:border-orange-500/30' },
  transport: { label: 'Transportation', color: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border-blue-200 dark:border-blue-500/30' },
  utilities: { label: 'Cloud & Utils', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30' },
  software: { label: 'Software & Tools', color: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400 border-purple-200 dark:border-purple-500/30' },
  marketing: { label: 'Marketing', color: 'bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-400 border-pink-200 dark:border-pink-500/30' },
  hardware: { label: 'Hardware', color: 'bg-slate-200 text-slate-800 dark:bg-slate-500/20 dark:text-slate-300 border-slate-300 dark:border-slate-500/30' },
  other: { label: 'Other', color: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-500/20 dark:text-zinc-400 border-zinc-200 dark:border-zinc-500/30' },
}

export default function CategoryBadge({ categoryId }) {
  const cat = categories[categoryId] || categories.other
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${cat.color}`}>
      {cat.label}
    </span>
  )
}
