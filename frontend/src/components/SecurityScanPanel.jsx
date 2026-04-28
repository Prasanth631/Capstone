import { useEffect, useState } from 'react'
import api from '../api/axios'

const SEVERITY_CONFIG = {
  CRITICAL: { label: 'Critical', color: '#ef4444', bg: 'rgba(239,68,68,0.15)', icon: '🔴' },
  HIGH:     { label: 'High',     color: '#f97316', bg: 'rgba(249,115,22,0.15)', icon: '🟠' },
  MEDIUM:   { label: 'Medium',   color: '#eab308', bg: 'rgba(234,179,8,0.15)',  icon: '🟡' },
  LOW:      { label: 'Low',      color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  icon: '🟢' },
}

function SeverityBadge({ count, type }) {
  const cfg = SEVERITY_CONFIG[type]
  if (!cfg) return null
  return (
    <div
      className="severity-badge"
      style={{ background: cfg.bg, borderColor: cfg.color + '44', color: cfg.color }}
      title={`${count} ${cfg.label} vulnerabilities`}
    >
      <span className="severity-icon">{cfg.icon}</span>
      <span className="severity-count">{count}</span>
      <span className="severity-label">{cfg.label}</span>
    </div>
  )
}

function ImageScanCard({ scan }) {
  const imageName = scan.image || 'Unknown image'
  const shortName = imageName.includes('/') ? imageName.split('/').pop() : imageName
  const isClean = (scan.criticalCount || 0) === 0 && (scan.highCount || 0) === 0
  const total = (scan.criticalCount || 0) + (scan.highCount || 0) + (scan.mediumCount || 0) + (scan.lowCount || 0)
  const scannedAt = scan.scannedAt
    ? new Date(scan.scannedAt).toLocaleString()
    : 'Unknown'

  return (
    <div className="image-scan-card" style={{ borderColor: isClean ? '#22c55e44' : '#ef444444' }}>
      <div className="image-scan-header">
        <div className="image-scan-name">
          <span className="image-scan-icon">🐳</span>
          <span className="image-scan-title" title={imageName}>{shortName}</span>
        </div>
        <div
          className="scan-status-pill"
          style={{
            background: isClean ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.12)',
            color: isClean ? '#22c55e' : '#ef4444',
            border: `1px solid ${isClean ? '#22c55e44' : '#ef444444'}`
          }}
        >
          {isClean ? '✅ Clean' : `⚠️ ${total} Issues`}
        </div>
      </div>

      <div className="severity-grid">
        <SeverityBadge count={scan.criticalCount || 0} type="CRITICAL" />
        <SeverityBadge count={scan.highCount || 0}     type="HIGH"     />
        <SeverityBadge count={scan.mediumCount || 0}   type="MEDIUM"   />
        <SeverityBadge count={scan.lowCount || 0}      type="LOW"      />
      </div>

      <div className="scan-timestamp">Scanned: {scannedAt}</div>
    </div>
  )
}

export default function SecurityScanPanel() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchScans = async () => {
    try {
      const res = await api.get('/api/security/latest')
      setData(res.data?.data || null)
      setError(null)
    } catch (e) {
      setError('Could not load scan results')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchScans()
    const interval = setInterval(fetchScans, 60000)
    return () => clearInterval(interval)
  }, [])

  const overallClean = data?.isClean ?? true
  const scans = data?.scans || []

  return (
    <div className="glass-card security-scan-panel">
      {/* Header */}
      <div className="panel-header">
        <div className="panel-title-group">
          <span className="panel-icon">🛡️</span>
          <div>
            <h3 className="panel-title">Security Scan</h3>
            <p className="panel-subtitle">Trivy vulnerability analysis</p>
          </div>
        </div>
        {!loading && data && (
          <div
            className="overall-status-pill"
            style={{
              background: overallClean ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.12)',
              color: overallClean ? '#22c55e' : '#ef4444',
              border: `1px solid ${overallClean ? '#22c55e55' : '#ef444455'}`
            }}
          >
            {overallClean ? '✅ All Clear' : '⚠️ Issues Found'}
          </div>
        )}
      </div>

      {/* Summary row */}
      {!loading && data && (
        <div className="scan-summary-row">
          {[
            { type: 'CRITICAL', count: data.totalCritical || 0 },
            { type: 'HIGH',     count: data.totalHigh     || 0 },
            { type: 'MEDIUM',   count: data.totalMedium   || 0 },
            { type: 'LOW',      count: data.totalLow      || 0 },
          ].map(({ type, count }) => {
            const cfg = SEVERITY_CONFIG[type]
            return (
              <div key={type} className="summary-stat" style={{ borderColor: cfg.color + '33' }}>
                <span className="summary-stat-icon">{cfg.icon}</span>
                <span className="summary-stat-count" style={{ color: cfg.color }}>{count}</span>
                <span className="summary-stat-label">{cfg.label}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Content */}
      <div className="panel-content">
        {loading && (
          <div className="panel-loading">
            <div className="spinner" />
            <span>Loading scan results…</span>
          </div>
        )}
        {error && !loading && (
          <div className="panel-empty">
            <span className="panel-empty-icon">🔍</span>
            <p>No scan results yet</p>
            <p className="panel-empty-sub">Run a Jenkins build to trigger Trivy scanning</p>
          </div>
        )}
        {!loading && !error && scans.length === 0 && (
          <div className="panel-empty">
            <span className="panel-empty-icon">🔍</span>
            <p>No scan results yet</p>
            <p className="panel-empty-sub">Run a Jenkins build to trigger Trivy scanning</p>
          </div>
        )}
        {!loading && !error && scans.length > 0 && (
          <div className="image-scan-list">
            {scans.map((scan, i) => (
              <ImageScanCard key={scan.image || i} scan={scan} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
