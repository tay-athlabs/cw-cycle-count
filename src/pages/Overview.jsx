import { useNavigate } from 'react-router-dom'
import { useSites } from '../hooks/useInventory'
import { useSessionList } from '../hooks/useSession'
import { useAuth } from '../context/AuthContext'
import StatCard from '../components/StatCard'
import { SiteStatus, SessionStatus, AccuracyBadge } from '../components/Badge'

const SECTION_COLORS = {
  daily:      'var(--sec-daily)',
  excess:     'var(--sec-excess)',
  critical:   'var(--sec-critical)',
  rma:        'var(--sec-rma)',
  quarantine: 'var(--sec-quarantine)',
}

function SiteCard({ site, sessions }) {
  const navigate = useNavigate()
  const siteSessions = sessions.filter(s => s.siteId === site.id)
  const lastSession  = siteSessions[0]
  const openCount    = siteSessions.filter(s => s.status === 'open' || s.status === 'in_progress').length
  const siteStatus   = openCount > 0 ? 'in-progress' : lastSession ? 'up-to-date' : 'due'

  // Total inventory per section across all SKUs
  const sectionTotals = { daily: 0, excess: 0, critical: 0, rma: 0, quarantine: 0 }
  const maxVal = Math.max(...Object.values(sectionTotals), 1)

  return (
    <div className="site-card" onClick={() => navigate(`/site/${site.id}`)}>
      <div className="site-card-header">
        <div>
          <div className="site-name">{site.name}</div>
          <div className="site-city">{site.city}, {site.country}</div>
        </div>
        <SiteStatus status={siteStatus === 'up-to-date' ? 'up-to-date' : 'count-due'} />
      </div>

      <div className="site-bars">
        {Object.entries(SECTION_COLORS).map(([key, color]) => (
          <div key={key} className="site-bar-row">
            <div className="site-bar-label">{key.charAt(0).toUpperCase() + key.slice(1)}</div>
            <div className="site-bar-track">
              <div
                className="site-bar-fill"
                style={{
                  width: `${Math.min(100, ((sectionTotals[key] || 0) / maxVal) * 100)}%`,
                  background: color,
                  minWidth: 4,
                }}
              />
            </div>
            <div className="site-bar-count">{sectionTotals[key] || '—'}</div>
          </div>
        ))}
      </div>

      <div className="flex-between mt-4" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
        <span>
          {lastSession
            ? `Last count: ${new Date(lastSession.createdAt).toLocaleDateString('en-GB', { day:'2-digit', month:'short' })}`
            : 'No counts yet'}
        </span>
        {openCount > 0 && (
          <span className="badge badge-blue" style={{ fontSize: 11 }}>
            {openCount} active
          </span>
        )}
      </div>
    </div>
  )
}

export default function Overview() {
  const navigate = useNavigate()
  const { user }  = useAuth()
  const { sites, loading: sitesLoading } = useSites()
  const { sessions, loading: sessionsLoading } = useSessionList()

  const loading = sitesLoading || sessionsLoading

  const openSessions    = sessions.filter(s => ['open','in_progress'].includes(s.status))
  const pendingSessions = sessions.filter(s => s.status === 'pending_review')
  const recentApproved  = sessions.filter(s => s.status === 'approved').slice(0, 5)
  const avgAccuracy     = recentApproved.length
    ? Math.round(recentApproved.reduce((s, x) => s + (x.accuracy || 0), 0) / recentApproved.length * 10) / 10
    : null

  if (loading) {
    return (
      <div className="page">
        <div className="loading-screen" style={{ minHeight: 300 }}>
          <div className="loading-spinner" />
          <p>Loading overview…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="flex-between mb-6">
        <div>
          <h1 className="page-title">
            Good {getGreeting()}, {user?.given_name || user?.name?.split(' ')[0] || 'there'} 👋
          </h1>
          <p className="page-sub">
            {new Date().toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
            {' · '}EU Operations — {sites.length} active sites
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/session/new')}>
          + New count session
        </button>
      </div>

      {/* Stats row */}
      <div className="grid-4 mb-6">
        <StatCard label="Active sessions"  value={openSessions.length}    sub="in progress"          accent={openSessions.length    > 0 ? 'var(--blue)'  : undefined} />
        <StatCard label="Pending review"   value={pendingSessions.length} sub="awaiting approval"    accent={pendingSessions.length > 0 ? 'var(--amber)' : undefined} />
        <StatCard label="Avg accuracy"     value={avgAccuracy ? `${avgAccuracy}%` : '—'} sub="last 5 approved"  accent={avgAccuracy >= 95 ? 'var(--green)' : avgAccuracy ? 'var(--amber)' : undefined} />
        <StatCard label="Sites tracked"    value={sites.length}           sub="EU region" />
      </div>

      {/* Alert banners */}
      {pendingSessions.length > 0 && (
        <div className="alert alert-amber">
          <div className="alert-dot" style={{ background:'var(--amber)' }} />
          <div>
            <strong>{pendingSessions.length} session{pendingSessions.length > 1 ? 's' : ''} pending review</strong>
            {' — '}
            <span
              style={{ textDecoration:'underline', cursor:'pointer' }}
              onClick={() => navigate('/history')}
            >
              View in History
            </span>
          </div>
        </div>
      )}

      {/* Sites grid */}
      <div className="flex-between mb-4">
        <h2 style={{ fontSize: 16, fontWeight: 700 }}>Sites</h2>
        <span className="text-muted text-sm">{sites.length} locations</span>
      </div>

      <div className="grid-3 mb-6">
        {sites.map(site => (
          <SiteCard key={site.id} site={site} sessions={sessions} />
        ))}
        {sites.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">🏢</div>
            <div className="empty-state-title">No sites configured</div>
            <div className="empty-state-desc">Sites are loaded from sites.json</div>
          </div>
        )}
      </div>

      {/* Recent sessions */}
      <div className="flex-between mb-4">
        <h2 style={{ fontSize: 16, fontWeight: 700 }}>Recent sessions</h2>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/history')}>
          View all →
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {sessions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-title">No sessions yet</div>
            <div className="empty-state-desc">Start a count session to see it here</div>
          </div>
        ) : (
          <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  {['Session ID','Site','Type','Mode','Technician','Started','Accuracy','Status',''].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sessions.slice(0, 8).map(s => (
                  <tr
                    key={s.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/session/${s.id}`)}
                  >
                    <td className="mono" style={{ fontSize: 12, fontWeight: 600 }}>{s.id}</td>
                    <td>{s.siteId}</td>
                    <td style={{ textTransform: 'capitalize' }}>{s.type}</td>
                    <td>
                      <span className={`badge ${s.mode === 'blind' ? 'badge-purple' : 'badge-gray'}`}>
                        {s.mode || 'visible'}
                      </span>
                    </td>
                    <td className="text-muted">{s.createdBy?.name || '—'}</td>
                    <td className="text-muted" style={{ whiteSpace:'nowrap' }}>
                      {formatDate(s.createdAt)}
                    </td>
                    <td><AccuracyBadge accuracy={s.accuracy} /></td>
                    <td><SessionStatus status={s.status} /></td>
                    <td>
                      <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>
                        {['open','in_progress'].includes(s.status) ? 'Continue →' : 'View →'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 18) return 'afternoon'
  return 'evening'
}

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  const today = new Date()
  const diff  = Math.floor((today - d) / 86400000)
  if (diff === 0) return `Today ${d.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' })}`
  if (diff === 1) return 'Yesterday'
  if (diff < 7)  return `${diff} days ago`
  return d.toLocaleDateString('en-GB', { day:'2-digit', month:'short' })
}
