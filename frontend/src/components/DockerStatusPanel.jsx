import { Container, Heart, ImageIcon } from 'lucide-react'

export default function DockerStatusPanel({ status }) {
  const containers = status?.containers?.details || []

  const formatContainerName = (rawName) => {
    if (!rawName) return 'Unknown'
    if (rawName.startsWith('k8s_')) {
      const parts = rawName.split('_')
      if (parts.length >= 4) {
        return `${parts[1]} (${parts[3]})`
      }
    }
    return rawName.length > 30 ? rawName.substring(0, 27) + '...' : rawName
  }

  const formatImageName = (rawImage) => {
    if (!rawImage) return ''
    const parts = rawImage.split('/')
    return parts[parts.length - 1]
  }

  const running = (containers || []).filter(c =>
    c.status && (c.status.toLowerCase().includes('run') || c.status.toLowerCase() === 'up')
  ).length

  if (containers.length === 0) {
    return (
      <div className="glass-card p-6 flex flex-col h-[400px]">
        <div className="flex items-center gap-2 mb-5">
          <Container className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
          <h2 className="text-lg font-bold text-heading">Docker Containers</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted text-sm">No containers detected</p>
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card p-6 flex flex-col h-[400px]">
      <div className="flex items-center justify-between mb-5 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Container className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
          <h2 className="text-lg font-bold text-heading">Docker Containers</h2>
        </div>
        <span className="text-xs font-semibold px-3 py-1 bg-indigo-50 dark:bg-white/5 rounded-full text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-transparent">
          {running}/{containers.length} running
        </span>
      </div>

      <div className="space-y-3 overflow-y-auto pr-2 flex-1">
        {containers.map((c, i) => {
          const isRunning = c.status && (c.status.toLowerCase().includes('run') || c.status.toLowerCase().includes('up'))
          return (
            <div key={i} className={`group flex items-center justify-between p-4 rounded-xl border transition-all duration-300 ${
              isRunning
                ? 'bg-emerald-50 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/10'
                : 'bg-red-50 dark:bg-rose-500/5 border-red-200 dark:border-rose-500/20 hover:bg-red-100 dark:hover:bg-rose-500/10'
            }`}>
              <div className="flex items-center gap-4 overflow-hidden">
                <div className="relative flex items-center justify-center flex-shrink-0">
                  <div className={`w-3 h-3 rounded-full z-10 ${isRunning ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-red-500 dark:bg-rose-400'}`} />
                  {isRunning && <div className="absolute w-3 h-3 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-ping opacity-75" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-surface-800 dark:text-slate-100 truncate pr-4" title={c.name}>
                    {formatContainerName(c.name)}
                  </p>
                  <p className="text-xs text-surface-500 dark:text-slate-400 font-mono mt-1 flex items-center gap-1.5 truncate" title={c.image}>
                    <ImageIcon className="w-3.5 h-3.5 opacity-60" />
                    {formatImageName(c.image)}
                  </p>
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-2">
                <div className="flex items-center justify-end gap-1.5 text-xs font-medium">
                  <Heart className={`w-3.5 h-3.5 ${c.health === 'healthy' ? 'text-emerald-500 dark:text-emerald-400' : 'text-surface-400 dark:text-slate-500'}`} />
                  <span className={c.health === 'healthy' ? 'text-emerald-600 dark:text-emerald-400' : 'text-surface-500 dark:text-slate-400 capitalize'}>{c.health || 'unknown'}</span>
                </div>
                <p className="text-[10px] text-surface-400 dark:text-slate-500 mt-1 uppercase tracking-wider">{c.uptime}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
