import { useState, useRef } from "react";

// ── CWPN CATEGORY CODES ──────────────────────────────────────────────────────
const CWPN_CATEGORIES = {
  "01": { label: "Compute & servers",              short: "COMPUTE" },
  "02": { label: "Networking — switching & routing", short: "SWITCH"  },
  "03": { label: "Networking — optics & transceivers", short: "OPTICS" },
  "04": { label: "Networking — cables & DACs",     short: "CABLES"  },
  "05": { label: "Storage",                         short: "STORAGE" },
  "06": { label: "Power",                           short: "POWER"   },
  "07": { label: "Accessories & consumables",       short: "ACCSY"   },
};

const CWPN_TYPES = {
  "01001": "GB200 NVL72",
  "01002": "GB300 NVL72",
  "02001": "48-port 25GbE switch",
  "03001": "100G QSFP28 SR4",
  "03002": "400G QSFP-DD DR4",
  "03003": "10G SFP+ LR",
  "03004": "10G SFP+ SR",
  "04001": "10G SFP+ DAC 3m",
  "04002": "AOC 8x LC 100G 10m",
  "04003": "AOC 400G QSFP-DD 2m",
  "05001": "NVMe SSD 3.84TB U.2",
  "06001": "PSU 2000W redundant",
  "07001": "Generic consumable",
};

// ── MOCK DATA ────────────────────────────────────────────────────────────────
const SITES = [
  { id: "AMS01", name: "AMS01", city: "Amsterdam",  country: "NL", lastCount: "2 days ago", status: "up-to-date" },
  { id: "LHR02", name: "LHR02", city: "London",     country: "GB", lastCount: "8 days ago", status: "due"        },
  { id: "FRA03", name: "FRA03", city: "Frankfurt",  country: "DE", lastCount: "1 day ago",  status: "up-to-date" },
];

const SKU_MASTER = [
  { cwpn: "010010001", sku: "GB200-NVL-72",    netsuite_id: "1062833700", desc: "GB200 NVL72 rack unit",            cat: "01", type: "01001", serialTracked: true,  status: "active",  qty_daily:0, qty_excess:2, qty_critical:4, qty_rma:1, qty_quarantine:0 },
  { cwpn: "010020001", sku: "GB300-NVL-72",    netsuite_id: "1062833701", desc: "GB300 NVL72 rack unit",            cat: "01", type: "01002", serialTracked: true,  status: "active",  qty_daily:0, qty_excess:1, qty_critical:3, qty_rma:0, qty_quarantine:1 },
  { cwpn: "030010001", sku: "SFP-100G-SR4",    netsuite_id: "1834560280", desc: "100G QSFP28 SR4 optical",          cat: "03", type: "03001", serialTracked: false, status: "active",  qty_daily:8, qty_excess:24, qty_critical:6, qty_rma:0, qty_quarantine:0 },
  { cwpn: "030020001", sku: "QSFP-400G-DR4",   netsuite_id: "1834560282", desc: "400G QSFP-DD DR4 optical",         cat: "03", type: "03002", serialTracked: false, status: "active",  qty_daily:2, qty_excess:4,  qty_critical:6, qty_rma:0, qty_quarantine:0 },
  { cwpn: "040010001", sku: "DAC-10G-3M",      netsuite_id: "1834560290", desc: "10G SFP+ DAC cable 3m",            cat: "04", type: "04001", serialTracked: false, status: "active",  qty_daily:40,qty_excess:20, qty_critical:0, qty_rma:0, qty_quarantine:0 },
  { cwpn: "040020001", sku: "AOC-QSFP-8LC",    netsuite_id: "1834560292", desc: "AOC 8x LC 100G 10m",               cat: "04", type: "04002", serialTracked: false, status: "active",  qty_daily:4, qty_excess:12, qty_critical:0, qty_rma:2, qty_quarantine:0 },
  { cwpn: "030030001", sku: "SFP-10G-LR-S",    netsuite_id: "1834560293", desc: "10G SFP+ LR single-mode 10km",     cat: "03", type: "03003", serialTracked: false, status: "active",  qty_daily:18,qty_excess:6,  qty_critical:4, qty_rma:0, qty_quarantine:0 },
  { cwpn: "060010001", sku: "CBA-PWR-2KW-R",   netsuite_id: "1834560298", desc: "PSU 2000W redundant hotswap",      cat: "06", type: "06001", serialTracked: false, status: "active",  qty_daily:14,qty_excess:8,  qty_critical:4, qty_rma:3, qty_quarantine:0 },
  { cwpn: "050010001", sku: "C6A-WH-SOLR-290", netsuite_id: "1062833750", desc: "NVMe SSD 3.84TB U.2 enterprise",   cat: "05", type: "05001", serialTracked: false, status: "active",  qty_daily:22,qty_excess:10, qty_critical:5, qty_rma:1, qty_quarantine:0 },
];

const SERIALS = {
  "010010001": ["SN-CW-GB200-00412","SN-CW-GB200-00413","SN-CW-GB200-00414","SN-CW-GB200-00415"],
  "010020001": ["SN-CW-GB300-00091","SN-CW-GB300-00092","SN-CW-GB300-00093"],
};

const COUNT_TYPES = {
  daily:  { label: "Daily count",  desc: "Daily storage area only",                    sections: ["daily"],                              color: "#4A90D9" },
  weekly: { label: "Weekly count", desc: "Daily + Excess + Critical spares",           sections: ["daily","excess","critical"],           color: "#7B68C8" },
  full:   { label: "Full count",   desc: "All sections including RMA & Quarantine",    sections: ["daily","excess","critical","rma","quarantine"], color: "#3AAA7A" },
};

const SECTIONS = {
  daily:      { label: "Daily storage",   color: "#4A90D9", bg: "#EBF4FC" },
  excess:     { label: "Excess / sealed", color: "#7B68C8", bg: "#F0EEFB" },
  critical:   { label: "Critical spares", color: "#E05A5A", bg: "#FDF0F0" },
  rma:        { label: "RMA / defective", color: "#D4874A", bg: "#FDF5EE" },
  quarantine: { label: "Quarantine",      color: "#888",    bg: "#F5F5F5" },
};

const STATUS_STYLE = {
  active:  { bg: "#EDF7F2", color: "#2D7A56" },
  faulty:  { bg: "#FDF0F0", color: "#B03A3A" },
  rma:     { bg: "#FDF5EE", color: "#9C4221" },
};

// ── STYLES ───────────────────────────────────────────────────────────────────
const S = {
  app:        { fontFamily: "system-ui,-apple-system,sans-serif", minHeight: "100vh", background: "#F7F8FA", color: "#1A1A2E" },
  nav:        { background: "#fff", borderBottom: "1px solid #EAECF0", padding: "0 28px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 54 },
  navTitle:   { fontSize: 15, fontWeight: 600, color: "#1A1A2E" },
  page:       { maxWidth: 1100, margin: "0 auto", padding: "28px 24px" },
  pageLg:     { maxWidth: 1200, margin: "0 auto", padding: "28px 24px" },
  h1:         { fontSize: 22, fontWeight: 600, color: "#1A1A2E", marginBottom: 4 },
  h2:         { fontSize: 15, fontWeight: 600, color: "#1A1A2E" },
  sub:        { fontSize: 13, color: "#8A8FA8" },
  card:       { background: "#fff", border: "1px solid #EAECF0", borderRadius: 12, padding: "20px 22px" },
  cardSm:     { background: "#fff", border: "1px solid #EAECF0", borderRadius: 10, padding: "14px 16px" },
  btn:        { padding: "7px 14px", fontSize: 13, fontWeight: 500, border: "1px solid #D0D5DD", borderRadius: 8, background: "#fff", color: "#344054", cursor: "pointer" },
  btnPrimary: { padding: "7px 14px", fontSize: 13, fontWeight: 500, border: "none", borderRadius: 8, background: "#1A1A2E", color: "#fff", cursor: "pointer" },
  btnSm:      { padding: "4px 10px", fontSize: 12, fontWeight: 500, border: "1px solid #D0D5DD", borderRadius: 6, background: "#fff", color: "#344054", cursor: "pointer" },
  input:      { fontSize: 13, padding: "7px 11px", border: "1px solid #D0D5DD", borderRadius: 8, background: "#fff", color: "#1A1A2E", outline: "none", width: "100%" },
  qtyInput:   { fontSize: 13, padding: "3px 5px", border: "1px solid #D0D5DD", borderRadius: 6, background: "#fff", color: "#1A1A2E", outline: "none", width: 50, textAlign: "center" },
  mono:       { fontFamily: "monospace", fontSize: 12 },
  row:        { display: "flex", alignItems: "center", gap: 10 },
  spacer:     { flex: 1 },
  badge:      (bg,c) => ({ display:"inline-block", fontSize:11, fontWeight:500, padding:"2px 8px", borderRadius:20, background:bg, color:c }),
  tag:        (bg,c) => ({ display:"inline-flex", alignItems:"center", fontSize:10, fontWeight:600, padding:"2px 7px", borderRadius:20, background:bg, color:c, letterSpacing:"0.02em" }),
  grid4:      { display:"grid", gridTemplateColumns:"repeat(4,minmax(0,1fr))", gap:10 },
  grid3:      { display:"grid", gridTemplateColumns:"repeat(3,minmax(0,1fr))", gap:12 },
};

function parseCWPN(cwpn) {
  if (!cwpn || cwpn.length !== 9) return null;
  const cat  = cwpn.slice(0,2);
  const type = cwpn.slice(0,5);
  const seq  = cwpn.slice(5);
  return { cat, type, seq, catLabel: CWPN_CATEGORIES[cat]?.label || "Unknown", typeLabel: CWPN_TYPES[type] || "Unknown type" };
}

// ── SHARED COMPONENTS ────────────────────────────────────────────────────────
function NavBar({ view, setView }) {
  return (
    <div style={S.nav}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ width:28, height:28, background:"#1A1A2E", borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="5" height="5" rx="1" fill="#fff"/><rect x="8" y="1" width="5" height="5" rx="1" fill="#fff" opacity=".6"/><rect x="1" y="8" width="5" height="5" rx="1" fill="#fff" opacity=".6"/><rect x="8" y="8" width="5" height="5" rx="1" fill="#fff" opacity=".3"/></svg>
        </div>
        <span style={S.navTitle}>CW Cycle Count</span>
        <span style={{ fontSize:11, background:"#F0F1F5", color:"#555", padding:"2px 8px", borderRadius:10, marginLeft:4 }}>v0.1 — prototype</span>
      </div>
      <div style={{ display:"flex", gap:4 }}>
        {[["home","Overview"],["sku","SKU / CWPN Master"],["history","History"]].map(([v,l]) => (
          <button key={v} onClick={() => setView(v)} style={{ ...S.btn, background: view===v ? "#F0F1F5":"#fff", border:"none", color: view===v ? "#1A1A2E":"#8A8FA8", fontWeight: view===v ? 600:400 }}>{l}</button>
        ))}
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <div style={{ width:30, height:30, borderRadius:"50%", background:"#E8EAF0", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:600, color:"#555" }}>ICS</div>
        <span style={{ fontSize:12, color:"#8A8FA8" }}>J. Bakker · AMS01</span>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{ background:"#F7F8FA", border:"1px solid #EAECF0", borderRadius:10, padding:"12px 14px" }}>
      <div style={{ fontSize:11, color:"#8A8FA8", fontWeight:500, textTransform:"uppercase", letterSpacing:"0.04em", marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:23, fontWeight:600, color: accent||"#1A1A2E", lineHeight:1.1 }}>{value}</div>
      {sub && <div style={{ fontSize:12, color:"#8A8FA8", marginTop:2 }}>{sub}</div>}
    </div>
  );
}

function CWPNBadge({ cwpn }) {
  const p = parseCWPN(cwpn);
  if (!p) return <span style={S.mono}>{cwpn}</span>;
  return (
    <div style={{ display:"inline-flex", flexDirection:"column", gap:1 }}>
      <span style={{ ...S.mono, fontWeight:700, fontSize:13, letterSpacing:"0.05em", color:"#1A1A2E" }}>{cwpn}</span>
      <span style={{ fontSize:10, color:"#8A8FA8" }}>{CWPN_CATEGORIES[p.cat]?.short} · {p.typeLabel} · #{p.seq}</span>
    </div>
  );
}

// ── HOME VIEW ────────────────────────────────────────────────────────────────
function HomeView({ onStartSession }) {
  const [showModal, setShowModal] = useState(false);
  const [countType, setCountType] = useState("daily");

  return (
    <div style={S.page}>
      <div style={{ marginBottom:22 }}>
        <div style={S.h1}>Inventory overview</div>
        <div style={S.sub}>European data centre operations</div>
      </div>
      <div style={{ ...S.grid4, marginBottom:20 }}>
        <StatCard label="Total SKUs" value={SKU_MASTER.length} sub="across 3 sites" />
        <StatCard label="Pending counts" value="2" sub="1 overdue" accent="#D4874A" />
        <StatCard label="Open variances" value="3" sub="awaiting review" accent="#E05A5A" />
        <StatCard label="Quarantine items" value="1" sub="pending resolution" accent="#888" />
      </div>

      <div style={{ ...S.row, marginBottom:12 }}>
        <div style={S.h2}>Sites</div>
        <div style={S.spacer} />
        <button style={S.btnPrimary} onClick={() => setShowModal(true)}>+ Start count session</button>
      </div>
      <div style={{ ...S.grid3, marginBottom:22 }}>
        {SITES.map(s => (
          <div key={s.id} style={{ ...S.cardSm, cursor:"pointer" }}>
            <div style={{ ...S.row, marginBottom:8 }}>
              <div>
                <div style={{ fontSize:14, fontWeight:600 }}>{s.name} — {s.city}</div>
                <div style={{ fontSize:12, color:"#8A8FA8" }}>Last count: {s.lastCount}</div>
              </div>
              <div style={S.spacer} />
              <span style={S.badge(s.status==="up-to-date"?"#EDF7F2":"#FDF5EE", s.status==="up-to-date"?"#2D7A56":"#9C4221")}>
                {s.status==="up-to-date"?"Up to date":"Count due"}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ ...S.row, marginBottom:12 }}><div style={S.h2}>Recent sessions</div></div>
      <div style={{ ...S.card, padding:0, overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
          <thead>
            <tr style={{ background:"#F9FAFB", borderBottom:"1px solid #EAECF0" }}>
              {["Session","Site","Type","Technician","Started","Status"].map(h => (
                <th key={h} style={{ textAlign:"left", padding:"8px 14px", fontSize:11, color:"#8A8FA8", fontWeight:500, textTransform:"uppercase", letterSpacing:"0.04em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ["CC-2024-041","AMS01","Weekly","J. Bakker","Today 07:15","In progress"],
              ["CC-2024-040","LHR02","Daily","M. Chen","Yesterday","Pending review"],
              ["CC-2024-039","FRA03","Full","A. Müller","3 days ago","Approved"],
            ].map(([id,site,type,tech,when,status]) => {
              const sc = status==="Approved"?["#EDF7F2","#2D7A56"]:status==="In progress"?["#EBF4FC","#2B6CB0"]:["#FDF5EE","#9C4221"];
              return (
                <tr key={id} style={{ borderBottom:"1px solid #F5F6F8" }}>
                  <td style={{ padding:"10px 14px", fontWeight:500 }}>{id}</td>
                  <td style={{ padding:"10px 14px" }}>{site}</td>
                  <td style={{ padding:"10px 14px" }}>{type}</td>
                  <td style={{ padding:"10px 14px", color:"#8A8FA8" }}>{tech}</td>
                  <td style={{ padding:"10px 14px", color:"#8A8FA8" }}>{when}</td>
                  <td style={{ padding:"10px 14px" }}><span style={S.badge(sc[0],sc[1])}>{status}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.35)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}>
          <div style={{ background:"#fff", borderRadius:14, padding:28, width:420 }}>
            <div style={{ fontSize:17, fontWeight:600, marginBottom:6 }}>Start count session</div>
            <div style={{ fontSize:13, color:"#8A8FA8", marginBottom:18 }}>Select site and count type</div>
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:12, fontWeight:500, color:"#555", marginBottom:6 }}>Site</div>
              <select style={S.input}>{SITES.map(s => <option key={s.id}>{s.name} — {s.city}</option>)}</select>
            </div>
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:12, fontWeight:500, color:"#555", marginBottom:8 }}>Count type</div>
              {Object.entries(COUNT_TYPES).map(([k,v]) => (
                <div key={k} onClick={() => setCountType(k)} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", borderRadius:8, border:`1.5px solid ${countType===k?v.color:"#EAECF0"}`, cursor:"pointer", background: countType===k?`${v.color}12`:"#fff", marginBottom:6 }}>
                  <div style={{ width:14, height:14, borderRadius:"50%", border:`2px solid ${v.color}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    {countType===k && <div style={{ width:7, height:7, borderRadius:"50%", background:v.color }} />}
                  </div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600 }}>{v.label}</div>
                    <div style={{ fontSize:12, color:"#8A8FA8" }}>{v.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              <button style={S.btn} onClick={() => setShowModal(false)}>Cancel</button>
              <button style={S.btnPrimary} onClick={() => { setShowModal(false); onStartSession(countType); }}>Begin session →</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── SKU MASTER VIEW ──────────────────────────────────────────────────────────
function SKUView() {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [filterCat, setFilterCat] = useState("all");
  const [newItem, setNewItem] = useState({ sku:"", netsuite_id:"", desc:"", cat:"01", type:"01001", serialTracked:false, status:"active", qty_daily:0, qty_excess:0, qty_critical:0 });

  const filtered = SKU_MASTER.filter(s => {
    const matchSearch = s.cwpn.includes(search) || s.sku.toLowerCase().includes(search.toLowerCase()) || s.desc.toLowerCase().includes(search.toLowerCase()) || s.netsuite_id.includes(search);
    const matchCat = filterCat === "all" || s.cat === filterCat;
    return matchSearch && matchCat;
  });

  return (
    <div style={S.page}>
      <div style={{ ...S.row, marginBottom:20 }}>
        <div>
          <div style={S.h1}>SKU / CWPN master</div>
          <div style={S.sub}>CoreWeave Part Numbers — source of truth for all sites</div>
        </div>
        <div style={S.spacer} />
        <button style={S.btn}>Import NetSuite CSV</button>
        <button style={S.btnPrimary} onClick={() => setShowAdd(true)}>+ Add item</button>
      </div>

      {/* CWPN Format explainer */}
      <div style={{ ...S.cardSm, marginBottom:16, background:"#F7F8FA", borderLeft:"3px solid #4A90D9" }}>
        <div style={{ fontSize:12, fontWeight:600, color:"#1A1A2E", marginBottom:6 }}>CWPN format — 9-digit fixed length</div>
        <div style={{ display:"flex", gap:20, flexWrap:"wrap" }}>
          <div style={{ fontSize:12, color:"#555" }}>
            <span style={{ ...S.mono, background:"#E8EAF0", padding:"1px 5px", borderRadius:4 }}>CC</span>
            <span style={{ color:"#8A8FA8", marginLeft:4 }}>Category (2 digits)</span>
          </div>
          <div style={{ fontSize:12, color:"#555" }}>
            <span style={{ ...S.mono, background:"#E8EAF0", padding:"1px 5px", borderRadius:4 }}>TTT</span>
            <span style={{ color:"#8A8FA8", marginLeft:4 }}>Type within category (3 digits)</span>
          </div>
          <div style={{ fontSize:12, color:"#555" }}>
            <span style={{ ...S.mono, background:"#E8EAF0", padding:"1px 5px", borderRadius:4 }}>SSSS</span>
            <span style={{ color:"#8A8FA8", marginLeft:4 }}>Sequence number (4 digits)</span>
          </div>
          <div style={{ fontSize:12, color:"#555" }}>
            Example: <span style={{ ...S.mono, fontWeight:700 }}>030010042</span>
            <span style={{ color:"#8A8FA8", marginLeft:4 }}>→ Optics · 100G SR4 · unit #0042</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ ...S.row, marginBottom:12, flexWrap:"wrap", gap:6 }}>
        <input style={{ ...S.input, maxWidth:280 }} placeholder="Search CWPN, SKU, description, NetSuite ID…" value={search} onChange={e => setSearch(e.target.value)} />
        <div style={S.spacer} />
        {[["all","All"], ...Object.entries(CWPN_CATEGORIES).map(([k,v]) => [k, v.short])].map(([k,l]) => (
          <button key={k} onClick={() => setFilterCat(k)} style={{ ...S.btnSm, background: filterCat===k?"#1A1A2E":"#fff", color: filterCat===k?"#fff":"#555", borderColor: filterCat===k?"#1A1A2E":"#D0D5DD" }}>{l}</button>
        ))}
      </div>

      <div style={{ ...S.card, padding:0, overflow:"hidden" }}>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead>
              <tr style={{ background:"#F9FAFB", borderBottom:"1px solid #EAECF0" }}>
                {["CWPN","NetSuite ID","SKU","Description","Category","Status","Serial","Qty daily","Qty excess","Qty critical","Qty RMA","Qty quar.","Total"].map(h => (
                  <th key={h} style={{ textAlign:"left", padding:"8px 12px", fontSize:10, color:"#8A8FA8", fontWeight:500, whiteSpace:"nowrap", textTransform:"uppercase", letterSpacing:"0.04em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, i) => {
                const total = item.qty_daily+item.qty_excess+item.qty_critical+item.qty_rma+item.qty_quarantine;
                const catInfo = CWPN_CATEGORIES[item.cat];
                const ss = STATUS_STYLE[item.status] || STATUS_STYLE.active;
                const noDesc = !item.desc || item.desc.trim() === "";
                return (
                  <tr key={item.cwpn} style={{ borderBottom:"1px solid #F0F1F3", background: i%2===0?"#fff":"#FAFBFC" }}>
                    <td style={{ padding:"9px 12px" }}><CWPNBadge cwpn={item.cwpn} /></td>
                    <td style={{ padding:"9px 12px", ...S.mono, color:"#8A8FA8" }}>{item.netsuite_id}</td>
                    <td style={{ padding:"9px 12px", fontWeight:600, ...S.mono }}>{item.sku}</td>
                    <td style={{ padding:"9px 12px", maxWidth:180 }}>
                      {noDesc
                        ? <span style={{ fontSize:11, background:"#FDF5EE", color:"#9C4221", padding:"2px 7px", borderRadius:10 }}>⚠ No description — click to enrich</span>
                        : <span style={{ color:"#555" }}>{item.desc}</span>
                      }
                    </td>
                    <td style={{ padding:"9px 12px" }}><span style={S.badge("#F0F1F5","#555")}>{catInfo?.short || item.cat}</span></td>
                    <td style={{ padding:"9px 12px" }}><span style={S.badge(ss.bg, ss.color)}>{item.status}</span></td>
                    <td style={{ padding:"9px 12px", textAlign:"center" }}>{item.serialTracked ? "✓" : "—"}</td>
                    {["qty_daily","qty_excess","qty_critical","qty_rma","qty_quarantine"].map(f => (
                      <td key={f} style={{ padding:"9px 12px", textAlign:"center", color: item[f]===0?"#CCC":"#1A1A2E", fontWeight: item[f]>0?500:400 }}>{item[f]||"—"}</td>
                    ))}
                    <td style={{ padding:"9px 12px", textAlign:"center", fontWeight:700 }}>{total}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding:"10px 14px", borderTop:"1px solid #EAECF0", fontSize:11, color:"#8A8FA8" }}>
          {filtered.length} items shown · Items with no description are flagged for enrichment · NetSuite IDs mapped for export
        </div>
      </div>

      {showAdd && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.35)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}>
          <div style={{ background:"#fff", borderRadius:14, padding:28, width:460 }}>
            <div style={{ fontSize:16, fontWeight:600, marginBottom:16 }}>Add new item</div>
            {[["NetSuite ID","netsuite_id"],["SKU","sku"],["Description","desc"]].map(([l,k]) => (
              <div key={k} style={{ marginBottom:12 }}>
                <div style={{ fontSize:12, fontWeight:500, color:"#555", marginBottom:4 }}>{l}</div>
                <input style={S.input} value={newItem[k]} onChange={e => setNewItem(p => ({...p,[k]:e.target.value}))} />
              </div>
            ))}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
              <div>
                <div style={{ fontSize:12, fontWeight:500, color:"#555", marginBottom:4 }}>Category</div>
                <select style={S.input} value={newItem.cat} onChange={e => setNewItem(p => ({...p,cat:e.target.value}))}>
                  {Object.entries(CWPN_CATEGORIES).map(([k,v]) => <option key={k} value={k}>{k} — {v.short}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize:12, fontWeight:500, color:"#555", marginBottom:4 }}>Status</div>
                <select style={S.input} value={newItem.status} onChange={e => setNewItem(p => ({...p,status:e.target.value}))}>
                  <option value="active">Active</option>
                  <option value="faulty">Faulty</option>
                  <option value="rma">In RMA</option>
                </select>
              </div>
            </div>
            <div style={{ fontSize:12, color:"#8A8FA8", marginBottom:16, background:"#F7F8FA", padding:"8px 12px", borderRadius:8 }}>
              CWPN will be auto-generated based on category and next available sequence number.
            </div>
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              <button style={S.btn} onClick={() => setShowAdd(false)}>Cancel</button>
              <button style={S.btnPrimary} onClick={() => setShowAdd(false)}>Save item</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── COUNT SESSION VIEW ───────────────────────────────────────────────────────
function CountSession({ countType, onBack }) {
  const ct = COUNT_TYPES[countType];
  const [activeSection, setActiveSection] = useState(ct.sections[0]);
  const [scanVal, setScanVal] = useState("");
  const [scanMsg, setScanMsg] = useState(null);
  const [counts, setCounts] = useState(() => Object.fromEntries(SKU_MASTER.map(i => [i.cwpn, { onHand:"", note:"" }])));
  const [scannedSerials, setScannedSerials] = useState([]);

  const sectionItems = SKU_MASTER.filter(i => i[`qty_${activeSection}`] > 0);
  const getExpected = i => i[`qty_${activeSection}`] || 0;

  const handleScan = e => {
    if (e.key !== "Enter") return;
    const val = scanVal.trim();
    if (!val) return;
    const allSerials = Object.values(SERIALS).flat();
    if (allSerials.includes(val)) {
      const cwpnEntry = Object.entries(SERIALS).find(([,v]) => v.includes(val));
      setScannedSerials(p => [...p.filter(s => s!==val), val]);
      setScanMsg({ type:"ok", text:`Serial confirmed — ${val}${cwpnEntry ? ` (CWPN ${cwpnEntry[0]})` : ""}` });
    } else if (val.length === 9 && /^\d+$/.test(val)) {
      const match = SKU_MASTER.find(s => s.cwpn === val);
      setScanMsg(match
        ? { type:"sku", text:`CWPN matched — ${match.desc}` }
        : { type:"warn", text:`CWPN ${val} not in system — will be flagged` }
      );
    } else {
      setScanMsg({ type:"warn", text:`Unrecognised — ${val}` });
    }
    setScanVal("");
    setTimeout(() => setScanMsg(null), 4000);
  };

  const updateCount = (cwpn, val) => setCounts(p => ({ ...p, [cwpn]: { ...p[cwpn], onHand:val } }));
  const getVariance = item => {
    const oh = counts[item.cwpn].onHand;
    if (oh === "" || oh === undefined) return null;
    return parseInt(oh) - getExpected(item);
  };

  const confirmed = sectionItems.filter(i => getVariance(i) === 0).length;
  const variances = sectionItems.filter(i => { const v=getVariance(i); return v!==null&&v!==0; }).length;
  const pending   = sectionItems.filter(i => counts[i.cwpn].onHand === "").length;
  const sec = SECTIONS[activeSection];

  return (
    <div style={S.pageLg}>
      <div style={{ ...S.row, marginBottom:18 }}>
        <button style={S.btn} onClick={onBack}>← Back</button>
        <div style={{ marginLeft:6 }}>
          <div style={{ fontSize:16, fontWeight:600 }}>AMS01 — Count session</div>
          <div style={{ fontSize:12, color:"#8A8FA8" }}>
            <span style={S.badge(`${ct.color}18`, ct.color)}>{ct.label}</span>
            <span style={{ marginLeft:8 }}>Started today · J. Bakker</span>
          </div>
        </div>
        <div style={S.spacer} />
        <button style={S.btn}>Save draft</button>
        <button style={S.btnPrimary}>Submit for review</button>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"180px 1fr", gap:14 }}>
        {/* Section nav */}
        <div>
          <div style={{ fontSize:11, fontWeight:500, color:"#8A8FA8", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:8 }}>Sections</div>
          {ct.sections.map(s => {
            const items = SKU_MASTER.filter(i => i[`qty_${s}`] > 0);
            const done  = items.filter(i => counts[i.cwpn].onHand !== "").length;
            const sc = SECTIONS[s];
            return (
              <div key={s} onClick={() => setActiveSection(s)} style={{ padding:"9px 12px", borderRadius:8, border:`1.5px solid ${activeSection===s?sc.color:"#EAECF0"}`, background: activeSection===s?`${sc.color}12`:"#fff", cursor:"pointer", marginBottom:5 }}>
                <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:3 }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background: done===items.length&&items.length>0?"#3AAA7A":sc.color }} />
                  <div style={{ fontSize:12, fontWeight: activeSection===s?600:400, color: activeSection===s?"#1A1A2E":"#555" }}>{sc.label}</div>
                </div>
                <div style={{ fontSize:11, color:"#8A8FA8" }}>{done}/{items.length} counted</div>
              </div>
            );
          })}
        </div>

        {/* Main */}
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div style={S.grid4}>
            <StatCard label="In section" value={sectionItems.length} />
            <StatCard label="Confirmed"  value={confirmed} accent="#3AAA7A" />
            <StatCard label="Variances"  value={variances}  accent="#E05A5A" />
            <StatCard label="Pending"    value={pending}    accent="#8A8FA8" />
          </div>

          {/* Scan bar */}
          <div style={{ ...S.cardSm, display:"flex", alignItems:"center", gap:10, borderLeft:`3px solid ${sec.color}`, padding:"10px 14px" }}>
            <div style={{ fontSize:12, fontWeight:500, color:"#8A8FA8", whiteSpace:"nowrap" }}>Scan / enter CWPN or serial</div>
            <input style={{ ...S.input, flex:1 }} placeholder="Scan 9-digit CWPN or serial number, press Enter…" value={scanVal} onChange={e => setScanVal(e.target.value)} onKeyDown={handleScan} autoFocus />
            {scanMsg && (
              <span style={{ ...S.badge(scanMsg.type==="ok"?"#EDF7F2":scanMsg.type==="sku"?"#EBF4FC":"#FDF0F0", scanMsg.type==="ok"?"#2D7A56":scanMsg.type==="sku"?"#2B6CB0":"#B03A3A"), whiteSpace:"nowrap", fontSize:12 }}>
                {scanMsg.text}
              </span>
            )}
          </div>

          {/* Table */}
          <div style={{ ...S.card, padding:0, overflow:"hidden" }}>
            <div style={{ padding:"10px 14px", background:sec.bg, borderBottom:`1px solid ${sec.color}30`, display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:10, height:10, borderRadius:"50%", background:sec.color }} />
              <div style={{ fontSize:13, fontWeight:600 }}>{sec.label}</div>
              <div style={{ fontSize:12, color:"#8A8FA8" }}>{sectionItems.length} items</div>
            </div>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                <thead>
                  <tr style={{ background:"#FAFBFC" }}>
                    {["CWPN","SKU","Description","Type","Expected","On hand","Variance","Daily","Excess","Critical","RMA","Quar.","Total",""].map(h => (
                      <th key={h} style={{ textAlign: ["CWPN","SKU","Description","Type"].includes(h)?"left":"center", padding:"7px 10px", fontSize:10, color:"#8A8FA8", fontWeight:500, whiteSpace:"nowrap", borderBottom:"1px solid #EAECF0", textTransform:"uppercase", letterSpacing:"0.04em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sectionItems.map((item, idx) => {
                    const exp = getExpected(item);
                    const oh  = counts[item.cwpn].onHand;
                    const variance = getVariance(item);
                    const total = item.qty_daily+item.qty_excess+item.qty_critical+item.qty_rma+item.qty_quarantine;
                    const rowBg = variance===null?(idx%2===0?"#fff":"#FAFBFC"):variance===0?"#F6FCF9":"#FEF8F8";
                    const scannedCount = item.serialTracked ? scannedSerials.filter(s => SERIALS[item.cwpn]?.includes(s)).length : null;
                    return (
                      <tr key={item.cwpn} style={{ background:rowBg, borderBottom:"1px solid #F0F1F3" }}>
                        <td style={{ padding:"8px 10px" }}><span style={{ ...S.mono, fontWeight:700, fontSize:11 }}>{item.cwpn}</span></td>
                        <td style={{ padding:"8px 10px", ...S.mono, fontSize:11 }}>{item.sku}</td>
                        <td style={{ padding:"8px 10px", color:"#555", maxWidth:150, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{item.desc}</td>
                        <td style={{ padding:"8px 10px" }}>
                          <span style={S.tag(item.serialTracked?"#EBF4FC":"#F5F6F8", item.serialTracked?"#2B6CB0":"#888")}>{item.serialTracked?"serial":"qty"}</span>
                        </td>
                        <td style={{ padding:"8px 10px", textAlign:"center", fontWeight:600 }}>{exp}</td>
                        <td style={{ padding:"8px 10px", textAlign:"center" }}>
                          {item.serialTracked
                            ? <span style={{ fontWeight:600, color: scannedCount===exp?"#2D7A56":"#E05A5A" }}>{scannedCount ?? 0}</span>
                            : <input style={{ ...S.qtyInput, borderColor: variance===null?"#D0D5DD":variance===0?"#88C9A8":"#E8A0A0" }} type="number" min="0" value={oh} placeholder="—" onChange={e => updateCount(item.cwpn, e.target.value)} />
                          }
                        </td>
                        <td style={{ padding:"8px 10px", textAlign:"center" }}>
                          {variance===null ? <span style={{ color:"#CCC" }}>—</span>
                            : variance===0  ? <span style={S.badge("#EDF7F2","#2D7A56")}>✓</span>
                            : <span style={S.badge("#FDF0F0","#B03A3A")}>{variance>0?"+":""}{variance}</span>}
                        </td>
                        {["qty_daily","qty_excess","qty_critical","qty_rma","qty_quarantine"].map(f => (
                          <td key={f} style={{ padding:"8px 10px", textAlign:"center", color: item[f]===0?"#DDD":"#555" }}>{item[f]||"—"}</td>
                        ))}
                        <td style={{ padding:"8px 10px", textAlign:"center", fontWeight:700 }}>{total}</td>
                        <td style={{ padding:"8px 10px", textAlign:"center" }}>
                          {variance!==null&&variance!==0&&<button style={{ ...S.btnSm, background:"#F0EEFB", borderColor:"#C4BCE8", color:"#553C9A", fontSize:11 }}>Quarantine</button>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ padding:"9px 14px", borderTop:"1px solid #EAECF0", fontSize:11, color:"#8A8FA8" }}>
              Section quantity columns show distribution across all storage areas — use to investigate discrepancies · CWPN scans auto-match to this list
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── HISTORY VIEW ─────────────────────────────────────────────────────────────
function HistoryView() {
  return (
    <div style={S.page}>
      <div style={{ marginBottom:20 }}>
        <div style={S.h1}>Session history</div>
        <div style={S.sub}>Completed and approved count sessions — export ready</div>
      </div>
      <div style={{ ...S.card, textAlign:"center", padding:"48px 0", color:"#8A8FA8", fontSize:13 }}>
        Full history and NetSuite export will be available once the backend is connected.
      </div>
    </div>
  );
}

// ── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState("home");
  const [activeSession, setActiveSession] = useState(null);
  const handleStartSession = type => { setActiveSession(type); setView("session"); };
  return (
    <div style={S.app}>
      <NavBar view={view==="session"?"session":view} setView={v => { setView(v); setActiveSession(null); }} />
      {view==="home"    && <HomeView onStartSession={handleStartSession} />}
      {view==="sku"     && <SKUView />}
      {view==="history" && <HistoryView />}
      {view==="session" && activeSession && <CountSession countType={activeSession} onBack={() => { setView("home"); setActiveSession(null); }} />}
    </div>
  );
}
