import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSession, getSectionKeysForType } from '../hooks/useSession'
import { useSKUs } from '../hooks/useInventory'
import { useAuth } from '../context/AuthContext'
import { SessionStatus, VarianceBadge, AccuracyBadge } from '../components/Badge'
import StatCard from '../components/StatCard'

const SECTIONS = {
  daily:      { label: 'Daily storage',   color: 'var(--sec-daily)'      },
  excess:     { label: 'Excess / sealed', color: 'var(--sec-excess)'     },
  critical:   { label: 'Critical spares', color: 'var(--sec-critical)'   },
  rma:        { label: 'RMA / defective', color: 'var(--sec-rma)'        },
  quarantine: { label: 'Quarantine',      color: 'var(--sec-quarantine)' },
}

const CAT_LABELS = {
  '01':'Compute','02':'Switch','03':'Optics',
  '04':'Cables','05':'Storage','06':'Power','07':'Accessories',
}
const CAT_COLORS = {
  '01':'var(--cat-01)','02':'var(--cat-02)','03':'var(--cat-03)',
  '04':'var(--cat-04)','05':'var(--cat-05)','06':'var(--cat-06)','07':'var(--cat-07)',
}
const CAT_BGS = {
  '01':'var(--cat-01-bg)','02':'var(--cat-02-bg)','03':'var(--cat-03-bg)',
  '04':'var(--cat-04-bg)','05':'var(--cat-05-bg)','06':'var(--cat-06-bg)','07':'var(--cat-07-bg)',
}

export default function CountSession() {
  const { sessionId } = useParams()
  const navigate      = useNavigate()
  const { user }      = useAuth()

  const {
    session, loading, saving, error,
    claim, saveItems, completeSection, submit, approve,
    startPolling, stopPolling,
  } = useSession(sessionId)

  const { skus } = useSKUs(session?.siteId)

  const [activeSection, setActiveSection] = useState(null)
  const [localCounts,   setLocalCounts]   = useState({})
  const [scanVal,       setScanVal]       = useState('')
  const [scanMsg,       setScanMsg]       = useState(null)
  const [dirty,         setDirty]         = useState(false)
  const scanRef = useRef()
  const scanTimer = useRef()

  // Start polling for collaborative sessions
  useEffect(() => {
    if (session?.collaborative) startPolling()
    return () => stopPolling()
  }, [session?.collaborative, startPolling, stopPolling])

  // Set default active section
  useEffect(() => {
    if (session && !activeSection) {
      const keys = getSectionKeysForType(session.type)
      setActiveSection(keys[0])
    }
  }, [session, activeSection])

  // Initialise local counts from saved session data
  useEffect(() => {
    if (!session || !activeSection) return
    const saved = session.sections?.[activeSection]?.items || []
    const init  = {}
    saved.forEach(item => { init[item.cwpn] = item.counted ?? '' })
    setLocalCounts(init)
    setDirty(false)
  }, [session, activeSection])

  const sectionKeys   = session ? getSectionKeysForType(session.type) : []
  const secDef        = activeSection ? SECTIONS[activeSection] : null
  const currentSection = session?.sections?.[activeSection]
  const isBlind        = session?.mode === 'blind'
  const isReadOnly     = !['open','in_progress'].includes(session?.status)

  // Check if this user has claimed the active section
  const mySection = currentSection?.claimedBy?.email === user?.email
  const unclaimed = session?.collaborative && !currentSection?.claimedBy

  // SKUs relevant to this section
  const sectionSKUs = skus.filter(sku =>
    (sku.inventory?.[session?.siteId]?.[activeSection] || 0) > 0
  )

  // Build merged item list combining saved + local
  const getItems = useCallback(() => {
    return sectionSKUs.map(sku => {
      const expected = sku.inventory?.[session?.siteId]?.[activeSection] || 0
      const saved    = currentSection?.items?.find(i => i.cwpn === sku.cwpn)
      const counted  = localCounts[sku.cwpn] !== undefined
        ? localCounts[sku.cwpn]
        : saved?.counted ?? ''
      const variance = counted !== '' ? parseInt(counted) - expected : null
      const status   = counted === ''
        ? 'pending'
        : variance === 0 ? 'matched' : 'variance'

      return { ...sku, expected, counted, variance, status }
    })
  }, [sectionSKUs, session, activeSection, currentSection, localCounts])

  const items = getItems()
  const confirmed  = items.filter(i => i.status === 'matched').length
  const variances  = items.filter(i => i.status === 'variance').length
  const pending    = items.filter(i => i.status === 'pending').length
  const total      = items.length
  const pct        = total > 0 ? Math.round(((confirmed + variances) / total) * 100) : 0

  // Auto-save after 2s of inactivity
  const scheduleAutoSave = useCallback(() => {
    clearTimeout(scanTimer.current)
    scanTimer.current = setTimeout(async () => {
      if (!dirty || !activeSection || isReadOnly) return
      const toSave = items.map(item => ({
        cwpn: item.cwpn,
        expected: item.expected,
        counted: item.counted !== '' ? parseInt(item.counted) : null,
        variance: item.variance,
        status: item.status,
      }))
      await saveItems(activeSection, toSave)
      setDirty(false)
    }, 2000)
  }, [dirty, activeSection, isReadOnly, items, saveItems])

  const handleCountChange = (cwpn, val) => {
    setLocalCounts(prev => ({ ...prev, [cwpn]: val }))
    setDirty(true)
    scheduleAutoSave()
  }

  // Scanner input handler
  const handleScan = (e) => {
    if (e.key !== 'Enter') return
    const val = e.target.value.trim()
    if (!val) return

    const skuMatch = skus.find(s => s.cwpn === val || s.nsItemId === val)
    if (skuMatch) {
      setScanMsg({ type: 'sku', text: `SKU found — ${skuMatch.desc}` })
      // Focus the count input for this SKU
      const input = document.getElementById(`qty-${skuMatch.cwpn}`)
      if (input) { input.focus(); input.select() }
    } else {
      setScanMsg({ type: 'warn', text: `Not in system — ${val}` })
    }

    setScanVal('')
    clearTimeout(scanTimer.current)
    scanTimer.current = setTimeout(() => setScanMsg(null), 4000)
  }

  const handleSaveSection = async () => {
    const toSave = items.map(item => ({
      cwpn: item.cwpn,
      expected: item.expected,
      counted: item.counted !== '' ? parseInt(item.counted) : null,
      variance: item.variance,
      status: item.status,
    }))
    await saveItems(activeSection, toSave)
    setDirty(false)
  }

  const handleCompleteSection = async () => {
    await handleSaveSection()
    await completeSection(activeSection)
  }

  if (loading) {
    return (
      <div className="page">
        <div className="loading-screen" style={{ minHeight: 300 }}>
          <div className="loading-spinner" /><p>Loading session…</p>
        </div>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <div className="empty-state-title">{error || 'Session not found'}</div>
          <button className="btn mt-4" onClick={() => navigate('/')}>← Back</button>
        </div>
      </div>
    )
  }

  return (
    <div className="page" style={{ maxWidth: 1280 }}>
      {/* Header */}
      <div className="flex-between mb-4">
        <div className="flex-center gap-3">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>←</button>
          <div>
            <div className="flex-center gap-2">
              <span style={{ fontSize: 16, fontWeight: 700 }}>{session.id}</span>
              <SessionStatus status={session.status} />
              {session.collaborative && (
                <span className="collab-badge">
                  <span className="collab-dot" />Collaborative
                </span>
              )}
              {session.mode === 'blind' && (
                <span className="badge badge-purple">Blind count</span>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {session.siteId} · {session.type} · Started by {session.createdBy?.name}
              {session.notes && ` · ${session.notes}`}
            </div>
          </div>
        </div>

        <div className="flex-center gap-2">
          {saving && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Saving…</span>}
          {dirty  && <span style={{ fontSize: 12, color: 'var(--amber)' }}>Unsaved</span>}
          {!isReadOnly && (
            <>
              <button className="btn btn-sm" onClick={handleSaveSection} disabled={saving || !dirty}>
                Save
              </button>
              <button className="btn btn-success btn-sm" onClick={submit} disabled={saving}>
                Submit for review
              </button>
            </>
          )}
          {session.status === 'pending_review' && (
            <button className="btn btn-primary btn-sm" onClick={approve} disabled={saving}>
              Approve
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid-4 mb-4">
        <StatCard label="Section items"  value={total}     />
        <StatCard label="Confirmed"      value={confirmed} accent="var(--green)" />
        <StatCard label="Variances"      value={variances} accent={variances > 0 ? 'var(--red)' : undefined} />
        <StatCard label="Session accuracy" value={session.accuracy ? `${session.accuracy}%` : '—'}
          accent={session.accuracy >= 95 ? 'var(--green)' : session.accuracy ? 'var(--amber)' : undefined} />
      </div>

      {/* Progress */}
      <div className="progress-wrap">
        <div className="progress-header">
          <span>{activeSection ? SECTIONS[activeSection]?.label : ''} progress</span>
          <span>{confirmed + variances} / {total} counted ({pct}%)</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="section-layout">
        {/* Section nav */}
        <div>
          <div className="section-nav">
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>
              Sections
            </div>
            {sectionKeys.map(key => {
              const sd      = SECTIONS[key]
              const sec     = session.sections?.[key]
              const secSKUs = skus.filter(s => (s.inventory?.[session.siteId]?.[key] || 0) > 0)
              const done    = sec?.items?.filter(i => i.status && i.status !== 'pending').length || 0
              const isCompleted = sec?.status === 'completed' || sec?.status === 'approved'
              const isClaimed   = !!sec?.claimedBy
              const isActive    = activeSection === key

              return (
                <div
                  key={key}
                  className={`section-nav-item${isActive ? ' active' : ''}`}
                  onClick={() => setActiveSection(key)}
                  style={{ borderColor: isActive ? sd.color : undefined }}
                >
                  <div className="section-nav-label">
                    <div className="section-dot" style={{
                      background: isCompleted ? 'var(--green)' : isClaimed ? sd.color : 'var(--border-2)',
                    }} />
                    {sd.label}
                  </div>
                  <div className="section-nav-meta">
                    {isCompleted ? '✓ Complete' : `${done}/${secSKUs.length} counted`}
                    {isClaimed && !isCompleted && (
                      <span style={{ marginLeft: 4, fontSize: 10, color: 'var(--text-muted)' }}>
                        · {sec.claimedBy.name}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Accuracy ring */}
          {session.accuracy && (
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <AccuracyRing accuracy={session.accuracy} />
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                Session accuracy
              </div>
            </div>
          )}
        </div>

        {/* Main count area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Claim prompt for collaborative */}
          {session.collaborative && unclaimed && !isReadOnly && (
            <div className="alert alert-blue">
              <div className="alert-dot" style={{ background: 'var(--blue)' }} />
              <div className="flex-between" style={{ flex: 1 }}>
                <div>
                  <strong>Section unclaimed</strong> — claim it to start counting
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => claim(activeSection)}>
                  Claim section
                </button>
              </div>
            </div>
          )}

          {session.collaborative && currentSection?.claimedBy && !mySection && (
            <div className="alert alert-amber">
              <div className="alert-dot" style={{ background: 'var(--amber)' }} />
              <strong>Claimed by {currentSection.claimedBy.name}</strong> — view only
            </div>
          )}

          {/* Scan bar */}
          {!isReadOnly && (mySection || !session.collaborative) && (
            <div className="scan-bar" style={{ borderLeftColor: secDef?.color }}>
              <span className="scan-label">Scan / enter</span>
              <input
                ref={scanRef}
                className="input"
                style={{ flex: 1 }}
                placeholder="Scan CWPN barcode or NetSuite ID — press Enter…"
                value={scanVal}
                onChange={e => setScanVal(e.target.value)}
                onKeyDown={handleScan}
                autoFocus
              />
              {scanMsg && (
                <span className={`scan-status scan-${scanMsg.type}`}>{scanMsg.text}</span>
              )}
            </div>
          )}

          {/* Count table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10,
              background: secDef ? `${secDef.color}14` : 'var(--surface-2)',
              borderBottom: `2px solid ${secDef?.color || 'var(--border)'}`,
            }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: secDef?.color }} />
              <span style={{ fontWeight: 700, fontSize: 13 }}>{secDef?.label}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{items.length} items</span>
              <div style={{ flex: 1 }} />
              {!isReadOnly && (mySection || !session.collaborative) && (
                <button
                  className="btn btn-success btn-sm"
                  onClick={handleCompleteSection}
                  disabled={saving || pending > 0}
                  title={pending > 0 ? `${pending} items still pending` : 'Mark section complete'}
                >
                  Mark complete
                </button>
              )}
            </div>

            <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>CWPN</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Type</th>
                    {!isBlind && <th style={{ textAlign: 'center' }}>Expected</th>}
                    <th style={{ textAlign: 'center' }}>On hand</th>
                    <th style={{ textAlign: 'center' }}>Variance</th>
                    <th style={{ textAlign: 'center' }}>Daily</th>
                    <th style={{ textAlign: 'center' }}>Excess</th>
                    <th style={{ textAlign: 'center' }}>Critical</th>
                    <th style={{ textAlign: 'center' }}>RMA</th>
                    <th style={{ textAlign: 'center' }}>Quar.</th>
                    <th style={{ textAlign: 'center' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={13} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
                        No items in this section
                      </td>
                    </tr>
                  )}
                  {items.map((item) => {
                    const inv   = item.inventory?.[session.siteId] || {}
                    const total = Object.values(inv).reduce((a, b) => a + b, 0)
                    const rowClass =
                      item.status === 'matched'  ? 'row-matched' :
                      item.status === 'variance' ? 'row-variance' :
                      item.status === 'pending'  ? 'row-pending' : ''
                    const canEdit = !isReadOnly && (mySection || !session.collaborative)

                    return (
                      <tr key={item.cwpn} className={rowClass}>
                        <td className="mono" style={{ fontSize: 11, fontWeight: 700, color: CAT_COLORS[item.category] }}>
                          {item.cwpn}
                        </td>
                        <td style={{ fontWeight: 500, maxWidth: 200 }} className="truncate">
                          {item.desc}
                        </td>
                        <td>
                          <span style={{
                            background: CAT_BGS[item.category], color: CAT_COLORS[item.category],
                            padding: '2px 7px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                            textTransform: 'uppercase',
                          }}>
                            {CAT_LABELS[item.category] || item.category}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${item.serialTracked ? 'badge-blue' : 'badge-gray'}`}
                            style={{ fontSize: 10 }}>
                            {item.serialTracked ? 'serial' : 'qty'}
                          </span>
                        </td>
                        {!isBlind && (
                          <td style={{ textAlign: 'center', fontWeight: 700 }}>{item.expected}</td>
                        )}
                        <td style={{ textAlign: 'center' }}>
                          {canEdit ? (
                            <input
                              id={`qty-${item.cwpn}`}
                              className={`input input-sm input-qty ${
                                item.status === 'variance' ? 'input-variance' :
                                item.status === 'matched'  ? 'input-matched'  : ''
                              }`}
                              type="number" min="0"
                              value={localCounts[item.cwpn] ?? item.counted}
                              placeholder="—"
                              onChange={e => handleCountChange(item.cwpn, e.target.value)}
                            />
                          ) : (
                            <span style={{ fontWeight: 600 }}>
                              {item.counted !== '' ? item.counted : '—'}
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <VarianceBadge variance={item.variance} />
                        </td>
                        {['daily','excess','critical','rma','quarantine'].map(f => (
                          <td key={f} style={{
                            textAlign: 'center', fontSize: 12,
                            color: (inv[f] || 0) === 0 ? 'var(--text-muted)' : 'var(--text-primary)',
                            fontWeight: (inv[f] || 0) > 0 ? 600 : 400,
                          }}>
                            {inv[f] || '—'}
                          </td>
                        ))}
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>{total}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Table footer */}
            <div style={{
              padding: '10px 16px', borderTop: '1px solid var(--border)',
              display: 'flex', gap: 16, alignItems: 'center', background: 'var(--surface-2)',
            }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {isBlind ? '🔒 Blind count — expected quantities hidden' : 'All section quantities visible for variance investigation'}
              </span>
              <div style={{ flex: 1 }} />
              {[
                ['var(--green-light)', 'var(--green-text)', 'Matched'],
                ['var(--red-light)',   'var(--red-text)',   'Variance'],
                ['var(--surface-2)',   'var(--text-muted)', 'Pending'],
              ].map(([bg, c, label]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: bg, border: `1px solid ${c}40` }} />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function AccuracyRing({ accuracy }) {
  const r   = 36
  const circ = 2 * Math.PI * r
  const offset = circ - (accuracy / 100) * circ
  const color = accuracy >= 95 ? 'var(--green)' : accuracy >= 85 ? 'var(--amber)' : 'var(--red)'

  return (
    <div className="accuracy-ring" style={{ width: 90, height: 90, margin: '0 auto' }}>
      <svg width="90" height="90" viewBox="0 0 90 90">
        <circle cx="45" cy="45" r={r} fill="none" stroke="var(--border)" strokeWidth="6" />
        <circle
          cx="45" cy="45" r={r} fill="none"
          stroke={color} strokeWidth="6"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 45 45)"
          style={{ transition: 'stroke-dashoffset .6s ease' }}
        />
      </svg>
      <div className="accuracy-label">
        <span>{accuracy}</span>
        <span className="accuracy-sub">%</span>
      </div>
    </div>
  )
}
