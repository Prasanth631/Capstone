import { useEffect, useState } from 'react'

const GRAFANA_URL = 'http://localhost:30030'
const PROMETHEUS_URL = 'http://localhost:30090'

// Grafana panel embed configs
const PANELS = [
  {
    id: 'heap',
    title: 'JVM Heap Usage',
    icon: '💾',
    panelId: 1,
    dashboardUid: 'devops-jvm',
  },
  {
    id: 'rps',
    title: 'HTTP Request Rate',
    icon: '⚡',
    panelId: 2,
    dashboardUid: 'devops-jvm',
  },
  {
    id: 'latency',
    title: 'Response Time (p99)',
    icon: '⏱️',
    panelId: 3,
    dashboardUid: 'devops-jvm',
  },
]

function GrafanaPanelEmbed({ panel, timeRange = '1h' }) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  const src = `${GRAFANA_URL}/d-solo/${panel.dashboardUid}?orgId=1&panelId=${panel.panelId}&from=now-${timeRange}&to=now&refresh=15s&theme=dark`

  return (
    <div className="grafana-panel-embed">
      <div className="grafana-panel-title">
        <span>{panel.icon}</span>
        <span>{panel.title}</span>
      </div>
      {!loaded && !error && (
        <div className="grafana-loading">
          <div className="spinner" />
          <span>Loading…</span>
        </div>
      )}
      {error && (
        <div className="grafana-error">
          <span>📊</span>
          <span>Grafana unavailable</span>
        </div>
      )}
      <iframe
        src={src}
        style={{ display: loaded && !error ? 'block' : 'none' }}
        className="grafana-iframe"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        title={panel.title}
        frameBorder="0"
      />
    </div>
  )
}

function TimeRangeSelector({ value, onChange }) {
  const ranges = [
    { label: '15m', value: '15m' },
    { label: '1h',  value: '1h'  },
    { label: '6h',  value: '6h'  },
    { label: '24h', value: '24h' },
  ]
  return (
    <div className="time-range-selector">
      {ranges.map(r => (
        <button
          key={r.value}
          className={`time-range-btn ${value === r.value ? 'active' : ''}`}
          onClick={() => onChange(r.value)}
        >
          {r.label}
        </button>
      ))}
    </div>
  )
}

export default function PrometheusMetricsPanel() {
  const [grafanaOnline, setGrafanaOnline] = useState(null)
  const [timeRange, setTimeRange] = useState('1h')

  useEffect(() => {
    // Check if Grafana is reachable by fetching its health endpoint via image
    const img = new Image()
    img.onload = () => setGrafanaOnline(true)
    img.onerror = () => setGrafanaOnline(false)
    img.src = `${GRAFANA_URL}/public/img/grafana_icon.svg?_=${Date.now()}`
  }, [])

  return (
    <div className="glass-card prometheus-metrics-panel">
      {/* Header */}
      <div className="panel-header">
        <div className="panel-title-group">
          <span className="panel-icon">📈</span>
          <div>
            <h3 className="panel-title">Live Metrics</h3>
            <p className="panel-subtitle">Prometheus + Grafana</p>
          </div>
        </div>
        <div className="metrics-header-actions">
          <div
            className="service-status-dot"
            style={{
              background: grafanaOnline === null ? '#6b7280' : grafanaOnline ? '#22c55e' : '#ef4444'
            }}
            title={grafanaOnline === null ? 'Checking...' : grafanaOnline ? 'Grafana Online' : 'Grafana Offline'}
          />
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
          <div className="metrics-links">
            <a
              href={GRAFANA_URL}
              target="_blank"
              rel="noreferrer"
              className="metrics-link-btn grafana-link"
              title="Open full Grafana dashboard"
            >
              📊 Grafana
            </a>
            <a
              href={`${PROMETHEUS_URL}/graph`}
              target="_blank"
              rel="noreferrer"
              className="metrics-link-btn prometheus-link"
              title="Open Prometheus"
            >
              🔥 Prometheus
            </a>
          </div>
        </div>
      </div>

      {/* Grafana offline fallback */}
      {grafanaOnline === false && (
        <div className="grafana-offline-banner">
          <span>⚠️</span>
          <div>
            <strong>Grafana is not reachable at port 30030.</strong>
            <span> Run: <code>kubectl get pods -n default | grep grafana</code> to check status.</span>
          </div>
          <a href={PROMETHEUS_URL} target="_blank" rel="noreferrer" className="prometheus-fallback-link">
            Open Prometheus →
          </a>
        </div>
      )}

      {/* Panel grid */}
      <div className="grafana-panels-grid">
        {PANELS.map(panel => (
          <GrafanaPanelEmbed key={panel.id} panel={panel} timeRange={timeRange} />
        ))}
      </div>

      {/* Footer */}
      <div className="metrics-footer">
        <span>📡 Scraping every 15s from <code>/actuator/prometheus</code></span>
        <a
          href={`${GRAFANA_URL}/d/devops-jvm`}
          target="_blank"
          rel="noreferrer"
          className="full-dashboard-link"
        >
          Open Full Dashboard →
        </a>
      </div>
    </div>
  )
}
