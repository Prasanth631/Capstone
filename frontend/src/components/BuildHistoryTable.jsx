import { useState } from 'react'
import { History, Search, GitBranch, Clock, ExternalLink, GitCommit } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

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
    try {
      const date = new Date(ts)
      return formatDistanceToNow(date, { addSuffix: true })
    } catch {
      return new Date(ts).toLocaleString()
    }
  }

  const formatTimeFull = (ts) => {
    if (!ts) return ''
    return new Date(ts).toLocaleString()
  }

  const statusClass = {
    SUCCESS: 'status-success',
    FAILURE: 'status-failure',
    IN_PROGRESS: 'status-running',
    PENDING: 'status-pending',
  }

  const getJenkinsUrl = (build) => {
    if (build.jenkinsUrl) return build.jenkinsUrl
    // Fallback: construct from job name and build number
    if (build.jobName && build.buildNumber) {
      return `http://localhost:8080/job/${build.jobName.replace(/\//g, '/job/')}/${build.buildNumber}/`
    }
    return null
  }

  const getCommitUrl = (build) => {
    if (!build.gitCommit || build.gitCommit === 'unknown') return null
    const repoUrl = build.githubUrl || 'https://github.com/Prasanth631/Capstone'
    return `${repoUrl}/commit/${build.gitCommit}`
  }

  return (
    <div className="glass-card p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-5 gap-3">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-primary-500 dark:text-primary-400" />
          <h2 className="text-lg font-semibold text-heading">Build History</h2>
          <span className="text-xs text-muted ml-1">({filtered.length} builds)</span>
        </div>
        <div className="relative group w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 dark:text-white/30 group-focus-within:text-primary-500 dark:group-focus-within:text-primary-400 transition-colors" />
          <input
            type="text"
            placeholder="Search builds..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9 w-full sm:w-64 text-sm"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="text-left text-surface-400 dark:text-white/40 text-xs uppercase tracking-wider border-b border-surface-200 dark:border-white/5">
              <th className="pb-3 pr-4">#</th>
              <th className="pb-3 pr-4">Job</th>
              <th className="pb-3 pr-4">Branch</th>
              <th className="pb-3 pr-4">Commit</th>
              <th className="pb-3 pr-4">Status</th>
              <th className="pb-3 pr-4">Duration</th>
              <th className="pb-3">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((build) => {
              const jenkinsLink = getJenkinsUrl(build)
              const commitLink = getCommitUrl(build)
              return (
                <tr
                  key={`${build.jobName}-${build.buildNumber}-${build.startTime}`}
                  className="border-b border-surface-100 dark:border-white/5 hover:bg-surface-50 dark:hover:bg-white/[0.03] transition-colors group"
                >
                  <td className="py-3.5 pr-4 pl-1 font-mono font-medium">
                    {jenkinsLink ? (
                      <a href={jenkinsLink} target="_blank" rel="noopener noreferrer"
                         className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 inline-flex items-center gap-1 hover:underline">
                        #{build.buildNumber}
                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                    ) : (
                      <span className="text-surface-700 dark:text-white/80">#{build.buildNumber}</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-surface-700 dark:text-white/80 font-medium">{build.jobName}</td>
                  <td className="py-3 pr-4">
                    <span className="inline-flex items-center gap-1 text-surface-500 dark:text-white/60">
                      <GitBranch className="w-3 h-3" />
                      {build.gitBranch || '-'}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    {commitLink ? (
                      <a href={commitLink} target="_blank" rel="noopener noreferrer"
                         className="inline-flex items-center gap-1 text-primary-600 dark:text-primary-400 hover:underline font-mono text-xs">
                        <GitCommit className="w-3 h-3" />
                        {build.gitCommit?.substring(0, 7)}
                      </a>
                    ) : (
                      <span className="text-muted text-xs">-</span>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <span className={statusClass[build.overallStatus] || 'status-pending'}>
                      {build.overallStatus || 'PENDING'}
                    </span>
                  </td>
                  <td className="py-3 pr-4 font-mono text-surface-600 dark:text-slate-300">
                    <span className="inline-flex items-center gap-1.5 opacity-80">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDuration(build.totalDuration)}
                    </span>
                  </td>
                  <td className="py-3 text-surface-400 dark:text-slate-400 text-[11px] uppercase tracking-wider font-semibold"
                      title={formatTimeFull(build.startTime)}>
                    {formatTime(build.startTime)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {loading && (
          <p className="text-center text-surface-400 dark:text-white/40 py-8">Loading build history...</p>
        )}

        {!loading && filtered.length === 0 && (
          <p className="text-center text-surface-300 dark:text-white/30 py-8">No builds found</p>
        )}
      </div>

      <div className="mt-4 flex justify-center">
        {hasMore && (
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors
              bg-primary-50 dark:bg-primary-500/15 border border-primary-200 dark:border-primary-400/30
              text-primary-600 dark:text-primary-200
              hover:bg-primary-100 dark:hover:bg-primary-500/25
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingMore ? 'Loading...' : 'Load More'}
          </button>
        )}
      </div>
    </div>
  )
}
