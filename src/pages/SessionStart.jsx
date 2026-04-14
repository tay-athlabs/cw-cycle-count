import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useSites } from '../hooks/useInventory'
import { useCreateSession, getSectionKeysForType } from '../hooks/useSession'

const COUNT_TYPES = [
  {
    key: 'daily',
    label: 'Daily count',
    desc: 'Daily storage area only — fast, focused on high-turnover stock',
    sections: ['daily'],
    color: 'var(--sec-daily)',
  },
  {
    key: 'weekly',
    label: 'Weekly count',
    desc: 'Daily + Excess + Critical spares — recommended weekly cadence',
    sections: ['daily', 'excess', 'critical'],
    color: 'var(--sec-excess)',
  },
  {
    key: 'full',
    label: 'Full count',
    desc: 'All sections including RMA & Quarantine — for audits and monthly counts',
    sections: ['daily', 'excess', 'critical', 'rma', 'quarantine'],
    color: 'var(--sec-critical)',
  },
]

function Toggle({ on, onToggle }) {
  return (
    <button className={`toggle${on ? ' on' : ''}`} onClick={onToggle} type="button">
      <div className="toggle-knob" />
    </button>
  )
}

export default function SessionStart() {
  const navigate       = useNavigate()
  const [params]       = useSearchParams()
  const { sites }      = useSites()
  const { create, creating } = useCreateSession()

  const [siteId,        setSiteId]        = useState(params.get('site') || '')
  const [countType,     setCountType]     = useState('daily')
  const [mode,          setMode]          = useState('visible')  // 'visible' | 'blind'
  const [collaborative, setCollaborative] = useState(false)
  const [notes,         setNotes]         = useState('')

  // Pre-select first site if only one available
  useEffect(() => {
    if (!siteId && sites.length === 1) setSiteId(sites[0].id)
  }, [sites, siteId])

  const selectedType = COUNT_TYPES.find(t => t.key === countType)
  const canSubmit    = !!siteId && !creating

  const handleCreate = async () => {
    if (!canSubmit) return
    const session = await create({ siteId, type: countType, mode, collaborative, notes })
    if (session) navigate(`/session/${session.id}`)
  }

  return (
    <div className="page" style={{ maxWidth: 700 }}>
      {/* Header */}
      <div className="flex-center gap-3 mb-6">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>←</button>
        <div>
          <h1 className="page-title">New count session</h1>
          <p className="page-sub">Configure and start a cycle count</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Site selection */}
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Site</h3>
          <div className="grid-2">
            {sites.map(site => (
              <div
                key={site.id}
                onClick={() => setSiteId(site.id)}
                style={{
                  padding: '12px 14px', borderRadius: 8, cursor: 'pointer',
                  border: `1.5px solid ${siteId === site.id ? 'var(--navy)' : 'var(--border)'}`,
                  background: siteId === site.id ? 'rgba(15,17,23,.03)' : 'var(--surface)',
                  transition: 'all .15s',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 14 }}>{site.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {site.city}, {site.country}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Count type */}
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Count type</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {COUNT_TYPES.map(type => (
              <div
                key={type.key}
                className={`type-option${countType === type.key ? ' selected' : ''}`}
                onClick={() => setCountType(type.key)}
              >
                <div className="type-radio">
                  {countType === type.key && <div className="type-radio-dot" />}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="type-label">{type.label}</div>
                  <div className="type-desc">{type.desc}</div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                    {type.sections.map(s => (
                      <span key={s} className="badge badge-gray" style={{ fontSize: 10 }}>{s}</span>
                    ))}
                  </div>
                </div>
                <div style={{
                  width: 6, height: 40, borderRadius: 3,
                  background: type.color, flexShrink: 0,
                }} />
              </div>
            ))}
          </div>
        </div>

        {/* Count mode */}
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Count mode</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              {
                key: 'visible',
                label: 'Visible count',
                desc: 'Expected quantities shown during count. Faster, good for regular checks.',
              },
              {
                key: 'blind',
                label: 'Blind count',
                desc: 'Expected quantities hidden. Technician counts independently — unbiased results. Recommended for audits.',
              },
            ].map(m => (
              <div
                key={m.key}
                className={`type-option${mode === m.key ? ' selected' : ''}`}
                onClick={() => setMode(m.key)}
              >
                <div className="type-radio">
                  {mode === m.key && <div className="type-radio-dot" />}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="type-label">
                    {m.label}
                    {m.key === 'blind' && (
                      <span className="badge badge-purple" style={{ marginLeft: 8, fontSize: 10 }}>
                        Recommended for audits
                      </span>
                    )}
                  </div>
                  <div className="type-desc">{m.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Collaborative toggle */}
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Collaboration</h3>
          <div className="toggle-row">
            <div>
              <div className="toggle-info-label">Collaborative session</div>
              <div className="toggle-info-desc">
                Multiple technicians can join and claim sections independently.
                Each tech counts their assigned area simultaneously.
              </div>
            </div>
            <Toggle on={collaborative} onToggle={() => setCollaborative(v => !v)} />
          </div>
          {collaborative && (
            <div className="alert alert-blue mt-4" style={{ marginBottom: 0 }}>
              <div className="alert-dot" style={{ background: 'var(--blue)' }} />
              <div>
                A <strong>session join code</strong> will be generated after creation.
                Share it with other technicians so they can join and claim sections.
                Sections auto-lock once claimed.
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Notes (optional)</h3>
          <textarea
            className="input"
            rows={3}
            placeholder="e.g. Weekly surplus + daily ops check. Focus on SFP-LR variance from last session."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            style={{ resize: 'vertical' }}
          />
        </div>

        {/* Summary + submit */}
        {siteId && (
          <div className="card" style={{ background: 'var(--navy)', border: 'none' }}>
            <div style={{ color: '#fff', marginBottom: 12 }}>
              <div style={{ fontSize: 13, opacity: .6, marginBottom: 4 }}>Session summary</div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13 }}>
                <span><strong>{sites.find(s=>s.id===siteId)?.name}</strong></span>
                <span style={{ opacity:.6 }}>·</span>
                <span style={{ textTransform:'capitalize' }}>{countType} count</span>
                <span style={{ opacity:.6 }}>·</span>
                <span style={{ textTransform:'capitalize' }}>{mode}</span>
                <span style={{ opacity:.6 }}>·</span>
                <span>{collaborative ? '👥 Collaborative' : '👤 Solo'}</span>
              </div>
              <div style={{ fontSize: 12, opacity: .5, marginTop: 6 }}>
                Sections: {getSectionKeysForType(countType).join(', ')}
              </div>
            </div>
            <button
              className="btn btn-full"
              style={{ background: '#fff', color: 'var(--navy)', fontWeight: 700, fontSize: 15 }}
              onClick={handleCreate}
              disabled={!canSubmit}
            >
              {creating ? 'Creating session…' : 'Start count session →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
