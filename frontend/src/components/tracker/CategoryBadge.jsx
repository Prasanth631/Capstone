import { defaultCategories } from '../../utils/constants'

export default function CategoryBadge({ categoryId, type = 'expense' }) {
  // Try to find the category in defaultCategories, handling fallback if unknown
  let cat = defaultCategories[categoryId]
  
  if (!cat) {
    cat = type === 'income' ? defaultCategories.other : defaultCategories.other
    // Fallback display name for custom categories
    cat = { ...cat, label: categoryId.charAt(0).toUpperCase() + categoryId.slice(1) }
  }
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border border-opacity-50 ${cat.color}`}>
      {cat.label}
    </span>
  )
}
