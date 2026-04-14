import { useState } from 'react'
import { useSKUMaster } from '../hooks/useInventory'

const CAT_LABELS = {
  '01':'Compute','02':'Net — Switch','03':'Net — Optics',
  '04':'Net — Cables','05':'Storage','06':'Power','07':'Accessories',
}
const CAT_COLORS = {
  '01':'var(--cat-01)','02':'var(--cat-02)','03':'var(--cat-03)',
  '04':'var(--cat-04)','05':'var(--cat-05)','06':'var(--cat-06)','07':'var(--cat-07)',
}
const CAT_BGS = {
  '01':'var(--cat-01-bg)','02':'var(--cat-02-bg)','03':'var(--cat-03-bg)',
  '04':'var(--cat-04-bg)','05':'var(--cat-05-bg)','06':'var(--cat-06-bg)','07':'var(--cat-07-bg)',
}

export default function SKUMaster() {
  const { skus, saving, saveSKU } = useSKUMaster()
  const [search,       setSearch]       = useState('')
  const [filterFlagged, setFilterFlagged] = useState(false)
  const [editCwpn,     setEditCwpn]     = useState(null)
  const [editValues,   setEditValues]   = useState({})

  const filtered = skus.filter(s => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      s.cwpn.includes(q) || s.desc.toLowerCase().includes(q) ||
      s.nsItemId.includes(q) || s.typeName?.toLowerCase().includes(q)
    return matchSearch && (!filterFlagged || s.flagged)
  })

  const openEdit = (sku) => {
    setEditCwpn(sku.cwpn)
    setEditValues({ desc: sku.desc, nsItemId: sku.nsItemId, nsDesc: sku.nsDesc || '' })
  }

  const handleSave = async () => {
    await saveSKU(editCwpn, editValues)
    setEditCwpn(null)
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="flex-between mb-4">
        <div>
          <h1 className="page-title">
            SKU master
            <span className="badge badge-amber" style={{ marginLeft:10, fontSize:11, verticalAlign:'middle' }}>
              Beta
            </span>
          </h1>
          <p className="page-sub">CWPN registry — CoreWeave Part Number source of truth</p>
        </div>
        <div className="flex-center gap-2">
          <button className="btn">Import NetSuite CSV</button>
          <button className="btn btn-primary">+ Add SKU</button>
        </div>
      </div>

      {/* CWPN legend */}
      <div className="card mb-4" style={{ background:'var(--surface-2)', padding:'12px 16px' }}>
        <div style={{ fontSize:12, fontWeight:700, color:'var(--text-secondary)', marginBottom:8 }}>
          CWPN format — 9 digits fixed: CC TTT SSSS
        </div>
        <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
          {Object.entries(CAT_LABELS).map(([k, v]) => (
            <div key={k} style={{ display:'flex', alignItems:'center', gap:6 }}>
              <span className="mono" style={{
                fontSize:12, fontWeight:700,
                color: CAT_COLORS[k], background: CAT_BGS[k],
                padding:'2px 7px', borderRadius:6,
              }}>{k}</span>
              <span style={{ fontSize:12, color:'var(--text-secondary)' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'flex', gap:10, alignItems:'center' }}>
          <input
            className="input input-sm"
            style={{ maxWidth:300 }}
            placeholder="Search CWPN, description, NS Item ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button
            className="btn btn-sm"
            style={{
              borderColor: filterFlagged ? 'var(--amber)' : undefined,
              background: filterFlagged ? 'var(--amber-light)' : undefined,
              color: filterFlagged ? 'var(--amber-text)' : undefined,
            }}
            onClick={() => setFilterFlagged(v => !v)}
          >
            {filterFlagged ? 'Showing: flagged only' : 'Show flagged only'}
          </button>
          <div style={{ flex:1 }} />
          <span className="text-muted text-sm">{filtered.length} items</span>
        </div>

        <div className="table-wrap" style={{ border:'none', borderRadius:0 }}>
          <table>
            <thead>
              <tr>
                {['CWPN','Category','Type','Description','Serial','NS Item ID','NS Description','Daily','Excess','Critical','RMA','Quar.','Total','Status',''].map(h => (
                  <th key={h} style={{ textAlign: ['Daily','Excess','Critical','RMA','Quar.','Total','Serial'].includes(h) ? 'center' : 'left' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, i) => {
                const inv   = item.inventory?.AMS01 || {}
                const total = Object.values(inv).reduce((a,b) => a+b, 0)
                const rowBg = item.flagged ? '#FFFBF5' : i % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)'
                return (
                  <tr key={item.cwpn} style={{ background: rowBg }}>
                    <td className="mono" style={{ fontWeight:700, fontSize:12, color: CAT_COLORS[item.category] }}>
                      {item.cwpn}
                    </td>
                    <td>
                      <span style={{
                        background: CAT_BGS[item.category], color: CAT_COLORS[item.category],
                        padding:'2px 7px', borderRadius:20, fontSize:10, fontWeight:700, textTransform:'uppercase',
                      }}>
                        {CAT_LABELS[item.category] || item.category}
                      </span>
                    </td>
                    <td style={{ fontSize:12, color:'var(--text-secondary)', whiteSpace:'nowrap' }}>
                      {item.typeName}
                    </td>
                    <td style={{ fontWeight:500, maxWidth:180 }} className="truncate">{item.desc}</td>
                    <td style={{ textAlign:'center' }}>{item.serialTracked ? '✓' : '—'}</td>
                    <td className="mono" style={{ fontSize:11, color:'var(--text-muted)' }}>{item.nsItemId}</td>
                    <td>
                      {item.nsDesc
                        ? <span style={{ fontSize:12, color:'var(--text-secondary)' }}>{item.nsDesc}</span>
                        : <span className="badge badge-amber" style={{ fontSize:10 }}>missing — enriched via CWPN</span>
                      }
                    </td>
                    {['daily','excess','critical','rma','quarantine'].map(f => (
                      <td key={f} style={{
                        textAlign:'center', fontSize:12,
                        color: (inv[f]||0) === 0 ? 'var(--text-muted)' : 'var(--text-primary)',
                        fontWeight: (inv[f]||0) > 0 ? 600 : 400,
                      }}>
                        {inv[f] || '—'}
                      </td>
                    ))}
                    <td style={{ textAlign:'center', fontWeight:700 }}>{total}</td>
                    <td>
                      <span className={`badge ${item.status === 'active' ? 'badge-green' : 'badge-amber'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(item)}>
                        Edit
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit modal */}
      {editCwpn && (
        <div style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,.4)',
          display:'flex', alignItems:'center', justifyContent:'center', zIndex:200,
        }}>
          <div className="card" style={{ width:460, maxWidth:'92vw' }}>
            <div style={{ fontSize:16, fontWeight:700, marginBottom:4 }}>Edit SKU</div>
            <div className="mono text-muted text-sm mb-4">CWPN: {editCwpn}</div>

            {[
              { label:'Description', field:'desc', placeholder:'Enter part description…' },
              { label:'NetSuite Item ID', field:'nsItemId', placeholder:'e.g. 1062833700' },
              { label:'NetSuite Description', field:'nsDesc', placeholder:'Description from NetSuite (if available)' },
            ].map(({ label, field, placeholder }) => (
              <div key={field} style={{ marginBottom:12 }}>
                <label>{label}</label>
                <input
                  className="input"
                  placeholder={placeholder}
                  value={editValues[field] || ''}
                  onChange={e => setEditValues(v => ({ ...v, [field]: e.target.value }))}
                />
              </div>
            ))}

            <div className="flex-center gap-2" style={{ justifyContent:'flex-end', marginTop:16 }}>
              <button className="btn" onClick={() => setEditCwpn(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
