/**
 * authService.js
 * ─────────────────────────────────────────────────────────────────
 * Google OAuth helpers.
 * Auth is currently bypassed — a mock user is returned.
 * To enable real auth: set VITE_GOOGLE_CLIENT_ID in GitHub secrets
 * and remove the BYPASS_AUTH flag.
 * ─────────────────────────────────────────────────────────────────
 */

import { jwtDecode } from 'jwt-decode'

export const BYPASS_AUTH = true // ← set to false when client ID is ready

export const ALLOWED_DOMAIN = 'coreweave.com'

export const MOCK_USER = {
  email: 'j.bakker@coreweave.com',
  name: 'J. Bakker',
  picture: null,
  given_name: 'J.',
  family_name: 'Bakker',
  role: 'ics', // 'ics' | 'manager' | 'admin'
}

/**
 * Decode and validate a Google credential JWT.
 * Returns user object or throws if domain not allowed.
 */
export function decodeCredential(credential) {
  const user = jwtDecode(credential)
  const domain = user.email?.split('@')[1]
  if (domain !== ALLOWED_DOMAIN) {
    throw new Error(`Access restricted to @${ALLOWED_DOMAIN} accounts`)
  }
  return {
    email:       user.email,
    name:        user.name,
    picture:     user.picture,
    given_name:  user.given_name,
    family_name: user.family_name,
    role:        'ics', // default role; extend with a roles lookup later
  }
}

/**
 * Persist user to sessionStorage so page refreshes don't log out.
 */
export function persistUser(user) {
  sessionStorage.setItem('cw_user', JSON.stringify(user))
}

export function getPersistedUser() {
  try {
    const raw = sessionStorage.getItem('cw_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function clearPersistedUser() {
  sessionStorage.removeItem('cw_user')
}

/**
 * Role helpers — extend as needed.
 */
export function isManager(user) {
  return user?.role === 'manager' || user?.role === 'admin'
}

export function isAdmin(user) {
  return user?.role === 'admin'
}
