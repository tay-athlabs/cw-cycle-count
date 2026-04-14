/**
 * useSession.js
 * All session lifecycle operations — create, load, update, claim,
 * complete, approve. Components stay clean.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  getSessions,
  getSessionById,
  createSession,
  updateSession,
  completeSession,
  approveSession,
  claimSection,
  updateSectionItems,
} from '../services/dataService'
import { useAppContext } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'

// ── All sessions (for History + Overview) ────────────────────────
export function useSessionList(siteId) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  const fetch = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const all = await getSessions()
      setSessions(siteId ? all.filter(s => s.siteId === siteId) : all)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [siteId])

  useEffect(() => { fetch() }, [fetch])

  return { sessions, loading, error, refetch: fetch }
}

// ── Single session (for active count + detail view) ───────────────
export function useSession(sessionId) {
  const { sessionCache, cacheSession, invalidateSession } = useAppContext()
  const { showToast } = useAppContext()
  const { user } = useAuth()

  const [session, setSession]   = useState(sessionCache[sessionId] || null)
  const [loading, setLoading]   = useState(!sessionCache[sessionId])
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState(null)
  const pollRef                 = useRef(null)

  const fetch = useCallback(async () => {
    if (!sessionId) return
    try {
      setError(null)
      const data = await getSessionById(sessionId)
      setSession(data)
      cacheSession(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [sessionId, cacheSession])

  useEffect(() => {
    if (!sessionCache[sessionId]) fetch()
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [sessionId, sessionCache, fetch])

  // Collaborative sessions poll for updates every 30s
  const startPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(fetch, 30000)
  }, [fetch])

  const stopPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current)
  }, [])

  // Claim a section for this user
  const claim = useCallback(async (sectionKey) => {
    try {
      setSaving(true)
      const updated = await claimSection(sessionId, sectionKey, {
        email: user.email,
        name: user.name,
      })
      setSession(updated)
      cacheSession(updated)
      showToast(`Section claimed — ${sectionKey}`, 'success')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }, [sessionId, user, cacheSession, showToast])

  // Save item counts for a section
  const saveItems = useCallback(async (sectionKey, items) => {
    try {
      setSaving(true)
      const updated = await updateSectionItems(sessionId, sectionKey, items)
      setSession(updated)
      cacheSession(updated)
    } catch (err) {
      showToast(`Save failed: ${err.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }, [sessionId, cacheSession, showToast])

  // Mark section complete
  const completeSection = useCallback(async (sectionKey) => {
    if (!session) return
    const updated = {
      ...session,
      sections: {
        ...session.sections,
        [sectionKey]: {
          ...session.sections[sectionKey],
          status: 'completed',
          completedAt: new Date().toISOString(),
        },
      },
    }
    try {
      setSaving(true)
      const saved = await updateSession(sessionId, { sections: updated.sections })
      setSession(saved)
      cacheSession(saved)
      showToast('Section marked complete', 'success')
    } catch (err) {
      showToast(`Failed: ${err.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }, [session, sessionId, cacheSession, showToast])

  // Submit entire session for review
  const submit = useCallback(async () => {
    try {
      setSaving(true)
      const updated = await completeSession(sessionId, { email: user.email, name: user.name })
      setSession(updated)
      cacheSession(updated)
      invalidateSession(sessionId)
      showToast('Session submitted for review', 'success')
    } catch (err) {
      showToast(`Submit failed: ${err.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }, [sessionId, user, cacheSession, invalidateSession, showToast])

  // Approve session (manager role)
  const approve = useCallback(async () => {
    try {
      setSaving(true)
      const updated = await approveSession(sessionId, { email: user.email, name: user.name })
      setSession(updated)
      cacheSession(updated)
      showToast('Session approved', 'success')
    } catch (err) {
      showToast(`Approve failed: ${err.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }, [sessionId, user, cacheSession, showToast])

  return {
    session,
    loading,
    saving,
    error,
    refetch: fetch,
    claim,
    saveItems,
    completeSection,
    submit,
    approve,
    startPolling,
    stopPolling,
  }
}

// ── Create new session ────────────────────────────────────────────
export function useCreateSession() {
  const { showToast } = useAppContext()
  const { user } = useAuth()
  const [creating, setCreating] = useState(false)

  const create = useCallback(async (config) => {
    try {
      setCreating(true)
      const session = await createSession({
        ...config,
        createdBy: { email: user.email, name: user.name },
        sections: buildInitialSections(config),
      })
      showToast(`Session ${session.id} created`, 'success')
      return session
    } catch (err) {
      showToast(`Failed to create session: ${err.message}`, 'error')
      return null
    } finally {
      setCreating(false)
    }
  }, [user, showToast])

  return { create, creating }
}

// ── Build empty section structure from config ─────────────────────
function buildInitialSections(config) {
  const sections = {}
  const sectionKeys = getSectionKeysForType(config.type)
  sectionKeys.forEach(key => {
    sections[key] = {
      status: 'open',
      claimedBy: config.collaborative ? null : { email: config.createdBy?.email, name: config.createdBy?.name },
      claimedAt: config.collaborative ? null : new Date().toISOString(),
      items: [],
    }
  })
  return sections
}

export function getSectionKeysForType(type) {
  const map = {
    daily:  ['daily'],
    weekly: ['daily', 'excess', 'critical'],
    full:   ['daily', 'excess', 'critical', 'rma', 'quarantine'],
  }
  return map[type] || ['daily']
}
