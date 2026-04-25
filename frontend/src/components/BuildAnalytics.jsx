import { useState, useEffect, useRef } from 'react'
import { TrendingUp, TrendingDown, Hash, Clock, CheckCircle, XCircle } from 'lucide-react'

function AnimatedNumber({ value, suffix = '', duration = 1200 }) {
  const [display, setDisplay] = useState(0)
  const prevRef = useRef(0)

  useEffect(() => {
    const start = prevRef.current
    const end = typeof value === 'number' ? value : parseFloat(value) || 0
    if (start === end) return

    const startTime = performance.now()
    const animate = (now) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = start + (end - start) * eased
      setDisplay(current)
      if (progress < 1) requestAnimationFrame(animate)
      else prevRef.current = end
    }
    requestAnimationFrame(animate)
  }, [value, duration])

  const formatted = Number.isInteger(value)
    ? Math.round(display).toLocaleString()
    : display.toFixed(1)

  return <>{formatted}{suffix}</>
}

export default function BuildAnalytics({ data }) {
  const cards = [
    {
      label: 'Total Builds',
      value: data.totalBuilds ?? 0,
      icon: Hash,
      color: 'from-blue-500 to-cyan-400',
      glow: 'dark:shadow-blue-500/20',
      isInteger: true,
    },
    {
      label: 'Success Rate',
      value: data.successRate ?? 0,
      suffix: '%',
      icon: data.successRate >= 80 ? TrendingUp : TrendingDown,
      color: data.successRate >= 80 ? 'from-emerald-500 to-green-400' : 'from-red-500 to-orange-400',
      glow: data.successRate >= 80 ? 'dark:shadow-emerald-500/20' : 'dark:shadow-red-500/20',
      isInteger: false,
    },
    {
      label: 'Passed',
      value: data.successCount ?? 0,
      icon: CheckCircle,
      color: 'from-emerald-500 to-teal-400',
      glow: 'dark:shadow-emerald-500/20',
      isInteger: true,
    },
    {
      label: 'Failed',
      value: data.failureCount ?? 0,
      icon: XCircle,
      color: 'from-red-500 to-pink-400',
      glow: 'dark:shadow-red-500/20',
      isInteger: true,
    },
    {
      label: 'Avg Duration',
      value: data.avgDurationMs ? Math.round(data.avgDurationMs / 1000) : 0,
      suffix: 's',
      icon: Clock,
      color: 'from-purple-500 to-violet-400',
      glow: 'dark:shadow-purple-500/20',
      isInteger: true,
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((card, i) => (
        <div key={i} className={`glass-card-hover p-5 animate-slide-up ${card.glow} shadow-sm`}
             style={{ animationDelay: `${i * 80}ms` }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-surface-500 dark:text-white/50 uppercase tracking-wider">{card.label}</span>
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center shadow-lg`}>
              <card.icon className="w-4 h-4 text-white" />
            </div>
          </div>
          <p className="text-2xl font-bold text-heading">
            <AnimatedNumber
              value={card.isInteger ? (card.value ?? 0) : (card.value ?? 0)}
              suffix={card.suffix || ''}
              duration={1200}
            />
          </p>
        </div>
      ))}
    </div>
  )
}
