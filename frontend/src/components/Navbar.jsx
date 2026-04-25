import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { Link, useLocation } from 'react-router-dom'
import { LogOut, Cpu, Sun, Moon, Github, ExternalLink, LayoutDashboard, ReceiptText, Activity } from 'lucide-react'

const GITHUB_REPO = 'https://github.com/Prasanth631/Capstone'
const JENKINS_URL = 'http://localhost:8080'

function LiveIndicator({ lastRefresh }) {
  const [ago, setAgo] = useState('')

  useEffect(() => {
    const update = () => {
      if (!lastRefresh) return
      const diff = Math.floor((Date.now() - lastRefresh.getTime()) / 1000)
      if (diff < 5) setAgo('just now')
      else if (diff < 60) setAgo(`${diff}s ago`)
      else setAgo(`${Math.floor(diff / 60)}m ago`)
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [lastRefresh])

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
      </span>
      <span className="text-emerald-600 dark:text-emerald-400 font-medium">Live</span>
      <span className="text-muted">· {ago}</span>
    </div>
  )
}

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
              <p className="text-[11px] text-muted">Real-Time CI/CD Dashboard</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4">
            {lastRefresh && (
              <>
                <LiveIndicator lastRefresh={lastRefresh} />
                <div className="h-4 w-px bg-surface-200 dark:bg-white/10" />
              </>
            )}
            <Link to="/dashboard" className={`flex items-center gap-1.5 text-xs transition-colors ${location.pathname === '/dashboard' ? 'text-primary-600 dark:text-primary-400 font-bold' : 'text-surface-500 dark:text-white/50 hover:text-primary-600 dark:hover:text-primary-400'}`}>
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>CI/CD Dashboard</span>
            </Link>
            <Link to="/expense-tracker" className={`flex items-center gap-1.5 text-xs transition-colors ${location.pathname === '/expense-tracker' ? 'text-purple-600 dark:text-purple-400 font-bold' : 'text-surface-500 dark:text-white/50 hover:text-purple-600 dark:hover:text-purple-400'}`}>
              <ReceiptText className="w-3.5 h-3.5" />
              <span>ExpenseFlow</span>
            </Link>
            <div className="h-4 w-px bg-surface-200 dark:bg-white/10 mx-1" />
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

            {user ? (
              <>
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
              </>
            ) : (
                <Link to="/login" className="px-4 py-1.5 rounded-lg text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white transition-colors">
                  Sign In
                </Link>
            )}
          </div>
        </div>

      </header>
    </>
  )
}
