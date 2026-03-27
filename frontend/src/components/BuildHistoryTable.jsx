import { useState } from 'react'
import { History, Search, GitBranch, Clock } from 'lucide-react'

export default function BuildHistoryTable({ builds, loading, hasMore, loadingMore, onLoadMore }) {
  const [search, setSearch] = useState('')

  const filtered = (builds || []).filter((build) =>
    (build.jobName?.toLowerCase() || '').includes(search.toLowerCase()) ||
    (build.gitBranch?.toLowerCase() || '').includes(search.toLowerCase()) ||
    String(build.buildNumber).includes(search)
  )

  const formatDuration = (ms) => {
    if (!ms) return '-'
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    return minutes > 0 ? `${minutes}m ${seconds % 60}s` : `${seconds}s`
  }

  const formatTime = (ts) => {
    if (!ts) return '-'
    return new Date(ts).toLocaleString()
  }

  const statusClass = {
    SUCCESS: 'status-success',
    FAILURE: 'status-failure',
    IN_PROGRESS: 'status-running',
    PENDING: 'status-pending',
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-primary-400" />
          <h2 className="text-lg font-semibold text-white">Build History</h2>
        </div>
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-primary-400 transition-colors" />
          <input
            type="text"
            placeholder="Search builds..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 bg-[#0f172a] border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/50 w-64 transition-all shadow-inner"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-white/40 text-xs uppercase tracking-wider border-b border-white/5">
              <th className="pb-3 pr-4">#</th>
              <th className="pb-3 pr-4">Job</th>
              <th className="pb-3 pr-4">Branch</th>
              <th className="pb-3 pr-4">Trigger</th>
              <th className="pb-3 pr-4">Status</th>
              <th className="pb-3 pr-4">Duration</th>
              <th className="pb-3">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((build) => (
              <tr
                key={`${build.jobName}-${build.buildNumber}-${build.startTime}`}
                className="border-b border-white/5 hover:bg-white/[0.03] transition-colors group cursor-default"
              >
                <td className="py-4 pr-4 pl-2 font-mono text-white/80 font-medium">#{build.buildNumber}</td>
                <td className="py-3 pr-4 text-white/80">{build.jobName}</td>
                <td className="py-3 pr-4">
                  <span className="inline-flex items-center gap-1 text-white/60">
                    <GitBranch className="w-3 h-3" />
                    {build.gitBranch}
                  </span>
                </td>
                <td className="py-3 pr-4">
                  <span className="px-2 py-0.5 rounded text-[10px] bg-white/5 text-white/50 uppercase">
                    {build.triggerType}
                  </span>
                </td>
                <td className="py-3 pr-4">
                  <span className={statusClass[build.overallStatus] || 'status-pending'}>
                    {build.overallStatus || 'PENDING'}
                  </span>
                </td>
                <td className="py-3 pr-4 font-mono text-slate-300">
                  <span className="inline-flex items-center gap-1.5 opacity-80">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDuration(build.totalDuration)}
                  </span>
                </td>
                <td className="py-3 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">{formatTime(build.startTime)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {loading && (
          <p className="text-center text-white/40 py-8">Loading build history...</p>
        )}

        {!loading && filtered.length === 0 && (
          <p className="text-center text-white/30 py-8">No builds found</p>
        )}
      </div>

      <div className="mt-4 flex justify-center">
        {hasMore && (
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg bg-primary-500/15 border border-primary-400/30 text-primary-200 hover:bg-primary-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loadingMore ? 'Loading...' : 'Load More'}
          </button>
        )}
      </div>
    </div>
  )
}
