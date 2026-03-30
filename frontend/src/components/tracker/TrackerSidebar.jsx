import { 
  LayoutDashboard, 
  ReceiptText, 
  PieChart, 
  Target, 
  Settings,
  LogOut,
  Sun,
  Moon,
  Home
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { Link } from 'react-router-dom'

const navItems = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'transactions', label: 'Transactions', icon: ReceiptText },
  { id: 'budgets', label: 'Budgets', icon: Target },
  { id: 'reports', label: 'Reports', icon: PieChart },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export default function TrackerSidebar({ activeTab, onTabChange }) {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()

  return (
    <aside className="h-screen w-64 flex-shrink-0 flex flex-col bg-surface-50 dark:bg-surface-950 border-r border-surface-200 dark:border-white/5 transition-colors duration-300">
      
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-surface-200 dark:border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
            <span className="text-white font-bold text-sm tracking-tighter">EF</span>
          </div>
          <span className="font-bold text-lg text-heading tracking-tight">ExpenseFlow</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg transition-colors hover:bg-surface-200 dark:hover:bg-white/10 text-surface-500 dark:text-white/60"
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <Link
            to="/dashboard"
            className="p-1.5 rounded-lg transition-colors hover:bg-surface-200 dark:hover:bg-white/10 text-surface-500 dark:text-white/60"
            title="Return to CI/CD Dashboard"
          >
            <Home className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400' 
                  : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-white/5 hover:text-surface-900 dark:hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-primary-600 dark:text-primary-400' : 'opacity-70'}`} />
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-surface-200 dark:border-white/5">
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-surface-100 dark:bg-white/5 group">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center font-bold text-white shadow-inner">
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-heading truncate">{user?.username}</p>
            <p className="text-[11px] text-surface-500 truncate">{user?.email}</p>
          </div>
          <button 
            onClick={logout}
            className="p-1.5 rounded-lg transition-colors hover:bg-red-50 text-surface-400 hover:text-red-500 dark:hover:bg-red-500/20 dark:hover:text-red-400"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
