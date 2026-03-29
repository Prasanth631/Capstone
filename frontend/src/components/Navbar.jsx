import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { Link, useLocation } from 'react-router-dom'
import { LogOut, Cpu, Sun, Moon, Github, ExternalLink, LayoutDashboard, ReceiptText, Activity } from 'lucide-react'

const GITHUB_REPO = 'https://github.com/Prasanth631/Capstone'
const JENKINS_URL = 'http://localhost:8080'

export default function Navbar({ lastRefresh }) {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()

  return (
    <>
      <header className="sticky top-0 z-50 glass-card rounded-none border-x-0 border-t-0 bg-surface-50/90 dark:bg-surface-950/90 backdrop-blur-md">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex-shrink-0 bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-base font-bold text-heading">DevOps Intelligence</h1>
              <p className="text-[11px] text-muted">SaaS Dashboard Framework</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4">
            {lastRefresh && (
              <>
                <div className="flex items-center gap-2 text-xs">
                  <Activity className="w-3 h-3 text-emerald-500 animate-pulse" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Live</span>
                  <span className="text-muted">· {lastRefresh.toLocaleTimeString()}</span>
                </div>
                <div className="h-4 w-px bg-surface-200 dark:bg-white/10" />
              </>
            )}
            <a href={GITHUB_REPO} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-1.5 text-xs text-surface-500 dark:text-white/50 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
              <Github className="w-3.5 h-3.5" />
              <span>GitHub</span>
            </a>
            <a href={JENKINS_URL} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-1.5 text-xs text-surface-500 dark:text-white/50 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Jenkins</span>
            </a>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg transition-colors bg-surface-100 dark:bg-white/5 hover:bg-surface-200 dark:hover:bg-white/10 text-surface-500 dark:text-white/60"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-100 dark:bg-white/5 border border-surface-200 dark:border-white/10">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-400 to-purple-500 flex items-center justify-center text-[10px] font-bold text-white">
                {user?.username?.[0]?.toUpperCase() || 'U'}
              </div>
              <span className="text-sm text-surface-700 dark:text-white/70 hidden sm:inline">{user?.username}</span>
            </div>

            <button onClick={logout}
              className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors text-surface-400 dark:text-white/60 hover:text-red-500 dark:hover:text-red-400"
              title="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 flex items-center gap-6 mt-1 overflow-x-auto custom-scrollbar">
          <Link to="/dashboard" className={`flex items-center gap-2 pb-3 px-1 border-b-2 text-sm font-medium transition-colors ${
            location.pathname === '/dashboard' 
              ? 'border-primary-500 text-primary-600 dark:text-primary-400' 
              : 'border-transparent text-surface-500 dark:text-muted hover:text-surface-800 dark:hover:text-white/80'
          }`}>
            <LayoutDashboard className="w-4 h-4" />
            CI/CD Dashboard
          </Link>
          <Link to="/expenses" className={`flex items-center gap-2 pb-3 px-1 border-b-2 text-sm font-medium transition-colors ${
            location.pathname === '/expenses' 
              ? 'border-purple-500 text-purple-600 dark:text-purple-400' 
              : 'border-transparent text-surface-500 dark:text-muted hover:text-surface-800 dark:hover:text-white/80'
          }`}>
            <ReceiptText className="w-4 h-4" />
            Expense Tracker
          </Link>
        </div>
      </header>
    </>
  )
}
