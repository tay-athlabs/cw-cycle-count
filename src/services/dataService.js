/**
 * dataService.js
 * ─────────────────────────────────────────────────────────────────
 * Single abstraction layer for all data operations.
 * Currently backed by GitHub Contents API + JSON files.
 * To migrate to CWDB/Supabase: replace the functions below,
 * keeping the same exported interface. Components never change.
 * ─────────────────────────────────────────────────────────────────
 */

const OWNER  = import.meta.env.VITE_GITHUB_OWNER  || 'tay-athlabs'
const REPO   = import.meta.env.VITE_GITHUB_REPO   || 'cw-cycle-count'
const BRANCH = import.meta.env.VITE_GITHUB_BRANCH || 'main'
const TOKEN  = import.meta.env.VITE_GITHUB_TOKEN  || ''

const BASE_URL = `https://api.github.com/repos/${OWNER}/${REPO}/contents`

const headers = {
  'Accept': 'application/vnd.github.v3+json',
  'Content-Type': 'application/json',
  ...(TOKEN ? { 'Authorization': `Bearer ${TOKEN}` } : {}),
}

// ── LOW-LEVEL GITHUB API ──────────────────────────────────────────

async function getFile(path) {
  const res = await fetch(`${BASE_URL}/${path}?ref=${BRANCH}`, { headers })
  if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`)
  const data = await res.json()
  const content = JSON.parse(atob(data.content.replace(/\n/g, '')))
  return { content, sha: data.sha }
}

async function putFile(path, content, sha, message) {
  const body = {
    message,
    content: btoa(unescape(encodeURIComponent(JSON.stringify(content, null, 2)))),
    branch: BRANCH,
    ...(sha ? { sha } : {}),
  }
  const res = await fetch(`${BASE_URL}/${path}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Failed to write ${path}: ${err.message}`)
  }
  return res.json()
}

async function listDirectory(path) {
  const res = await fetch(`${BASE_URL}/${path}?ref=${BRANCH}`, { headers })
  if (!res.ok) throw new Error(`Failed to list ${path}: ${res.status}`)
  return res.json()
}

// ── SITES ─────────────────────────────────────────────────────────

export async function getSites() {
  const { content } = await getFile('src/data/sites.json')
  return content
}

export async function getSiteById(id) {
  const sites = await getSites()
  return sites.find(s => s.id === id) || null
}

// ── SKUS ──────────────────────────────────────────────────────────

export async function getSKUs() {
  const { content } = await getFile('src/data/skus.json')
  return content
}

export async function getSKUsBySite(siteId) {
  const skus = await getSKUs()
  return skus.filter(sku => sku.inventory?.[siteId])
}

export async function updateSKU(cwpn, updates) {
  const { content: skus, sha } = await getFile('src/data/skus.json')
  const idx = skus.findIndex(s => s.cwpn === cwpn)
  if (idx === -1) throw new Error(`SKU ${cwpn} not found`)
  skus[idx] = { ...skus[idx], ...updates }
  await putFile('src/data/skus.json', skus, sha, `Update SKU ${cwpn}`)
  return skus[idx]
}

// ── SESSIONS ──────────────────────────────────────────────────────

/**
 * Generate a unique session ID.
 * Format: CC-{SITE}-{YYYYMMDD}-{NNN}
 */
export function generateSessionId(siteId) {
  const d = new Date()
  const date = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`
  const seq  = String(Math.floor(Math.random() * 900) + 100)
  return `CC-${siteId}-${date}-${seq}`
}

export async function getSessions() {
  try {
    const files = await listDirectory('src/data/sessions')
    const sessions = await Promise.all(
      files
        .filter(f => f.name.endsWith('.json') && f.name !== 'example.json')
        .map(async f => {
          const { content } = await getFile(`src/data/sessions/${f.name}`)
          return content
        })
    )
    // Include example session for demo data
    try {
      const { content: example } = await getFile('src/data/sessions/example.json')
      sessions.push(example)
    } catch (_) { /* example may not exist */ }

    return sessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  } catch (err) {
    console.warn('No sessions found:', err.message)
    return []
  }
}

export async function getSessionById(id) {
  const { content } = await getFile(`src/data/sessions/${id}.json`)
  return content
}

export async function createSession(sessionData) {
  const id = generateSessionId(sessionData.siteId)
  const session = {
    id,
    ...sessionData,
    status: 'open',
    createdAt: new Date().toISOString(),
    completedAt: null,
    approvedAt: null,
    approvedBy: null,
    accuracy: null,
    summary: {
      totalItems: 0,
      matched: 0,
      variances: 0,
      quarantined: 0,
      notCounted: 0,
    },
    notes: '',
  }
  await putFile(
    `src/data/sessions/${id}.json`,
    session,
    null,
    `Create session ${id}`
  )
  return session
}

export async function updateSession(id, updates) {
  const { content: session, sha } = await getFile(`src/data/sessions/${id}.json`)
  const updated = { ...session, ...updates }

  // Recalculate accuracy and summary whenever sections are updated
  if (updates.sections) {
    const { summary, accuracy } = calculateSessionStats(updated)
    updated.summary = summary
    updated.accuracy = accuracy
  }

  await putFile(
    `src/data/sessions/${id}.json`,
    updated,
    sha,
    `Update session ${id}`
  )
  return updated
}

export async function completeSession(id, userInfo) {
  return updateSession(id, {
    status: 'pending_review',
    completedAt: new Date().toISOString(),
    completedBy: userInfo,
  })
}

export async function approveSession(id, userInfo) {
  return updateSession(id, {
    status: 'approved',
    approvedAt: new Date().toISOString(),
    approvedBy: userInfo,
  })
}

export async function claimSection(sessionId, sectionKey, userInfo) {
  const { content: session, sha } = await getFile(`src/data/sessions/${sessionId}.json`)
  if (session.sections?.[sectionKey]?.claimedBy) {
    throw new Error(`Section ${sectionKey} is already claimed`)
  }
  const updated = {
    ...session,
    sections: {
      ...session.sections,
      [sectionKey]: {
        ...(session.sections?.[sectionKey] || {}),
        status: 'in_progress',
        claimedBy: userInfo,
        claimedAt: new Date().toISOString(),
        items: session.sections?.[sectionKey]?.items || [],
      },
    },
  }
  await putFile(`src/data/sessions/${sessionId}.json`, updated, sha, `Claim section ${sectionKey} in ${sessionId}`)
  return updated
}

export async function updateSectionItems(sessionId, sectionKey, items) {
  const { content: session, sha } = await getFile(`src/data/sessions/${sessionId}.json`)
  const updated = {
    ...session,
    sections: {
      ...session.sections,
      [sectionKey]: {
        ...session.sections[sectionKey],
        items,
      },
    },
  }
  const { summary, accuracy } = calculateSessionStats(updated)
  updated.summary = summary
  updated.accuracy = accuracy
  await putFile(`src/data/sessions/${sessionId}.json`, updated, sha, `Update items in ${sessionId}/${sectionKey}`)
  return updated
}

// ── ANALYTICS ─────────────────────────────────────────────────────

export async function getAnalytics(siteId) {
  const sessions = await getSessions()
  const filtered = siteId
    ? sessions.filter(s => s.siteId === siteId && s.status === 'approved')
    : sessions.filter(s => s.status === 'approved')

  return buildAnalytics(filtered)
}

// ── HELPERS ───────────────────────────────────────────────────────

function calculateSessionStats(session) {
  const allItems = Object.values(session.sections || {}).flatMap(s => s.items || [])
  const totalItems   = allItems.length
  const matched      = allItems.filter(i => i.status === 'matched').length
  const variances    = allItems.filter(i => i.status === 'variance').length
  const quarantined  = allItems.filter(i => i.status === 'quarantine').length
  const notCounted   = allItems.filter(i => !i.status || i.status === 'pending').length
  const counted      = totalItems - notCounted
  const accuracy     = counted > 0 ? Math.round((matched / counted) * 1000) / 10 : null

  return {
    summary: { totalItems, matched, variances, quarantined, notCounted },
    accuracy,
  }
}

function buildAnalytics(sessions) {
  if (!sessions.length) return { sessions: [], trends: [], siteBreakdown: [], topVariances: [] }

  // Accuracy trend over time
  const trends = sessions.slice(0, 12).reverse().map(s => ({
    date: new Date(s.createdAt).toLocaleDateString('en-GB', { day:'2-digit', month:'short' }),
    accuracy: s.accuracy || 0,
    sessionId: s.id,
    site: s.siteId,
  }))

  // Per-site breakdown
  const siteMap = {}
  sessions.forEach(s => {
    if (!siteMap[s.siteId]) siteMap[s.siteId] = { sessions: 0, accuracy: [], variances: 0 }
    siteMap[s.siteId].sessions++
    if (s.accuracy) siteMap[s.siteId].accuracy.push(s.accuracy)
    siteMap[s.siteId].variances += s.summary?.variances || 0
  })
  const siteBreakdown = Object.entries(siteMap).map(([site, d]) => ({
    site,
    sessions: d.sessions,
    avgAccuracy: d.accuracy.length
      ? Math.round(d.accuracy.reduce((a,b) => a+b, 0) / d.accuracy.length * 10) / 10
      : 0,
    variances: d.variances,
  }))

  // Top variance SKUs
  const varianceMap = {}
  sessions.forEach(s => {
    Object.values(s.sections || {}).forEach(sec => {
      (sec.items || []).filter(i => i.status === 'variance').forEach(i => {
        varianceMap[i.cwpn] = (varianceMap[i.cwpn] || 0) + 1
      })
    })
  })
  const topVariances = Object.entries(varianceMap)
    .sort(([,a],[,b]) => b - a)
    .slice(0, 5)
    .map(([cwpn, count]) => ({ cwpn, count }))

  return { sessions, trends, siteBreakdown, topVariances }
}
